/**
 * BFS impact-radius traversal using in-memory adjacency lists.
 * Replaces Python's NetworkX DiGraph with pure Map/Set structures.
 */

import type { GraphStore } from "./store.js";
import type { GraphEdge, GraphNode, ImpactResult } from "./types.js";

export interface AdjacencyList {
  /** source → set of target qualified names */
  forward: Map<string, Set<string>>;
  /** target → set of source qualified names */
  reverse: Map<string, Set<string>>;
}

/**
 * Build forward and reverse adjacency lists from edge records.
 */
export function buildAdjacencyList(edges: GraphEdge[]): AdjacencyList {
  const forward = new Map<string, Set<string>>();
  const reverse = new Map<string, Set<string>>();

  for (const e of edges) {
    let fwd = forward.get(e.source_qualified);
    if (!fwd) {
      fwd = new Set();
      forward.set(e.source_qualified, fwd);
    }
    fwd.add(e.target_qualified);

    let rev = reverse.get(e.target_qualified);
    if (!rev) {
      rev = new Set();
      reverse.set(e.target_qualified, rev);
    }
    rev.add(e.source_qualified);
  }

  return { forward, reverse };
}

/**
 * BFS from changed files to find all impacted nodes within N hops.
 *
 * Traverses both forward edges (things this node affects) and reverse
 * edges (things that depend on this node) at each depth level.
 */
export function getImpactRadius(
  store: GraphStore,
  changedFiles: string[],
  maxDepth = 2,
  maxNodes = 500,
): ImpactResult {
  // Build adjacency list from all edges
  const allEdges = store.getAllEdges();
  const adj = buildAdjacencyList(allEdges);

  // Seed: all qualified names from nodes in changed files
  const seeds = new Set<string>();
  for (const f of changedFiles) {
    for (const node of store.getNodesByFile(f)) {
      seeds.add(node.qualified_name);
    }
  }

  // BFS
  const visited = new Set<string>();
  let frontier = new Set(seeds);
  const impacted = new Set<string>();

  for (let depth = 0; depth < maxDepth && frontier.size > 0; depth++) {
    const nextFrontier = new Set<string>();

    for (const qn of frontier) {
      visited.add(qn);

      // Forward neighbors
      const fwd = adj.forward.get(qn);
      if (fwd) {
        for (const neighbor of fwd) {
          if (!visited.has(neighbor)) {
            nextFrontier.add(neighbor);
            impacted.add(neighbor);
          }
        }
      }

      // Reverse predecessors
      const rev = adj.reverse.get(qn);
      if (rev) {
        for (const pred of rev) {
          if (!visited.has(pred)) {
            nextFrontier.add(pred);
            impacted.add(pred);
          }
        }
      }
    }

    // Cap total nodes to prevent resource exhaustion
    if (visited.size + nextFrontier.size > maxNodes) {
      break;
    }
    frontier = nextFrontier;
  }

  // Resolve to full node info
  const changedNodes: GraphNode[] = [];
  for (const qn of seeds) {
    const node = store.getNode(qn);
    if (node) changedNodes.push(node);
  }

  const impactedNodes: GraphNode[] = [];
  for (const qn of impacted) {
    if (seeds.has(qn)) continue; // Don't double-count seeds
    const node = store.getNode(qn);
    if (node) impactedNodes.push(node);
  }

  const totalImpacted = impactedNodes.length;
  const truncated = totalImpacted > maxNodes;
  const finalImpacted = truncated
    ? impactedNodes.slice(0, maxNodes)
    : impactedNodes;

  const impactedFiles = [
    ...new Set(finalImpacted.map((n) => n.file_path)),
  ];

  // Collect relevant edges
  const allQns = new Set([
    ...seeds,
    ...finalImpacted.map((n) => n.qualified_name),
  ]);
  const relevantEdges = store.getEdgesAmong(allQns);

  return {
    changed_nodes: changedNodes,
    impacted_nodes: finalImpacted,
    impacted_files: impactedFiles,
    edges: relevantEdges,
    truncated,
    total_impacted: totalImpacted,
  };
}

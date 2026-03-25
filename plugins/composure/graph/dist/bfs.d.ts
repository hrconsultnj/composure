/**
 * BFS impact-radius traversal using in-memory adjacency lists.
 * Replaces Python's NetworkX DiGraph with pure Map/Set structures.
 */
import type { GraphStore } from "./store.js";
import type { GraphEdge, ImpactResult } from "./types.js";
export interface AdjacencyList {
    /** source → set of target qualified names */
    forward: Map<string, Set<string>>;
    /** target → set of source qualified names */
    reverse: Map<string, Set<string>>;
}
/**
 * Build forward and reverse adjacency lists from edge records.
 */
export declare function buildAdjacencyList(edges: GraphEdge[]): AdjacencyList;
/**
 * BFS from changed files to find all impacted nodes within N hops.
 *
 * Traverses both forward edges (things this node affects) and reverse
 * edges (things that depend on this node) at each depth level.
 */
export declare function getImpactRadius(store: GraphStore, changedFiles: string[], maxDepth?: number, maxNodes?: number): ImpactResult;

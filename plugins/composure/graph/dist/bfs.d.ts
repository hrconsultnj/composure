/**
 * BFS impact-radius traversal using in-memory adjacency lists.
 * Replaces Python's NetworkX DiGraph with pure Map/Set structures.
 */
import type { GraphStore } from "./store.js";
import type { GraphEdge, GraphNode, ImpactResult } from "./types.js";
/**
 * BFS shortest path from one node to another.
 * Traverses forward edges only (follows dependency direction).
 * Returns the path as an ordered list of qualified names, or empty if not found.
 */
export declare function getShortestPath(store: GraphStore, fromQN: string, toQN: string, maxDepth?: number): {
    path: GraphNode[];
    edges: GraphEdge[];
    depth: number;
    found: boolean;
};
/**
 * BFS from changed files to find all impacted nodes within N hops.
 *
 * Traverses both forward edges (things this node affects) and reverse
 * edges (things that depend on this node) at each depth level.
 */
export declare function getImpactRadius(store: GraphStore, changedFiles: string[], maxDepth?: number, maxNodes?: number): ImpactResult;

/**
 * get_dependency_chain — shortest path between two nodes in the graph.
 *
 * Uses BFS to find how two code entities are connected through
 * imports, calls, and other edges. Returns the path with full
 * node details and connecting edges.
 */
import type { ToolResult } from "../types.js";
export declare function getDependencyChain(params: {
    from: string;
    to: string;
    max_depth?: number;
    repo_root?: string;
}): ToolResult;

/**
 * Memory graph traversal — BFS through ai_memory_edges.
 *
 * Walks the memory graph from a starting node, collecting all
 * connected nodes within a given depth. Useful for context
 * expansion ("give me everything related to X").
 */
import type { ToolResult } from "../types.js";
import type { StorageAdapter } from "../../adapters/types.js";
export declare function traverseGraph(adapter: StorageAdapter, params: {
    start_node_id: string;
    depth?: number;
    relationship_types?: string[];
}): Promise<ToolResult>;

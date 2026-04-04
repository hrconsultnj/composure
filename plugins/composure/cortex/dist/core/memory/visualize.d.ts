/**
 * Memory graph visualization — generates self-contained HTML
 * with D3.js force-directed graph of memory nodes and edges.
 *
 * Nodes colored by content_type, sized by edge count.
 * Edges labeled by relationship_type.
 */
import type { ToolResult } from "../types.js";
import type { StorageAdapter } from "../../adapters/types.js";
export declare function generateMemoryHtml(adapter: StorageAdapter, params: {
    agent_id: string;
    output_path?: string;
}): Promise<ToolResult>;

/**
 * Memory edge CRUD — create, read, delete on ai_memory_edges.
 */
import type { ToolResult, CreateEdgeParams } from "../types.js";
import type { StorageAdapter } from "../../adapters/types.js";
export declare function createEdge(adapter: StorageAdapter, params: CreateEdgeParams): Promise<ToolResult>;
export declare function getEdgesForNode(adapter: StorageAdapter, params: {
    node_id: string;
}): Promise<ToolResult>;
export declare function deleteEdge(adapter: StorageAdapter, params: {
    edge_id: string;
}): Promise<ToolResult>;

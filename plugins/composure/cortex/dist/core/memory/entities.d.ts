/**
 * Memory node CRUD — create, read, update, delete on ai_memory_nodes.
 */
import type { ToolResult, CreateNodeParams, UpdateNodeParams } from "../types.js";
import type { StorageAdapter } from "../../adapters/types.js";
export declare function createNode(adapter: StorageAdapter, params: CreateNodeParams): Promise<ToolResult>;
export declare function getNode(adapter: StorageAdapter, params: {
    node_id: string;
}): Promise<ToolResult>;
export declare function updateNode(adapter: StorageAdapter, params: {
    node_id: string;
} & UpdateNodeParams): Promise<ToolResult>;
export declare function deleteNode(adapter: StorageAdapter, params: {
    node_id: string;
}): Promise<ToolResult>;

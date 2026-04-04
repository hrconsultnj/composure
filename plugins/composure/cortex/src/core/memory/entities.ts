/**
 * Memory node CRUD — create, read, update, delete on ai_memory_nodes.
 */

import type { ToolResult, CreateNodeParams, UpdateNodeParams } from "../types.js";
import type { StorageAdapter } from "../../adapters/types.js";

export async function createNode(
  adapter: StorageAdapter,
  params: CreateNodeParams
): Promise<ToolResult> {
  try {
    const node = await adapter.createNode(params);
    return {
      status: "ok",
      node_id: node.id,
      id_prefix: node.id_prefix,
      content_type: node.content_type,
      message: "Memory node created",
    };
  } catch (err) {
    return {
      status: "error",
      error: `Failed to create node: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

export async function getNode(
  adapter: StorageAdapter,
  params: { node_id: string }
): Promise<ToolResult> {
  try {
    const node = await adapter.getNode(params.node_id);
    if (!node) {
      return { status: "not_found", error: `Node ${params.node_id} not found` };
    }
    return { status: "ok", node };
  } catch (err) {
    return {
      status: "error",
      error: `Failed to get node: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

export async function updateNode(
  adapter: StorageAdapter,
  params: { node_id: string } & UpdateNodeParams
): Promise<ToolResult> {
  try {
    const { node_id, ...updates } = params;
    const node = await adapter.updateNode(node_id, updates);
    if (!node) {
      return { status: "not_found", error: `Node ${node_id} not found` };
    }
    return { status: "ok", node };
  } catch (err) {
    return {
      status: "error",
      error: `Failed to update node: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

export async function deleteNode(
  adapter: StorageAdapter,
  params: { node_id: string }
): Promise<ToolResult> {
  try {
    const deleted = await adapter.deleteNode(params.node_id);
    if (!deleted) {
      return { status: "not_found", error: `Node ${params.node_id} not found` };
    }
    return { status: "ok", message: "Node deleted" };
  } catch (err) {
    return {
      status: "error",
      error: `Failed to delete node: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

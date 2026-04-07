/**
 * Graph ↔ Memory links — bridge between the code graph and Cortex memory.
 *
 * Links code entities (graph qualified_names) to memory nodes and thinking
 * sessions. Enables: "What decisions were made about this function?"
 */

import type { ToolResult, CreateGraphLinkParams, SearchByGraphEntityParams } from "../types.js";
import type { StorageAdapter } from "../../adapters/types.js";

export async function createGraphLink(
  adapter: StorageAdapter,
  params: CreateGraphLinkParams
): Promise<ToolResult> {
  if (!params.memory_node_id && !params.thinking_session_id) {
    return {
      status: "error",
      error: "Either memory_node_id or thinking_session_id is required",
    };
  }

  try {
    const link = await adapter.createGraphLink(params);
    return {
      status: "ok",
      link_id: link.id,
      graph_qualified_name: link.graph_qualified_name,
      link_type: link.link_type,
      message: `Linked ${link.memory_node_id ? "memory node" : "thinking session"} to graph entity`,
    };
  } catch (err) {
    return {
      status: "error",
      error: `Failed to create graph link: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

export async function searchByGraphEntity(
  adapter: StorageAdapter,
  params: SearchByGraphEntityParams
): Promise<ToolResult> {
  if (!params.graph_qualified_name && !params.graph_file_path) {
    return {
      status: "error",
      error: "Either graph_qualified_name or graph_file_path is required",
    };
  }

  try {
    const result = await adapter.searchByGraphEntity(params);
    return {
      status: "ok",
      summary: `Found ${result.links.length} links (${result.nodes.length} memory nodes, ${result.sessions.length} thinking sessions)`,
      links: result.links,
      nodes: result.nodes,
      sessions: result.sessions,
    };
  } catch (err) {
    return {
      status: "error",
      error: `Failed to search by graph entity: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

export async function deleteGraphLinksForNode(
  adapter: StorageAdapter,
  params: { memory_node_id: string }
): Promise<ToolResult> {
  try {
    const count = await adapter.deleteGraphLinksForNode(params.memory_node_id);
    return {
      status: "ok",
      deleted: count,
      message: `Deleted ${count} graph links for memory node ${params.memory_node_id}`,
    };
  } catch (err) {
    return {
      status: "error",
      error: `Failed to delete graph links: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

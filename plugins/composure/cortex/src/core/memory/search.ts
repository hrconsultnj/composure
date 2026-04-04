/**
 * Memory search — wraps existing search_agent_memory() and
 * search_agent_memory_semantic() Supabase RPCs.
 *
 * These functions exist in the database already. The core module
 * delegates to the adapter, which calls the RPCs. We NEVER
 * reimplement the search logic here.
 */

import type { ToolResult, MemorySearchParams, SemanticSearchParams } from "../types.js";
import type { StorageAdapter } from "../../adapters/types.js";

export async function searchMemory(
  adapter: StorageAdapter,
  params: MemorySearchParams
): Promise<ToolResult> {
  try {
    const results = await adapter.searchMemory(params);
    return {
      status: "ok",
      count: results.length,
      results,
    };
  } catch (err) {
    return {
      status: "error",
      error: `Failed to search memory: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

export async function searchSemantic(
  adapter: StorageAdapter,
  params: SemanticSearchParams
): Promise<ToolResult> {
  try {
    const results = await adapter.searchSemantic(params);
    return {
      status: "ok",
      count: results.length,
      results,
    };
  } catch (err) {
    return {
      status: "error",
      error: `Failed to search memory (semantic): ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

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
export declare function searchMemory(adapter: StorageAdapter, params: MemorySearchParams): Promise<ToolResult>;
export declare function searchSemantic(adapter: StorageAdapter, params: SemanticSearchParams): Promise<ToolResult>;
/**
 * Convenience: search with plain text — auto-generates embedding,
 * then calls semantic search. Falls back to FTS if embedding
 * provider is not configured.
 *
 * Embedding generation uses OpenAI text-embedding-3-small ($0.02/1M tokens).
 * The vector is stored in Supabase pgvector (ai_memory_nodes.embedding column).
 * OpenAI generates the vector; Supabase stores and searches it.
 */
export declare function searchWithText(adapter: StorageAdapter, params: Omit<MemorySearchParams, "query"> & {
    query: string;
}): Promise<ToolResult>;

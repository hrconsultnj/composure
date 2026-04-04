/**
 * Memory search — wraps existing search_agent_memory() and
 * search_agent_memory_semantic() Supabase RPCs.
 *
 * These functions exist in the database already. The core module
 * delegates to the adapter, which calls the RPCs. We NEVER
 * reimplement the search logic here.
 */
import { generateEmbedding, getEmbeddingConfig } from "./embed.js";
export async function searchMemory(adapter, params) {
    try {
        const results = await adapter.searchMemory(params);
        return {
            status: "ok",
            count: results.length,
            results,
        };
    }
    catch (err) {
        return {
            status: "error",
            error: `Failed to search memory: ${err instanceof Error ? err.message : String(err)}`,
        };
    }
}
export async function searchSemantic(adapter, params) {
    try {
        const results = await adapter.searchSemantic(params);
        return {
            status: "ok",
            count: results.length,
            results,
        };
    }
    catch (err) {
        return {
            status: "error",
            error: `Failed to search memory (semantic): ${err instanceof Error ? err.message : String(err)}`,
        };
    }
}
/**
 * Convenience: search with plain text — auto-generates embedding,
 * then calls semantic search. Falls back to FTS if embedding
 * provider is not configured.
 *
 * Embedding generation uses OpenAI text-embedding-3-small ($0.02/1M tokens).
 * The vector is stored in Supabase pgvector (ai_memory_nodes.embedding column).
 * OpenAI generates the vector; Supabase stores and searches it.
 */
export async function searchWithText(adapter, params) {
    const embeddingConfig = getEmbeddingConfig();
    // If no embedding provider configured, fall back to full-text search
    if (!embeddingConfig) {
        return searchMemory(adapter, params);
    }
    try {
        const embedding = await generateEmbedding(params.query, embeddingConfig);
        return searchSemantic(adapter, {
            ...params,
            query_embedding: embedding,
            query_text: params.query,
        });
    }
    catch (err) {
        // If embedding fails, fall back to FTS gracefully
        return searchMemory(adapter, params);
    }
}
//# sourceMappingURL=search.js.map
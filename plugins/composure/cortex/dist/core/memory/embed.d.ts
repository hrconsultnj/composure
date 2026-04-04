/**
 * Embedding pipeline — generates vector embeddings for semantic search.
 *
 * Supports OpenAI text-embedding-3-small (1536 dimensions, matches
 * the ai_memory_nodes.embedding column).
 *
 * Provider is configurable via EMBEDDING_PROVIDER env var.
 * Currently supports: "openai" (default).
 * API key via OPENAI_API_KEY env var.
 */
export type EmbeddingProvider = "openai";
export interface EmbeddingConfig {
    provider: EmbeddingProvider;
    model: string;
    apiKey: string;
}
export declare function getEmbeddingConfig(): EmbeddingConfig | null;
/**
 * Generate an embedding vector for the given text.
 * Returns a 1536-dimensional float array.
 */
export declare function generateEmbedding(text: string, config?: EmbeddingConfig): Promise<number[]>;
/**
 * Generate embeddings for multiple texts in a single API call.
 * More efficient than calling generateEmbedding() in a loop.
 */
export declare function generateEmbeddings(texts: string[], config?: EmbeddingConfig): Promise<number[][]>;

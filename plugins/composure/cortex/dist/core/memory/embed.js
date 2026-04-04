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
export function getEmbeddingConfig() {
    const provider = (process.env.EMBEDDING_PROVIDER ?? "openai");
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey)
        return null;
    return {
        provider,
        model: "text-embedding-3-small",
        apiKey,
    };
}
/**
 * Generate an embedding vector for the given text.
 * Returns a 1536-dimensional float array.
 */
export async function generateEmbedding(text, config) {
    const cfg = config ?? getEmbeddingConfig();
    if (!cfg) {
        throw new Error("Embedding not configured. Set OPENAI_API_KEY environment variable.");
    }
    if (cfg.provider === "openai") {
        return generateOpenAIEmbedding(text, cfg);
    }
    throw new Error(`Unsupported embedding provider: ${cfg.provider}`);
}
async function generateOpenAIEmbedding(text, config) {
    const response = await fetch("https://api.openai.com/v1/embeddings", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
            input: text,
            model: config.model,
        }),
    });
    if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenAI embedding failed (${response.status}): ${error}`);
    }
    const data = await response.json();
    return data.data[0].embedding;
}
/**
 * Generate embeddings for multiple texts in a single API call.
 * More efficient than calling generateEmbedding() in a loop.
 */
export async function generateEmbeddings(texts, config) {
    const cfg = config ?? getEmbeddingConfig();
    if (!cfg) {
        throw new Error("Embedding not configured. Set OPENAI_API_KEY environment variable.");
    }
    if (cfg.provider !== "openai") {
        throw new Error(`Batch embedding not supported for: ${cfg.provider}`);
    }
    const response = await fetch("https://api.openai.com/v1/embeddings", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${cfg.apiKey}`,
        },
        body: JSON.stringify({
            input: texts,
            model: cfg.model,
        }),
    });
    if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenAI batch embedding failed (${response.status}): ${error}`);
    }
    const data = await response.json();
    return data.data
        .sort((a, b) => a.index - b.index)
        .map((item) => item.embedding);
}
//# sourceMappingURL=embed.js.map
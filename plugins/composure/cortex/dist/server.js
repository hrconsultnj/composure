#!/usr/bin/env node
/**
 * MCP STDIO server for Composure Cortex — Door 1.
 *
 * Registers thinking + memory tools over STDIO transport.
 * Uses the shared @composure/cortex package for all logic.
 * Detects adapter from environment: SUPABASE_URL → Pro, else → SQLite.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { thinking, memory } from "./index.js";
import { SupabaseAdapter } from "./adapters/supabase.js";
import { SqliteAdapter } from "./adapters/sqlite.js";
// ── Adapter Detection ────────────────────────────────────────────
function createAdapter() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY;
    if (supabaseUrl && supabaseKey) {
        return new SupabaseAdapter({ type: "supabase", url: supabaseUrl, key: supabaseKey });
    }
    // Free tier: local SQLite
    return new SqliteAdapter();
}
const adapter = createAdapter();
const server = new McpServer({
    name: "composure-cortex",
    version: "0.1.0",
});
// ── Thinking Tools ───────────────────────────────────────────────
server.tool("sequential_think", `Add a thought step to a reasoning chain. Creates a new session automatically if no session_id is provided.

Supports:
- Templates: provide template_id to follow a guided reasoning pattern (code-review, bug-investigation, architecture-decision, guardrails-config, incident-response, refactor-plan)
- Sequential thoughts (default): builds a chain of analysis
- Revisions: mark is_revision=true to reconsider a previous thought
- Branching: provide branch_id + branch_from_thought to explore alternatives
- Auto-completion: set total_thoughts to signal when the chain should end`, {
    thought: z.string().describe("The current thinking step content."),
    session_id: z.string().optional().describe("Existing session to continue. If omitted, creates a new session."),
    agent_id: z.string().optional().describe("Agent ID. Required when creating a new session."),
    title: z.string().optional().describe("Session title. Used when creating a new session."),
    template_id: z.string().optional().describe("Template for guided reasoning: code-review, bug-investigation, architecture-decision, guardrails-config, incident-response, refactor-plan."),
    thought_type: z.enum(["analysis", "revision", "hypothesis", "verification", "conclusion", "branch"]).optional().describe("Type of thought. Auto-detected for revisions and branches."),
    is_revision: z.boolean().optional().describe("Whether this thought revises a previous one."),
    revises_thought: z.number().optional().describe("Which thought number is being revised."),
    branch_id: z.string().optional().describe("Branch identifier for alternative reasoning paths."),
    branch_from_thought: z.number().optional().describe("Which thought number this branch diverges from."),
    total_thoughts: z.number().optional().describe("Estimated total thoughts needed. Signals completion."),
}, async (params) => {
    const result = await thinking.addThought(adapter, params);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
});
server.tool("get_thinking_session", "Retrieve a thinking session with all its steps, ordered by branch and thought number.", {
    session_id: z.string().describe("The session ID to retrieve."),
}, async (params) => {
    const result = await thinking.resumeSession(adapter, params);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
});
server.tool("list_thinking_sessions", "List thinking sessions for an agent, optionally filtered by status.", {
    agent_id: z.string().describe("Agent ID to list sessions for."),
    status: z.enum(["active", "completed", "archived", "suspended"]).optional().describe("Filter by session status."),
}, async (params) => {
    const result = await thinking.listSessions(adapter, params);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
});
server.tool("complete_thinking_session", "Mark a thinking session as completed with an optional conclusion.", {
    session_id: z.string().describe("The session ID to complete."),
    conclusion: z.string().optional().describe("Final conclusion for the session."),
}, async (params) => {
    const result = await thinking.completeSession(adapter, params);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
});
server.tool("summarize_thinking_session", "Get a structured summary of a thinking session — thought chains, branches, revisions, and conclusion.", {
    session_id: z.string().describe("The session ID to summarize."),
}, async (params) => {
    const result = await thinking.summarizeSession(adapter, params);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
});
server.tool("list_thinking_templates", "List available thinking templates — pre-built reasoning patterns for common workflows.", {}, async () => {
    const templates = thinking.listTemplates();
    return { content: [{ type: "text", text: JSON.stringify({ status: "ok", templates }, null, 2) }] };
});
// ── Memory Tools ─────────────────────────────────────────────────
server.tool("create_memory_node", "Create a new memory node in the knowledge graph.", {
    agent_id: z.string().describe("Agent ID that owns this memory."),
    content: z.string().describe("The memory content."),
    content_type: z.enum(["text", "markdown", "document", "conversation", "fact"]).optional().describe("Content type. Default: text."),
    metadata: z.record(z.unknown()).optional().describe("Searchable metadata (tags, category, keywords)."),
    time_range_start: z.string().optional().describe("When this memory became relevant (ISO 8601)."),
    time_range_end: z.string().optional().describe("When this memory stopped being relevant (ISO 8601)."),
    parent_node_id: z.string().optional().describe("Parent node for document chunks."),
}, async (params) => {
    const result = await memory.createNode(adapter, params);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
});
server.tool("create_memory_edge", "Create a relationship between two memory nodes.", {
    agent_id: z.string().describe("Agent ID."),
    from_node_id: z.string().describe("Source node ID."),
    to_node_id: z.string().describe("Target node ID."),
    relationship_type: z.enum(["related_to", "follows", "contradicts", "supports", "contains", "derived_from"]).describe("Relationship type."),
    weight: z.number().min(0).max(1).optional().describe("Relationship strength (0-1). Default: 1.0."),
    metadata: z.record(z.unknown()).optional().describe("Additional relationship context."),
}, async (params) => {
    const result = await memory.createEdge(adapter, params);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
});
server.tool("search_memory", "Search the memory knowledge graph using full-text search with optional filtering by tags, category, and time range.", {
    agent_id: z.string().describe("Agent ID to search within."),
    query: z.string().optional().describe("Full-text search query."),
    tags: z.array(z.string()).optional().describe("Filter by metadata tags."),
    category: z.string().optional().describe("Filter by metadata category."),
    time_start: z.string().optional().describe("Filter: memory relevant after this time (ISO 8601)."),
    time_end: z.string().optional().describe("Filter: memory relevant before this time (ISO 8601)."),
    include_related: z.boolean().optional().describe("Include 1-hop related nodes in results. Default: false."),
    limit: z.number().optional().describe("Max results. Default: 10."),
}, async (params) => {
    const result = await memory.searchMemory(adapter, params);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
});
server.tool("search_memory_semantic", "Semantic search using vector embeddings with optional keyword boost (70% semantic + 30% keyword). Requires a pre-computed embedding vector.", {
    agent_id: z.string().describe("Agent ID to search within."),
    query_embedding: z.array(z.number()).describe("Query embedding vector (1536 dimensions for text-embedding-3-small)."),
    query_text: z.string().optional().describe("Optional keyword query for hybrid scoring."),
    tags: z.array(z.string()).optional().describe("Filter by metadata tags."),
    category: z.string().optional().describe("Filter by metadata category."),
    include_related: z.boolean().optional().describe("Include 1-hop related nodes. Default: false."),
    limit: z.number().optional().describe("Max results. Default: 10."),
}, async (params) => {
    const result = await memory.searchSemantic(adapter, params);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
});
server.tool("traverse_memory_graph", "Walk the memory graph from a starting node, collecting connected nodes within a given depth via BFS.", {
    start_node_id: z.string().describe("Node ID to start traversal from."),
    depth: z.number().optional().describe("How many hops to traverse. Default: 2."),
    relationship_types: z.array(z.string()).optional().describe("Only follow these relationship types. Default: all."),
}, async (params) => {
    const result = await memory.traverseGraph(adapter, params);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
});
server.tool("search_memory_text", "Smart search: takes plain text, auto-generates embedding vector, then runs hybrid semantic+keyword search (70/30 scoring). Falls back to full-text search if embedding provider is not configured. Set OPENAI_API_KEY for semantic search.", {
    agent_id: z.string().describe("Agent ID to search within."),
    query: z.string().describe("Plain text query — embedding is generated automatically."),
    tags: z.array(z.string()).optional().describe("Filter by metadata tags."),
    category: z.string().optional().describe("Filter by metadata category."),
    include_related: z.boolean().optional().describe("Include 1-hop related nodes. Default: false."),
    limit: z.number().optional().describe("Max results. Default: 10."),
}, async (params) => {
    const result = await memory.searchWithText(adapter, params);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
});
server.tool("generate_memory_html", "Generate an interactive HTML visualization of the memory knowledge graph. D3.js force-directed graph with nodes colored by type, edges by relationship.", {
    agent_id: z.string().describe("Agent ID to visualize."),
    output_path: z.string().optional().describe("File path to write HTML. If omitted, returns HTML in response."),
}, async (params) => {
    const result = await memory.generateMemoryHtml(adapter, params);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
});
server.tool("delete_memory_node", "Delete a memory node and all its edges (CASCADE).", {
    node_id: z.string().describe("The node ID to delete."),
}, async (params) => {
    const result = await memory.deleteNode(adapter, params);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
});
// ── Start Server ─────────────────────────────────────────────────
const transport = new StdioServerTransport();
await server.connect(transport);
//# sourceMappingURL=server.js.map
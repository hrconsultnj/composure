/**
 * Supabase storage adapter — Pro tier persistence.
 *
 * Uses @supabase/supabase-js to interact with the existing
 * ai_memory_nodes, ai_memory_edges tables and the new
 * ai_thinking_sessions, ai_thinking_steps tables.
 *
 * Search methods call the existing search_agent_memory() and
 * search_agent_memory_semantic() RPCs — we NEVER reimplement
 * the search logic.
 */
import { createClient } from "@supabase/supabase-js";
export class SupabaseAdapter {
    type = "supabase";
    client;
    constructor(config) {
        this.client = createClient(config.url, config.key);
    }
    // ── Thinking — Sessions ──────────────────────────────────────
    async createSession(agent_id, title, options) {
        const insertData = { agent_id, title: title ?? null };
        // When feed_context is provided, populate metadata with project + task linkage.
        // The existing create_entity_feed() trigger auto-populates entity_registry.
        if (options?.metadata || options?.feed_context) {
            const meta = { ...(options.metadata ?? {}) };
            if (options.feed_context) {
                meta.feed_entity_type = options.feed_context.entity_type;
                meta.feed_project = options.feed_context.project;
                meta.feed_project_root = options.feed_context.project_root;
                if (options.feed_context.task_id)
                    meta.feed_task_id = options.feed_context.task_id;
                if (options.feed_context.task_subject)
                    meta.feed_task_subject = options.feed_context.task_subject;
            }
            insertData.metadata = meta;
        }
        const { data, error } = await this.client
            .from("ai_thinking_sessions")
            .insert(insertData)
            .select()
            .single();
        if (error)
            throw new Error(`createSession: ${error.message}`);
        return data;
    }
    async getSession(session_id) {
        const { data: session, error: sErr } = await this.client
            .from("ai_thinking_sessions")
            .select()
            .eq("id", session_id)
            .single();
        if (sErr || !session)
            return null;
        const { data: steps, error: stErr } = await this.client
            .from("ai_thinking_steps")
            .select()
            .eq("session_id", session_id)
            .order("thought_number", { ascending: true });
        if (stErr)
            throw new Error(`getSession steps: ${stErr.message}`);
        return {
            session: session,
            steps: (steps ?? []),
        };
    }
    async listSessions(agent_id, status) {
        let query = this.client
            .from("ai_thinking_sessions")
            .select()
            .eq("agent_id", agent_id)
            .order("created_at", { ascending: false });
        if (status) {
            query = query.eq("status", status);
        }
        const { data, error } = await query;
        if (error)
            throw new Error(`listSessions: ${error.message}`);
        return (data ?? []);
    }
    async updateSession(session_id, updates) {
        const { data, error } = await this.client
            .from("ai_thinking_sessions")
            .update(updates)
            .eq("id", session_id)
            .select()
            .single();
        if (error)
            throw new Error(`updateSession: ${error.message}`);
        return data;
    }
    // ── Thinking — Steps ─────────────────────────────────────────
    async addStep(session_id, step) {
        const { data, error } = await this.client
            .from("ai_thinking_steps")
            .insert({ session_id, ...step })
            .select()
            .single();
        if (error)
            throw new Error(`addStep: ${error.message}`);
        return data;
    }
    async getSteps(session_id, branch_id) {
        let query = this.client
            .from("ai_thinking_steps")
            .select()
            .eq("session_id", session_id)
            .order("thought_number", { ascending: true });
        if (branch_id) {
            query = query.eq("branch_id", branch_id);
        }
        const { data, error } = await query;
        if (error)
            throw new Error(`getSteps: ${error.message}`);
        return (data ?? []);
    }
    // ── Memory — Nodes ───────────────────────────────────────────
    async createNode(params) {
        const { data, error } = await this.client
            .from("ai_memory_nodes")
            .insert({
            agent_id: params.agent_id,
            content: params.content,
            content_type: params.content_type ?? "text",
            metadata: params.metadata ?? {},
            time_range_start: params.time_range_start ?? null,
            time_range_end: params.time_range_end ?? null,
            parent_node_id: params.parent_node_id ?? null,
        })
            .select()
            .single();
        if (error)
            throw new Error(`createNode: ${error.message}`);
        return data;
    }
    async getNode(node_id) {
        const { data, error } = await this.client
            .from("ai_memory_nodes")
            .select()
            .eq("id", node_id)
            .single();
        if (error)
            return null;
        return data;
    }
    async updateNode(node_id, params) {
        const { data, error } = await this.client
            .from("ai_memory_nodes")
            .update(params)
            .eq("id", node_id)
            .select()
            .single();
        if (error)
            throw new Error(`updateNode: ${error.message}`);
        return data;
    }
    async deleteNode(node_id) {
        const { error, count } = await this.client
            .from("ai_memory_nodes")
            .delete()
            .eq("id", node_id);
        if (error)
            throw new Error(`deleteNode: ${error.message}`);
        return (count ?? 0) > 0;
    }
    // ── Memory — Edges ───────────────────────────────────────────
    async createEdge(params) {
        const { data, error } = await this.client
            .from("ai_memory_edges")
            .insert({
            agent_id: params.agent_id,
            from_node_id: params.from_node_id,
            to_node_id: params.to_node_id,
            relationship_type: params.relationship_type,
            weight: params.weight ?? 1.0,
            metadata: params.metadata ?? {},
        })
            .select()
            .single();
        if (error)
            throw new Error(`createEdge: ${error.message}`);
        return data;
    }
    async getEdgesForNode(node_id) {
        const { data, error } = await this.client
            .from("ai_memory_edges")
            .select()
            .or(`from_node_id.eq.${node_id},to_node_id.eq.${node_id}`);
        if (error)
            throw new Error(`getEdgesForNode: ${error.message}`);
        return (data ?? []);
    }
    async deleteEdge(edge_id) {
        const { error, count } = await this.client
            .from("ai_memory_edges")
            .delete()
            .eq("id", edge_id);
        if (error)
            throw new Error(`deleteEdge: ${error.message}`);
        return (count ?? 0) > 0;
    }
    // ── Memory — Search ──────────────────────────────────────────
    async searchMemory(params) {
        const { data, error } = await this.client.rpc("search_agent_memory", {
            p_agent_id: params.agent_id,
            p_query: params.query ?? null,
            p_tags: params.tags ?? null,
            p_category: params.category ?? null,
            p_time_start: params.time_start ?? null,
            p_time_end: params.time_end ?? null,
            p_include_related: params.include_related ?? false,
            p_limit: params.limit ?? 10,
        });
        if (error)
            throw new Error(`searchMemory: ${error.message}`);
        return (data ?? []);
    }
    async searchSemantic(params) {
        const { data, error } = await this.client.rpc("search_agent_memory_semantic", {
            p_agent_id: params.agent_id,
            p_query_embedding: params.query_embedding,
            p_query_text: params.query_text ?? null,
            p_tags: params.tags ?? null,
            p_category: params.category ?? null,
            p_time_start: params.time_start ?? null,
            p_time_end: params.time_end ?? null,
            p_include_related: params.include_related ?? false,
            p_limit: params.limit ?? 10,
        });
        if (error)
            throw new Error(`searchSemantic: ${error.message}`);
        return (data ?? []);
    }
    // ── Memory — Traversal ───────────────────────────────────────
    async traverseGraph(start_node_id, depth, relationship_types) {
        // BFS traversal via multiple queries
        const visitedNodeIds = new Set();
        const allEdges = [];
        let frontier = [start_node_id];
        for (let d = 0; d < depth && frontier.length > 0; d++) {
            const nextFrontier = [];
            for (const nodeId of frontier) {
                if (visitedNodeIds.has(nodeId))
                    continue;
                visitedNodeIds.add(nodeId);
                const edges = await this.getEdgesForNode(nodeId);
                for (const edge of edges) {
                    if (relationship_types && !relationship_types.includes(edge.relationship_type))
                        continue;
                    allEdges.push(edge);
                    const neighborId = edge.from_node_id === nodeId ? edge.to_node_id : edge.from_node_id;
                    if (!visitedNodeIds.has(neighborId)) {
                        nextFrontier.push(neighborId);
                    }
                }
            }
            frontier = nextFrontier;
        }
        // Collect remaining frontier nodes
        for (const nodeId of frontier) {
            visitedNodeIds.add(nodeId);
        }
        // Fetch all visited nodes
        const nodeIds = [...visitedNodeIds];
        const { data: nodes, error } = await this.client
            .from("ai_memory_nodes")
            .select()
            .in("id", nodeIds);
        if (error)
            throw new Error(`traverseGraph: ${error.message}`);
        return {
            nodes: (nodes ?? []),
            edges: allEdges,
        };
    }
    // ── Lifecycle ────────────────────────────────────────────────
    close() {
        // Supabase client doesn't need explicit cleanup
    }
}
//# sourceMappingURL=supabase.js.map
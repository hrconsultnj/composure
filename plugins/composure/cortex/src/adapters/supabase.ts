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

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { StorageAdapter, SupabaseAdapterConfig, CreateSessionOptions } from "./types.js";
import type {
  ThinkingSession,
  ThinkingStep,
  ThinkingSessionStatus,
  MemoryNode,
  MemoryEdge,
  MemorySearchParams,
  SemanticSearchParams,
  MemorySearchResult,
  SemanticSearchResult,
  CreateNodeParams,
  UpdateNodeParams,
  CreateEdgeParams,
} from "../core/types.js";

export class SupabaseAdapter implements StorageAdapter {
  readonly type = "supabase" as const;
  private client: SupabaseClient;

  constructor(config: SupabaseAdapterConfig) {
    // Suppress Supabase's noisy auth/realtime debug output. The bundled
    // @supabase/supabase-js + gotrue-js + realtime-js ship with console.log
    // calls for lock acquisition, auth state changes, navigatorLock, etc.
    // In a Cortex CLI context (spawned from hooks), those writes would leak
    // into Claude Code's hook output. Disabling debug + providing a no-op
    // logger keeps the CLI silent unless the caller explicitly wants logs.
    this.client = createClient(config.url, config.key, {
      auth: {
        debug: false,
      },
      global: {
        headers: {},
      },
      realtime: {
        logger: () => {
          /* no-op */
        },
        params: {
          log_level: "error",
        },
      },
    });
  }

  // ── Thinking — Sessions ──────────────────────────────────────

  async createSession(agent_id: string, title?: string, options?: CreateSessionOptions): Promise<ThinkingSession> {
    const insertData: Record<string, unknown> = { agent_id, title: title ?? null };

    // When feed_context is provided, populate metadata with project + task linkage.
    // The existing create_entity_feed() trigger auto-populates entity_registry.
    if (options?.metadata || options?.feed_context) {
      const meta: Record<string, unknown> = { ...(options.metadata ?? {}) };
      if (options.feed_context) {
        meta.feed_entity_type = options.feed_context.entity_type;
        meta.feed_project = options.feed_context.project;
        meta.feed_project_root = options.feed_context.project_root;
        if (options.feed_context.task_id) meta.feed_task_id = options.feed_context.task_id;
        if (options.feed_context.task_subject) meta.feed_task_subject = options.feed_context.task_subject;
      }
      insertData.metadata = meta;
    }

    const { data, error } = await this.client
      .from("ai_thinking_sessions")
      .insert(insertData)
      .select()
      .single();

    if (error) throw new Error(`createSession: ${error.message}`);
    return data as ThinkingSession;
  }

  async getSession(session_id: string): Promise<{ session: ThinkingSession; steps: ThinkingStep[] } | null> {
    const { data: session, error: sErr } = await this.client
      .from("ai_thinking_sessions")
      .select()
      .eq("id", session_id)
      .single();

    if (sErr || !session) return null;

    const { data: steps, error: stErr } = await this.client
      .from("ai_thinking_steps")
      .select()
      .eq("session_id", session_id)
      .order("thought_number", { ascending: true });

    if (stErr) throw new Error(`getSession steps: ${stErr.message}`);

    return {
      session: session as ThinkingSession,
      steps: (steps ?? []) as ThinkingStep[],
    };
  }

  async listSessions(agent_id: string, status?: ThinkingSessionStatus): Promise<ThinkingSession[]> {
    let query = this.client
      .from("ai_thinking_sessions")
      .select()
      .eq("agent_id", agent_id)
      .order("created_at", { ascending: false });

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;
    if (error) throw new Error(`listSessions: ${error.message}`);
    return (data ?? []) as ThinkingSession[];
  }

  async updateSession(
    session_id: string,
    updates: Partial<Pick<ThinkingSession, "title" | "status" | "total_thoughts" | "conclusion">>
  ): Promise<ThinkingSession | null> {
    const { data, error } = await this.client
      .from("ai_thinking_sessions")
      .update(updates)
      .eq("id", session_id)
      .select()
      .single();

    if (error) throw new Error(`updateSession: ${error.message}`);
    return data as ThinkingSession | null;
  }

  // ── Thinking — Steps ─────────────────────────────────────────

  async addStep(
    session_id: string,
    step: Omit<ThinkingStep, "id" | "session_id" | "created_at">
  ): Promise<ThinkingStep> {
    const { data, error } = await this.client
      .from("ai_thinking_steps")
      .insert({ session_id, ...step })
      .select()
      .single();

    if (error) throw new Error(`addStep: ${error.message}`);
    return data as ThinkingStep;
  }

  async getSteps(session_id: string, branch_id?: string): Promise<ThinkingStep[]> {
    let query = this.client
      .from("ai_thinking_steps")
      .select()
      .eq("session_id", session_id)
      .order("thought_number", { ascending: true });

    if (branch_id) {
      query = query.eq("branch_id", branch_id);
    }

    const { data, error } = await query;
    if (error) throw new Error(`getSteps: ${error.message}`);
    return (data ?? []) as ThinkingStep[];
  }

  // ── Memory — Nodes ───────────────────────────────────────────

  async createNode(params: CreateNodeParams): Promise<MemoryNode> {
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

    if (error) throw new Error(`createNode: ${error.message}`);
    return data as MemoryNode;
  }

  async getNode(node_id: string): Promise<MemoryNode | null> {
    const { data, error } = await this.client
      .from("ai_memory_nodes")
      .select()
      .eq("id", node_id)
      .single();

    if (error) return null;
    return data as MemoryNode;
  }

  async updateNode(node_id: string, params: UpdateNodeParams): Promise<MemoryNode | null> {
    const { data, error } = await this.client
      .from("ai_memory_nodes")
      .update(params)
      .eq("id", node_id)
      .select()
      .single();

    if (error) throw new Error(`updateNode: ${error.message}`);
    return data as MemoryNode | null;
  }

  async deleteNode(node_id: string): Promise<boolean> {
    const { error, count } = await this.client
      .from("ai_memory_nodes")
      .delete()
      .eq("id", node_id);

    if (error) throw new Error(`deleteNode: ${error.message}`);
    return (count ?? 0) > 0;
  }

  // ── Memory — Edges ───────────────────────────────────────────

  async createEdge(params: CreateEdgeParams): Promise<MemoryEdge> {
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

    if (error) throw new Error(`createEdge: ${error.message}`);
    return data as MemoryEdge;
  }

  async getEdgesForNode(node_id: string): Promise<MemoryEdge[]> {
    const { data, error } = await this.client
      .from("ai_memory_edges")
      .select()
      .or(`from_node_id.eq.${node_id},to_node_id.eq.${node_id}`);

    if (error) throw new Error(`getEdgesForNode: ${error.message}`);
    return (data ?? []) as MemoryEdge[];
  }

  async deleteEdge(edge_id: string): Promise<boolean> {
    const { error, count } = await this.client
      .from("ai_memory_edges")
      .delete()
      .eq("id", edge_id);

    if (error) throw new Error(`deleteEdge: ${error.message}`);
    return (count ?? 0) > 0;
  }

  // ── Memory — Search ──────────────────────────────────────────

  async searchMemory(params: MemorySearchParams): Promise<MemorySearchResult[]> {
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

    if (error) throw new Error(`searchMemory: ${error.message}`);
    return (data ?? []) as MemorySearchResult[];
  }

  async searchSemantic(params: SemanticSearchParams): Promise<SemanticSearchResult[]> {
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

    if (error) throw new Error(`searchSemantic: ${error.message}`);
    return (data ?? []) as SemanticSearchResult[];
  }

  // ── Memory — Traversal ───────────────────────────────────────

  async traverseGraph(
    start_node_id: string,
    depth: number,
    relationship_types?: string[]
  ): Promise<{ nodes: MemoryNode[]; edges: MemoryEdge[] }> {
    // BFS traversal via multiple queries
    const visitedNodeIds = new Set<string>();
    const allEdges: MemoryEdge[] = [];
    let frontier = [start_node_id];

    for (let d = 0; d < depth && frontier.length > 0; d++) {
      const nextFrontier: string[] = [];

      for (const nodeId of frontier) {
        if (visitedNodeIds.has(nodeId)) continue;
        visitedNodeIds.add(nodeId);

        const edges = await this.getEdgesForNode(nodeId);
        for (const edge of edges) {
          if (relationship_types && !relationship_types.includes(edge.relationship_type)) continue;

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

    if (error) throw new Error(`traverseGraph: ${error.message}`);

    return {
      nodes: (nodes ?? []) as MemoryNode[],
      edges: allEdges,
    };
  }

  // ── Graph ↔ Memory Links ─────────────────────────────────────
  // Supabase implementation: requires ai_graph_links table in the remote DB.
  // For now, these are stubs that return errors until the migration is applied.

  async createGraphLink(params: import("../core/types.js").CreateGraphLinkParams): Promise<import("../core/types.js").GraphLink> {
    const id = crypto.randomUUID();
    const { data, error } = await this.client
      .from("ai_graph_links")
      .insert({
        id,
        memory_node_id: params.memory_node_id ?? null,
        thinking_session_id: params.thinking_session_id ?? null,
        graph_qualified_name: params.graph_qualified_name,
        graph_file_path: params.graph_file_path ?? null,
        link_type: params.link_type ?? "about",
        agent_id: params.agent_id,
      })
      .select()
      .single();
    if (error) throw new Error(`createGraphLink: ${error.message}`);
    return data as import("../core/types.js").GraphLink;
  }

  async searchByGraphEntity(params: import("../core/types.js").SearchByGraphEntityParams): Promise<{
    links: import("../core/types.js").GraphLink[];
    nodes: import("../core/types.js").MemoryNode[];
    sessions: import("../core/types.js").ThinkingSession[];
  }> {
    let query = this.client.from("ai_graph_links").select().eq("agent_id", params.agent_id);
    if (params.graph_qualified_name) query = query.eq("graph_qualified_name", params.graph_qualified_name);
    if (params.graph_file_path) query = query.eq("graph_file_path", params.graph_file_path);
    if (params.link_type) query = query.eq("link_type", params.link_type);
    const { data: links, error } = await query.order("created_at", { ascending: false }).limit(params.limit ?? 20);
    if (error) throw new Error(`searchByGraphEntity: ${error.message}`);

    const typedLinks = (links ?? []) as import("../core/types.js").GraphLink[];
    const nodeIds = [...new Set(typedLinks.filter((l) => l.memory_node_id).map((l) => l.memory_node_id!))];
    const sessionIds = [...new Set(typedLinks.filter((l) => l.thinking_session_id).map((l) => l.thinking_session_id!))];

    const nodes: import("../core/types.js").MemoryNode[] = [];
    if (nodeIds.length > 0) {
      const { data } = await this.client.from("ai_memory_nodes").select().in("id", nodeIds);
      if (data) nodes.push(...(data as import("../core/types.js").MemoryNode[]));
    }

    const sessions: import("../core/types.js").ThinkingSession[] = [];
    if (sessionIds.length > 0) {
      const { data } = await this.client.from("ai_thinking_sessions").select().in("id", sessionIds);
      if (data) sessions.push(...(data as import("../core/types.js").ThinkingSession[]));
    }

    return { links: typedLinks, nodes, sessions };
  }

  async deleteGraphLinksForNode(memory_node_id: string): Promise<number> {
    const { data, error } = await this.client
      .from("ai_graph_links")
      .delete()
      .eq("memory_node_id", memory_node_id)
      .select();
    if (error) throw new Error(`deleteGraphLinksForNode: ${error.message}`);
    return data?.length ?? 0;
  }

  // ── Lifecycle ────────────────────────────────────────────────

  close(): void {
    // Supabase client doesn't need explicit cleanup
  }
}

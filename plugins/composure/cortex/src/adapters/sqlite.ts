/**
 * SQLite storage adapter — Free tier local persistence.
 *
 * Uses Node.js built-in SQLite (>= 22.5) for local storage.
 * Mirrors the Supabase schema structure but without vector search
 * or tsvector — uses simple LIKE matching instead.
 *
 * Stores at .composure/cortex.db in the project root.
 */

import type { StorageAdapter, CreateSessionOptions } from "./types.js";
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

// Node.js built-in SQLite (>= 22.5)
let DatabaseConstructor: any;
try {
  const sqliteModule = await import("node:sqlite");
  DatabaseConstructor = sqliteModule.DatabaseSync;
} catch {
  // Will throw at construction time if unavailable
}

function generateId(): string {
  return crypto.randomUUID();
}

function generatePrefix(prefix: string): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 12; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return prefix.toUpperCase() + result;
}

function now(): string {
  return new Date().toISOString();
}

export class SqliteAdapter implements StorageAdapter {
  readonly type = "sqlite" as const;
  private db: any;

  constructor(dbPath?: string) {
    if (!DatabaseConstructor) {
      throw new Error("Node.js built-in SQLite requires Node >= 22.5");
    }
    // Decision 19: prefer .composure/cortex/cortex.db, fall back to .composure/cortex.db
    const path = dbPath ?? SqliteAdapter.resolveDbPath();
    this.db = new DatabaseConstructor(path);
    this.db.exec("PRAGMA journal_mode = WAL");
    this.initSchema();
  }

  private static resolveDbPath(): string {
    const { existsSync, mkdirSync } = require("node:fs");
    const { join } = require("node:path");
    const home = process.env.HOME || process.env.USERPROFILE || "";

    // Resolution order:
    // 1. Project-level .composure/cortex/cortex.db (Decision 19, per-project override)
    // 2. Project-level .composure/cortex.db (old path, backwards compat)
    // 3. Global ~/.composure/cortex/cortex.db (shared across all projects — default)
    const projectNew = ".composure/cortex/cortex.db";
    const projectOld = ".composure/cortex.db";
    const globalPath = join(home, ".composure", "cortex", "cortex.db");

    if (existsSync(projectNew)) return projectNew;
    if (existsSync(projectOld)) return projectOld;
    if (existsSync(globalPath)) return globalPath;

    // Nothing exists — create at global path
    mkdirSync(join(home, ".composure", "cortex"), { recursive: true });
    return globalPath;
  }

  private initSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS ai_thinking_sessions (
        id TEXT PRIMARY KEY,
        id_prefix TEXT UNIQUE,
        agent_id TEXT NOT NULL,
        title TEXT,
        status TEXT DEFAULT 'active',
        total_thoughts INTEGER DEFAULT 0,
        conclusion TEXT,
        metadata TEXT DEFAULT '{}',
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS ai_thinking_steps (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL REFERENCES ai_thinking_sessions(id) ON DELETE CASCADE,
        thought_number INTEGER NOT NULL,
        thought TEXT NOT NULL,
        thought_type TEXT DEFAULT 'analysis',
        is_revision INTEGER DEFAULT 0,
        revises_thought INTEGER,
        branch_id TEXT,
        branch_from_thought INTEGER,
        needs_more_thoughts INTEGER DEFAULT 0,
        metadata TEXT DEFAULT '{}',
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS ai_memory_nodes (
        id TEXT PRIMARY KEY,
        id_prefix TEXT UNIQUE,
        agent_id TEXT NOT NULL,
        content TEXT NOT NULL,
        content_type TEXT DEFAULT 'text',
        metadata TEXT DEFAULT '{}',
        time_range_start TEXT,
        time_range_end TEXT,
        chunk_index INTEGER DEFAULT 0,
        parent_node_id TEXT,
        status TEXT DEFAULT 'active',
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS ai_memory_edges (
        id TEXT PRIMARY KEY,
        agent_id TEXT NOT NULL,
        from_node_id TEXT NOT NULL REFERENCES ai_memory_nodes(id) ON DELETE CASCADE,
        to_node_id TEXT NOT NULL REFERENCES ai_memory_nodes(id) ON DELETE CASCADE,
        relationship_type TEXT NOT NULL,
        weight REAL DEFAULT 1.0,
        metadata TEXT DEFAULT '{}',
        created_at TEXT DEFAULT (datetime('now')),
        UNIQUE(from_node_id, to_node_id, relationship_type)
      );

      -- Local mirror of entity_registry for free-tier feed linkage
      CREATE TABLE IF NOT EXISTS local_entity_feed (
        id TEXT PRIMARY KEY,
        entity_type TEXT NOT NULL,
        project TEXT NOT NULL,
        project_root TEXT NOT NULL,
        task_id TEXT,
        task_subject TEXT,
        created_at INTEGER DEFAULT (unixepoch())
      );

      CREATE INDEX IF NOT EXISTS idx_thinking_sessions_agent ON ai_thinking_sessions(agent_id, status);
      CREATE INDEX IF NOT EXISTS idx_thinking_steps_session ON ai_thinking_steps(session_id, thought_number);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_thinking_steps_unique_main ON ai_thinking_steps(session_id, thought_number) WHERE branch_id IS NULL;
      CREATE UNIQUE INDEX IF NOT EXISTS idx_thinking_steps_unique_branch ON ai_thinking_steps(session_id, thought_number, branch_id) WHERE branch_id IS NOT NULL;
      CREATE INDEX IF NOT EXISTS idx_memory_nodes_agent ON ai_memory_nodes(agent_id, status);
      CREATE INDEX IF NOT EXISTS idx_memory_edges_from ON ai_memory_edges(from_node_id);
      CREATE INDEX IF NOT EXISTS idx_memory_edges_to ON ai_memory_edges(to_node_id);
      CREATE INDEX IF NOT EXISTS idx_local_entity_feed_project ON local_entity_feed(project);
      CREATE INDEX IF NOT EXISTS idx_local_entity_feed_task ON local_entity_feed(task_id) WHERE task_id IS NOT NULL;

      -- Graph ↔ Memory linking table
      CREATE TABLE IF NOT EXISTS ai_graph_links (
        id TEXT PRIMARY KEY,
        memory_node_id TEXT REFERENCES ai_memory_nodes(id) ON DELETE CASCADE,
        thinking_session_id TEXT REFERENCES ai_thinking_sessions(id) ON DELETE CASCADE,
        graph_qualified_name TEXT NOT NULL,
        graph_file_path TEXT,
        link_type TEXT DEFAULT 'about',
        agent_id TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        CHECK (memory_node_id IS NOT NULL OR thinking_session_id IS NOT NULL)
      );
      CREATE INDEX IF NOT EXISTS idx_graph_links_qualified ON ai_graph_links(graph_qualified_name);
      CREATE INDEX IF NOT EXISTS idx_graph_links_memory ON ai_graph_links(memory_node_id);
      CREATE INDEX IF NOT EXISTS idx_graph_links_session ON ai_graph_links(thinking_session_id);
      CREATE INDEX IF NOT EXISTS idx_graph_links_agent ON ai_graph_links(agent_id);
    `);

    // Schema migration: add feed_id column to ai_thinking_sessions if missing
    try {
      this.db.exec("ALTER TABLE ai_thinking_sessions ADD COLUMN feed_id TEXT REFERENCES local_entity_feed(id)");
    } catch {
      // Column already exists — fine
    }
  }

  private parseJson(val: string | null): Record<string, unknown> {
    if (!val) return {};
    try { return JSON.parse(val); } catch { return {}; }
  }

  // ── Thinking — Sessions ──────────────────────────────────────

  async createSession(agent_id: string, title?: string, options?: CreateSessionOptions): Promise<ThinkingSession> {
    const id = generateId();
    const id_prefix = generatePrefix("ATS");
    const ts = now();

    let feedId: string | null = null;
    const meta: Record<string, unknown> = { ...(options?.metadata ?? {}) };

    // Insert local_entity_feed row when feed_context is provided
    if (options?.feed_context) {
      feedId = generateId();
      const fc = options.feed_context;
      this.db.prepare(
        `INSERT INTO local_entity_feed (id, entity_type, project, project_root, task_id, task_subject)
         VALUES (?, ?, ?, ?, ?, ?)`
      ).run(feedId, fc.entity_type, fc.project, fc.project_root, fc.task_id ?? null, fc.task_subject ?? null);

      meta.feed_entity_type = fc.entity_type;
      meta.feed_project = fc.project;
      if (fc.task_id) meta.feed_task_id = fc.task_id;
      if (fc.task_subject) meta.feed_task_subject = fc.task_subject;
    }

    this.db.prepare(
      `INSERT INTO ai_thinking_sessions (id, id_prefix, agent_id, title, metadata, feed_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(id, id_prefix, agent_id, title ?? null, JSON.stringify(meta), feedId, ts, ts);

    return { id, id_prefix, agent_id, title: title ?? null, status: "active", total_thoughts: 0, conclusion: null, metadata: meta, created_at: ts, updated_at: ts };
  }

  async getSession(session_id: string): Promise<{ session: ThinkingSession; steps: ThinkingStep[] } | null> {
    const row = this.db.prepare("SELECT * FROM ai_thinking_sessions WHERE id = ?").get(session_id);
    if (!row) return null;

    const steps = this.db.prepare(
      "SELECT * FROM ai_thinking_steps WHERE session_id = ? ORDER BY thought_number"
    ).all(session_id);

    return {
      session: { ...row, metadata: this.parseJson(row.metadata) } as ThinkingSession,
      steps: steps.map((s: any) => ({ ...s, metadata: this.parseJson(s.metadata), is_revision: !!s.is_revision, needs_more_thoughts: !!s.needs_more_thoughts })) as ThinkingStep[],
    };
  }

  async listSessions(agent_id: string, status?: ThinkingSessionStatus): Promise<ThinkingSession[]> {
    const sql = status
      ? "SELECT * FROM ai_thinking_sessions WHERE agent_id = ? AND status = ? ORDER BY created_at DESC"
      : "SELECT * FROM ai_thinking_sessions WHERE agent_id = ? ORDER BY created_at DESC";
    const rows = status
      ? this.db.prepare(sql).all(agent_id, status)
      : this.db.prepare(sql).all(agent_id);
    return rows.map((r: any) => ({ ...r, metadata: this.parseJson(r.metadata) })) as ThinkingSession[];
  }

  async updateSession(session_id: string, updates: Partial<Pick<ThinkingSession, "title" | "status" | "total_thoughts" | "conclusion">>): Promise<ThinkingSession | null> {
    const sets: string[] = [];
    const vals: any[] = [];
    if (updates.title !== undefined) { sets.push("title = ?"); vals.push(updates.title); }
    if (updates.status !== undefined) { sets.push("status = ?"); vals.push(updates.status); }
    if (updates.total_thoughts !== undefined) { sets.push("total_thoughts = ?"); vals.push(updates.total_thoughts); }
    if (updates.conclusion !== undefined) { sets.push("conclusion = ?"); vals.push(updates.conclusion); }
    sets.push("updated_at = ?"); vals.push(now());
    vals.push(session_id);

    this.db.prepare(`UPDATE ai_thinking_sessions SET ${sets.join(", ")} WHERE id = ?`).run(...vals);
    return this.getSession(session_id).then((r) => r?.session ?? null);
  }

  // ── Thinking — Steps ─────────────────────────────────────────

  async addStep(session_id: string, step: Omit<ThinkingStep, "id" | "session_id" | "created_at">): Promise<ThinkingStep> {
    const id = generateId();
    const ts = now();

    this.db.prepare(
      `INSERT INTO ai_thinking_steps (id, session_id, thought_number, thought, thought_type, is_revision, revises_thought, branch_id, branch_from_thought, needs_more_thoughts, metadata, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(id, session_id, step.thought_number, step.thought, step.thought_type, step.is_revision ? 1 : 0, step.revises_thought, step.branch_id, step.branch_from_thought, step.needs_more_thoughts ? 1 : 0, JSON.stringify(step.metadata), ts);

    return { id, session_id, ...step, created_at: ts };
  }

  async getSteps(session_id: string, branch_id?: string): Promise<ThinkingStep[]> {
    const sql = branch_id
      ? "SELECT * FROM ai_thinking_steps WHERE session_id = ? AND branch_id = ? ORDER BY thought_number"
      : "SELECT * FROM ai_thinking_steps WHERE session_id = ? ORDER BY thought_number";
    const rows = branch_id
      ? this.db.prepare(sql).all(session_id, branch_id)
      : this.db.prepare(sql).all(session_id);
    return rows.map((s: any) => ({ ...s, metadata: this.parseJson(s.metadata), is_revision: !!s.is_revision, needs_more_thoughts: !!s.needs_more_thoughts })) as ThinkingStep[];
  }

  // ── Memory — Nodes ───────────────────────────────────────────

  async createNode(params: CreateNodeParams): Promise<MemoryNode> {
    const id = generateId();
    const id_prefix = generatePrefix("AMN");
    const ts = now();

    this.db.prepare(
      `INSERT INTO ai_memory_nodes (id, id_prefix, agent_id, content, content_type, metadata, time_range_start, time_range_end, parent_node_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(id, id_prefix, params.agent_id, params.content, params.content_type ?? "text", JSON.stringify(params.metadata ?? {}), params.time_range_start ?? null, params.time_range_end ?? null, params.parent_node_id ?? null, ts, ts);

    return { id, id_prefix, agent_id: params.agent_id, content: params.content, content_type: (params.content_type ?? "text") as any, metadata: params.metadata ?? {}, time_range_start: params.time_range_start ?? null, time_range_end: params.time_range_end ?? null, chunk_index: 0, parent_node_id: params.parent_node_id ?? null, status: "active", created_at: ts, updated_at: ts };
  }

  async getNode(node_id: string): Promise<MemoryNode | null> {
    const row = this.db.prepare("SELECT * FROM ai_memory_nodes WHERE id = ?").get(node_id);
    if (!row) return null;
    return { ...row, metadata: this.parseJson(row.metadata) } as MemoryNode;
  }

  async updateNode(node_id: string, params: UpdateNodeParams): Promise<MemoryNode | null> {
    const sets: string[] = [];
    const vals: any[] = [];
    if (params.content !== undefined) { sets.push("content = ?"); vals.push(params.content); }
    if (params.content_type !== undefined) { sets.push("content_type = ?"); vals.push(params.content_type); }
    if (params.metadata !== undefined) { sets.push("metadata = ?"); vals.push(JSON.stringify(params.metadata)); }
    if (params.status !== undefined) { sets.push("status = ?"); vals.push(params.status); }
    sets.push("updated_at = ?"); vals.push(now());
    vals.push(node_id);

    this.db.prepare(`UPDATE ai_memory_nodes SET ${sets.join(", ")} WHERE id = ?`).run(...vals);
    return this.getNode(node_id);
  }

  async deleteNode(node_id: string): Promise<boolean> {
    const result = this.db.prepare("DELETE FROM ai_memory_nodes WHERE id = ?").run(node_id);
    return result.changes > 0;
  }

  // ── Memory — Edges ───────────────────────────────────────────

  async createEdge(params: CreateEdgeParams): Promise<MemoryEdge> {
    const id = generateId();
    const ts = now();

    this.db.prepare(
      `INSERT INTO ai_memory_edges (id, agent_id, from_node_id, to_node_id, relationship_type, weight, metadata, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(id, params.agent_id, params.from_node_id, params.to_node_id, params.relationship_type, params.weight ?? 1.0, JSON.stringify(params.metadata ?? {}), ts);

    return { id, agent_id: params.agent_id, from_node_id: params.from_node_id, to_node_id: params.to_node_id, relationship_type: params.relationship_type as any, weight: params.weight ?? 1.0, metadata: params.metadata ?? {}, created_at: ts };
  }

  async getEdgesForNode(node_id: string): Promise<MemoryEdge[]> {
    const rows = this.db.prepare(
      "SELECT * FROM ai_memory_edges WHERE from_node_id = ? OR to_node_id = ?"
    ).all(node_id, node_id);
    return rows.map((r: any) => ({ ...r, metadata: this.parseJson(r.metadata) })) as MemoryEdge[];
  }

  async deleteEdge(edge_id: string): Promise<boolean> {
    const result = this.db.prepare("DELETE FROM ai_memory_edges WHERE id = ?").run(edge_id);
    return result.changes > 0;
  }

  // ── Memory — Search (simplified LIKE matching for free tier) ─

  async searchMemory(params: MemorySearchParams): Promise<MemorySearchResult[]> {
    let sql = "SELECT * FROM ai_memory_nodes WHERE agent_id = ? AND status = 'active'";
    const vals: any[] = [params.agent_id];

    if (params.query) {
      sql += " AND content LIKE ?";
      vals.push(`%${params.query}%`);
    }

    sql += ` ORDER BY created_at DESC LIMIT ?`;
    vals.push(params.limit ?? 10);

    const rows = this.db.prepare(sql).all(...vals);
    return rows.map((r: any) => ({
      id: r.id,
      content: r.content,
      metadata: this.parseJson(r.metadata),
      time_range_start: r.time_range_start,
      time_range_end: r.time_range_end,
      relevance_score: 1.0,
      related_nodes: [],
    })) as MemorySearchResult[];
  }

  async searchSemantic(_params: SemanticSearchParams): Promise<SemanticSearchResult[]> {
    // SQLite free tier does not support vector search
    // Fall back to text search using the query_text field
    if (_params.query_text) {
      const results = await this.searchMemory({ ..._params, query: _params.query_text });
      return results.map((r) => ({ ...r, similarity: 0, text_score: r.relevance_score, combined_score: r.relevance_score }));
    }
    return [];
  }

  // ── Memory — Traversal ───────────────────────────────────────

  async traverseGraph(
    start_node_id: string,
    depth: number,
    relationship_types?: string[]
  ): Promise<{ nodes: MemoryNode[]; edges: MemoryEdge[] }> {
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
          if (!visitedNodeIds.has(neighborId)) nextFrontier.push(neighborId);
        }
      }
      frontier = nextFrontier;
    }

    for (const nodeId of frontier) visitedNodeIds.add(nodeId);

    const nodeIds = [...visitedNodeIds];
    const nodes: MemoryNode[] = [];
    for (const nid of nodeIds) {
      const node = await this.getNode(nid);
      if (node) nodes.push(node);
    }

    return { nodes, edges: allEdges };
  }

  // ── Graph ↔ Memory Links ─────────────────────────────────────

  async createGraphLink(params: import("../core/types.js").CreateGraphLinkParams): Promise<import("../core/types.js").GraphLink> {
    const id = crypto.randomUUID();
    const memoryNodeId = params.memory_node_id ?? null;
    const sessionId = params.thinking_session_id ?? null;
    const linkType = params.link_type ?? "about";
    const filePath = params.graph_file_path ?? null;

    this.db.exec(
      `INSERT INTO ai_graph_links (id, memory_node_id, thinking_session_id, graph_qualified_name, graph_file_path, link_type, agent_id)
       VALUES ('${id}', ${memoryNodeId ? `'${memoryNodeId}'` : "NULL"}, ${sessionId ? `'${sessionId}'` : "NULL"}, '${params.graph_qualified_name}', ${filePath ? `'${filePath}'` : "NULL"}, '${linkType}', '${params.agent_id}')`
    );

    return {
      id,
      memory_node_id: memoryNodeId,
      thinking_session_id: sessionId,
      graph_qualified_name: params.graph_qualified_name,
      graph_file_path: filePath,
      link_type: linkType as import("../core/types.js").GraphLinkType,
      agent_id: params.agent_id,
      created_at: new Date().toISOString(),
    };
  }

  async searchByGraphEntity(params: import("../core/types.js").SearchByGraphEntityParams): Promise<{
    links: import("../core/types.js").GraphLink[];
    nodes: import("../core/types.js").MemoryNode[];
    sessions: import("../core/types.js").ThinkingSession[];
  }> {
    const limit = params.limit ?? 20;
    const conditions: string[] = [`agent_id = '${params.agent_id}'`];
    if (params.graph_qualified_name) conditions.push(`graph_qualified_name = '${params.graph_qualified_name}'`);
    if (params.graph_file_path) conditions.push(`graph_file_path = '${params.graph_file_path}'`);
    if (params.link_type) conditions.push(`link_type = '${params.link_type}'`);

    const where = conditions.join(" AND ");
    const rows = this.db.prepare(
      `SELECT * FROM ai_graph_links WHERE ${where} ORDER BY created_at DESC LIMIT ${limit}`
    ).all() as Array<Record<string, unknown>>;

    const links: import("../core/types.js").GraphLink[] = rows.map((r) => ({
      id: r.id as string,
      memory_node_id: r.memory_node_id as string | null,
      thinking_session_id: r.thinking_session_id as string | null,
      graph_qualified_name: r.graph_qualified_name as string,
      graph_file_path: r.graph_file_path as string | null,
      link_type: r.link_type as import("../core/types.js").GraphLinkType,
      agent_id: r.agent_id as string,
      created_at: r.created_at as string,
    }));

    // Fetch linked memory nodes
    const nodeIds = [...new Set(links.filter((l) => l.memory_node_id).map((l) => l.memory_node_id!))];
    const nodes: import("../core/types.js").MemoryNode[] = [];
    for (const nid of nodeIds) {
      const node = await this.getNode(nid);
      if (node) nodes.push(node);
    }

    // Fetch linked thinking sessions
    const sessionIds = [...new Set(links.filter((l) => l.thinking_session_id).map((l) => l.thinking_session_id!))];
    const sessions: import("../core/types.js").ThinkingSession[] = [];
    for (const sid of sessionIds) {
      const result = await this.getSession(sid);
      if (result) sessions.push(result.session);
    }

    return { links, nodes, sessions };
  }

  async deleteGraphLinksForNode(memory_node_id: string): Promise<number> {
    const result = this.db.prepare(
      `DELETE FROM ai_graph_links WHERE memory_node_id = '${memory_node_id}'`
    ).run();
    return (result as { changes: number }).changes ?? 0;
  }

  // ── Lifecycle ────────────────────────────────────────────────

  close(): void {
    this.db.close();
  }
}

/**
 * SQLite storage adapter — Free tier local persistence.
 *
 * Uses Node.js built-in SQLite (>= 22.5) for local storage.
 * Mirrors the Supabase schema structure but without vector search
 * or tsvector — uses simple LIKE matching instead.
 *
 * Stores at .composure/cortex.db in the project root.
 */
// Node.js built-in SQLite (>= 22.5)
let DatabaseConstructor;
try {
    const sqliteModule = await import("node:sqlite");
    DatabaseConstructor = sqliteModule.DatabaseSync;
}
catch {
    // Will throw at construction time if unavailable
}
function generateId() {
    return crypto.randomUUID();
}
function generatePrefix(prefix) {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < 12; i++) {
        result += chars[Math.floor(Math.random() * chars.length)];
    }
    return prefix.toUpperCase() + result;
}
function now() {
    return new Date().toISOString();
}
export class SqliteAdapter {
    type = "sqlite";
    db;
    constructor(dbPath) {
        if (!DatabaseConstructor) {
            throw new Error("Node.js built-in SQLite requires Node >= 22.5");
        }
        const path = dbPath ?? ".composure/cortex.db";
        this.db = new DatabaseConstructor(path);
        this.db.exec("PRAGMA journal_mode = WAL");
        this.initSchema();
    }
    initSchema() {
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
        created_at TEXT DEFAULT (datetime('now')),
        UNIQUE(session_id, thought_number, COALESCE(branch_id, '__main__'))
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

      CREATE INDEX IF NOT EXISTS idx_thinking_sessions_agent ON ai_thinking_sessions(agent_id, status);
      CREATE INDEX IF NOT EXISTS idx_thinking_steps_session ON ai_thinking_steps(session_id, thought_number);
      CREATE INDEX IF NOT EXISTS idx_memory_nodes_agent ON ai_memory_nodes(agent_id, status);
      CREATE INDEX IF NOT EXISTS idx_memory_edges_from ON ai_memory_edges(from_node_id);
      CREATE INDEX IF NOT EXISTS idx_memory_edges_to ON ai_memory_edges(to_node_id);
    `);
    }
    parseJson(val) {
        if (!val)
            return {};
        try {
            return JSON.parse(val);
        }
        catch {
            return {};
        }
    }
    // ── Thinking — Sessions ──────────────────────────────────────
    async createSession(agent_id, title) {
        const id = generateId();
        const id_prefix = generatePrefix("ATS");
        const ts = now();
        this.db.prepare(`INSERT INTO ai_thinking_sessions (id, id_prefix, agent_id, title, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`).run(id, id_prefix, agent_id, title ?? null, ts, ts);
        return { id, id_prefix, agent_id, title: title ?? null, status: "active", total_thoughts: 0, conclusion: null, metadata: {}, created_at: ts, updated_at: ts };
    }
    async getSession(session_id) {
        const row = this.db.prepare("SELECT * FROM ai_thinking_sessions WHERE id = ?").get(session_id);
        if (!row)
            return null;
        const steps = this.db.prepare("SELECT * FROM ai_thinking_steps WHERE session_id = ? ORDER BY thought_number").all(session_id);
        return {
            session: { ...row, metadata: this.parseJson(row.metadata) },
            steps: steps.map((s) => ({ ...s, metadata: this.parseJson(s.metadata), is_revision: !!s.is_revision, needs_more_thoughts: !!s.needs_more_thoughts })),
        };
    }
    async listSessions(agent_id, status) {
        const sql = status
            ? "SELECT * FROM ai_thinking_sessions WHERE agent_id = ? AND status = ? ORDER BY created_at DESC"
            : "SELECT * FROM ai_thinking_sessions WHERE agent_id = ? ORDER BY created_at DESC";
        const rows = status
            ? this.db.prepare(sql).all(agent_id, status)
            : this.db.prepare(sql).all(agent_id);
        return rows.map((r) => ({ ...r, metadata: this.parseJson(r.metadata) }));
    }
    async updateSession(session_id, updates) {
        const sets = [];
        const vals = [];
        if (updates.title !== undefined) {
            sets.push("title = ?");
            vals.push(updates.title);
        }
        if (updates.status !== undefined) {
            sets.push("status = ?");
            vals.push(updates.status);
        }
        if (updates.total_thoughts !== undefined) {
            sets.push("total_thoughts = ?");
            vals.push(updates.total_thoughts);
        }
        if (updates.conclusion !== undefined) {
            sets.push("conclusion = ?");
            vals.push(updates.conclusion);
        }
        sets.push("updated_at = ?");
        vals.push(now());
        vals.push(session_id);
        this.db.prepare(`UPDATE ai_thinking_sessions SET ${sets.join(", ")} WHERE id = ?`).run(...vals);
        return this.getSession(session_id).then((r) => r?.session ?? null);
    }
    // ── Thinking — Steps ─────────────────────────────────────────
    async addStep(session_id, step) {
        const id = generateId();
        const ts = now();
        this.db.prepare(`INSERT INTO ai_thinking_steps (id, session_id, thought_number, thought, thought_type, is_revision, revises_thought, branch_id, branch_from_thought, needs_more_thoughts, metadata, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(id, session_id, step.thought_number, step.thought, step.thought_type, step.is_revision ? 1 : 0, step.revises_thought, step.branch_id, step.branch_from_thought, step.needs_more_thoughts ? 1 : 0, JSON.stringify(step.metadata), ts);
        return { id, session_id, ...step, created_at: ts };
    }
    async getSteps(session_id, branch_id) {
        const sql = branch_id
            ? "SELECT * FROM ai_thinking_steps WHERE session_id = ? AND branch_id = ? ORDER BY thought_number"
            : "SELECT * FROM ai_thinking_steps WHERE session_id = ? ORDER BY thought_number";
        const rows = branch_id
            ? this.db.prepare(sql).all(session_id, branch_id)
            : this.db.prepare(sql).all(session_id);
        return rows.map((s) => ({ ...s, metadata: this.parseJson(s.metadata), is_revision: !!s.is_revision, needs_more_thoughts: !!s.needs_more_thoughts }));
    }
    // ── Memory — Nodes ───────────────────────────────────────────
    async createNode(params) {
        const id = generateId();
        const id_prefix = generatePrefix("AMN");
        const ts = now();
        this.db.prepare(`INSERT INTO ai_memory_nodes (id, id_prefix, agent_id, content, content_type, metadata, time_range_start, time_range_end, parent_node_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(id, id_prefix, params.agent_id, params.content, params.content_type ?? "text", JSON.stringify(params.metadata ?? {}), params.time_range_start ?? null, params.time_range_end ?? null, params.parent_node_id ?? null, ts, ts);
        return { id, id_prefix, agent_id: params.agent_id, content: params.content, content_type: (params.content_type ?? "text"), metadata: params.metadata ?? {}, time_range_start: params.time_range_start ?? null, time_range_end: params.time_range_end ?? null, chunk_index: 0, parent_node_id: params.parent_node_id ?? null, status: "active", created_at: ts, updated_at: ts };
    }
    async getNode(node_id) {
        const row = this.db.prepare("SELECT * FROM ai_memory_nodes WHERE id = ?").get(node_id);
        if (!row)
            return null;
        return { ...row, metadata: this.parseJson(row.metadata) };
    }
    async updateNode(node_id, params) {
        const sets = [];
        const vals = [];
        if (params.content !== undefined) {
            sets.push("content = ?");
            vals.push(params.content);
        }
        if (params.content_type !== undefined) {
            sets.push("content_type = ?");
            vals.push(params.content_type);
        }
        if (params.metadata !== undefined) {
            sets.push("metadata = ?");
            vals.push(JSON.stringify(params.metadata));
        }
        if (params.status !== undefined) {
            sets.push("status = ?");
            vals.push(params.status);
        }
        sets.push("updated_at = ?");
        vals.push(now());
        vals.push(node_id);
        this.db.prepare(`UPDATE ai_memory_nodes SET ${sets.join(", ")} WHERE id = ?`).run(...vals);
        return this.getNode(node_id);
    }
    async deleteNode(node_id) {
        const result = this.db.prepare("DELETE FROM ai_memory_nodes WHERE id = ?").run(node_id);
        return result.changes > 0;
    }
    // ── Memory — Edges ───────────────────────────────────────────
    async createEdge(params) {
        const id = generateId();
        const ts = now();
        this.db.prepare(`INSERT INTO ai_memory_edges (id, agent_id, from_node_id, to_node_id, relationship_type, weight, metadata, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(id, params.agent_id, params.from_node_id, params.to_node_id, params.relationship_type, params.weight ?? 1.0, JSON.stringify(params.metadata ?? {}), ts);
        return { id, agent_id: params.agent_id, from_node_id: params.from_node_id, to_node_id: params.to_node_id, relationship_type: params.relationship_type, weight: params.weight ?? 1.0, metadata: params.metadata ?? {}, created_at: ts };
    }
    async getEdgesForNode(node_id) {
        const rows = this.db.prepare("SELECT * FROM ai_memory_edges WHERE from_node_id = ? OR to_node_id = ?").all(node_id, node_id);
        return rows.map((r) => ({ ...r, metadata: this.parseJson(r.metadata) }));
    }
    async deleteEdge(edge_id) {
        const result = this.db.prepare("DELETE FROM ai_memory_edges WHERE id = ?").run(edge_id);
        return result.changes > 0;
    }
    // ── Memory — Search (simplified LIKE matching for free tier) ─
    async searchMemory(params) {
        let sql = "SELECT * FROM ai_memory_nodes WHERE agent_id = ? AND status = 'active'";
        const vals = [params.agent_id];
        if (params.query) {
            sql += " AND content LIKE ?";
            vals.push(`%${params.query}%`);
        }
        sql += ` ORDER BY created_at DESC LIMIT ?`;
        vals.push(params.limit ?? 10);
        const rows = this.db.prepare(sql).all(...vals);
        return rows.map((r) => ({
            id: r.id,
            content: r.content,
            metadata: this.parseJson(r.metadata),
            time_range_start: r.time_range_start,
            time_range_end: r.time_range_end,
            relevance_score: 1.0,
            related_nodes: [],
        }));
    }
    async searchSemantic(_params) {
        // SQLite free tier does not support vector search
        // Fall back to text search using the query_text field
        if (_params.query_text) {
            const results = await this.searchMemory({ ..._params, query: _params.query_text });
            return results.map((r) => ({ ...r, similarity: 0, text_score: r.relevance_score, combined_score: r.relevance_score }));
        }
        return [];
    }
    // ── Memory — Traversal ───────────────────────────────────────
    async traverseGraph(start_node_id, depth, relationship_types) {
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
                    if (!visitedNodeIds.has(neighborId))
                        nextFrontier.push(neighborId);
                }
            }
            frontier = nextFrontier;
        }
        for (const nodeId of frontier)
            visitedNodeIds.add(nodeId);
        const nodeIds = [...visitedNodeIds];
        const nodes = [];
        for (const nid of nodeIds) {
            const node = await this.getNode(nid);
            if (node)
                nodes.push(node);
        }
        return { nodes, edges: allEdges };
    }
    // ── Lifecycle ────────────────────────────────────────────────
    close() {
        this.db.close();
    }
}
//# sourceMappingURL=sqlite.js.map
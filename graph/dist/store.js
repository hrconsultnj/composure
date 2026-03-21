/**
 * SQLite-backed knowledge graph storage and query engine.
 *
 * Uses Node.js built-in node:sqlite (DatabaseSync) — zero native dependencies.
 * Serialization helpers (row converters, dict formatters) live in serialization.ts.
 */
import { DatabaseSync } from "node:sqlite";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { makeQualifiedName, rowToNode, rowToEdge } from "./serialization.js";
// Re-export for consumers that import from store.ts
export { nodeToDict, edgeToDict } from "./serialization.js";
// ── Schema ─────────────────────────────────────────────────────────
const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS nodes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kind TEXT NOT NULL,
    name TEXT NOT NULL,
    qualified_name TEXT NOT NULL UNIQUE,
    file_path TEXT NOT NULL,
    line_start INTEGER,
    line_end INTEGER,
    language TEXT,
    parent_name TEXT,
    params TEXT,
    return_type TEXT,
    modifiers TEXT,
    is_test INTEGER DEFAULT 0,
    file_hash TEXT,
    extra TEXT DEFAULT '{}',
    updated_at REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS edges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kind TEXT NOT NULL,
    source_qualified TEXT NOT NULL,
    target_qualified TEXT NOT NULL,
    file_path TEXT NOT NULL,
    line INTEGER DEFAULT 0,
    extra TEXT DEFAULT '{}',
    updated_at REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS metadata (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_nodes_file ON nodes(file_path);
CREATE INDEX IF NOT EXISTS idx_nodes_kind ON nodes(kind);
CREATE INDEX IF NOT EXISTS idx_nodes_qualified ON nodes(qualified_name);
CREATE INDEX IF NOT EXISTS idx_edges_source ON edges(source_qualified);
CREATE INDEX IF NOT EXISTS idx_edges_target ON edges(target_qualified);
CREATE INDEX IF NOT EXISTS idx_edges_kind ON edges(kind);
CREATE INDEX IF NOT EXISTS idx_edges_file ON edges(file_path);
`;
// ── GraphStore ─────────────────────────────────────────────────────
export class GraphStore {
    db;
    constructor(dbPath) {
        const dir = dirname(dbPath);
        if (!existsSync(dir)) {
            mkdirSync(dir, { recursive: true });
            const gitignorePath = `${dir}/.gitignore`;
            if (!existsSync(gitignorePath)) {
                writeFileSync(gitignorePath, "*\n");
            }
        }
        this.db = new DatabaseSync(dbPath);
        this.db.exec("PRAGMA journal_mode = WAL");
        this.db.exec("PRAGMA busy_timeout = 30000");
        this.db.exec(SCHEMA_SQL);
    }
    close() {
        this.db.close();
    }
    commit() {
        // better-sqlite3 auto-commits; this is a no-op for API compat
    }
    // ── Metadata ───────────────────────────────────────────────────
    setMetadata(key, value) {
        this.db
            .prepare("INSERT OR REPLACE INTO metadata (key, value) VALUES (?, ?)")
            .run(key, value);
    }
    getMetadata(key) {
        const row = this.db
            .prepare("SELECT value FROM metadata WHERE key = ?")
            .get(key);
        return row?.value ?? null;
    }
    // ── Node CRUD ──────────────────────────────────────────────────
    upsertNode(node, fileHash) {
        const qn = makeQualifiedName(node);
        const now = Date.now() / 1000;
        const stmt = this.db.prepare(`
      INSERT INTO nodes (kind, name, qualified_name, file_path, line_start, line_end,
                         language, parent_name, params, return_type, modifiers,
                         is_test, file_hash, extra, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(qualified_name) DO UPDATE SET
        kind=excluded.kind, name=excluded.name, file_path=excluded.file_path,
        line_start=excluded.line_start, line_end=excluded.line_end,
        language=excluded.language, parent_name=excluded.parent_name,
        params=excluded.params, return_type=excluded.return_type,
        modifiers=excluded.modifiers, is_test=excluded.is_test,
        file_hash=excluded.file_hash, extra=excluded.extra, updated_at=excluded.updated_at
    `);
        const info = stmt.run(node.kind, node.name, qn, node.file_path, node.line_start, node.line_end, node.language ?? null, node.parent_name ?? null, node.params ?? null, node.return_type ?? null, node.modifiers ?? null, node.is_test ? 1 : 0, fileHash ?? null, JSON.stringify(node.extra ?? {}), now);
        return Number(info.lastInsertRowid);
    }
    upsertEdge(edge) {
        const now = Date.now() / 1000;
        const stmt = this.db.prepare(`
      INSERT INTO edges (kind, source_qualified, target_qualified, file_path, line, extra, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT DO NOTHING
    `);
        const info = stmt.run(edge.kind, edge.source, edge.target, edge.file_path, edge.line, JSON.stringify(edge.extra ?? {}), now);
        return Number(info.lastInsertRowid);
    }
    removeFileData(filePath) {
        this.db.prepare("DELETE FROM nodes WHERE file_path = ?").run(filePath);
        this.db.prepare("DELETE FROM edges WHERE file_path = ?").run(filePath);
    }
    storeFileNodesEdges(filePath, nodes, edges, fileHash) {
        this.db.exec("BEGIN");
        try {
            this.removeFileData(filePath);
            for (const node of nodes) {
                this.upsertNode(node, fileHash);
            }
            for (const edge of edges) {
                this.upsertEdge(edge);
            }
            this.db.exec("COMMIT");
        }
        catch (err) {
            this.db.exec("ROLLBACK");
            throw err;
        }
    }
    // ── Node queries ───────────────────────────────────────────────
    getNode(qualifiedName) {
        const row = this.db
            .prepare("SELECT * FROM nodes WHERE qualified_name = ?")
            .get(qualifiedName);
        return row ? rowToNode(row) : null;
    }
    getNodesByFile(filePath) {
        const rows = this.db
            .prepare("SELECT * FROM nodes WHERE file_path = ?")
            .all(filePath);
        return rows.map(rowToNode);
    }
    getAllFiles() {
        const rows = this.db
            .prepare("SELECT DISTINCT file_path FROM nodes ORDER BY file_path")
            .all();
        return rows.map((r) => r.file_path);
    }
    searchNodes(query, limit = 20) {
        const words = query.trim().split(/\s+/).filter(Boolean);
        if (words.length === 0)
            return [];
        const conditions = words.map(() => "(name LIKE ? OR qualified_name LIKE ?)");
        const params = [];
        for (const w of words) {
            params.push(`%${w}%`, `%${w}%`);
        }
        const sql = `SELECT * FROM nodes WHERE ${conditions.join(" AND ")} LIMIT ?`;
        params.push(limit);
        const rows = this.db.prepare(sql).all(...params);
        return rows.map(rowToNode);
    }
    getNodesBySize(minLines, maxLines, kind, filePathPattern, limit = 50) {
        const conditions = [
            "(line_end - line_start + 1) >= ?",
        ];
        const params = [minLines];
        if (maxLines != null) {
            conditions.push("(line_end - line_start + 1) <= ?");
            params.push(maxLines);
        }
        if (kind) {
            conditions.push("kind = ?");
            params.push(kind);
        }
        if (filePathPattern) {
            const likePattern = filePathPattern
                .replace(/\*\*/g, "%")
                .replace(/\*/g, "%")
                .replace(/\?/g, "_");
            conditions.push("file_path LIKE ?");
            params.push(likePattern);
        }
        const sql = `
      SELECT * FROM nodes
      WHERE ${conditions.join(" AND ")}
      ORDER BY (line_end - line_start + 1) DESC
      LIMIT ?
    `;
        params.push(limit);
        const rows = this.db.prepare(sql).all(...params);
        return rows.map(rowToNode);
    }
    // ── Edge queries ───────────────────────────────────────────────
    getEdgesBySource(qualifiedName) {
        const rows = this.db
            .prepare("SELECT * FROM edges WHERE source_qualified = ?")
            .all(qualifiedName);
        return rows.map(rowToEdge);
    }
    getEdgesByTarget(qualifiedName) {
        const rows = this.db
            .prepare("SELECT * FROM edges WHERE target_qualified = ?")
            .all(qualifiedName);
        return rows.map(rowToEdge);
    }
    searchEdgesByTargetName(name, kind = "CALLS") {
        const rows = this.db
            .prepare("SELECT * FROM edges WHERE kind = ? AND (target_qualified LIKE ? OR target_qualified = ?)")
            .all(kind, `%::${name}`, name);
        return rows.map(rowToEdge);
    }
    getAllEdges() {
        const rows = this.db
            .prepare("SELECT * FROM edges")
            .all();
        return rows.map(rowToEdge);
    }
    getEdgesAmong(qualifiedNames) {
        if (qualifiedNames.size === 0)
            return [];
        this.db.exec("CREATE TEMP TABLE IF NOT EXISTS _qn_filter (qn TEXT PRIMARY KEY)");
        this.db.exec("DELETE FROM _qn_filter");
        const insert = this.db.prepare("INSERT OR IGNORE INTO _qn_filter (qn) VALUES (?)");
        this.db.exec("BEGIN");
        for (const n of qualifiedNames)
            insert.run(n);
        this.db.exec("COMMIT");
        const rows = this.db
            .prepare(`SELECT e.* FROM edges e
         WHERE e.source_qualified IN (SELECT qn FROM _qn_filter)
           AND e.target_qualified IN (SELECT qn FROM _qn_filter)`)
            .all();
        this.db.exec("DELETE FROM _qn_filter");
        return rows.map(rowToEdge);
    }
    // ── Stats ──────────────────────────────────────────────────────
    getStats() {
        const totalNodes = this.db.prepare("SELECT COUNT(*) as c FROM nodes").get().c;
        const totalEdges = this.db.prepare("SELECT COUNT(*) as c FROM edges").get().c;
        const nodesByKind = {};
        const nkRows = this.db
            .prepare("SELECT kind, COUNT(*) as c FROM nodes GROUP BY kind")
            .all();
        for (const r of nkRows)
            nodesByKind[r.kind] = r.c;
        const edgesByKind = {};
        const ekRows = this.db
            .prepare("SELECT kind, COUNT(*) as c FROM edges GROUP BY kind")
            .all();
        for (const r of ekRows)
            edgesByKind[r.kind] = r.c;
        const langRows = this.db
            .prepare("SELECT DISTINCT language FROM nodes WHERE language IS NOT NULL AND language != ''")
            .all();
        const languages = langRows.map((r) => r.language);
        const filesCount = this.db
            .prepare("SELECT COUNT(DISTINCT file_path) as c FROM nodes")
            .get().c;
        const lastUpdated = this.getMetadata("last_updated");
        return {
            total_nodes: totalNodes,
            total_edges: totalEdges,
            nodes_by_kind: nodesByKind,
            edges_by_kind: edgesByKind,
            languages,
            files_count: filesCount,
            last_updated: lastUpdated,
        };
    }
}
//# sourceMappingURL=store.js.map
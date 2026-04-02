/**
 * SQLite-backed knowledge graph storage and query engine.
 *
 * Uses Node.js built-in node:sqlite (DatabaseSync) — zero native dependencies.
 * Write operations (CRUD) live here. Query operations are in store-queries.ts.
 * Serialization helpers (row converters) live in serialization.ts.
 */

import { DatabaseSync } from "node:sqlite";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { EdgeInfo, GraphEdge, GraphNode, GraphStats, NodeInfo } from "./types.js";
import { makeQualifiedName } from "./serialization.js";
import * as Q from "./store-queries.js";

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
    summary TEXT,
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
CREATE INDEX IF NOT EXISTS idx_edges_kind_target ON edges(kind, target_qualified);
CREATE INDEX IF NOT EXISTS idx_edges_kind_source ON edges(kind, source_qualified);
CREATE INDEX IF NOT EXISTS idx_nodes_name ON nodes(name);

CREATE TABLE IF NOT EXISTS entities (
    name TEXT PRIMARY KEY,
    display_name TEXT NOT NULL,
    source TEXT NOT NULL,
    updated_at REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS entity_members (
    entity_name TEXT NOT NULL REFERENCES entities(name),
    node_qualified_name TEXT NOT NULL,
    role TEXT NOT NULL,
    confidence REAL DEFAULT 1.0,
    updated_at REAL NOT NULL,
    PRIMARY KEY (entity_name, node_qualified_name)
);

CREATE INDEX IF NOT EXISTS idx_em_entity ON entity_members(entity_name);
CREATE INDEX IF NOT EXISTS idx_em_node ON entity_members(node_qualified_name);

CREATE TABLE IF NOT EXISTS audit_findings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    audit_run_id TEXT NOT NULL,
    category TEXT NOT NULL,
    finding_type TEXT NOT NULL,
    severity TEXT NOT NULL,
    node_qualified_name TEXT,
    file_path TEXT,
    title TEXT NOT NULL,
    detail TEXT DEFAULT '{}',
    score_impact REAL DEFAULT 0,
    created_at REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS test_coverage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    audit_run_id TEXT NOT NULL,
    node_qualified_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    has_test_edge INTEGER DEFAULT 0,
    coverage_pct REAL,
    test_count INTEGER DEFAULT 0,
    created_at REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    audit_run_id TEXT NOT NULL,
    category TEXT NOT NULL,
    raw_score REAL NOT NULL,
    weight REAL NOT NULL,
    adjusted_weight REAL NOT NULL,
    grade TEXT NOT NULL,
    grade_color TEXT NOT NULL,
    finding_count INTEGER DEFAULT 0,
    created_at REAL NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_af_run ON audit_findings(audit_run_id);
CREATE INDEX IF NOT EXISTS idx_af_category ON audit_findings(category);
CREATE INDEX IF NOT EXISTS idx_af_severity ON audit_findings(severity);
CREATE INDEX IF NOT EXISTS idx_af_file ON audit_findings(file_path);
CREATE INDEX IF NOT EXISTS idx_tc_run ON test_coverage(audit_run_id);
CREATE INDEX IF NOT EXISTS idx_tc_file ON test_coverage(file_path);
CREATE INDEX IF NOT EXISTS idx_as_run ON audit_scores(audit_run_id);
`;

// ── GraphStore ─────────────────────────────────────────────────────

export class GraphStore {
  private db: DatabaseSync;

  constructor(dbPath: string) {
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

    // Schema migrations for existing databases
    try { this.db.exec("ALTER TABLE nodes ADD COLUMN summary TEXT"); } catch { /* column already exists */ }
  }

  /** Expose the raw database for audit-store and other modules. */
  getDb(): DatabaseSync {
    return this.db;
  }

  close(): void {
    this.db.close();
  }

  commit(): void {
    // better-sqlite3 auto-commits; this is a no-op for API compat
  }

  // ── Metadata ───────────────────────────────────────────────────

  setMetadata(key: string, value: string): void {
    this.db
      .prepare("INSERT OR REPLACE INTO metadata (key, value) VALUES (?, ?)")
      .run(key, value);
  }

  getMetadata(key: string): string | null {
    const row = this.db
      .prepare("SELECT value FROM metadata WHERE key = ?")
      .get(key) as { value: string } | undefined;
    return row?.value ?? null;
  }

  // ── Node CRUD ──────────────────────────────────────────────────

  upsertNode(node: NodeInfo, fileHash?: string): number {
    const qn = makeQualifiedName(node);
    const now = Date.now() / 1000;
    const stmt = this.db.prepare(`
      INSERT INTO nodes (kind, name, qualified_name, file_path, line_start, line_end,
                         language, parent_name, params, return_type, modifiers, summary,
                         is_test, file_hash, extra, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(qualified_name) DO UPDATE SET
        kind=excluded.kind, name=excluded.name, file_path=excluded.file_path,
        line_start=excluded.line_start, line_end=excluded.line_end,
        language=excluded.language, parent_name=excluded.parent_name,
        params=excluded.params, return_type=excluded.return_type,
        modifiers=excluded.modifiers, summary=excluded.summary, is_test=excluded.is_test,
        file_hash=excluded.file_hash, extra=excluded.extra, updated_at=excluded.updated_at
    `);
    const info = stmt.run(
      node.kind,
      node.name,
      qn,
      node.file_path,
      node.line_start,
      node.line_end,
      node.language ?? null,
      node.parent_name ?? null,
      node.params ?? null,
      node.return_type ?? null,
      node.modifiers ?? null,
      node.summary ?? null,
      node.is_test ? 1 : 0,
      fileHash ?? null,
      JSON.stringify(node.extra ?? {}),
      now,
    );
    return Number(info.lastInsertRowid);
  }

  upsertEdge(edge: EdgeInfo): number {
    const now = Date.now() / 1000;
    const stmt = this.db.prepare(`
      INSERT INTO edges (kind, source_qualified, target_qualified, file_path, line, extra, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT DO NOTHING
    `);
    const info = stmt.run(
      edge.kind,
      edge.source,
      edge.target,
      edge.file_path,
      edge.line,
      JSON.stringify(edge.extra ?? {}),
      now,
    );
    return Number(info.lastInsertRowid);
  }

  removeFileData(filePath: string): void {
    this.db.prepare("DELETE FROM nodes WHERE file_path = ?").run(filePath);
    this.db.prepare("DELETE FROM edges WHERE file_path = ?").run(filePath);
  }

  storeFileNodesEdges(
    filePath: string,
    nodes: NodeInfo[],
    edges: EdgeInfo[],
    fileHash?: string,
  ): void {
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
    } catch (err) {
      this.db.exec("ROLLBACK");
      throw err;
    }
  }

  // ── Entity CRUD ────────────────────────────────────────────────

  upsertEntity(name: string, displayName: string, source: string): void {
    const now = Date.now() / 1000;
    this.db
      .prepare(
        `INSERT INTO entities (name, display_name, source, updated_at)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(name) DO UPDATE SET
           display_name=excluded.display_name, source=excluded.source, updated_at=excluded.updated_at`,
      )
      .run(name, displayName, source, now);
  }

  upsertEntityMember(
    entityName: string,
    nodeQualifiedName: string,
    role: string,
    confidence: number,
  ): void {
    const now = Date.now() / 1000;
    this.db
      .prepare(
        `INSERT INTO entity_members (entity_name, node_qualified_name, role, confidence, updated_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(entity_name, node_qualified_name) DO UPDATE SET
           role=excluded.role,
           confidence=CASE WHEN excluded.confidence > entity_members.confidence
                          THEN excluded.confidence ELSE entity_members.confidence END,
           updated_at=excluded.updated_at`,
      )
      .run(entityName, nodeQualifiedName, role, confidence, now);
  }

  removeEntityData(): void {
    this.db.exec("DELETE FROM entity_members");
    this.db.exec("DELETE FROM entities");
  }

  // ── Query delegation (implementations in store-queries.ts) ─────

  getNode(qualifiedName: string): GraphNode | null { return Q.getNode(this.db, qualifiedName); }
  getNodesByFile(filePath: string): GraphNode[] { return Q.getNodesByFile(this.db, filePath); }
  getAllFiles(): string[] { return Q.getAllFiles(this.db); }
  searchNodes(query: string, limit = 20): GraphNode[] { return Q.searchNodes(this.db, query, limit); }
  getNodesBySize(minLines: number, maxLines?: number, kind?: string, filePathPattern?: string, limit = 50): GraphNode[] {
    return Q.getNodesBySize(this.db, minLines, maxLines, kind, filePathPattern, limit);
  }
  getEdgesBySource(qualifiedName: string): GraphEdge[] { return Q.getEdgesBySource(this.db, qualifiedName); }
  getEdgesByTarget(qualifiedName: string): GraphEdge[] { return Q.getEdgesByTarget(this.db, qualifiedName); }
  searchEdgesByTargetName(name: string, kind = "CALLS"): GraphEdge[] { return Q.searchEdgesByTargetName(this.db, name, kind); }
  getAllEdges(): GraphEdge[] { return Q.getAllEdges(this.db); }
  getEdgesAmong(qualifiedNames: Set<string>): GraphEdge[] { return Q.getEdgesAmong(this.db, qualifiedNames); }
  getAllEntities() { return Q.getAllEntities(this.db); }
  getEntityMembers(entityName: string, minConfidence = 0.5) { return Q.getEntityMembers(this.db, entityName, minConfidence); }
  getEntitiesForNode(qualifiedName: string) { return Q.getEntitiesForNode(this.db, qualifiedName); }
  getEntityRoleCounts(entityName: string) { return Q.getEntityRoleCounts(this.db, entityName); }
  getStats(): GraphStats { return Q.getStats(this.db, this.getMetadata.bind(this)); }
}

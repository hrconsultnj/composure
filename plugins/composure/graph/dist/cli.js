#!/usr/bin/env node
import { createRequire } from 'module'; const require = createRequire(import.meta.url);

// dist/store.js
import { DatabaseSync } from "node:sqlite";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

// dist/serialization.js
function makeQualifiedName(node) {
  if (node.kind === "File")
    return node.file_path;
  if (node.parent_name)
    return `${node.file_path}::${node.parent_name}.${node.name}`;
  return `${node.file_path}::${node.name}`;
}
function rowToNode(row) {
  return {
    id: row.id,
    kind: row.kind,
    name: row.name,
    qualified_name: row.qualified_name,
    file_path: row.file_path,
    line_start: row.line_start,
    line_end: row.line_end,
    language: row.language ?? "",
    parent_name: row.parent_name ?? null,
    params: row.params ?? null,
    return_type: row.return_type ?? null,
    modifiers: row.modifiers ?? null,
    summary: row.summary ?? null,
    is_test: row.is_test === 1,
    file_hash: row.file_hash ?? null,
    extra: JSON.parse(row.extra ?? "{}"),
    updated_at: row.updated_at
  };
}
function rowToEdge(row) {
  return {
    id: row.id,
    kind: row.kind,
    source_qualified: row.source_qualified,
    target_qualified: row.target_qualified,
    file_path: row.file_path,
    line: row.line,
    extra: JSON.parse(row.extra ?? "{}"),
    updated_at: row.updated_at
  };
}
function nodeToDict(n) {
  return {
    name: n.name,
    kind: n.kind,
    qualified_name: n.qualified_name,
    file_path: n.file_path,
    line_start: n.line_start,
    line_end: n.line_end,
    lines: n.line_end - n.line_start + 1,
    language: n.language,
    parent_name: n.parent_name,
    params: n.params,
    return_type: n.return_type,
    ...n.summary ? { summary: n.summary } : {},
    is_test: n.is_test
  };
}
function edgeToDict(e) {
  return {
    kind: e.kind,
    source: e.source_qualified,
    target: e.target_qualified,
    file_path: e.file_path,
    line: e.line
  };
}

// dist/store-queries.js
function getNode(db, qualifiedName) {
  const row = db.prepare("SELECT * FROM nodes WHERE qualified_name = ?").get(qualifiedName);
  return row ? rowToNode(row) : null;
}
function getNodesByFile(db, filePath) {
  const rows = db.prepare("SELECT * FROM nodes WHERE file_path = ?").all(filePath);
  return rows.map(rowToNode);
}
function getAllFiles(db) {
  const rows = db.prepare("SELECT DISTINCT file_path FROM nodes ORDER BY file_path").all();
  return rows.map((r) => r.file_path);
}
function searchNodes(db, query, limit = 20) {
  const words = query.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0)
    return [];
  const conditions = words.map(() => "(name LIKE ? OR qualified_name LIKE ? OR summary LIKE ?)");
  const params = [];
  for (const w of words) {
    params.push(`%${w}%`, `%${w}%`, `%${w}%`);
  }
  const sql = `SELECT * FROM nodes WHERE ${conditions.join(" AND ")} LIMIT ?`;
  params.push(limit);
  const rows = db.prepare(sql).all(...params);
  return rows.map(rowToNode);
}
function getNodesBySize(db, minLines, maxLines, kind, filePathPattern, limit = 50) {
  const conditions = [
    "(line_end - line_start + 1) >= ?"
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
    const likePattern = filePathPattern.replace(/\*\*/g, "%").replace(/\*/g, "%").replace(/\?/g, "_");
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
  const rows = db.prepare(sql).all(...params);
  return rows.map(rowToNode);
}
function getEdgesBySource(db, qualifiedName) {
  const rows = db.prepare("SELECT * FROM edges WHERE source_qualified = ?").all(qualifiedName);
  return rows.map(rowToEdge);
}
function getEdgesByTarget(db, qualifiedName) {
  const rows = db.prepare("SELECT * FROM edges WHERE target_qualified = ?").all(qualifiedName);
  return rows.map(rowToEdge);
}
function searchEdgesByTargetName(db, name2, kind = "CALLS") {
  const rows = db.prepare("SELECT * FROM edges WHERE kind = ? AND (target_qualified LIKE ? OR target_qualified = ?)").all(kind, `%::${name2}`, name2);
  return rows.map(rowToEdge);
}
function getAllEdges(db) {
  const rows = db.prepare("SELECT * FROM edges").all();
  return rows.map(rowToEdge);
}
function getEdgesAmong(db, qualifiedNames) {
  if (qualifiedNames.size === 0)
    return [];
  db.exec("CREATE TEMP TABLE IF NOT EXISTS _qn_filter (qn TEXT PRIMARY KEY)");
  db.exec("DELETE FROM _qn_filter");
  const insert = db.prepare("INSERT OR IGNORE INTO _qn_filter (qn) VALUES (?)");
  db.exec("BEGIN");
  for (const n of qualifiedNames)
    insert.run(n);
  db.exec("COMMIT");
  const rows = db.prepare(`SELECT e.* FROM edges e
       WHERE e.source_qualified IN (SELECT qn FROM _qn_filter)
         AND e.target_qualified IN (SELECT qn FROM _qn_filter)`).all();
  db.exec("DELETE FROM _qn_filter");
  return rows.map(rowToEdge);
}
function getAllEntities(db) {
  return db.prepare(`SELECT e.name, e.display_name, e.source,
              COUNT(em.node_qualified_name) as member_count
       FROM entities e
       LEFT JOIN entity_members em ON em.entity_name = e.name
       GROUP BY e.name
       ORDER BY member_count DESC`).all();
}
function getEntityMembers(db, entityName, minConfidence = 0.5) {
  const rows = db.prepare(`SELECT n.*, em.role, em.confidence
       FROM entity_members em
       JOIN nodes n ON n.qualified_name = em.node_qualified_name
       WHERE em.entity_name = ? AND em.confidence >= ?
       ORDER BY em.role, n.file_path`).all(entityName, minConfidence);
  return rows.map((r) => ({
    node: rowToNode(r),
    role: r.role,
    confidence: r.confidence
  }));
}
function getEntitiesForNode(db, qualifiedName) {
  return db.prepare(`SELECT entity_name, role, confidence
       FROM entity_members
       WHERE node_qualified_name = ?`).all(qualifiedName);
}
function getEntityRoleCounts(db, entityName) {
  const rows = db.prepare(`SELECT role, COUNT(*) as c FROM entity_members
       WHERE entity_name = ? GROUP BY role`).all(entityName);
  const result = {};
  for (const r of rows)
    result[r.role] = r.c;
  return result;
}
function getStats(db, getMetadata) {
  const totalNodes = db.prepare("SELECT COUNT(*) as c FROM nodes").get().c;
  const totalEdges = db.prepare("SELECT COUNT(*) as c FROM edges").get().c;
  const nodesByKind = {};
  const nkRows = db.prepare("SELECT kind, COUNT(*) as c FROM nodes GROUP BY kind").all();
  for (const r of nkRows)
    nodesByKind[r.kind] = r.c;
  const edgesByKind = {};
  const ekRows = db.prepare("SELECT kind, COUNT(*) as c FROM edges GROUP BY kind").all();
  for (const r of ekRows)
    edgesByKind[r.kind] = r.c;
  const langRows = db.prepare("SELECT DISTINCT language FROM nodes WHERE language IS NOT NULL AND language != ''").all();
  const languages = langRows.map((r) => r.language);
  const filesCount = db.prepare("SELECT COUNT(DISTINCT file_path) as c FROM nodes").get().c;
  const lastUpdated = getMetadata("last_updated");
  return {
    total_nodes: totalNodes,
    total_edges: totalEdges,
    nodes_by_kind: nodesByKind,
    edges_by_kind: edgesByKind,
    languages,
    files_count: filesCount,
    last_updated: lastUpdated
  };
}

// dist/store.js
var SCHEMA_SQL = `
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

-- Graph \u2192 Memory bridge (reverse direction of Cortex ai_graph_links)
CREATE TABLE IF NOT EXISTS memory_links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    node_qualified_name TEXT NOT NULL,
    cortex_memory_node_id TEXT,
    cortex_session_id TEXT,
    link_type TEXT DEFAULT 'about',
    agent_id TEXT NOT NULL,
    content_preview TEXT,
    created_at REAL NOT NULL,
    CHECK (cortex_memory_node_id IS NOT NULL OR cortex_session_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_ml_node ON memory_links(node_qualified_name);
CREATE INDEX IF NOT EXISTS idx_ml_cortex_mem ON memory_links(cortex_memory_node_id);
CREATE INDEX IF NOT EXISTS idx_ml_cortex_sess ON memory_links(cortex_session_id);
CREATE INDEX IF NOT EXISTS idx_ml_agent ON memory_links(agent_id);
`;
var GraphStore = class {
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
    try {
      this.db.exec("ALTER TABLE nodes ADD COLUMN summary TEXT");
    } catch {
    }
  }
  /** Expose the raw database for audit-store and other modules. */
  getDb() {
    return this.db;
  }
  close() {
    this.db.close();
  }
  commit() {
  }
  // ── Memory Links (Graph → Cortex bridge) ──────────────────────
  createMemoryLink(params) {
    const now = Date.now() / 1e3;
    const result = this.db.prepare(`INSERT INTO memory_links (node_qualified_name, cortex_memory_node_id, cortex_session_id, link_type, agent_id, content_preview, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`).run(params.node_qualified_name, params.cortex_memory_node_id ?? null, params.cortex_session_id ?? null, params.link_type ?? "about", params.agent_id, params.content_preview ?? null, now);
    return result.lastInsertRowid;
  }
  getMemoryLinksForNode(node_qualified_name) {
    return this.db.prepare("SELECT * FROM memory_links WHERE node_qualified_name = ? ORDER BY created_at DESC").all(node_qualified_name);
  }
  getMemoryLinksForFile(file_path) {
    return this.db.prepare(`SELECT ml.* FROM memory_links ml
       JOIN nodes n ON ml.node_qualified_name = n.qualified_name
       WHERE n.file_path = ?
       ORDER BY ml.created_at DESC`).all(file_path);
  }
  // ── Metadata ───────────────────────────────────────────────────
  setMetadata(key, value) {
    this.db.prepare("INSERT OR REPLACE INTO metadata (key, value) VALUES (?, ?)").run(key, value);
  }
  getMetadata(key) {
    const row = this.db.prepare("SELECT value FROM metadata WHERE key = ?").get(key);
    return row?.value ?? null;
  }
  // ── Node CRUD ──────────────────────────────────────────────────
  upsertNode(node, fileHash2) {
    const qn = makeQualifiedName(node);
    const now = Date.now() / 1e3;
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
    const info2 = stmt.run(node.kind, node.name, qn, node.file_path, node.line_start, node.line_end, node.language ?? null, node.parent_name ?? null, node.params ?? null, node.return_type ?? null, node.modifiers ?? null, node.summary ?? null, node.is_test ? 1 : 0, fileHash2 ?? null, JSON.stringify(node.extra ?? {}), now);
    return Number(info2.lastInsertRowid);
  }
  upsertEdge(edge) {
    const now = Date.now() / 1e3;
    const stmt = this.db.prepare(`
      INSERT INTO edges (kind, source_qualified, target_qualified, file_path, line, extra, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT DO NOTHING
    `);
    const info2 = stmt.run(edge.kind, edge.source, edge.target, edge.file_path, edge.line, JSON.stringify(edge.extra ?? {}), now);
    return Number(info2.lastInsertRowid);
  }
  removeFileData(filePath) {
    this.db.prepare("DELETE FROM nodes WHERE file_path = ?").run(filePath);
    this.db.prepare("DELETE FROM edges WHERE file_path = ?").run(filePath);
  }
  storeFileNodesEdges(filePath, nodes, edges, fileHash2) {
    this.db.exec("BEGIN");
    try {
      this.removeFileData(filePath);
      for (const node of nodes) {
        this.upsertNode(node, fileHash2);
      }
      for (const edge of edges) {
        this.upsertEdge(edge);
      }
      this.db.exec("COMMIT");
    } catch (err2) {
      this.db.exec("ROLLBACK");
      throw err2;
    }
  }
  // ── Entity CRUD ────────────────────────────────────────────────
  upsertEntity(name2, displayName2, source) {
    const now = Date.now() / 1e3;
    this.db.prepare(`INSERT INTO entities (name, display_name, source, updated_at)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(name) DO UPDATE SET
           display_name=excluded.display_name, source=excluded.source, updated_at=excluded.updated_at`).run(name2, displayName2, source, now);
  }
  upsertEntityMember(entityName, nodeQualifiedName, role, confidence) {
    const now = Date.now() / 1e3;
    this.db.prepare(`INSERT INTO entity_members (entity_name, node_qualified_name, role, confidence, updated_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(entity_name, node_qualified_name) DO UPDATE SET
           role=excluded.role,
           confidence=CASE WHEN excluded.confidence > entity_members.confidence
                          THEN excluded.confidence ELSE entity_members.confidence END,
           updated_at=excluded.updated_at`).run(entityName, nodeQualifiedName, role, confidence, now);
  }
  removeEntityData() {
    this.db.exec("DELETE FROM entity_members");
    this.db.exec("DELETE FROM entities");
  }
  // ── Query delegation (implementations in store-queries.ts) ─────
  getNode(qualifiedName) {
    return getNode(this.db, qualifiedName);
  }
  getNodesByFile(filePath) {
    return getNodesByFile(this.db, filePath);
  }
  getAllFiles() {
    return getAllFiles(this.db);
  }
  searchNodes(query, limit = 20) {
    return searchNodes(this.db, query, limit);
  }
  getNodesBySize(minLines, maxLines, kind, filePathPattern, limit = 50) {
    return getNodesBySize(this.db, minLines, maxLines, kind, filePathPattern, limit);
  }
  getEdgesBySource(qualifiedName) {
    return getEdgesBySource(this.db, qualifiedName);
  }
  getEdgesByTarget(qualifiedName) {
    return getEdgesByTarget(this.db, qualifiedName);
  }
  searchEdgesByTargetName(name2, kind = "CALLS") {
    return searchEdgesByTargetName(this.db, name2, kind);
  }
  getAllEdges() {
    return getAllEdges(this.db);
  }
  getEdgesAmong(qualifiedNames) {
    return getEdgesAmong(this.db, qualifiedNames);
  }
  getAllEntities() {
    return getAllEntities(this.db);
  }
  getEntityMembers(entityName, minConfidence = 0.5) {
    return getEntityMembers(this.db, entityName, minConfidence);
  }
  getEntitiesForNode(qualifiedName) {
    return getEntitiesForNode(this.db, qualifiedName);
  }
  getEntityRoleCounts(entityName) {
    return getEntityRoleCounts(this.db, entityName);
  }
  getStats() {
    return getStats(this.db, this.getMetadata.bind(this));
  }
};

// dist/incremental.js
import { execFileSync } from "node:child_process";
import { existsSync as existsSync4, mkdirSync as mkdirSync2, readdirSync, readFileSync as readFileSync13, renameSync, rmSync, statSync as statSync2, writeFileSync as writeFileSync2 } from "node:fs";
import { dirname as dirname8, join as join4, relative as relative2, resolve as resolve4 } from "node:path";

// dist/parser.js
import { createHash } from "node:crypto";
import { readFileSync as readFileSync2 } from "node:fs";
import { basename, dirname as dirname3, extname, join as join2 } from "node:path";
import { fileURLToPath } from "node:url";

// node_modules/.pnpm/web-tree-sitter@0.26.7/node_modules/web-tree-sitter/web-tree-sitter.js
var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var Edit = class {
  static {
    __name(this, "Edit");
  }
  /** The start position of the change. */
  startPosition;
  /** The end position of the change before the edit. */
  oldEndPosition;
  /** The end position of the change after the edit. */
  newEndPosition;
  /** The start index of the change. */
  startIndex;
  /** The end index of the change before the edit. */
  oldEndIndex;
  /** The end index of the change after the edit. */
  newEndIndex;
  constructor({
    startIndex,
    oldEndIndex,
    newEndIndex,
    startPosition,
    oldEndPosition,
    newEndPosition
  }) {
    this.startIndex = startIndex >>> 0;
    this.oldEndIndex = oldEndIndex >>> 0;
    this.newEndIndex = newEndIndex >>> 0;
    this.startPosition = startPosition;
    this.oldEndPosition = oldEndPosition;
    this.newEndPosition = newEndPosition;
  }
  /**
   * Edit a point and index to keep it in-sync with source code that has been edited.
   *
   * This function updates a single point's byte offset and row/column position
   * based on an edit operation. This is useful for editing points without
   * requiring a tree or node instance.
   */
  editPoint(point, index) {
    let newIndex = index;
    const newPoint = { ...point };
    if (index >= this.oldEndIndex) {
      newIndex = this.newEndIndex + (index - this.oldEndIndex);
      const originalRow = point.row;
      newPoint.row = this.newEndPosition.row + (point.row - this.oldEndPosition.row);
      newPoint.column = originalRow === this.oldEndPosition.row ? this.newEndPosition.column + (point.column - this.oldEndPosition.column) : point.column;
    } else if (index > this.startIndex) {
      newIndex = this.newEndIndex;
      newPoint.row = this.newEndPosition.row;
      newPoint.column = this.newEndPosition.column;
    }
    return { point: newPoint, index: newIndex };
  }
  /**
   * Edit a range to keep it in-sync with source code that has been edited.
   *
   * This function updates a range's start and end positions based on an edit
   * operation. This is useful for editing ranges without requiring a tree
   * or node instance.
   */
  editRange(range) {
    const newRange = {
      startIndex: range.startIndex,
      startPosition: { ...range.startPosition },
      endIndex: range.endIndex,
      endPosition: { ...range.endPosition }
    };
    if (range.endIndex >= this.oldEndIndex) {
      if (range.endIndex !== Number.MAX_SAFE_INTEGER) {
        newRange.endIndex = this.newEndIndex + (range.endIndex - this.oldEndIndex);
        newRange.endPosition = {
          row: this.newEndPosition.row + (range.endPosition.row - this.oldEndPosition.row),
          column: range.endPosition.row === this.oldEndPosition.row ? this.newEndPosition.column + (range.endPosition.column - this.oldEndPosition.column) : range.endPosition.column
        };
        if (newRange.endIndex < this.newEndIndex) {
          newRange.endIndex = Number.MAX_SAFE_INTEGER;
          newRange.endPosition = { row: Number.MAX_SAFE_INTEGER, column: Number.MAX_SAFE_INTEGER };
        }
      }
    } else if (range.endIndex > this.startIndex) {
      newRange.endIndex = this.startIndex;
      newRange.endPosition = { ...this.startPosition };
    }
    if (range.startIndex >= this.oldEndIndex) {
      newRange.startIndex = this.newEndIndex + (range.startIndex - this.oldEndIndex);
      newRange.startPosition = {
        row: this.newEndPosition.row + (range.startPosition.row - this.oldEndPosition.row),
        column: range.startPosition.row === this.oldEndPosition.row ? this.newEndPosition.column + (range.startPosition.column - this.oldEndPosition.column) : range.startPosition.column
      };
      if (newRange.startIndex < this.newEndIndex) {
        newRange.startIndex = Number.MAX_SAFE_INTEGER;
        newRange.startPosition = { row: Number.MAX_SAFE_INTEGER, column: Number.MAX_SAFE_INTEGER };
      }
    } else if (range.startIndex > this.startIndex) {
      newRange.startIndex = this.startIndex;
      newRange.startPosition = { ...this.startPosition };
    }
    return newRange;
  }
};
var SIZE_OF_SHORT = 2;
var SIZE_OF_INT = 4;
var SIZE_OF_CURSOR = 4 * SIZE_OF_INT;
var SIZE_OF_NODE = 5 * SIZE_OF_INT;
var SIZE_OF_POINT = 2 * SIZE_OF_INT;
var SIZE_OF_RANGE = 2 * SIZE_OF_INT + 2 * SIZE_OF_POINT;
var ZERO_POINT = { row: 0, column: 0 };
var INTERNAL = /* @__PURE__ */ Symbol("INTERNAL");
function assertInternal(x) {
  if (x !== INTERNAL) throw new Error("Illegal constructor");
}
__name(assertInternal, "assertInternal");
function isPoint(point) {
  return !!point && typeof point.row === "number" && typeof point.column === "number";
}
__name(isPoint, "isPoint");
function setModule(module2) {
  C = module2;
}
__name(setModule, "setModule");
var C;
var LookaheadIterator = class {
  static {
    __name(this, "LookaheadIterator");
  }
  /** @internal */
  [0] = 0;
  // Internal handle for Wasm
  /** @internal */
  language;
  /** @internal */
  constructor(internal, address, language) {
    assertInternal(internal);
    this[0] = address;
    this.language = language;
  }
  /** Get the current symbol of the lookahead iterator. */
  get currentTypeId() {
    return C._ts_lookahead_iterator_current_symbol(this[0]);
  }
  /** Get the current symbol name of the lookahead iterator. */
  get currentType() {
    return this.language.types[this.currentTypeId] || "ERROR";
  }
  /** Delete the lookahead iterator, freeing its resources. */
  delete() {
    C._ts_lookahead_iterator_delete(this[0]);
    this[0] = 0;
  }
  /**
   * Reset the lookahead iterator.
   *
   * This returns `true` if the language was set successfully and `false`
   * otherwise.
   */
  reset(language, stateId) {
    if (C._ts_lookahead_iterator_reset(this[0], language[0], stateId)) {
      this.language = language;
      return true;
    }
    return false;
  }
  /**
   * Reset the lookahead iterator to another state.
   *
   * This returns `true` if the iterator was reset to the given state and
   * `false` otherwise.
   */
  resetState(stateId) {
    return Boolean(C._ts_lookahead_iterator_reset_state(this[0], stateId));
  }
  /**
   * Returns an iterator that iterates over the symbols of the lookahead iterator.
   *
   * The iterator will yield the current symbol name as a string for each step
   * until there are no more symbols to iterate over.
   */
  [Symbol.iterator]() {
    return {
      next: /* @__PURE__ */ __name(() => {
        if (C._ts_lookahead_iterator_next(this[0])) {
          return { done: false, value: this.currentType };
        }
        return { done: true, value: "" };
      }, "next")
    };
  }
};
function getText(tree, startIndex, endIndex, startPosition) {
  const length = endIndex - startIndex;
  let result = tree.textCallback(startIndex, startPosition);
  if (result) {
    startIndex += result.length;
    while (startIndex < endIndex) {
      const string = tree.textCallback(startIndex, startPosition);
      if (string && string.length > 0) {
        startIndex += string.length;
        result += string;
      } else {
        break;
      }
    }
    if (startIndex > endIndex) {
      result = result.slice(0, length);
    }
  }
  return result ?? "";
}
__name(getText, "getText");
var Tree = class _Tree {
  static {
    __name(this, "Tree");
  }
  /** @internal */
  [0] = 0;
  // Internal handle for Wasm
  /** @internal */
  textCallback;
  /** The language that was used to parse the syntax tree. */
  language;
  /** @internal */
  constructor(internal, address, language, textCallback) {
    assertInternal(internal);
    this[0] = address;
    this.language = language;
    this.textCallback = textCallback;
  }
  /** Create a shallow copy of the syntax tree. This is very fast. */
  copy() {
    const address = C._ts_tree_copy(this[0]);
    return new _Tree(INTERNAL, address, this.language, this.textCallback);
  }
  /** Delete the syntax tree, freeing its resources. */
  delete() {
    C._ts_tree_delete(this[0]);
    this[0] = 0;
  }
  /** Get the root node of the syntax tree. */
  get rootNode() {
    C._ts_tree_root_node_wasm(this[0]);
    return unmarshalNode(this);
  }
  /**
   * Get the root node of the syntax tree, but with its position shifted
   * forward by the given offset.
   */
  rootNodeWithOffset(offsetBytes, offsetExtent) {
    const address = TRANSFER_BUFFER + SIZE_OF_NODE;
    C.setValue(address, offsetBytes, "i32");
    marshalPoint(address + SIZE_OF_INT, offsetExtent);
    C._ts_tree_root_node_with_offset_wasm(this[0]);
    return unmarshalNode(this);
  }
  /**
   * Edit the syntax tree to keep it in sync with source code that has been
   * edited.
   *
   * You must describe the edit both in terms of byte offsets and in terms of
   * row/column coordinates.
   */
  edit(edit) {
    marshalEdit(edit);
    C._ts_tree_edit_wasm(this[0]);
  }
  /** Create a new {@link TreeCursor} starting from the root of the tree. */
  walk() {
    return this.rootNode.walk();
  }
  /**
   * Compare this old edited syntax tree to a new syntax tree representing
   * the same document, returning a sequence of ranges whose syntactic
   * structure has changed.
   *
   * For this to work correctly, this syntax tree must have been edited such
   * that its ranges match up to the new tree. Generally, you'll want to
   * call this method right after calling one of the [`Parser::parse`]
   * functions. Call it on the old tree that was passed to parse, and
   * pass the new tree that was returned from `parse`.
   */
  getChangedRanges(other) {
    if (!(other instanceof _Tree)) {
      throw new TypeError("Argument must be a Tree");
    }
    C._ts_tree_get_changed_ranges_wasm(this[0], other[0]);
    const count = C.getValue(TRANSFER_BUFFER, "i32");
    const buffer = C.getValue(TRANSFER_BUFFER + SIZE_OF_INT, "i32");
    const result = new Array(count);
    if (count > 0) {
      let address = buffer;
      for (let i2 = 0; i2 < count; i2++) {
        result[i2] = unmarshalRange(address);
        address += SIZE_OF_RANGE;
      }
      C._free(buffer);
    }
    return result;
  }
  /** Get the included ranges that were used to parse the syntax tree. */
  getIncludedRanges() {
    C._ts_tree_included_ranges_wasm(this[0]);
    const count = C.getValue(TRANSFER_BUFFER, "i32");
    const buffer = C.getValue(TRANSFER_BUFFER + SIZE_OF_INT, "i32");
    const result = new Array(count);
    if (count > 0) {
      let address = buffer;
      for (let i2 = 0; i2 < count; i2++) {
        result[i2] = unmarshalRange(address);
        address += SIZE_OF_RANGE;
      }
      C._free(buffer);
    }
    return result;
  }
};
var TreeCursor = class _TreeCursor {
  static {
    __name(this, "TreeCursor");
  }
  /** @internal */
  // @ts-expect-error: never read
  [0] = 0;
  // Internal handle for Wasm
  /** @internal */
  // @ts-expect-error: never read
  [1] = 0;
  // Internal handle for Wasm
  /** @internal */
  // @ts-expect-error: never read
  [2] = 0;
  // Internal handle for Wasm
  /** @internal */
  // @ts-expect-error: never read
  [3] = 0;
  // Internal handle for Wasm
  /** @internal */
  tree;
  /** @internal */
  constructor(internal, tree) {
    assertInternal(internal);
    this.tree = tree;
    unmarshalTreeCursor(this);
  }
  /** Creates a deep copy of the tree cursor. This allocates new memory. */
  copy() {
    const copy = new _TreeCursor(INTERNAL, this.tree);
    C._ts_tree_cursor_copy_wasm(this.tree[0]);
    unmarshalTreeCursor(copy);
    return copy;
  }
  /** Delete the tree cursor, freeing its resources. */
  delete() {
    marshalTreeCursor(this);
    C._ts_tree_cursor_delete_wasm(this.tree[0]);
    this[0] = this[1] = this[2] = 0;
  }
  /** Get the tree cursor's current {@link Node}. */
  get currentNode() {
    marshalTreeCursor(this);
    C._ts_tree_cursor_current_node_wasm(this.tree[0]);
    return unmarshalNode(this.tree);
  }
  /**
   * Get the numerical field id of this tree cursor's current node.
   *
   * See also {@link TreeCursor#currentFieldName}.
   */
  get currentFieldId() {
    marshalTreeCursor(this);
    return C._ts_tree_cursor_current_field_id_wasm(this.tree[0]);
  }
  /** Get the field name of this tree cursor's current node. */
  get currentFieldName() {
    return this.tree.language.fields[this.currentFieldId];
  }
  /**
   * Get the depth of the cursor's current node relative to the original
   * node that the cursor was constructed with.
   */
  get currentDepth() {
    marshalTreeCursor(this);
    return C._ts_tree_cursor_current_depth_wasm(this.tree[0]);
  }
  /**
   * Get the index of the cursor's current node out of all of the
   * descendants of the original node that the cursor was constructed with.
   */
  get currentDescendantIndex() {
    marshalTreeCursor(this);
    return C._ts_tree_cursor_current_descendant_index_wasm(this.tree[0]);
  }
  /** Get the type of the cursor's current node. */
  get nodeType() {
    return this.tree.language.types[this.nodeTypeId] || "ERROR";
  }
  /** Get the type id of the cursor's current node. */
  get nodeTypeId() {
    marshalTreeCursor(this);
    return C._ts_tree_cursor_current_node_type_id_wasm(this.tree[0]);
  }
  /** Get the state id of the cursor's current node. */
  get nodeStateId() {
    marshalTreeCursor(this);
    return C._ts_tree_cursor_current_node_state_id_wasm(this.tree[0]);
  }
  /** Get the id of the cursor's current node. */
  get nodeId() {
    marshalTreeCursor(this);
    return C._ts_tree_cursor_current_node_id_wasm(this.tree[0]);
  }
  /**
   * Check if the cursor's current node is *named*.
   *
   * Named nodes correspond to named rules in the grammar, whereas
   * *anonymous* nodes correspond to string literals in the grammar.
   */
  get nodeIsNamed() {
    marshalTreeCursor(this);
    return C._ts_tree_cursor_current_node_is_named_wasm(this.tree[0]) === 1;
  }
  /**
   * Check if the cursor's current node is *missing*.
   *
   * Missing nodes are inserted by the parser in order to recover from
   * certain kinds of syntax errors.
   */
  get nodeIsMissing() {
    marshalTreeCursor(this);
    return C._ts_tree_cursor_current_node_is_missing_wasm(this.tree[0]) === 1;
  }
  /** Get the string content of the cursor's current node. */
  get nodeText() {
    marshalTreeCursor(this);
    const startIndex = C._ts_tree_cursor_start_index_wasm(this.tree[0]);
    const endIndex = C._ts_tree_cursor_end_index_wasm(this.tree[0]);
    C._ts_tree_cursor_start_position_wasm(this.tree[0]);
    const startPosition = unmarshalPoint(TRANSFER_BUFFER);
    return getText(this.tree, startIndex, endIndex, startPosition);
  }
  /** Get the start position of the cursor's current node. */
  get startPosition() {
    marshalTreeCursor(this);
    C._ts_tree_cursor_start_position_wasm(this.tree[0]);
    return unmarshalPoint(TRANSFER_BUFFER);
  }
  /** Get the end position of the cursor's current node. */
  get endPosition() {
    marshalTreeCursor(this);
    C._ts_tree_cursor_end_position_wasm(this.tree[0]);
    return unmarshalPoint(TRANSFER_BUFFER);
  }
  /** Get the start index of the cursor's current node. */
  get startIndex() {
    marshalTreeCursor(this);
    return C._ts_tree_cursor_start_index_wasm(this.tree[0]);
  }
  /** Get the end index of the cursor's current node. */
  get endIndex() {
    marshalTreeCursor(this);
    return C._ts_tree_cursor_end_index_wasm(this.tree[0]);
  }
  /**
   * Move this cursor to the first child of its current node.
   *
   * This returns `true` if the cursor successfully moved, and returns
   * `false` if there were no children.
   */
  gotoFirstChild() {
    marshalTreeCursor(this);
    const result = C._ts_tree_cursor_goto_first_child_wasm(this.tree[0]);
    unmarshalTreeCursor(this);
    return result === 1;
  }
  /**
   * Move this cursor to the last child of its current node.
   *
   * This returns `true` if the cursor successfully moved, and returns
   * `false` if there were no children.
   *
   * Note that this function may be slower than
   * {@link TreeCursor#gotoFirstChild} because it needs to
   * iterate through all the children to compute the child's position.
   */
  gotoLastChild() {
    marshalTreeCursor(this);
    const result = C._ts_tree_cursor_goto_last_child_wasm(this.tree[0]);
    unmarshalTreeCursor(this);
    return result === 1;
  }
  /**
   * Move this cursor to the parent of its current node.
   *
   * This returns `true` if the cursor successfully moved, and returns
   * `false` if there was no parent node (the cursor was already on the
   * root node).
   *
   * Note that the node the cursor was constructed with is considered the root
   * of the cursor, and the cursor cannot walk outside this node.
   */
  gotoParent() {
    marshalTreeCursor(this);
    const result = C._ts_tree_cursor_goto_parent_wasm(this.tree[0]);
    unmarshalTreeCursor(this);
    return result === 1;
  }
  /**
   * Move this cursor to the next sibling of its current node.
   *
   * This returns `true` if the cursor successfully moved, and returns
   * `false` if there was no next sibling node.
   *
   * Note that the node the cursor was constructed with is considered the root
   * of the cursor, and the cursor cannot walk outside this node.
   */
  gotoNextSibling() {
    marshalTreeCursor(this);
    const result = C._ts_tree_cursor_goto_next_sibling_wasm(this.tree[0]);
    unmarshalTreeCursor(this);
    return result === 1;
  }
  /**
   * Move this cursor to the previous sibling of its current node.
   *
   * This returns `true` if the cursor successfully moved, and returns
   * `false` if there was no previous sibling node.
   *
   * Note that this function may be slower than
   * {@link TreeCursor#gotoNextSibling} due to how node
   * positions are stored. In the worst case, this will need to iterate
   * through all the children up to the previous sibling node to recalculate
   * its position. Also note that the node the cursor was constructed with is
   * considered the root of the cursor, and the cursor cannot walk outside this node.
   */
  gotoPreviousSibling() {
    marshalTreeCursor(this);
    const result = C._ts_tree_cursor_goto_previous_sibling_wasm(this.tree[0]);
    unmarshalTreeCursor(this);
    return result === 1;
  }
  /**
   * Move the cursor to the node that is the nth descendant of
   * the original node that the cursor was constructed with, where
   * zero represents the original node itself.
   */
  gotoDescendant(goalDescendantIndex) {
    marshalTreeCursor(this);
    C._ts_tree_cursor_goto_descendant_wasm(this.tree[0], goalDescendantIndex);
    unmarshalTreeCursor(this);
  }
  /**
   * Move this cursor to the first child of its current node that contains or
   * starts after the given byte offset.
   *
   * This returns `true` if the cursor successfully moved to a child node, and returns
   * `false` if no such child was found.
   */
  gotoFirstChildForIndex(goalIndex) {
    marshalTreeCursor(this);
    C.setValue(TRANSFER_BUFFER + SIZE_OF_CURSOR, goalIndex, "i32");
    const result = C._ts_tree_cursor_goto_first_child_for_index_wasm(this.tree[0]);
    unmarshalTreeCursor(this);
    return result === 1;
  }
  /**
   * Move this cursor to the first child of its current node that contains or
   * starts after the given byte offset.
   *
   * This returns the index of the child node if one was found, and returns
   * `null` if no such child was found.
   */
  gotoFirstChildForPosition(goalPosition) {
    marshalTreeCursor(this);
    marshalPoint(TRANSFER_BUFFER + SIZE_OF_CURSOR, goalPosition);
    const result = C._ts_tree_cursor_goto_first_child_for_position_wasm(this.tree[0]);
    unmarshalTreeCursor(this);
    return result === 1;
  }
  /**
   * Re-initialize this tree cursor to start at the original node that the
   * cursor was constructed with.
   */
  reset(node) {
    marshalNode(node);
    marshalTreeCursor(this, TRANSFER_BUFFER + SIZE_OF_NODE);
    C._ts_tree_cursor_reset_wasm(this.tree[0]);
    unmarshalTreeCursor(this);
  }
  /**
   * Re-initialize a tree cursor to the same position as another cursor.
   *
   * Unlike {@link TreeCursor#reset}, this will not lose parent
   * information and allows reusing already created cursors.
   */
  resetTo(cursor) {
    marshalTreeCursor(this, TRANSFER_BUFFER);
    marshalTreeCursor(cursor, TRANSFER_BUFFER + SIZE_OF_CURSOR);
    C._ts_tree_cursor_reset_to_wasm(this.tree[0], cursor.tree[0]);
    unmarshalTreeCursor(this);
  }
};
var Node = class {
  static {
    __name(this, "Node");
  }
  /** @internal */
  // @ts-expect-error: never read
  [0] = 0;
  // Internal handle for Wasm
  /** @internal */
  _children;
  /** @internal */
  _namedChildren;
  /** @internal */
  constructor(internal, {
    id,
    tree,
    startIndex,
    startPosition,
    other
  }) {
    assertInternal(internal);
    this[0] = other;
    this.id = id;
    this.tree = tree;
    this.startIndex = startIndex;
    this.startPosition = startPosition;
  }
  /**
   * The numeric id for this node that is unique.
   *
   * Within a given syntax tree, no two nodes have the same id. However:
   *
   * * If a new tree is created based on an older tree, and a node from the old tree is reused in
   *   the process, then that node will have the same id in both trees.
   *
   * * A node not marked as having changes does not guarantee it was reused.
   *
   * * If a node is marked as having changed in the old tree, it will not be reused.
   */
  id;
  /** The byte index where this node starts. */
  startIndex;
  /** The position where this node starts. */
  startPosition;
  /** The tree that this node belongs to. */
  tree;
  /** Get this node's type as a numerical id. */
  get typeId() {
    marshalNode(this);
    return C._ts_node_symbol_wasm(this.tree[0]);
  }
  /**
   * Get the node's type as a numerical id as it appears in the grammar,
   * ignoring aliases.
   */
  get grammarId() {
    marshalNode(this);
    return C._ts_node_grammar_symbol_wasm(this.tree[0]);
  }
  /** Get this node's type as a string. */
  get type() {
    return this.tree.language.types[this.typeId] || "ERROR";
  }
  /**
   * Get this node's symbol name as it appears in the grammar, ignoring
   * aliases as a string.
   */
  get grammarType() {
    return this.tree.language.types[this.grammarId] || "ERROR";
  }
  /**
   * Check if this node is *named*.
   *
   * Named nodes correspond to named rules in the grammar, whereas
   * *anonymous* nodes correspond to string literals in the grammar.
   */
  get isNamed() {
    marshalNode(this);
    return C._ts_node_is_named_wasm(this.tree[0]) === 1;
  }
  /**
   * Check if this node is *extra*.
   *
   * Extra nodes represent things like comments, which are not required
   * by the grammar, but can appear anywhere.
   */
  get isExtra() {
    marshalNode(this);
    return C._ts_node_is_extra_wasm(this.tree[0]) === 1;
  }
  /**
   * Check if this node represents a syntax error.
   *
   * Syntax errors represent parts of the code that could not be incorporated
   * into a valid syntax tree.
   */
  get isError() {
    marshalNode(this);
    return C._ts_node_is_error_wasm(this.tree[0]) === 1;
  }
  /**
   * Check if this node is *missing*.
   *
   * Missing nodes are inserted by the parser in order to recover from
   * certain kinds of syntax errors.
   */
  get isMissing() {
    marshalNode(this);
    return C._ts_node_is_missing_wasm(this.tree[0]) === 1;
  }
  /** Check if this node has been edited. */
  get hasChanges() {
    marshalNode(this);
    return C._ts_node_has_changes_wasm(this.tree[0]) === 1;
  }
  /**
   * Check if this node represents a syntax error or contains any syntax
   * errors anywhere within it.
   */
  get hasError() {
    marshalNode(this);
    return C._ts_node_has_error_wasm(this.tree[0]) === 1;
  }
  /** Get the byte index where this node ends. */
  get endIndex() {
    marshalNode(this);
    return C._ts_node_end_index_wasm(this.tree[0]);
  }
  /** Get the position where this node ends. */
  get endPosition() {
    marshalNode(this);
    C._ts_node_end_point_wasm(this.tree[0]);
    return unmarshalPoint(TRANSFER_BUFFER);
  }
  /** Get the string content of this node. */
  get text() {
    return getText(this.tree, this.startIndex, this.endIndex, this.startPosition);
  }
  /** Get this node's parse state. */
  get parseState() {
    marshalNode(this);
    return C._ts_node_parse_state_wasm(this.tree[0]);
  }
  /** Get the parse state after this node. */
  get nextParseState() {
    marshalNode(this);
    return C._ts_node_next_parse_state_wasm(this.tree[0]);
  }
  /** Check if this node is equal to another node. */
  equals(other) {
    return this.tree === other.tree && this.id === other.id;
  }
  /**
   * Get the node's child at the given index, where zero represents the first child.
   *
   * This method is fairly fast, but its cost is technically log(n), so if
   * you might be iterating over a long list of children, you should use
   * {@link Node#children} instead.
   */
  child(index) {
    marshalNode(this);
    C._ts_node_child_wasm(this.tree[0], index);
    return unmarshalNode(this.tree);
  }
  /**
   * Get this node's *named* child at the given index.
   *
   * See also {@link Node#isNamed}.
   * This method is fairly fast, but its cost is technically log(n), so if
   * you might be iterating over a long list of children, you should use
   * {@link Node#namedChildren} instead.
   */
  namedChild(index) {
    marshalNode(this);
    C._ts_node_named_child_wasm(this.tree[0], index);
    return unmarshalNode(this.tree);
  }
  /**
   * Get this node's child with the given numerical field id.
   *
   * See also {@link Node#childForFieldName}. You can
   * convert a field name to an id using {@link Language#fieldIdForName}.
   */
  childForFieldId(fieldId) {
    marshalNode(this);
    C._ts_node_child_by_field_id_wasm(this.tree[0], fieldId);
    return unmarshalNode(this.tree);
  }
  /**
   * Get the first child with the given field name.
   *
   * If multiple children may have the same field name, access them using
   * {@link Node#childrenForFieldName}.
   */
  childForFieldName(fieldName) {
    const fieldId = this.tree.language.fields.indexOf(fieldName);
    if (fieldId !== -1) return this.childForFieldId(fieldId);
    return null;
  }
  /** Get the field name of this node's child at the given index. */
  fieldNameForChild(index) {
    marshalNode(this);
    const address = C._ts_node_field_name_for_child_wasm(this.tree[0], index);
    if (!address) return null;
    return C.AsciiToString(address);
  }
  /** Get the field name of this node's named child at the given index. */
  fieldNameForNamedChild(index) {
    marshalNode(this);
    const address = C._ts_node_field_name_for_named_child_wasm(this.tree[0], index);
    if (!address) return null;
    return C.AsciiToString(address);
  }
  /**
   * Get an array of this node's children with a given field name.
   *
   * See also {@link Node#children}.
   */
  childrenForFieldName(fieldName) {
    const fieldId = this.tree.language.fields.indexOf(fieldName);
    if (fieldId !== -1 && fieldId !== 0) return this.childrenForFieldId(fieldId);
    return [];
  }
  /**
    * Get an array of this node's children with a given field id.
    *
    * See also {@link Node#childrenForFieldName}.
    */
  childrenForFieldId(fieldId) {
    marshalNode(this);
    C._ts_node_children_by_field_id_wasm(this.tree[0], fieldId);
    const count = C.getValue(TRANSFER_BUFFER, "i32");
    const buffer = C.getValue(TRANSFER_BUFFER + SIZE_OF_INT, "i32");
    const result = new Array(count);
    if (count > 0) {
      let address = buffer;
      for (let i2 = 0; i2 < count; i2++) {
        result[i2] = unmarshalNode(this.tree, address);
        address += SIZE_OF_NODE;
      }
      C._free(buffer);
    }
    return result;
  }
  /** Get the node's first child that contains or starts after the given byte offset. */
  firstChildForIndex(index) {
    marshalNode(this);
    const address = TRANSFER_BUFFER + SIZE_OF_NODE;
    C.setValue(address, index, "i32");
    C._ts_node_first_child_for_byte_wasm(this.tree[0]);
    return unmarshalNode(this.tree);
  }
  /** Get the node's first named child that contains or starts after the given byte offset. */
  firstNamedChildForIndex(index) {
    marshalNode(this);
    const address = TRANSFER_BUFFER + SIZE_OF_NODE;
    C.setValue(address, index, "i32");
    C._ts_node_first_named_child_for_byte_wasm(this.tree[0]);
    return unmarshalNode(this.tree);
  }
  /** Get this node's number of children. */
  get childCount() {
    marshalNode(this);
    return C._ts_node_child_count_wasm(this.tree[0]);
  }
  /**
   * Get this node's number of *named* children.
   *
   * See also {@link Node#isNamed}.
   */
  get namedChildCount() {
    marshalNode(this);
    return C._ts_node_named_child_count_wasm(this.tree[0]);
  }
  /** Get this node's first child. */
  get firstChild() {
    return this.child(0);
  }
  /**
   * Get this node's first named child.
   *
   * See also {@link Node#isNamed}.
   */
  get firstNamedChild() {
    return this.namedChild(0);
  }
  /** Get this node's last child. */
  get lastChild() {
    return this.child(this.childCount - 1);
  }
  /**
   * Get this node's last named child.
   *
   * See also {@link Node#isNamed}.
   */
  get lastNamedChild() {
    return this.namedChild(this.namedChildCount - 1);
  }
  /**
   * Iterate over this node's children.
   *
   * If you're walking the tree recursively, you may want to use the
   * {@link TreeCursor} APIs directly instead.
   */
  get children() {
    if (!this._children) {
      marshalNode(this);
      C._ts_node_children_wasm(this.tree[0]);
      const count = C.getValue(TRANSFER_BUFFER, "i32");
      const buffer = C.getValue(TRANSFER_BUFFER + SIZE_OF_INT, "i32");
      this._children = new Array(count);
      if (count > 0) {
        let address = buffer;
        for (let i2 = 0; i2 < count; i2++) {
          this._children[i2] = unmarshalNode(this.tree, address);
          address += SIZE_OF_NODE;
        }
        C._free(buffer);
      }
    }
    return this._children;
  }
  /**
   * Iterate over this node's named children.
   *
   * See also {@link Node#children}.
   */
  get namedChildren() {
    if (!this._namedChildren) {
      marshalNode(this);
      C._ts_node_named_children_wasm(this.tree[0]);
      const count = C.getValue(TRANSFER_BUFFER, "i32");
      const buffer = C.getValue(TRANSFER_BUFFER + SIZE_OF_INT, "i32");
      this._namedChildren = new Array(count);
      if (count > 0) {
        let address = buffer;
        for (let i2 = 0; i2 < count; i2++) {
          this._namedChildren[i2] = unmarshalNode(this.tree, address);
          address += SIZE_OF_NODE;
        }
        C._free(buffer);
      }
    }
    return this._namedChildren;
  }
  /**
   * Get the descendants of this node that are the given type, or in the given types array.
   *
   * The types array should contain node type strings, which can be retrieved from {@link Language#types}.
   *
   * Additionally, a `startPosition` and `endPosition` can be passed in to restrict the search to a byte range.
   */
  descendantsOfType(types, startPosition = ZERO_POINT, endPosition = ZERO_POINT) {
    if (!Array.isArray(types)) types = [types];
    const symbols = [];
    const typesBySymbol = this.tree.language.types;
    for (const node_type of types) {
      if (node_type == "ERROR") {
        symbols.push(65535);
      }
    }
    for (let i2 = 0, n = typesBySymbol.length; i2 < n; i2++) {
      if (types.includes(typesBySymbol[i2])) {
        symbols.push(i2);
      }
    }
    const symbolsAddress = C._malloc(SIZE_OF_INT * symbols.length);
    for (let i2 = 0, n = symbols.length; i2 < n; i2++) {
      C.setValue(symbolsAddress + i2 * SIZE_OF_INT, symbols[i2], "i32");
    }
    marshalNode(this);
    C._ts_node_descendants_of_type_wasm(
      this.tree[0],
      symbolsAddress,
      symbols.length,
      startPosition.row,
      startPosition.column,
      endPosition.row,
      endPosition.column
    );
    const descendantCount = C.getValue(TRANSFER_BUFFER, "i32");
    const descendantAddress = C.getValue(TRANSFER_BUFFER + SIZE_OF_INT, "i32");
    const result = new Array(descendantCount);
    if (descendantCount > 0) {
      let address = descendantAddress;
      for (let i2 = 0; i2 < descendantCount; i2++) {
        result[i2] = unmarshalNode(this.tree, address);
        address += SIZE_OF_NODE;
      }
    }
    C._free(descendantAddress);
    C._free(symbolsAddress);
    return result;
  }
  /** Get this node's next sibling. */
  get nextSibling() {
    marshalNode(this);
    C._ts_node_next_sibling_wasm(this.tree[0]);
    return unmarshalNode(this.tree);
  }
  /** Get this node's previous sibling. */
  get previousSibling() {
    marshalNode(this);
    C._ts_node_prev_sibling_wasm(this.tree[0]);
    return unmarshalNode(this.tree);
  }
  /**
   * Get this node's next *named* sibling.
   *
   * See also {@link Node#isNamed}.
   */
  get nextNamedSibling() {
    marshalNode(this);
    C._ts_node_next_named_sibling_wasm(this.tree[0]);
    return unmarshalNode(this.tree);
  }
  /**
   * Get this node's previous *named* sibling.
   *
   * See also {@link Node#isNamed}.
   */
  get previousNamedSibling() {
    marshalNode(this);
    C._ts_node_prev_named_sibling_wasm(this.tree[0]);
    return unmarshalNode(this.tree);
  }
  /** Get the node's number of descendants, including one for the node itself. */
  get descendantCount() {
    marshalNode(this);
    return C._ts_node_descendant_count_wasm(this.tree[0]);
  }
  /**
   * Get this node's immediate parent.
   * Prefer {@link Node#childWithDescendant} for iterating over this node's ancestors.
   */
  get parent() {
    marshalNode(this);
    C._ts_node_parent_wasm(this.tree[0]);
    return unmarshalNode(this.tree);
  }
  /**
   * Get the node that contains `descendant`.
   *
   * Note that this can return `descendant` itself.
   */
  childWithDescendant(descendant) {
    marshalNode(this);
    marshalNode(descendant, 1);
    C._ts_node_child_with_descendant_wasm(this.tree[0]);
    return unmarshalNode(this.tree);
  }
  /** Get the smallest node within this node that spans the given byte range. */
  descendantForIndex(start2, end = start2) {
    if (typeof start2 !== "number" || typeof end !== "number") {
      throw new Error("Arguments must be numbers");
    }
    marshalNode(this);
    const address = TRANSFER_BUFFER + SIZE_OF_NODE;
    C.setValue(address, start2, "i32");
    C.setValue(address + SIZE_OF_INT, end, "i32");
    C._ts_node_descendant_for_index_wasm(this.tree[0]);
    return unmarshalNode(this.tree);
  }
  /** Get the smallest named node within this node that spans the given byte range. */
  namedDescendantForIndex(start2, end = start2) {
    if (typeof start2 !== "number" || typeof end !== "number") {
      throw new Error("Arguments must be numbers");
    }
    marshalNode(this);
    const address = TRANSFER_BUFFER + SIZE_OF_NODE;
    C.setValue(address, start2, "i32");
    C.setValue(address + SIZE_OF_INT, end, "i32");
    C._ts_node_named_descendant_for_index_wasm(this.tree[0]);
    return unmarshalNode(this.tree);
  }
  /** Get the smallest node within this node that spans the given point range. */
  descendantForPosition(start2, end = start2) {
    if (!isPoint(start2) || !isPoint(end)) {
      throw new Error("Arguments must be {row, column} objects");
    }
    marshalNode(this);
    const address = TRANSFER_BUFFER + SIZE_OF_NODE;
    marshalPoint(address, start2);
    marshalPoint(address + SIZE_OF_POINT, end);
    C._ts_node_descendant_for_position_wasm(this.tree[0]);
    return unmarshalNode(this.tree);
  }
  /** Get the smallest named node within this node that spans the given point range. */
  namedDescendantForPosition(start2, end = start2) {
    if (!isPoint(start2) || !isPoint(end)) {
      throw new Error("Arguments must be {row, column} objects");
    }
    marshalNode(this);
    const address = TRANSFER_BUFFER + SIZE_OF_NODE;
    marshalPoint(address, start2);
    marshalPoint(address + SIZE_OF_POINT, end);
    C._ts_node_named_descendant_for_position_wasm(this.tree[0]);
    return unmarshalNode(this.tree);
  }
  /**
   * Create a new {@link TreeCursor} starting from this node.
   *
   * Note that the given node is considered the root of the cursor,
   * and the cursor cannot walk outside this node.
   */
  walk() {
    marshalNode(this);
    C._ts_tree_cursor_new_wasm(this.tree[0]);
    return new TreeCursor(INTERNAL, this.tree);
  }
  /**
   * Edit this node to keep it in-sync with source code that has been edited.
   *
   * This function is only rarely needed. When you edit a syntax tree with
   * the {@link Tree#edit} method, all of the nodes that you retrieve from
   * the tree afterward will already reflect the edit. You only need to
   * use {@link Node#edit} when you have a specific {@link Node} instance that
   * you want to keep and continue to use after an edit.
   */
  edit(edit) {
    if (this.startIndex >= edit.oldEndIndex) {
      this.startIndex = edit.newEndIndex + (this.startIndex - edit.oldEndIndex);
      let subbedPointRow;
      let subbedPointColumn;
      if (this.startPosition.row > edit.oldEndPosition.row) {
        subbedPointRow = this.startPosition.row - edit.oldEndPosition.row;
        subbedPointColumn = this.startPosition.column;
      } else {
        subbedPointRow = 0;
        subbedPointColumn = this.startPosition.column;
        if (this.startPosition.column >= edit.oldEndPosition.column) {
          subbedPointColumn = this.startPosition.column - edit.oldEndPosition.column;
        }
      }
      if (subbedPointRow > 0) {
        this.startPosition.row += subbedPointRow;
        this.startPosition.column = subbedPointColumn;
      } else {
        this.startPosition.column += subbedPointColumn;
      }
    } else if (this.startIndex > edit.startIndex) {
      this.startIndex = edit.newEndIndex;
      this.startPosition.row = edit.newEndPosition.row;
      this.startPosition.column = edit.newEndPosition.column;
    }
  }
  /** Get the S-expression representation of this node. */
  toString() {
    marshalNode(this);
    const address = C._ts_node_to_string_wasm(this.tree[0]);
    const result = C.AsciiToString(address);
    C._free(address);
    return result;
  }
};
function unmarshalCaptures(query, tree, address, patternIndex, result) {
  for (let i2 = 0, n = result.length; i2 < n; i2++) {
    const captureIndex = C.getValue(address, "i32");
    address += SIZE_OF_INT;
    const node = unmarshalNode(tree, address);
    address += SIZE_OF_NODE;
    result[i2] = { patternIndex, name: query.captureNames[captureIndex], node };
  }
  return address;
}
__name(unmarshalCaptures, "unmarshalCaptures");
function marshalNode(node, index = 0) {
  let address = TRANSFER_BUFFER + index * SIZE_OF_NODE;
  C.setValue(address, node.id, "i32");
  address += SIZE_OF_INT;
  C.setValue(address, node.startIndex, "i32");
  address += SIZE_OF_INT;
  C.setValue(address, node.startPosition.row, "i32");
  address += SIZE_OF_INT;
  C.setValue(address, node.startPosition.column, "i32");
  address += SIZE_OF_INT;
  C.setValue(address, node[0], "i32");
}
__name(marshalNode, "marshalNode");
function unmarshalNode(tree, address = TRANSFER_BUFFER) {
  const id = C.getValue(address, "i32");
  address += SIZE_OF_INT;
  if (id === 0) return null;
  const index = C.getValue(address, "i32");
  address += SIZE_OF_INT;
  const row = C.getValue(address, "i32");
  address += SIZE_OF_INT;
  const column = C.getValue(address, "i32");
  address += SIZE_OF_INT;
  const other = C.getValue(address, "i32");
  const result = new Node(INTERNAL, {
    id,
    tree,
    startIndex: index,
    startPosition: { row, column },
    other
  });
  return result;
}
__name(unmarshalNode, "unmarshalNode");
function marshalTreeCursor(cursor, address = TRANSFER_BUFFER) {
  C.setValue(address + 0 * SIZE_OF_INT, cursor[0], "i32");
  C.setValue(address + 1 * SIZE_OF_INT, cursor[1], "i32");
  C.setValue(address + 2 * SIZE_OF_INT, cursor[2], "i32");
  C.setValue(address + 3 * SIZE_OF_INT, cursor[3], "i32");
}
__name(marshalTreeCursor, "marshalTreeCursor");
function unmarshalTreeCursor(cursor) {
  cursor[0] = C.getValue(TRANSFER_BUFFER + 0 * SIZE_OF_INT, "i32");
  cursor[1] = C.getValue(TRANSFER_BUFFER + 1 * SIZE_OF_INT, "i32");
  cursor[2] = C.getValue(TRANSFER_BUFFER + 2 * SIZE_OF_INT, "i32");
  cursor[3] = C.getValue(TRANSFER_BUFFER + 3 * SIZE_OF_INT, "i32");
}
__name(unmarshalTreeCursor, "unmarshalTreeCursor");
function marshalPoint(address, point) {
  C.setValue(address, point.row, "i32");
  C.setValue(address + SIZE_OF_INT, point.column, "i32");
}
__name(marshalPoint, "marshalPoint");
function unmarshalPoint(address) {
  const result = {
    row: C.getValue(address, "i32") >>> 0,
    column: C.getValue(address + SIZE_OF_INT, "i32") >>> 0
  };
  return result;
}
__name(unmarshalPoint, "unmarshalPoint");
function marshalRange(address, range) {
  marshalPoint(address, range.startPosition);
  address += SIZE_OF_POINT;
  marshalPoint(address, range.endPosition);
  address += SIZE_OF_POINT;
  C.setValue(address, range.startIndex, "i32");
  address += SIZE_OF_INT;
  C.setValue(address, range.endIndex, "i32");
  address += SIZE_OF_INT;
}
__name(marshalRange, "marshalRange");
function unmarshalRange(address) {
  const result = {};
  result.startPosition = unmarshalPoint(address);
  address += SIZE_OF_POINT;
  result.endPosition = unmarshalPoint(address);
  address += SIZE_OF_POINT;
  result.startIndex = C.getValue(address, "i32") >>> 0;
  address += SIZE_OF_INT;
  result.endIndex = C.getValue(address, "i32") >>> 0;
  return result;
}
__name(unmarshalRange, "unmarshalRange");
function marshalEdit(edit, address = TRANSFER_BUFFER) {
  marshalPoint(address, edit.startPosition);
  address += SIZE_OF_POINT;
  marshalPoint(address, edit.oldEndPosition);
  address += SIZE_OF_POINT;
  marshalPoint(address, edit.newEndPosition);
  address += SIZE_OF_POINT;
  C.setValue(address, edit.startIndex, "i32");
  address += SIZE_OF_INT;
  C.setValue(address, edit.oldEndIndex, "i32");
  address += SIZE_OF_INT;
  C.setValue(address, edit.newEndIndex, "i32");
  address += SIZE_OF_INT;
}
__name(marshalEdit, "marshalEdit");
function unmarshalLanguageMetadata(address) {
  const major_version = C.getValue(address, "i32");
  const minor_version = C.getValue(address += SIZE_OF_INT, "i32");
  const patch_version = C.getValue(address += SIZE_OF_INT, "i32");
  return { major_version, minor_version, patch_version };
}
__name(unmarshalLanguageMetadata, "unmarshalLanguageMetadata");
var LANGUAGE_FUNCTION_REGEX = /^tree_sitter_\w+$/;
var Language = class _Language {
  static {
    __name(this, "Language");
  }
  /** @internal */
  [0] = 0;
  // Internal handle for Wasm
  /**
   * A list of all node types in the language. The index of each type in this
   * array is its node type id.
   */
  types;
  /**
   * A list of all field names in the language. The index of each field name in
   * this array is its field id.
   */
  fields;
  /** @internal */
  constructor(internal, address) {
    assertInternal(internal);
    this[0] = address;
    this.types = new Array(C._ts_language_symbol_count(this[0]));
    for (let i2 = 0, n = this.types.length; i2 < n; i2++) {
      if (C._ts_language_symbol_type(this[0], i2) < 2) {
        this.types[i2] = C.UTF8ToString(C._ts_language_symbol_name(this[0], i2));
      }
    }
    this.fields = new Array(C._ts_language_field_count(this[0]) + 1);
    for (let i2 = 0, n = this.fields.length; i2 < n; i2++) {
      const fieldName = C._ts_language_field_name_for_id(this[0], i2);
      if (fieldName !== 0) {
        this.fields[i2] = C.UTF8ToString(fieldName);
      } else {
        this.fields[i2] = null;
      }
    }
  }
  /**
   * Gets the name of the language.
   */
  get name() {
    const ptr = C._ts_language_name(this[0]);
    if (ptr === 0) return null;
    return C.UTF8ToString(ptr);
  }
  /**
   * Gets the ABI version of the language.
   */
  get abiVersion() {
    return C._ts_language_abi_version(this[0]);
  }
  /**
  * Get the metadata for this language. This information is generated by the
  * CLI, and relies on the language author providing the correct metadata in
  * the language's `tree-sitter.json` file.
  */
  get metadata() {
    C._ts_language_metadata_wasm(this[0]);
    const length = C.getValue(TRANSFER_BUFFER, "i32");
    if (length === 0) return null;
    return unmarshalLanguageMetadata(TRANSFER_BUFFER + SIZE_OF_INT);
  }
  /**
   * Gets the number of fields in the language.
   */
  get fieldCount() {
    return this.fields.length - 1;
  }
  /**
   * Gets the number of states in the language.
   */
  get stateCount() {
    return C._ts_language_state_count(this[0]);
  }
  /**
   * Get the field id for a field name.
   */
  fieldIdForName(fieldName) {
    const result = this.fields.indexOf(fieldName);
    return result !== -1 ? result : null;
  }
  /**
   * Get the field name for a field id.
   */
  fieldNameForId(fieldId) {
    return this.fields[fieldId] ?? null;
  }
  /**
   * Get the node type id for a node type name.
   */
  idForNodeType(type, named) {
    const typeLength = C.lengthBytesUTF8(type);
    const typeAddress = C._malloc(typeLength + 1);
    C.stringToUTF8(type, typeAddress, typeLength + 1);
    const result = C._ts_language_symbol_for_name(this[0], typeAddress, typeLength, named ? 1 : 0);
    C._free(typeAddress);
    return result || null;
  }
  /**
   * Gets the number of node types in the language.
   */
  get nodeTypeCount() {
    return C._ts_language_symbol_count(this[0]);
  }
  /**
   * Get the node type name for a node type id.
   */
  nodeTypeForId(typeId) {
    const name2 = C._ts_language_symbol_name(this[0], typeId);
    return name2 ? C.UTF8ToString(name2) : null;
  }
  /**
   * Check if a node type is named.
   *
   * @see {@link https://tree-sitter.github.io/tree-sitter/using-parsers/2-basic-parsing.html#named-vs-anonymous-nodes}
   */
  nodeTypeIsNamed(typeId) {
    return C._ts_language_type_is_named_wasm(this[0], typeId) ? true : false;
  }
  /**
   * Check if a node type is visible.
   */
  nodeTypeIsVisible(typeId) {
    return C._ts_language_type_is_visible_wasm(this[0], typeId) ? true : false;
  }
  /**
   * Get the supertypes ids of this language.
   *
   * @see {@link https://tree-sitter.github.io/tree-sitter/using-parsers/6-static-node-types.html?highlight=supertype#supertype-nodes}
   */
  get supertypes() {
    C._ts_language_supertypes_wasm(this[0]);
    const count = C.getValue(TRANSFER_BUFFER, "i32");
    const buffer = C.getValue(TRANSFER_BUFFER + SIZE_OF_INT, "i32");
    const result = new Array(count);
    if (count > 0) {
      let address = buffer;
      for (let i2 = 0; i2 < count; i2++) {
        result[i2] = C.getValue(address, "i16");
        address += SIZE_OF_SHORT;
      }
    }
    return result;
  }
  /**
   * Get the subtype ids for a given supertype node id.
   */
  subtypes(supertype) {
    C._ts_language_subtypes_wasm(this[0], supertype);
    const count = C.getValue(TRANSFER_BUFFER, "i32");
    const buffer = C.getValue(TRANSFER_BUFFER + SIZE_OF_INT, "i32");
    const result = new Array(count);
    if (count > 0) {
      let address = buffer;
      for (let i2 = 0; i2 < count; i2++) {
        result[i2] = C.getValue(address, "i16");
        address += SIZE_OF_SHORT;
      }
    }
    return result;
  }
  /**
   * Get the next state id for a given state id and node type id.
   */
  nextState(stateId, typeId) {
    return C._ts_language_next_state(this[0], stateId, typeId);
  }
  /**
   * Create a new lookahead iterator for this language and parse state.
   *
   * This returns `null` if state is invalid for this language.
   *
   * Iterating {@link LookaheadIterator} will yield valid symbols in the given
   * parse state. Newly created lookahead iterators will return the `ERROR`
   * symbol from {@link LookaheadIterator#currentType}.
   *
   * Lookahead iterators can be useful for generating suggestions and improving
   * syntax error diagnostics. To get symbols valid in an `ERROR` node, use the
   * lookahead iterator on its first leaf node state. For `MISSING` nodes, a
   * lookahead iterator created on the previous non-extra leaf node may be
   * appropriate.
   */
  lookaheadIterator(stateId) {
    const address = C._ts_lookahead_iterator_new(this[0], stateId);
    if (address) return new LookaheadIterator(INTERNAL, address, this);
    return null;
  }
  /**
   * Load a language from a WebAssembly module.
   * The module can be provided as a path to a file or as a buffer.
   */
  static async load(input) {
    let binary2;
    if (input instanceof Uint8Array) {
      binary2 = input;
    } else if (globalThis.process?.versions.node) {
      const fs2 = await import("fs/promises");
      binary2 = await fs2.readFile(input);
    } else {
      const response = await fetch(input);
      if (!response.ok) {
        const body2 = await response.text();
        throw new Error(`Language.load failed with status ${response.status}.

${body2}`);
      }
      const retryResp = response.clone();
      try {
        binary2 = await WebAssembly.compileStreaming(response);
      } catch (reason) {
        console.error("wasm streaming compile failed:", reason);
        console.error("falling back to ArrayBuffer instantiation");
        binary2 = new Uint8Array(await retryResp.arrayBuffer());
      }
    }
    const mod = await C.loadWebAssemblyModule(binary2, { loadAsync: true });
    const symbolNames = Object.keys(mod);
    const functionName = symbolNames.find((key) => LANGUAGE_FUNCTION_REGEX.test(key) && !key.includes("external_scanner_"));
    if (!functionName) {
      console.log(`Couldn't find language function in Wasm file. Symbols:
${JSON.stringify(symbolNames, null, 2)}`);
      throw new Error("Language.load failed: no language function found in Wasm file");
    }
    const languageAddress = mod[functionName]();
    return new _Language(INTERNAL, languageAddress);
  }
};
async function Module2(moduleArg = {}) {
  var moduleRtn;
  var Module = moduleArg;
  var ENVIRONMENT_IS_WEB = typeof window == "object";
  var ENVIRONMENT_IS_WORKER = typeof WorkerGlobalScope != "undefined";
  var ENVIRONMENT_IS_NODE = typeof process == "object" && process.versions?.node && process.type != "renderer";
  if (ENVIRONMENT_IS_NODE) {
    const { createRequire } = await import("module");
    var require = createRequire(import.meta.url);
  }
  Module.currentQueryProgressCallback = null;
  Module.currentProgressCallback = null;
  Module.currentLogCallback = null;
  Module.currentParseCallback = null;
  var arguments_ = [];
  var thisProgram = "./this.program";
  var quit_ = /* @__PURE__ */ __name((status, toThrow) => {
    throw toThrow;
  }, "quit_");
  var _scriptName = import.meta.url;
  var scriptDirectory = "";
  function locateFile(path) {
    if (Module["locateFile"]) {
      return Module["locateFile"](path, scriptDirectory);
    }
    return scriptDirectory + path;
  }
  __name(locateFile, "locateFile");
  var readAsync, readBinary;
  if (ENVIRONMENT_IS_NODE) {
    var fs = require("fs");
    if (_scriptName.startsWith("file:")) {
      scriptDirectory = require("path").dirname(require("url").fileURLToPath(_scriptName)) + "/";
    }
    readBinary = /* @__PURE__ */ __name((filename) => {
      filename = isFileURI(filename) ? new URL(filename) : filename;
      var ret = fs.readFileSync(filename);
      return ret;
    }, "readBinary");
    readAsync = /* @__PURE__ */ __name(async (filename, binary2 = true) => {
      filename = isFileURI(filename) ? new URL(filename) : filename;
      var ret = fs.readFileSync(filename, binary2 ? void 0 : "utf8");
      return ret;
    }, "readAsync");
    if (process.argv.length > 1) {
      thisProgram = process.argv[1].replace(/\\/g, "/");
    }
    arguments_ = process.argv.slice(2);
    quit_ = /* @__PURE__ */ __name((status, toThrow) => {
      process.exitCode = status;
      throw toThrow;
    }, "quit_");
  } else if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
    try {
      scriptDirectory = new URL(".", _scriptName).href;
    } catch {
    }
    {
      if (ENVIRONMENT_IS_WORKER) {
        readBinary = /* @__PURE__ */ __name((url) => {
          var xhr = new XMLHttpRequest();
          xhr.open("GET", url, false);
          xhr.responseType = "arraybuffer";
          xhr.send(null);
          return new Uint8Array(
            /** @type{!ArrayBuffer} */
            xhr.response
          );
        }, "readBinary");
      }
      readAsync = /* @__PURE__ */ __name(async (url) => {
        if (isFileURI(url)) {
          return new Promise((resolve9, reject) => {
            var xhr = new XMLHttpRequest();
            xhr.open("GET", url, true);
            xhr.responseType = "arraybuffer";
            xhr.onload = () => {
              if (xhr.status == 200 || xhr.status == 0 && xhr.response) {
                resolve9(xhr.response);
                return;
              }
              reject(xhr.status);
            };
            xhr.onerror = reject;
            xhr.send(null);
          });
        }
        var response = await fetch(url, {
          credentials: "same-origin"
        });
        if (response.ok) {
          return response.arrayBuffer();
        }
        throw new Error(response.status + " : " + response.url);
      }, "readAsync");
    }
  } else {
  }
  var out = console.log.bind(console);
  var err = console.error.bind(console);
  var dynamicLibraries = [];
  var wasmBinary;
  var ABORT = false;
  var EXITSTATUS;
  var isFileURI = /* @__PURE__ */ __name((filename) => filename.startsWith("file://"), "isFileURI");
  var readyPromiseResolve, readyPromiseReject;
  var wasmMemory;
  var HEAP8, HEAPU8, HEAP16, HEAPU16, HEAP32, HEAPU32, HEAPF32, HEAPF64;
  var HEAP64, HEAPU64;
  var HEAP_DATA_VIEW;
  var runtimeInitialized = false;
  function updateMemoryViews() {
    var b = wasmMemory.buffer;
    Module["HEAP8"] = HEAP8 = new Int8Array(b);
    Module["HEAP16"] = HEAP16 = new Int16Array(b);
    Module["HEAPU8"] = HEAPU8 = new Uint8Array(b);
    Module["HEAPU16"] = HEAPU16 = new Uint16Array(b);
    Module["HEAP32"] = HEAP32 = new Int32Array(b);
    Module["HEAPU32"] = HEAPU32 = new Uint32Array(b);
    Module["HEAPF32"] = HEAPF32 = new Float32Array(b);
    Module["HEAPF64"] = HEAPF64 = new Float64Array(b);
    Module["HEAP64"] = HEAP64 = new BigInt64Array(b);
    Module["HEAPU64"] = HEAPU64 = new BigUint64Array(b);
    Module["HEAP_DATA_VIEW"] = HEAP_DATA_VIEW = new DataView(b);
    LE_HEAP_UPDATE();
  }
  __name(updateMemoryViews, "updateMemoryViews");
  function initMemory() {
    if (Module["wasmMemory"]) {
      wasmMemory = Module["wasmMemory"];
    } else {
      var INITIAL_MEMORY = Module["INITIAL_MEMORY"] || 33554432;
      wasmMemory = new WebAssembly.Memory({
        "initial": INITIAL_MEMORY / 65536,
        // In theory we should not need to emit the maximum if we want "unlimited"
        // or 4GB of memory, but VMs error on that atm, see
        // https://github.com/emscripten-core/emscripten/issues/14130
        // And in the pthreads case we definitely need to emit a maximum. So
        // always emit one.
        "maximum": 32768
      });
    }
    updateMemoryViews();
  }
  __name(initMemory, "initMemory");
  var __RELOC_FUNCS__ = [];
  function preRun() {
    if (Module["preRun"]) {
      if (typeof Module["preRun"] == "function") Module["preRun"] = [Module["preRun"]];
      while (Module["preRun"].length) {
        addOnPreRun(Module["preRun"].shift());
      }
    }
    callRuntimeCallbacks(onPreRuns);
  }
  __name(preRun, "preRun");
  function initRuntime() {
    runtimeInitialized = true;
    callRuntimeCallbacks(__RELOC_FUNCS__);
    wasmExports["__wasm_call_ctors"]();
    callRuntimeCallbacks(onPostCtors);
  }
  __name(initRuntime, "initRuntime");
  function preMain() {
  }
  __name(preMain, "preMain");
  function postRun() {
    if (Module["postRun"]) {
      if (typeof Module["postRun"] == "function") Module["postRun"] = [Module["postRun"]];
      while (Module["postRun"].length) {
        addOnPostRun(Module["postRun"].shift());
      }
    }
    callRuntimeCallbacks(onPostRuns);
  }
  __name(postRun, "postRun");
  function abort(what) {
    Module["onAbort"]?.(what);
    what = "Aborted(" + what + ")";
    err(what);
    ABORT = true;
    what += ". Build with -sASSERTIONS for more info.";
    var e = new WebAssembly.RuntimeError(what);
    readyPromiseReject?.(e);
    throw e;
  }
  __name(abort, "abort");
  var wasmBinaryFile;
  function findWasmBinary() {
    if (Module["locateFile"]) {
      return locateFile("web-tree-sitter.wasm");
    }
    return new URL("web-tree-sitter.wasm", import.meta.url).href;
  }
  __name(findWasmBinary, "findWasmBinary");
  function getBinarySync(file) {
    if (file == wasmBinaryFile && wasmBinary) {
      return new Uint8Array(wasmBinary);
    }
    if (readBinary) {
      return readBinary(file);
    }
    throw "both async and sync fetching of the wasm failed";
  }
  __name(getBinarySync, "getBinarySync");
  async function getWasmBinary(binaryFile) {
    if (!wasmBinary) {
      try {
        var response = await readAsync(binaryFile);
        return new Uint8Array(response);
      } catch {
      }
    }
    return getBinarySync(binaryFile);
  }
  __name(getWasmBinary, "getWasmBinary");
  async function instantiateArrayBuffer(binaryFile, imports) {
    try {
      var binary2 = await getWasmBinary(binaryFile);
      var instance2 = await WebAssembly.instantiate(binary2, imports);
      return instance2;
    } catch (reason) {
      err(`failed to asynchronously prepare wasm: ${reason}`);
      abort(reason);
    }
  }
  __name(instantiateArrayBuffer, "instantiateArrayBuffer");
  async function instantiateAsync(binary2, binaryFile, imports) {
    if (!binary2 && !isFileURI(binaryFile) && !ENVIRONMENT_IS_NODE) {
      try {
        var response = fetch(binaryFile, {
          credentials: "same-origin"
        });
        var instantiationResult = await WebAssembly.instantiateStreaming(response, imports);
        return instantiationResult;
      } catch (reason) {
        err(`wasm streaming compile failed: ${reason}`);
        err("falling back to ArrayBuffer instantiation");
      }
    }
    return instantiateArrayBuffer(binaryFile, imports);
  }
  __name(instantiateAsync, "instantiateAsync");
  function getWasmImports() {
    return {
      "env": wasmImports,
      "wasi_snapshot_preview1": wasmImports,
      "GOT.mem": new Proxy(wasmImports, GOTHandler),
      "GOT.func": new Proxy(wasmImports, GOTHandler)
    };
  }
  __name(getWasmImports, "getWasmImports");
  async function createWasm() {
    function receiveInstance(instance2, module2) {
      wasmExports = instance2.exports;
      wasmExports = relocateExports(wasmExports, 1024);
      var metadata2 = getDylinkMetadata(module2);
      if (metadata2.neededDynlibs) {
        dynamicLibraries = metadata2.neededDynlibs.concat(dynamicLibraries);
      }
      mergeLibSymbols(wasmExports, "main");
      LDSO.init();
      loadDylibs();
      __RELOC_FUNCS__.push(wasmExports["__wasm_apply_data_relocs"]);
      assignWasmExports(wasmExports);
      return wasmExports;
    }
    __name(receiveInstance, "receiveInstance");
    function receiveInstantiationResult(result2) {
      return receiveInstance(result2["instance"], result2["module"]);
    }
    __name(receiveInstantiationResult, "receiveInstantiationResult");
    var info2 = getWasmImports();
    if (Module["instantiateWasm"]) {
      return new Promise((resolve9, reject) => {
        Module["instantiateWasm"](info2, (mod, inst) => {
          resolve9(receiveInstance(mod, inst));
        });
      });
    }
    wasmBinaryFile ??= findWasmBinary();
    var result = await instantiateAsync(wasmBinary, wasmBinaryFile, info2);
    var exports = receiveInstantiationResult(result);
    return exports;
  }
  __name(createWasm, "createWasm");
  class ExitStatus {
    static {
      __name(this, "ExitStatus");
    }
    name = "ExitStatus";
    constructor(status) {
      this.message = `Program terminated with exit(${status})`;
      this.status = status;
    }
  }
  var GOT = {};
  var currentModuleWeakSymbols = /* @__PURE__ */ new Set([]);
  var GOTHandler = {
    get(obj, symName) {
      var rtn = GOT[symName];
      if (!rtn) {
        rtn = GOT[symName] = new WebAssembly.Global({
          "value": "i32",
          "mutable": true
        });
      }
      if (!currentModuleWeakSymbols.has(symName)) {
        rtn.required = true;
      }
      return rtn;
    }
  };
  var LE_ATOMICS_NATIVE_BYTE_ORDER = [];
  var LE_HEAP_LOAD_F32 = /* @__PURE__ */ __name((byteOffset) => HEAP_DATA_VIEW.getFloat32(byteOffset, true), "LE_HEAP_LOAD_F32");
  var LE_HEAP_LOAD_F64 = /* @__PURE__ */ __name((byteOffset) => HEAP_DATA_VIEW.getFloat64(byteOffset, true), "LE_HEAP_LOAD_F64");
  var LE_HEAP_LOAD_I16 = /* @__PURE__ */ __name((byteOffset) => HEAP_DATA_VIEW.getInt16(byteOffset, true), "LE_HEAP_LOAD_I16");
  var LE_HEAP_LOAD_I32 = /* @__PURE__ */ __name((byteOffset) => HEAP_DATA_VIEW.getInt32(byteOffset, true), "LE_HEAP_LOAD_I32");
  var LE_HEAP_LOAD_I64 = /* @__PURE__ */ __name((byteOffset) => HEAP_DATA_VIEW.getBigInt64(byteOffset, true), "LE_HEAP_LOAD_I64");
  var LE_HEAP_LOAD_U32 = /* @__PURE__ */ __name((byteOffset) => HEAP_DATA_VIEW.getUint32(byteOffset, true), "LE_HEAP_LOAD_U32");
  var LE_HEAP_STORE_F32 = /* @__PURE__ */ __name((byteOffset, value) => HEAP_DATA_VIEW.setFloat32(byteOffset, value, true), "LE_HEAP_STORE_F32");
  var LE_HEAP_STORE_F64 = /* @__PURE__ */ __name((byteOffset, value) => HEAP_DATA_VIEW.setFloat64(byteOffset, value, true), "LE_HEAP_STORE_F64");
  var LE_HEAP_STORE_I16 = /* @__PURE__ */ __name((byteOffset, value) => HEAP_DATA_VIEW.setInt16(byteOffset, value, true), "LE_HEAP_STORE_I16");
  var LE_HEAP_STORE_I32 = /* @__PURE__ */ __name((byteOffset, value) => HEAP_DATA_VIEW.setInt32(byteOffset, value, true), "LE_HEAP_STORE_I32");
  var LE_HEAP_STORE_I64 = /* @__PURE__ */ __name((byteOffset, value) => HEAP_DATA_VIEW.setBigInt64(byteOffset, value, true), "LE_HEAP_STORE_I64");
  var LE_HEAP_STORE_U32 = /* @__PURE__ */ __name((byteOffset, value) => HEAP_DATA_VIEW.setUint32(byteOffset, value, true), "LE_HEAP_STORE_U32");
  var callRuntimeCallbacks = /* @__PURE__ */ __name((callbacks) => {
    while (callbacks.length > 0) {
      callbacks.shift()(Module);
    }
  }, "callRuntimeCallbacks");
  var onPostRuns = [];
  var addOnPostRun = /* @__PURE__ */ __name((cb) => onPostRuns.push(cb), "addOnPostRun");
  var onPreRuns = [];
  var addOnPreRun = /* @__PURE__ */ __name((cb) => onPreRuns.push(cb), "addOnPreRun");
  var UTF8Decoder = typeof TextDecoder != "undefined" ? new TextDecoder() : void 0;
  var findStringEnd = /* @__PURE__ */ __name((heapOrArray, idx, maxBytesToRead, ignoreNul) => {
    var maxIdx = idx + maxBytesToRead;
    if (ignoreNul) return maxIdx;
    while (heapOrArray[idx] && !(idx >= maxIdx)) ++idx;
    return idx;
  }, "findStringEnd");
  var UTF8ArrayToString = /* @__PURE__ */ __name((heapOrArray, idx = 0, maxBytesToRead, ignoreNul) => {
    var endPtr = findStringEnd(heapOrArray, idx, maxBytesToRead, ignoreNul);
    if (endPtr - idx > 16 && heapOrArray.buffer && UTF8Decoder) {
      return UTF8Decoder.decode(heapOrArray.subarray(idx, endPtr));
    }
    var str = "";
    while (idx < endPtr) {
      var u0 = heapOrArray[idx++];
      if (!(u0 & 128)) {
        str += String.fromCharCode(u0);
        continue;
      }
      var u1 = heapOrArray[idx++] & 63;
      if ((u0 & 224) == 192) {
        str += String.fromCharCode((u0 & 31) << 6 | u1);
        continue;
      }
      var u2 = heapOrArray[idx++] & 63;
      if ((u0 & 240) == 224) {
        u0 = (u0 & 15) << 12 | u1 << 6 | u2;
      } else {
        u0 = (u0 & 7) << 18 | u1 << 12 | u2 << 6 | heapOrArray[idx++] & 63;
      }
      if (u0 < 65536) {
        str += String.fromCharCode(u0);
      } else {
        var ch = u0 - 65536;
        str += String.fromCharCode(55296 | ch >> 10, 56320 | ch & 1023);
      }
    }
    return str;
  }, "UTF8ArrayToString");
  var getDylinkMetadata = /* @__PURE__ */ __name((binary2) => {
    var offset = 0;
    var end = 0;
    function getU8() {
      return binary2[offset++];
    }
    __name(getU8, "getU8");
    function getLEB() {
      var ret = 0;
      var mul = 1;
      while (1) {
        var byte = binary2[offset++];
        ret += (byte & 127) * mul;
        mul *= 128;
        if (!(byte & 128)) break;
      }
      return ret;
    }
    __name(getLEB, "getLEB");
    function getString() {
      var len = getLEB();
      offset += len;
      return UTF8ArrayToString(binary2, offset - len, len);
    }
    __name(getString, "getString");
    function getStringList() {
      var count2 = getLEB();
      var rtn = [];
      while (count2--) rtn.push(getString());
      return rtn;
    }
    __name(getStringList, "getStringList");
    function failIf(condition, message) {
      if (condition) throw new Error(message);
    }
    __name(failIf, "failIf");
    if (binary2 instanceof WebAssembly.Module) {
      var dylinkSection = WebAssembly.Module.customSections(binary2, "dylink.0");
      failIf(dylinkSection.length === 0, "need dylink section");
      binary2 = new Uint8Array(dylinkSection[0]);
      end = binary2.length;
    } else {
      var int32View = new Uint32Array(new Uint8Array(binary2.subarray(0, 24)).buffer);
      var magicNumberFound = int32View[0] == 1836278016 || int32View[0] == 6386541;
      failIf(!magicNumberFound, "need to see wasm magic number");
      failIf(binary2[8] !== 0, "need the dylink section to be first");
      offset = 9;
      var section_size = getLEB();
      end = offset + section_size;
      var name2 = getString();
      failIf(name2 !== "dylink.0");
    }
    var customSection = {
      neededDynlibs: [],
      tlsExports: /* @__PURE__ */ new Set(),
      weakImports: /* @__PURE__ */ new Set(),
      runtimePaths: []
    };
    var WASM_DYLINK_MEM_INFO = 1;
    var WASM_DYLINK_NEEDED = 2;
    var WASM_DYLINK_EXPORT_INFO = 3;
    var WASM_DYLINK_IMPORT_INFO = 4;
    var WASM_DYLINK_RUNTIME_PATH = 5;
    var WASM_SYMBOL_TLS = 256;
    var WASM_SYMBOL_BINDING_MASK = 3;
    var WASM_SYMBOL_BINDING_WEAK = 1;
    while (offset < end) {
      var subsectionType = getU8();
      var subsectionSize = getLEB();
      if (subsectionType === WASM_DYLINK_MEM_INFO) {
        customSection.memorySize = getLEB();
        customSection.memoryAlign = getLEB();
        customSection.tableSize = getLEB();
        customSection.tableAlign = getLEB();
      } else if (subsectionType === WASM_DYLINK_NEEDED) {
        customSection.neededDynlibs = getStringList();
      } else if (subsectionType === WASM_DYLINK_EXPORT_INFO) {
        var count = getLEB();
        while (count--) {
          var symname = getString();
          var flags2 = getLEB();
          if (flags2 & WASM_SYMBOL_TLS) {
            customSection.tlsExports.add(symname);
          }
        }
      } else if (subsectionType === WASM_DYLINK_IMPORT_INFO) {
        var count = getLEB();
        while (count--) {
          var modname = getString();
          var symname = getString();
          var flags2 = getLEB();
          if ((flags2 & WASM_SYMBOL_BINDING_MASK) == WASM_SYMBOL_BINDING_WEAK) {
            customSection.weakImports.add(symname);
          }
        }
      } else if (subsectionType === WASM_DYLINK_RUNTIME_PATH) {
        customSection.runtimePaths = getStringList();
      } else {
        offset += subsectionSize;
      }
    }
    return customSection;
  }, "getDylinkMetadata");
  function getValue(ptr, type = "i8") {
    if (type.endsWith("*")) type = "*";
    switch (type) {
      case "i1":
        return HEAP8[ptr];
      case "i8":
        return HEAP8[ptr];
      case "i16":
        return LE_HEAP_LOAD_I16((ptr >> 1) * 2);
      case "i32":
        return LE_HEAP_LOAD_I32((ptr >> 2) * 4);
      case "i64":
        return LE_HEAP_LOAD_I64((ptr >> 3) * 8);
      case "float":
        return LE_HEAP_LOAD_F32((ptr >> 2) * 4);
      case "double":
        return LE_HEAP_LOAD_F64((ptr >> 3) * 8);
      case "*":
        return LE_HEAP_LOAD_U32((ptr >> 2) * 4);
      default:
        abort(`invalid type for getValue: ${type}`);
    }
  }
  __name(getValue, "getValue");
  var newDSO = /* @__PURE__ */ __name((name2, handle2, syms) => {
    var dso = {
      refcount: Infinity,
      name: name2,
      exports: syms,
      global: true
    };
    LDSO.loadedLibsByName[name2] = dso;
    if (handle2 != void 0) {
      LDSO.loadedLibsByHandle[handle2] = dso;
    }
    return dso;
  }, "newDSO");
  var LDSO = {
    loadedLibsByName: {},
    loadedLibsByHandle: {},
    init() {
      newDSO("__main__", 0, wasmImports);
    }
  };
  var ___heap_base = 78240;
  var alignMemory = /* @__PURE__ */ __name((size, alignment) => Math.ceil(size / alignment) * alignment, "alignMemory");
  var getMemory = /* @__PURE__ */ __name((size) => {
    if (runtimeInitialized) {
      return _calloc(size, 1);
    }
    var ret = ___heap_base;
    var end = ret + alignMemory(size, 16);
    ___heap_base = end;
    GOT["__heap_base"].value = end;
    return ret;
  }, "getMemory");
  var isInternalSym = /* @__PURE__ */ __name((symName) => ["__cpp_exception", "__c_longjmp", "__wasm_apply_data_relocs", "__dso_handle", "__tls_size", "__tls_align", "__set_stack_limits", "_emscripten_tls_init", "__wasm_init_tls", "__wasm_call_ctors", "__start_em_asm", "__stop_em_asm", "__start_em_js", "__stop_em_js"].includes(symName) || symName.startsWith("__em_js__"), "isInternalSym");
  var uleb128EncodeWithLen = /* @__PURE__ */ __name((arr) => {
    const n = arr.length;
    return [n % 128 | 128, n >> 7, ...arr];
  }, "uleb128EncodeWithLen");
  var wasmTypeCodes = {
    "i": 127,
    // i32
    "p": 127,
    // i32
    "j": 126,
    // i64
    "f": 125,
    // f32
    "d": 124,
    // f64
    "e": 111
  };
  var generateTypePack = /* @__PURE__ */ __name((types) => uleb128EncodeWithLen(Array.from(types, (type) => {
    var code = wasmTypeCodes[type];
    return code;
  })), "generateTypePack");
  var convertJsFunctionToWasm = /* @__PURE__ */ __name((func2, sig) => {
    var bytes = Uint8Array.of(
      0,
      97,
      115,
      109,
      // magic ("\0asm")
      1,
      0,
      0,
      0,
      // version: 1
      1,
      ...uleb128EncodeWithLen([
        1,
        // count: 1
        96,
        // param types
        ...generateTypePack(sig.slice(1)),
        // return types (for now only supporting [] if `void` and single [T] otherwise)
        ...generateTypePack(sig[0] === "v" ? "" : sig[0])
      ]),
      // The rest of the module is static
      2,
      7,
      // import section
      // (import "e" "f" (func 0 (type 0)))
      1,
      1,
      101,
      1,
      102,
      0,
      0,
      7,
      5,
      // export section
      // (export "f" (func 0 (type 0)))
      1,
      1,
      102,
      0,
      0
    );
    var module2 = new WebAssembly.Module(bytes);
    var instance2 = new WebAssembly.Instance(module2, {
      "e": {
        "f": func2
      }
    });
    var wrappedFunc = instance2.exports["f"];
    return wrappedFunc;
  }, "convertJsFunctionToWasm");
  var wasmTableMirror = [];
  var wasmTable = new WebAssembly.Table({
    "initial": 31,
    "element": "anyfunc"
  });
  var getWasmTableEntry = /* @__PURE__ */ __name((funcPtr) => {
    var func2 = wasmTableMirror[funcPtr];
    if (!func2) {
      wasmTableMirror[funcPtr] = func2 = wasmTable.get(funcPtr);
    }
    return func2;
  }, "getWasmTableEntry");
  var updateTableMap = /* @__PURE__ */ __name((offset, count) => {
    if (functionsInTableMap) {
      for (var i2 = offset; i2 < offset + count; i2++) {
        var item = getWasmTableEntry(i2);
        if (item) {
          functionsInTableMap.set(item, i2);
        }
      }
    }
  }, "updateTableMap");
  var functionsInTableMap;
  var getFunctionAddress = /* @__PURE__ */ __name((func2) => {
    if (!functionsInTableMap) {
      functionsInTableMap = /* @__PURE__ */ new WeakMap();
      updateTableMap(0, wasmTable.length);
    }
    return functionsInTableMap.get(func2) || 0;
  }, "getFunctionAddress");
  var freeTableIndexes = [];
  var getEmptyTableSlot = /* @__PURE__ */ __name(() => {
    if (freeTableIndexes.length) {
      return freeTableIndexes.pop();
    }
    return wasmTable["grow"](1);
  }, "getEmptyTableSlot");
  var setWasmTableEntry = /* @__PURE__ */ __name((idx, func2) => {
    wasmTable.set(idx, func2);
    wasmTableMirror[idx] = wasmTable.get(idx);
  }, "setWasmTableEntry");
  var addFunction = /* @__PURE__ */ __name((func2, sig) => {
    var rtn = getFunctionAddress(func2);
    if (rtn) {
      return rtn;
    }
    var ret = getEmptyTableSlot();
    try {
      setWasmTableEntry(ret, func2);
    } catch (err2) {
      if (!(err2 instanceof TypeError)) {
        throw err2;
      }
      var wrapped = convertJsFunctionToWasm(func2, sig);
      setWasmTableEntry(ret, wrapped);
    }
    functionsInTableMap.set(func2, ret);
    return ret;
  }, "addFunction");
  var updateGOT = /* @__PURE__ */ __name((exports, replace) => {
    for (var symName in exports) {
      if (isInternalSym(symName)) {
        continue;
      }
      var value = exports[symName];
      GOT[symName] ||= new WebAssembly.Global({
        "value": "i32",
        "mutable": true
      });
      if (replace || GOT[symName].value == 0) {
        if (typeof value == "function") {
          GOT[symName].value = addFunction(value);
        } else if (typeof value == "number") {
          GOT[symName].value = value;
        } else {
          err(`unhandled export type for '${symName}': ${typeof value}`);
        }
      }
    }
  }, "updateGOT");
  var relocateExports = /* @__PURE__ */ __name((exports, memoryBase2, replace) => {
    var relocated = {};
    for (var e in exports) {
      var value = exports[e];
      if (typeof value == "object") {
        value = value.value;
      }
      if (typeof value == "number") {
        value += memoryBase2;
      }
      relocated[e] = value;
    }
    updateGOT(relocated, replace);
    return relocated;
  }, "relocateExports");
  var isSymbolDefined = /* @__PURE__ */ __name((symName) => {
    var existing = wasmImports[symName];
    if (!existing || existing.stub) {
      return false;
    }
    return true;
  }, "isSymbolDefined");
  var dynCall = /* @__PURE__ */ __name((sig, ptr, args2 = [], promising = false) => {
    var func2 = getWasmTableEntry(ptr);
    var rtn = func2(...args2);
    function convert(rtn2) {
      return rtn2;
    }
    __name(convert, "convert");
    return convert(rtn);
  }, "dynCall");
  var stackSave = /* @__PURE__ */ __name(() => _emscripten_stack_get_current(), "stackSave");
  var stackRestore = /* @__PURE__ */ __name((val) => __emscripten_stack_restore(val), "stackRestore");
  var createInvokeFunction = /* @__PURE__ */ __name((sig) => (ptr, ...args2) => {
    var sp = stackSave();
    try {
      return dynCall(sig, ptr, args2);
    } catch (e) {
      stackRestore(sp);
      if (e !== e + 0) throw e;
      _setThrew(1, 0);
      if (sig[0] == "j") return 0n;
    }
  }, "createInvokeFunction");
  var resolveGlobalSymbol = /* @__PURE__ */ __name((symName, direct = false) => {
    var sym;
    if (isSymbolDefined(symName)) {
      sym = wasmImports[symName];
    } else if (symName.startsWith("invoke_")) {
      sym = wasmImports[symName] = createInvokeFunction(symName.split("_")[1]);
    }
    return {
      sym,
      name: symName
    };
  }, "resolveGlobalSymbol");
  var onPostCtors = [];
  var addOnPostCtor = /* @__PURE__ */ __name((cb) => onPostCtors.push(cb), "addOnPostCtor");
  var UTF8ToString = /* @__PURE__ */ __name((ptr, maxBytesToRead, ignoreNul) => ptr ? UTF8ArrayToString(HEAPU8, ptr, maxBytesToRead, ignoreNul) : "", "UTF8ToString");
  var loadWebAssemblyModule = /* @__PURE__ */ __name((binary, flags, libName, localScope, handle) => {
    var metadata = getDylinkMetadata(binary);
    function loadModule() {
      var memAlign = Math.pow(2, metadata.memoryAlign);
      var memoryBase = metadata.memorySize ? alignMemory(getMemory(metadata.memorySize + memAlign), memAlign) : 0;
      var tableBase = metadata.tableSize ? wasmTable.length : 0;
      if (handle) {
        HEAP8[handle + 8] = 1;
        LE_HEAP_STORE_U32((handle + 12 >> 2) * 4, memoryBase);
        LE_HEAP_STORE_I32((handle + 16 >> 2) * 4, metadata.memorySize);
        LE_HEAP_STORE_U32((handle + 20 >> 2) * 4, tableBase);
        LE_HEAP_STORE_I32((handle + 24 >> 2) * 4, metadata.tableSize);
      }
      if (metadata.tableSize) {
        wasmTable.grow(metadata.tableSize);
      }
      var moduleExports;
      function resolveSymbol(sym) {
        var resolved = resolveGlobalSymbol(sym).sym;
        if (!resolved && localScope) {
          resolved = localScope[sym];
        }
        if (!resolved) {
          resolved = moduleExports[sym];
        }
        return resolved;
      }
      __name(resolveSymbol, "resolveSymbol");
      var proxyHandler = {
        get(stubs, prop) {
          switch (prop) {
            case "__memory_base":
              return memoryBase;
            case "__table_base":
              return tableBase;
          }
          if (prop in wasmImports && !wasmImports[prop].stub) {
            var res = wasmImports[prop];
            return res;
          }
          if (!(prop in stubs)) {
            var resolved;
            stubs[prop] = (...args2) => {
              resolved ||= resolveSymbol(prop);
              return resolved(...args2);
            };
          }
          return stubs[prop];
        }
      };
      var proxy = new Proxy({}, proxyHandler);
      currentModuleWeakSymbols = metadata.weakImports;
      var info = {
        "GOT.mem": new Proxy({}, GOTHandler),
        "GOT.func": new Proxy({}, GOTHandler),
        "env": proxy,
        "wasi_snapshot_preview1": proxy
      };
      function postInstantiation(module, instance) {
        updateTableMap(tableBase, metadata.tableSize);
        moduleExports = relocateExports(instance.exports, memoryBase);
        if (!flags.allowUndefined) {
          reportUndefinedSymbols();
        }
        function addEmAsm(addr, body) {
          var args = [];
          var arity = 0;
          for (; arity < 16; arity++) {
            if (body.indexOf("$" + arity) != -1) {
              args.push("$" + arity);
            } else {
              break;
            }
          }
          args = args.join(",");
          var func = `(${args}) => { ${body} };`;
          ASM_CONSTS[start] = eval(func);
        }
        __name(addEmAsm, "addEmAsm");
        if ("__start_em_asm" in moduleExports) {
          var start = moduleExports["__start_em_asm"];
          var stop = moduleExports["__stop_em_asm"];
          while (start < stop) {
            var jsString = UTF8ToString(start);
            addEmAsm(start, jsString);
            start = HEAPU8.indexOf(0, start) + 1;
          }
        }
        function addEmJs(name, cSig, body) {
          var jsArgs = [];
          cSig = cSig.slice(1, -1);
          if (cSig != "void") {
            cSig = cSig.split(",");
            for (var i in cSig) {
              var jsArg = cSig[i].split(" ").pop();
              jsArgs.push(jsArg.replace("*", ""));
            }
          }
          var func = `(${jsArgs}) => ${body};`;
          moduleExports[name] = eval(func);
        }
        __name(addEmJs, "addEmJs");
        for (var name in moduleExports) {
          if (name.startsWith("__em_js__")) {
            var start = moduleExports[name];
            var jsString = UTF8ToString(start);
            var parts = jsString.split("<::>");
            addEmJs(name.replace("__em_js__", ""), parts[0], parts[1]);
            delete moduleExports[name];
          }
        }
        var applyRelocs = moduleExports["__wasm_apply_data_relocs"];
        if (applyRelocs) {
          if (runtimeInitialized) {
            applyRelocs();
          } else {
            __RELOC_FUNCS__.push(applyRelocs);
          }
        }
        var init = moduleExports["__wasm_call_ctors"];
        if (init) {
          if (runtimeInitialized) {
            init();
          } else {
            addOnPostCtor(init);
          }
        }
        return moduleExports;
      }
      __name(postInstantiation, "postInstantiation");
      if (flags.loadAsync) {
        return (async () => {
          var instance2;
          if (binary instanceof WebAssembly.Module) {
            instance2 = new WebAssembly.Instance(binary, info);
          } else {
            ({ module: binary, instance: instance2 } = await WebAssembly.instantiate(binary, info));
          }
          return postInstantiation(binary, instance2);
        })();
      }
      var module = binary instanceof WebAssembly.Module ? binary : new WebAssembly.Module(binary);
      var instance = new WebAssembly.Instance(module, info);
      return postInstantiation(module, instance);
    }
    __name(loadModule, "loadModule");
    flags = {
      ...flags,
      rpath: {
        parentLibPath: libName,
        paths: metadata.runtimePaths
      }
    };
    if (flags.loadAsync) {
      return metadata.neededDynlibs.reduce((chain, dynNeeded) => chain.then(() => loadDynamicLibrary(dynNeeded, flags, localScope)), Promise.resolve()).then(loadModule);
    }
    metadata.neededDynlibs.forEach((needed) => loadDynamicLibrary(needed, flags, localScope));
    return loadModule();
  }, "loadWebAssemblyModule");
  var mergeLibSymbols = /* @__PURE__ */ __name((exports, libName2) => {
    for (var [sym, exp] of Object.entries(exports)) {
      const setImport = /* @__PURE__ */ __name((target) => {
        if (!isSymbolDefined(target)) {
          wasmImports[target] = exp;
        }
      }, "setImport");
      setImport(sym);
      const main_alias = "__main_argc_argv";
      if (sym == "main") {
        setImport(main_alias);
      }
      if (sym == main_alias) {
        setImport("main");
      }
    }
  }, "mergeLibSymbols");
  var asyncLoad = /* @__PURE__ */ __name(async (url) => {
    var arrayBuffer = await readAsync(url);
    return new Uint8Array(arrayBuffer);
  }, "asyncLoad");
  function loadDynamicLibrary(libName2, flags2 = {
    global: true,
    nodelete: true
  }, localScope2, handle2) {
    var dso = LDSO.loadedLibsByName[libName2];
    if (dso) {
      if (!flags2.global) {
        if (localScope2) {
          Object.assign(localScope2, dso.exports);
        }
      } else if (!dso.global) {
        dso.global = true;
        mergeLibSymbols(dso.exports, libName2);
      }
      if (flags2.nodelete && dso.refcount !== Infinity) {
        dso.refcount = Infinity;
      }
      dso.refcount++;
      if (handle2) {
        LDSO.loadedLibsByHandle[handle2] = dso;
      }
      return flags2.loadAsync ? Promise.resolve(true) : true;
    }
    dso = newDSO(libName2, handle2, "loading");
    dso.refcount = flags2.nodelete ? Infinity : 1;
    dso.global = flags2.global;
    function loadLibData() {
      if (handle2) {
        var data = LE_HEAP_LOAD_U32((handle2 + 28 >> 2) * 4);
        var dataSize = LE_HEAP_LOAD_U32((handle2 + 32 >> 2) * 4);
        if (data && dataSize) {
          var libData = HEAP8.slice(data, data + dataSize);
          return flags2.loadAsync ? Promise.resolve(libData) : libData;
        }
      }
      var libFile = locateFile(libName2);
      if (flags2.loadAsync) {
        return asyncLoad(libFile);
      }
      if (!readBinary) {
        throw new Error(`${libFile}: file not found, and synchronous loading of external files is not available`);
      }
      return readBinary(libFile);
    }
    __name(loadLibData, "loadLibData");
    function getExports() {
      if (flags2.loadAsync) {
        return loadLibData().then((libData) => loadWebAssemblyModule(libData, flags2, libName2, localScope2, handle2));
      }
      return loadWebAssemblyModule(loadLibData(), flags2, libName2, localScope2, handle2);
    }
    __name(getExports, "getExports");
    function moduleLoaded(exports) {
      if (dso.global) {
        mergeLibSymbols(exports, libName2);
      } else if (localScope2) {
        Object.assign(localScope2, exports);
      }
      dso.exports = exports;
    }
    __name(moduleLoaded, "moduleLoaded");
    if (flags2.loadAsync) {
      return getExports().then((exports) => {
        moduleLoaded(exports);
        return true;
      });
    }
    moduleLoaded(getExports());
    return true;
  }
  __name(loadDynamicLibrary, "loadDynamicLibrary");
  var reportUndefinedSymbols = /* @__PURE__ */ __name(() => {
    for (var [symName, entry] of Object.entries(GOT)) {
      if (entry.value == 0) {
        var value = resolveGlobalSymbol(symName, true).sym;
        if (!value && !entry.required) {
          continue;
        }
        if (typeof value == "function") {
          entry.value = addFunction(value, value.sig);
        } else if (typeof value == "number") {
          entry.value = value;
        } else {
          throw new Error(`bad export type for '${symName}': ${typeof value}`);
        }
      }
    }
  }, "reportUndefinedSymbols");
  var runDependencies = 0;
  var dependenciesFulfilled = null;
  var removeRunDependency = /* @__PURE__ */ __name((id) => {
    runDependencies--;
    Module["monitorRunDependencies"]?.(runDependencies);
    if (runDependencies == 0) {
      if (dependenciesFulfilled) {
        var callback = dependenciesFulfilled;
        dependenciesFulfilled = null;
        callback();
      }
    }
  }, "removeRunDependency");
  var addRunDependency = /* @__PURE__ */ __name((id) => {
    runDependencies++;
    Module["monitorRunDependencies"]?.(runDependencies);
  }, "addRunDependency");
  var loadDylibs = /* @__PURE__ */ __name(async () => {
    if (!dynamicLibraries.length) {
      reportUndefinedSymbols();
      return;
    }
    addRunDependency("loadDylibs");
    for (var lib of dynamicLibraries) {
      await loadDynamicLibrary(lib, {
        loadAsync: true,
        global: true,
        nodelete: true,
        allowUndefined: true
      });
    }
    reportUndefinedSymbols();
    removeRunDependency("loadDylibs");
  }, "loadDylibs");
  var noExitRuntime = true;
  function setValue(ptr, value, type = "i8") {
    if (type.endsWith("*")) type = "*";
    switch (type) {
      case "i1":
        HEAP8[ptr] = value;
        break;
      case "i8":
        HEAP8[ptr] = value;
        break;
      case "i16":
        LE_HEAP_STORE_I16((ptr >> 1) * 2, value);
        break;
      case "i32":
        LE_HEAP_STORE_I32((ptr >> 2) * 4, value);
        break;
      case "i64":
        LE_HEAP_STORE_I64((ptr >> 3) * 8, BigInt(value));
        break;
      case "float":
        LE_HEAP_STORE_F32((ptr >> 2) * 4, value);
        break;
      case "double":
        LE_HEAP_STORE_F64((ptr >> 3) * 8, value);
        break;
      case "*":
        LE_HEAP_STORE_U32((ptr >> 2) * 4, value);
        break;
      default:
        abort(`invalid type for setValue: ${type}`);
    }
  }
  __name(setValue, "setValue");
  var ___memory_base = new WebAssembly.Global({
    "value": "i32",
    "mutable": false
  }, 1024);
  var ___stack_high = 78240;
  var ___stack_low = 12704;
  var ___stack_pointer = new WebAssembly.Global({
    "value": "i32",
    "mutable": true
  }, 78240);
  var ___table_base = new WebAssembly.Global({
    "value": "i32",
    "mutable": false
  }, 1);
  var __abort_js = /* @__PURE__ */ __name(() => abort(""), "__abort_js");
  __abort_js.sig = "v";
  var getHeapMax = /* @__PURE__ */ __name(() => (
    // Stay one Wasm page short of 4GB: while e.g. Chrome is able to allocate
    // full 4GB Wasm memories, the size will wrap back to 0 bytes in Wasm side
    // for any code that deals with heap sizes, which would require special
    // casing all heap size related code to treat 0 specially.
    2147483648
  ), "getHeapMax");
  var growMemory = /* @__PURE__ */ __name((size) => {
    var oldHeapSize = wasmMemory.buffer.byteLength;
    var pages = (size - oldHeapSize + 65535) / 65536 | 0;
    try {
      wasmMemory.grow(pages);
      updateMemoryViews();
      return 1;
    } catch (e) {
    }
  }, "growMemory");
  var _emscripten_resize_heap = /* @__PURE__ */ __name((requestedSize) => {
    var oldSize = HEAPU8.length;
    requestedSize >>>= 0;
    var maxHeapSize = getHeapMax();
    if (requestedSize > maxHeapSize) {
      return false;
    }
    for (var cutDown = 1; cutDown <= 4; cutDown *= 2) {
      var overGrownHeapSize = oldSize * (1 + 0.2 / cutDown);
      overGrownHeapSize = Math.min(overGrownHeapSize, requestedSize + 100663296);
      var newSize = Math.min(maxHeapSize, alignMemory(Math.max(requestedSize, overGrownHeapSize), 65536));
      var replacement = growMemory(newSize);
      if (replacement) {
        return true;
      }
    }
    return false;
  }, "_emscripten_resize_heap");
  _emscripten_resize_heap.sig = "ip";
  var _fd_close = /* @__PURE__ */ __name((fd) => 52, "_fd_close");
  _fd_close.sig = "ii";
  var INT53_MAX = 9007199254740992;
  var INT53_MIN = -9007199254740992;
  var bigintToI53Checked = /* @__PURE__ */ __name((num) => num < INT53_MIN || num > INT53_MAX ? NaN : Number(num), "bigintToI53Checked");
  function _fd_seek(fd, offset, whence, newOffset) {
    offset = bigintToI53Checked(offset);
    return 70;
  }
  __name(_fd_seek, "_fd_seek");
  _fd_seek.sig = "iijip";
  var printCharBuffers = [null, [], []];
  var printChar = /* @__PURE__ */ __name((stream, curr) => {
    var buffer = printCharBuffers[stream];
    if (curr === 0 || curr === 10) {
      (stream === 1 ? out : err)(UTF8ArrayToString(buffer));
      buffer.length = 0;
    } else {
      buffer.push(curr);
    }
  }, "printChar");
  var _fd_write = /* @__PURE__ */ __name((fd, iov, iovcnt, pnum) => {
    var num = 0;
    for (var i2 = 0; i2 < iovcnt; i2++) {
      var ptr = LE_HEAP_LOAD_U32((iov >> 2) * 4);
      var len = LE_HEAP_LOAD_U32((iov + 4 >> 2) * 4);
      iov += 8;
      for (var j = 0; j < len; j++) {
        printChar(fd, HEAPU8[ptr + j]);
      }
      num += len;
    }
    LE_HEAP_STORE_U32((pnum >> 2) * 4, num);
    return 0;
  }, "_fd_write");
  _fd_write.sig = "iippp";
  function _tree_sitter_log_callback(isLexMessage, messageAddress) {
    if (Module.currentLogCallback) {
      const message = UTF8ToString(messageAddress);
      Module.currentLogCallback(message, isLexMessage !== 0);
    }
  }
  __name(_tree_sitter_log_callback, "_tree_sitter_log_callback");
  function _tree_sitter_parse_callback(inputBufferAddress, index, row, column, lengthAddress) {
    const INPUT_BUFFER_SIZE = 10 * 1024;
    const string = Module.currentParseCallback(index, {
      row,
      column
    });
    if (typeof string === "string") {
      setValue(lengthAddress, string.length, "i32");
      stringToUTF16(string, inputBufferAddress, INPUT_BUFFER_SIZE);
    } else {
      setValue(lengthAddress, 0, "i32");
    }
  }
  __name(_tree_sitter_parse_callback, "_tree_sitter_parse_callback");
  function _tree_sitter_progress_callback(currentOffset, hasError) {
    if (Module.currentProgressCallback) {
      return Module.currentProgressCallback({
        currentOffset,
        hasError
      });
    }
    return false;
  }
  __name(_tree_sitter_progress_callback, "_tree_sitter_progress_callback");
  function _tree_sitter_query_progress_callback(currentOffset) {
    if (Module.currentQueryProgressCallback) {
      return Module.currentQueryProgressCallback({
        currentOffset
      });
    }
    return false;
  }
  __name(_tree_sitter_query_progress_callback, "_tree_sitter_query_progress_callback");
  var runtimeKeepaliveCounter = 0;
  var keepRuntimeAlive = /* @__PURE__ */ __name(() => noExitRuntime || runtimeKeepaliveCounter > 0, "keepRuntimeAlive");
  var _proc_exit = /* @__PURE__ */ __name((code) => {
    EXITSTATUS = code;
    if (!keepRuntimeAlive()) {
      Module["onExit"]?.(code);
      ABORT = true;
    }
    quit_(code, new ExitStatus(code));
  }, "_proc_exit");
  _proc_exit.sig = "vi";
  var exitJS = /* @__PURE__ */ __name((status, implicit) => {
    EXITSTATUS = status;
    _proc_exit(status);
  }, "exitJS");
  var handleException = /* @__PURE__ */ __name((e) => {
    if (e instanceof ExitStatus || e == "unwind") {
      return EXITSTATUS;
    }
    quit_(1, e);
  }, "handleException");
  var lengthBytesUTF8 = /* @__PURE__ */ __name((str) => {
    var len = 0;
    for (var i2 = 0; i2 < str.length; ++i2) {
      var c = str.charCodeAt(i2);
      if (c <= 127) {
        len++;
      } else if (c <= 2047) {
        len += 2;
      } else if (c >= 55296 && c <= 57343) {
        len += 4;
        ++i2;
      } else {
        len += 3;
      }
    }
    return len;
  }, "lengthBytesUTF8");
  var stringToUTF8Array = /* @__PURE__ */ __name((str, heap, outIdx, maxBytesToWrite) => {
    if (!(maxBytesToWrite > 0)) return 0;
    var startIdx = outIdx;
    var endIdx = outIdx + maxBytesToWrite - 1;
    for (var i2 = 0; i2 < str.length; ++i2) {
      var u = str.codePointAt(i2);
      if (u <= 127) {
        if (outIdx >= endIdx) break;
        heap[outIdx++] = u;
      } else if (u <= 2047) {
        if (outIdx + 1 >= endIdx) break;
        heap[outIdx++] = 192 | u >> 6;
        heap[outIdx++] = 128 | u & 63;
      } else if (u <= 65535) {
        if (outIdx + 2 >= endIdx) break;
        heap[outIdx++] = 224 | u >> 12;
        heap[outIdx++] = 128 | u >> 6 & 63;
        heap[outIdx++] = 128 | u & 63;
      } else {
        if (outIdx + 3 >= endIdx) break;
        heap[outIdx++] = 240 | u >> 18;
        heap[outIdx++] = 128 | u >> 12 & 63;
        heap[outIdx++] = 128 | u >> 6 & 63;
        heap[outIdx++] = 128 | u & 63;
        i2++;
      }
    }
    heap[outIdx] = 0;
    return outIdx - startIdx;
  }, "stringToUTF8Array");
  var stringToUTF8 = /* @__PURE__ */ __name((str, outPtr, maxBytesToWrite) => stringToUTF8Array(str, HEAPU8, outPtr, maxBytesToWrite), "stringToUTF8");
  var stackAlloc = /* @__PURE__ */ __name((sz) => __emscripten_stack_alloc(sz), "stackAlloc");
  var stringToUTF8OnStack = /* @__PURE__ */ __name((str) => {
    var size = lengthBytesUTF8(str) + 1;
    var ret = stackAlloc(size);
    stringToUTF8(str, ret, size);
    return ret;
  }, "stringToUTF8OnStack");
  var AsciiToString = /* @__PURE__ */ __name((ptr) => {
    var str = "";
    while (1) {
      var ch = HEAPU8[ptr++];
      if (!ch) return str;
      str += String.fromCharCode(ch);
    }
  }, "AsciiToString");
  var stringToUTF16 = /* @__PURE__ */ __name((str, outPtr, maxBytesToWrite) => {
    maxBytesToWrite ??= 2147483647;
    if (maxBytesToWrite < 2) return 0;
    maxBytesToWrite -= 2;
    var startPtr = outPtr;
    var numCharsToWrite = maxBytesToWrite < str.length * 2 ? maxBytesToWrite / 2 : str.length;
    for (var i2 = 0; i2 < numCharsToWrite; ++i2) {
      var codeUnit = str.charCodeAt(i2);
      LE_HEAP_STORE_I16((outPtr >> 1) * 2, codeUnit);
      outPtr += 2;
    }
    LE_HEAP_STORE_I16((outPtr >> 1) * 2, 0);
    return outPtr - startPtr;
  }, "stringToUTF16");
  LE_ATOMICS_NATIVE_BYTE_ORDER = new Int8Array(new Int16Array([1]).buffer)[0] === 1 ? [
    /* little endian */
    ((x) => x),
    ((x) => x),
    void 0,
    ((x) => x)
  ] : [
    /* big endian */
    ((x) => x),
    ((x) => ((x & 65280) << 8 | (x & 255) << 24) >> 16),
    void 0,
    ((x) => x >> 24 & 255 | x >> 8 & 65280 | (x & 65280) << 8 | (x & 255) << 24)
  ];
  function LE_HEAP_UPDATE() {
    HEAPU16.unsigned = ((x) => x & 65535);
    HEAPU32.unsigned = ((x) => x >>> 0);
  }
  __name(LE_HEAP_UPDATE, "LE_HEAP_UPDATE");
  {
    initMemory();
    if (Module["noExitRuntime"]) noExitRuntime = Module["noExitRuntime"];
    if (Module["print"]) out = Module["print"];
    if (Module["printErr"]) err = Module["printErr"];
    if (Module["dynamicLibraries"]) dynamicLibraries = Module["dynamicLibraries"];
    if (Module["wasmBinary"]) wasmBinary = Module["wasmBinary"];
    if (Module["arguments"]) arguments_ = Module["arguments"];
    if (Module["thisProgram"]) thisProgram = Module["thisProgram"];
    if (Module["preInit"]) {
      if (typeof Module["preInit"] == "function") Module["preInit"] = [Module["preInit"]];
      while (Module["preInit"].length > 0) {
        Module["preInit"].shift()();
      }
    }
  }
  Module["setValue"] = setValue;
  Module["getValue"] = getValue;
  Module["UTF8ToString"] = UTF8ToString;
  Module["stringToUTF8"] = stringToUTF8;
  Module["lengthBytesUTF8"] = lengthBytesUTF8;
  Module["AsciiToString"] = AsciiToString;
  Module["stringToUTF16"] = stringToUTF16;
  Module["loadWebAssemblyModule"] = loadWebAssemblyModule;
  Module["LE_HEAP_STORE_I64"] = LE_HEAP_STORE_I64;
  var ASM_CONSTS = {};
  var _malloc, _calloc, _realloc, _free, _ts_range_edit, _memcmp, _ts_language_symbol_count, _ts_language_state_count, _ts_language_abi_version, _ts_language_name, _ts_language_field_count, _ts_language_next_state, _ts_language_symbol_name, _ts_language_symbol_for_name, _strncmp, _ts_language_symbol_type, _ts_language_field_name_for_id, _ts_lookahead_iterator_new, _ts_lookahead_iterator_delete, _ts_lookahead_iterator_reset_state, _ts_lookahead_iterator_reset, _ts_lookahead_iterator_next, _ts_lookahead_iterator_current_symbol, _ts_point_edit, _ts_parser_delete, _ts_parser_reset, _ts_parser_set_language, _ts_parser_set_included_ranges, _ts_query_new, _ts_query_delete, _iswspace, _iswalnum, _ts_query_pattern_count, _ts_query_capture_count, _ts_query_string_count, _ts_query_capture_name_for_id, _ts_query_capture_quantifier_for_id, _ts_query_string_value_for_id, _ts_query_predicates_for_pattern, _ts_query_start_byte_for_pattern, _ts_query_end_byte_for_pattern, _ts_query_is_pattern_rooted, _ts_query_is_pattern_non_local, _ts_query_is_pattern_guaranteed_at_step, _ts_query_disable_capture, _ts_query_disable_pattern, _ts_tree_copy, _ts_tree_delete, _ts_init, _ts_parser_new_wasm, _ts_parser_enable_logger_wasm, _ts_parser_parse_wasm, _ts_parser_included_ranges_wasm, _ts_language_type_is_named_wasm, _ts_language_type_is_visible_wasm, _ts_language_metadata_wasm, _ts_language_supertypes_wasm, _ts_language_subtypes_wasm, _ts_tree_root_node_wasm, _ts_tree_root_node_with_offset_wasm, _ts_tree_edit_wasm, _ts_tree_included_ranges_wasm, _ts_tree_get_changed_ranges_wasm, _ts_tree_cursor_new_wasm, _ts_tree_cursor_copy_wasm, _ts_tree_cursor_delete_wasm, _ts_tree_cursor_reset_wasm, _ts_tree_cursor_reset_to_wasm, _ts_tree_cursor_goto_first_child_wasm, _ts_tree_cursor_goto_last_child_wasm, _ts_tree_cursor_goto_first_child_for_index_wasm, _ts_tree_cursor_goto_first_child_for_position_wasm, _ts_tree_cursor_goto_next_sibling_wasm, _ts_tree_cursor_goto_previous_sibling_wasm, _ts_tree_cursor_goto_descendant_wasm, _ts_tree_cursor_goto_parent_wasm, _ts_tree_cursor_current_node_type_id_wasm, _ts_tree_cursor_current_node_state_id_wasm, _ts_tree_cursor_current_node_is_named_wasm, _ts_tree_cursor_current_node_is_missing_wasm, _ts_tree_cursor_current_node_id_wasm, _ts_tree_cursor_start_position_wasm, _ts_tree_cursor_end_position_wasm, _ts_tree_cursor_start_index_wasm, _ts_tree_cursor_end_index_wasm, _ts_tree_cursor_current_field_id_wasm, _ts_tree_cursor_current_depth_wasm, _ts_tree_cursor_current_descendant_index_wasm, _ts_tree_cursor_current_node_wasm, _ts_node_symbol_wasm, _ts_node_field_name_for_child_wasm, _ts_node_field_name_for_named_child_wasm, _ts_node_children_by_field_id_wasm, _ts_node_first_child_for_byte_wasm, _ts_node_first_named_child_for_byte_wasm, _ts_node_grammar_symbol_wasm, _ts_node_child_count_wasm, _ts_node_named_child_count_wasm, _ts_node_child_wasm, _ts_node_named_child_wasm, _ts_node_child_by_field_id_wasm, _ts_node_next_sibling_wasm, _ts_node_prev_sibling_wasm, _ts_node_next_named_sibling_wasm, _ts_node_prev_named_sibling_wasm, _ts_node_descendant_count_wasm, _ts_node_parent_wasm, _ts_node_child_with_descendant_wasm, _ts_node_descendant_for_index_wasm, _ts_node_named_descendant_for_index_wasm, _ts_node_descendant_for_position_wasm, _ts_node_named_descendant_for_position_wasm, _ts_node_start_point_wasm, _ts_node_end_point_wasm, _ts_node_start_index_wasm, _ts_node_end_index_wasm, _ts_node_to_string_wasm, _ts_node_children_wasm, _ts_node_named_children_wasm, _ts_node_descendants_of_type_wasm, _ts_node_is_named_wasm, _ts_node_has_changes_wasm, _ts_node_has_error_wasm, _ts_node_is_error_wasm, _ts_node_is_missing_wasm, _ts_node_is_extra_wasm, _ts_node_parse_state_wasm, _ts_node_next_parse_state_wasm, _ts_query_matches_wasm, _ts_query_captures_wasm, _memset, _memcpy, _memmove, _iswalpha, _iswblank, _iswdigit, _iswlower, _iswupper, _iswxdigit, _memchr, _strlen, _strcmp, _strncat, _strncpy, _towlower, _towupper, _setThrew, __emscripten_stack_restore, __emscripten_stack_alloc, _emscripten_stack_get_current, ___wasm_apply_data_relocs;
  function assignWasmExports(wasmExports2) {
    Module["_malloc"] = _malloc = wasmExports2["malloc"];
    Module["_calloc"] = _calloc = wasmExports2["calloc"];
    Module["_realloc"] = _realloc = wasmExports2["realloc"];
    Module["_free"] = _free = wasmExports2["free"];
    Module["_ts_range_edit"] = _ts_range_edit = wasmExports2["ts_range_edit"];
    Module["_memcmp"] = _memcmp = wasmExports2["memcmp"];
    Module["_ts_language_symbol_count"] = _ts_language_symbol_count = wasmExports2["ts_language_symbol_count"];
    Module["_ts_language_state_count"] = _ts_language_state_count = wasmExports2["ts_language_state_count"];
    Module["_ts_language_abi_version"] = _ts_language_abi_version = wasmExports2["ts_language_abi_version"];
    Module["_ts_language_name"] = _ts_language_name = wasmExports2["ts_language_name"];
    Module["_ts_language_field_count"] = _ts_language_field_count = wasmExports2["ts_language_field_count"];
    Module["_ts_language_next_state"] = _ts_language_next_state = wasmExports2["ts_language_next_state"];
    Module["_ts_language_symbol_name"] = _ts_language_symbol_name = wasmExports2["ts_language_symbol_name"];
    Module["_ts_language_symbol_for_name"] = _ts_language_symbol_for_name = wasmExports2["ts_language_symbol_for_name"];
    Module["_strncmp"] = _strncmp = wasmExports2["strncmp"];
    Module["_ts_language_symbol_type"] = _ts_language_symbol_type = wasmExports2["ts_language_symbol_type"];
    Module["_ts_language_field_name_for_id"] = _ts_language_field_name_for_id = wasmExports2["ts_language_field_name_for_id"];
    Module["_ts_lookahead_iterator_new"] = _ts_lookahead_iterator_new = wasmExports2["ts_lookahead_iterator_new"];
    Module["_ts_lookahead_iterator_delete"] = _ts_lookahead_iterator_delete = wasmExports2["ts_lookahead_iterator_delete"];
    Module["_ts_lookahead_iterator_reset_state"] = _ts_lookahead_iterator_reset_state = wasmExports2["ts_lookahead_iterator_reset_state"];
    Module["_ts_lookahead_iterator_reset"] = _ts_lookahead_iterator_reset = wasmExports2["ts_lookahead_iterator_reset"];
    Module["_ts_lookahead_iterator_next"] = _ts_lookahead_iterator_next = wasmExports2["ts_lookahead_iterator_next"];
    Module["_ts_lookahead_iterator_current_symbol"] = _ts_lookahead_iterator_current_symbol = wasmExports2["ts_lookahead_iterator_current_symbol"];
    Module["_ts_point_edit"] = _ts_point_edit = wasmExports2["ts_point_edit"];
    Module["_ts_parser_delete"] = _ts_parser_delete = wasmExports2["ts_parser_delete"];
    Module["_ts_parser_reset"] = _ts_parser_reset = wasmExports2["ts_parser_reset"];
    Module["_ts_parser_set_language"] = _ts_parser_set_language = wasmExports2["ts_parser_set_language"];
    Module["_ts_parser_set_included_ranges"] = _ts_parser_set_included_ranges = wasmExports2["ts_parser_set_included_ranges"];
    Module["_ts_query_new"] = _ts_query_new = wasmExports2["ts_query_new"];
    Module["_ts_query_delete"] = _ts_query_delete = wasmExports2["ts_query_delete"];
    Module["_iswspace"] = _iswspace = wasmExports2["iswspace"];
    Module["_iswalnum"] = _iswalnum = wasmExports2["iswalnum"];
    Module["_ts_query_pattern_count"] = _ts_query_pattern_count = wasmExports2["ts_query_pattern_count"];
    Module["_ts_query_capture_count"] = _ts_query_capture_count = wasmExports2["ts_query_capture_count"];
    Module["_ts_query_string_count"] = _ts_query_string_count = wasmExports2["ts_query_string_count"];
    Module["_ts_query_capture_name_for_id"] = _ts_query_capture_name_for_id = wasmExports2["ts_query_capture_name_for_id"];
    Module["_ts_query_capture_quantifier_for_id"] = _ts_query_capture_quantifier_for_id = wasmExports2["ts_query_capture_quantifier_for_id"];
    Module["_ts_query_string_value_for_id"] = _ts_query_string_value_for_id = wasmExports2["ts_query_string_value_for_id"];
    Module["_ts_query_predicates_for_pattern"] = _ts_query_predicates_for_pattern = wasmExports2["ts_query_predicates_for_pattern"];
    Module["_ts_query_start_byte_for_pattern"] = _ts_query_start_byte_for_pattern = wasmExports2["ts_query_start_byte_for_pattern"];
    Module["_ts_query_end_byte_for_pattern"] = _ts_query_end_byte_for_pattern = wasmExports2["ts_query_end_byte_for_pattern"];
    Module["_ts_query_is_pattern_rooted"] = _ts_query_is_pattern_rooted = wasmExports2["ts_query_is_pattern_rooted"];
    Module["_ts_query_is_pattern_non_local"] = _ts_query_is_pattern_non_local = wasmExports2["ts_query_is_pattern_non_local"];
    Module["_ts_query_is_pattern_guaranteed_at_step"] = _ts_query_is_pattern_guaranteed_at_step = wasmExports2["ts_query_is_pattern_guaranteed_at_step"];
    Module["_ts_query_disable_capture"] = _ts_query_disable_capture = wasmExports2["ts_query_disable_capture"];
    Module["_ts_query_disable_pattern"] = _ts_query_disable_pattern = wasmExports2["ts_query_disable_pattern"];
    Module["_ts_tree_copy"] = _ts_tree_copy = wasmExports2["ts_tree_copy"];
    Module["_ts_tree_delete"] = _ts_tree_delete = wasmExports2["ts_tree_delete"];
    Module["_ts_init"] = _ts_init = wasmExports2["ts_init"];
    Module["_ts_parser_new_wasm"] = _ts_parser_new_wasm = wasmExports2["ts_parser_new_wasm"];
    Module["_ts_parser_enable_logger_wasm"] = _ts_parser_enable_logger_wasm = wasmExports2["ts_parser_enable_logger_wasm"];
    Module["_ts_parser_parse_wasm"] = _ts_parser_parse_wasm = wasmExports2["ts_parser_parse_wasm"];
    Module["_ts_parser_included_ranges_wasm"] = _ts_parser_included_ranges_wasm = wasmExports2["ts_parser_included_ranges_wasm"];
    Module["_ts_language_type_is_named_wasm"] = _ts_language_type_is_named_wasm = wasmExports2["ts_language_type_is_named_wasm"];
    Module["_ts_language_type_is_visible_wasm"] = _ts_language_type_is_visible_wasm = wasmExports2["ts_language_type_is_visible_wasm"];
    Module["_ts_language_metadata_wasm"] = _ts_language_metadata_wasm = wasmExports2["ts_language_metadata_wasm"];
    Module["_ts_language_supertypes_wasm"] = _ts_language_supertypes_wasm = wasmExports2["ts_language_supertypes_wasm"];
    Module["_ts_language_subtypes_wasm"] = _ts_language_subtypes_wasm = wasmExports2["ts_language_subtypes_wasm"];
    Module["_ts_tree_root_node_wasm"] = _ts_tree_root_node_wasm = wasmExports2["ts_tree_root_node_wasm"];
    Module["_ts_tree_root_node_with_offset_wasm"] = _ts_tree_root_node_with_offset_wasm = wasmExports2["ts_tree_root_node_with_offset_wasm"];
    Module["_ts_tree_edit_wasm"] = _ts_tree_edit_wasm = wasmExports2["ts_tree_edit_wasm"];
    Module["_ts_tree_included_ranges_wasm"] = _ts_tree_included_ranges_wasm = wasmExports2["ts_tree_included_ranges_wasm"];
    Module["_ts_tree_get_changed_ranges_wasm"] = _ts_tree_get_changed_ranges_wasm = wasmExports2["ts_tree_get_changed_ranges_wasm"];
    Module["_ts_tree_cursor_new_wasm"] = _ts_tree_cursor_new_wasm = wasmExports2["ts_tree_cursor_new_wasm"];
    Module["_ts_tree_cursor_copy_wasm"] = _ts_tree_cursor_copy_wasm = wasmExports2["ts_tree_cursor_copy_wasm"];
    Module["_ts_tree_cursor_delete_wasm"] = _ts_tree_cursor_delete_wasm = wasmExports2["ts_tree_cursor_delete_wasm"];
    Module["_ts_tree_cursor_reset_wasm"] = _ts_tree_cursor_reset_wasm = wasmExports2["ts_tree_cursor_reset_wasm"];
    Module["_ts_tree_cursor_reset_to_wasm"] = _ts_tree_cursor_reset_to_wasm = wasmExports2["ts_tree_cursor_reset_to_wasm"];
    Module["_ts_tree_cursor_goto_first_child_wasm"] = _ts_tree_cursor_goto_first_child_wasm = wasmExports2["ts_tree_cursor_goto_first_child_wasm"];
    Module["_ts_tree_cursor_goto_last_child_wasm"] = _ts_tree_cursor_goto_last_child_wasm = wasmExports2["ts_tree_cursor_goto_last_child_wasm"];
    Module["_ts_tree_cursor_goto_first_child_for_index_wasm"] = _ts_tree_cursor_goto_first_child_for_index_wasm = wasmExports2["ts_tree_cursor_goto_first_child_for_index_wasm"];
    Module["_ts_tree_cursor_goto_first_child_for_position_wasm"] = _ts_tree_cursor_goto_first_child_for_position_wasm = wasmExports2["ts_tree_cursor_goto_first_child_for_position_wasm"];
    Module["_ts_tree_cursor_goto_next_sibling_wasm"] = _ts_tree_cursor_goto_next_sibling_wasm = wasmExports2["ts_tree_cursor_goto_next_sibling_wasm"];
    Module["_ts_tree_cursor_goto_previous_sibling_wasm"] = _ts_tree_cursor_goto_previous_sibling_wasm = wasmExports2["ts_tree_cursor_goto_previous_sibling_wasm"];
    Module["_ts_tree_cursor_goto_descendant_wasm"] = _ts_tree_cursor_goto_descendant_wasm = wasmExports2["ts_tree_cursor_goto_descendant_wasm"];
    Module["_ts_tree_cursor_goto_parent_wasm"] = _ts_tree_cursor_goto_parent_wasm = wasmExports2["ts_tree_cursor_goto_parent_wasm"];
    Module["_ts_tree_cursor_current_node_type_id_wasm"] = _ts_tree_cursor_current_node_type_id_wasm = wasmExports2["ts_tree_cursor_current_node_type_id_wasm"];
    Module["_ts_tree_cursor_current_node_state_id_wasm"] = _ts_tree_cursor_current_node_state_id_wasm = wasmExports2["ts_tree_cursor_current_node_state_id_wasm"];
    Module["_ts_tree_cursor_current_node_is_named_wasm"] = _ts_tree_cursor_current_node_is_named_wasm = wasmExports2["ts_tree_cursor_current_node_is_named_wasm"];
    Module["_ts_tree_cursor_current_node_is_missing_wasm"] = _ts_tree_cursor_current_node_is_missing_wasm = wasmExports2["ts_tree_cursor_current_node_is_missing_wasm"];
    Module["_ts_tree_cursor_current_node_id_wasm"] = _ts_tree_cursor_current_node_id_wasm = wasmExports2["ts_tree_cursor_current_node_id_wasm"];
    Module["_ts_tree_cursor_start_position_wasm"] = _ts_tree_cursor_start_position_wasm = wasmExports2["ts_tree_cursor_start_position_wasm"];
    Module["_ts_tree_cursor_end_position_wasm"] = _ts_tree_cursor_end_position_wasm = wasmExports2["ts_tree_cursor_end_position_wasm"];
    Module["_ts_tree_cursor_start_index_wasm"] = _ts_tree_cursor_start_index_wasm = wasmExports2["ts_tree_cursor_start_index_wasm"];
    Module["_ts_tree_cursor_end_index_wasm"] = _ts_tree_cursor_end_index_wasm = wasmExports2["ts_tree_cursor_end_index_wasm"];
    Module["_ts_tree_cursor_current_field_id_wasm"] = _ts_tree_cursor_current_field_id_wasm = wasmExports2["ts_tree_cursor_current_field_id_wasm"];
    Module["_ts_tree_cursor_current_depth_wasm"] = _ts_tree_cursor_current_depth_wasm = wasmExports2["ts_tree_cursor_current_depth_wasm"];
    Module["_ts_tree_cursor_current_descendant_index_wasm"] = _ts_tree_cursor_current_descendant_index_wasm = wasmExports2["ts_tree_cursor_current_descendant_index_wasm"];
    Module["_ts_tree_cursor_current_node_wasm"] = _ts_tree_cursor_current_node_wasm = wasmExports2["ts_tree_cursor_current_node_wasm"];
    Module["_ts_node_symbol_wasm"] = _ts_node_symbol_wasm = wasmExports2["ts_node_symbol_wasm"];
    Module["_ts_node_field_name_for_child_wasm"] = _ts_node_field_name_for_child_wasm = wasmExports2["ts_node_field_name_for_child_wasm"];
    Module["_ts_node_field_name_for_named_child_wasm"] = _ts_node_field_name_for_named_child_wasm = wasmExports2["ts_node_field_name_for_named_child_wasm"];
    Module["_ts_node_children_by_field_id_wasm"] = _ts_node_children_by_field_id_wasm = wasmExports2["ts_node_children_by_field_id_wasm"];
    Module["_ts_node_first_child_for_byte_wasm"] = _ts_node_first_child_for_byte_wasm = wasmExports2["ts_node_first_child_for_byte_wasm"];
    Module["_ts_node_first_named_child_for_byte_wasm"] = _ts_node_first_named_child_for_byte_wasm = wasmExports2["ts_node_first_named_child_for_byte_wasm"];
    Module["_ts_node_grammar_symbol_wasm"] = _ts_node_grammar_symbol_wasm = wasmExports2["ts_node_grammar_symbol_wasm"];
    Module["_ts_node_child_count_wasm"] = _ts_node_child_count_wasm = wasmExports2["ts_node_child_count_wasm"];
    Module["_ts_node_named_child_count_wasm"] = _ts_node_named_child_count_wasm = wasmExports2["ts_node_named_child_count_wasm"];
    Module["_ts_node_child_wasm"] = _ts_node_child_wasm = wasmExports2["ts_node_child_wasm"];
    Module["_ts_node_named_child_wasm"] = _ts_node_named_child_wasm = wasmExports2["ts_node_named_child_wasm"];
    Module["_ts_node_child_by_field_id_wasm"] = _ts_node_child_by_field_id_wasm = wasmExports2["ts_node_child_by_field_id_wasm"];
    Module["_ts_node_next_sibling_wasm"] = _ts_node_next_sibling_wasm = wasmExports2["ts_node_next_sibling_wasm"];
    Module["_ts_node_prev_sibling_wasm"] = _ts_node_prev_sibling_wasm = wasmExports2["ts_node_prev_sibling_wasm"];
    Module["_ts_node_next_named_sibling_wasm"] = _ts_node_next_named_sibling_wasm = wasmExports2["ts_node_next_named_sibling_wasm"];
    Module["_ts_node_prev_named_sibling_wasm"] = _ts_node_prev_named_sibling_wasm = wasmExports2["ts_node_prev_named_sibling_wasm"];
    Module["_ts_node_descendant_count_wasm"] = _ts_node_descendant_count_wasm = wasmExports2["ts_node_descendant_count_wasm"];
    Module["_ts_node_parent_wasm"] = _ts_node_parent_wasm = wasmExports2["ts_node_parent_wasm"];
    Module["_ts_node_child_with_descendant_wasm"] = _ts_node_child_with_descendant_wasm = wasmExports2["ts_node_child_with_descendant_wasm"];
    Module["_ts_node_descendant_for_index_wasm"] = _ts_node_descendant_for_index_wasm = wasmExports2["ts_node_descendant_for_index_wasm"];
    Module["_ts_node_named_descendant_for_index_wasm"] = _ts_node_named_descendant_for_index_wasm = wasmExports2["ts_node_named_descendant_for_index_wasm"];
    Module["_ts_node_descendant_for_position_wasm"] = _ts_node_descendant_for_position_wasm = wasmExports2["ts_node_descendant_for_position_wasm"];
    Module["_ts_node_named_descendant_for_position_wasm"] = _ts_node_named_descendant_for_position_wasm = wasmExports2["ts_node_named_descendant_for_position_wasm"];
    Module["_ts_node_start_point_wasm"] = _ts_node_start_point_wasm = wasmExports2["ts_node_start_point_wasm"];
    Module["_ts_node_end_point_wasm"] = _ts_node_end_point_wasm = wasmExports2["ts_node_end_point_wasm"];
    Module["_ts_node_start_index_wasm"] = _ts_node_start_index_wasm = wasmExports2["ts_node_start_index_wasm"];
    Module["_ts_node_end_index_wasm"] = _ts_node_end_index_wasm = wasmExports2["ts_node_end_index_wasm"];
    Module["_ts_node_to_string_wasm"] = _ts_node_to_string_wasm = wasmExports2["ts_node_to_string_wasm"];
    Module["_ts_node_children_wasm"] = _ts_node_children_wasm = wasmExports2["ts_node_children_wasm"];
    Module["_ts_node_named_children_wasm"] = _ts_node_named_children_wasm = wasmExports2["ts_node_named_children_wasm"];
    Module["_ts_node_descendants_of_type_wasm"] = _ts_node_descendants_of_type_wasm = wasmExports2["ts_node_descendants_of_type_wasm"];
    Module["_ts_node_is_named_wasm"] = _ts_node_is_named_wasm = wasmExports2["ts_node_is_named_wasm"];
    Module["_ts_node_has_changes_wasm"] = _ts_node_has_changes_wasm = wasmExports2["ts_node_has_changes_wasm"];
    Module["_ts_node_has_error_wasm"] = _ts_node_has_error_wasm = wasmExports2["ts_node_has_error_wasm"];
    Module["_ts_node_is_error_wasm"] = _ts_node_is_error_wasm = wasmExports2["ts_node_is_error_wasm"];
    Module["_ts_node_is_missing_wasm"] = _ts_node_is_missing_wasm = wasmExports2["ts_node_is_missing_wasm"];
    Module["_ts_node_is_extra_wasm"] = _ts_node_is_extra_wasm = wasmExports2["ts_node_is_extra_wasm"];
    Module["_ts_node_parse_state_wasm"] = _ts_node_parse_state_wasm = wasmExports2["ts_node_parse_state_wasm"];
    Module["_ts_node_next_parse_state_wasm"] = _ts_node_next_parse_state_wasm = wasmExports2["ts_node_next_parse_state_wasm"];
    Module["_ts_query_matches_wasm"] = _ts_query_matches_wasm = wasmExports2["ts_query_matches_wasm"];
    Module["_ts_query_captures_wasm"] = _ts_query_captures_wasm = wasmExports2["ts_query_captures_wasm"];
    Module["_memset"] = _memset = wasmExports2["memset"];
    Module["_memcpy"] = _memcpy = wasmExports2["memcpy"];
    Module["_memmove"] = _memmove = wasmExports2["memmove"];
    Module["_iswalpha"] = _iswalpha = wasmExports2["iswalpha"];
    Module["_iswblank"] = _iswblank = wasmExports2["iswblank"];
    Module["_iswdigit"] = _iswdigit = wasmExports2["iswdigit"];
    Module["_iswlower"] = _iswlower = wasmExports2["iswlower"];
    Module["_iswupper"] = _iswupper = wasmExports2["iswupper"];
    Module["_iswxdigit"] = _iswxdigit = wasmExports2["iswxdigit"];
    Module["_memchr"] = _memchr = wasmExports2["memchr"];
    Module["_strlen"] = _strlen = wasmExports2["strlen"];
    Module["_strcmp"] = _strcmp = wasmExports2["strcmp"];
    Module["_strncat"] = _strncat = wasmExports2["strncat"];
    Module["_strncpy"] = _strncpy = wasmExports2["strncpy"];
    Module["_towlower"] = _towlower = wasmExports2["towlower"];
    Module["_towupper"] = _towupper = wasmExports2["towupper"];
    _setThrew = wasmExports2["setThrew"];
    __emscripten_stack_restore = wasmExports2["_emscripten_stack_restore"];
    __emscripten_stack_alloc = wasmExports2["_emscripten_stack_alloc"];
    _emscripten_stack_get_current = wasmExports2["emscripten_stack_get_current"];
    ___wasm_apply_data_relocs = wasmExports2["__wasm_apply_data_relocs"];
  }
  __name(assignWasmExports, "assignWasmExports");
  var wasmImports = {
    /** @export */
    __heap_base: ___heap_base,
    /** @export */
    __indirect_function_table: wasmTable,
    /** @export */
    __memory_base: ___memory_base,
    /** @export */
    __stack_high: ___stack_high,
    /** @export */
    __stack_low: ___stack_low,
    /** @export */
    __stack_pointer: ___stack_pointer,
    /** @export */
    __table_base: ___table_base,
    /** @export */
    _abort_js: __abort_js,
    /** @export */
    emscripten_resize_heap: _emscripten_resize_heap,
    /** @export */
    fd_close: _fd_close,
    /** @export */
    fd_seek: _fd_seek,
    /** @export */
    fd_write: _fd_write,
    /** @export */
    memory: wasmMemory,
    /** @export */
    tree_sitter_log_callback: _tree_sitter_log_callback,
    /** @export */
    tree_sitter_parse_callback: _tree_sitter_parse_callback,
    /** @export */
    tree_sitter_progress_callback: _tree_sitter_progress_callback,
    /** @export */
    tree_sitter_query_progress_callback: _tree_sitter_query_progress_callback
  };
  function callMain(args2 = []) {
    var entryFunction = resolveGlobalSymbol("main").sym;
    if (!entryFunction) return;
    args2.unshift(thisProgram);
    var argc = args2.length;
    var argv = stackAlloc((argc + 1) * 4);
    var argv_ptr = argv;
    args2.forEach((arg) => {
      LE_HEAP_STORE_U32((argv_ptr >> 2) * 4, stringToUTF8OnStack(arg));
      argv_ptr += 4;
    });
    LE_HEAP_STORE_U32((argv_ptr >> 2) * 4, 0);
    try {
      var ret = entryFunction(argc, argv);
      exitJS(
        ret,
        /* implicit = */
        true
      );
      return ret;
    } catch (e) {
      return handleException(e);
    }
  }
  __name(callMain, "callMain");
  function run(args2 = arguments_) {
    if (runDependencies > 0) {
      dependenciesFulfilled = run;
      return;
    }
    preRun();
    if (runDependencies > 0) {
      dependenciesFulfilled = run;
      return;
    }
    function doRun() {
      Module["calledRun"] = true;
      if (ABORT) return;
      initRuntime();
      preMain();
      readyPromiseResolve?.(Module);
      Module["onRuntimeInitialized"]?.();
      var noInitialRun = Module["noInitialRun"] || false;
      if (!noInitialRun) callMain(args2);
      postRun();
    }
    __name(doRun, "doRun");
    if (Module["setStatus"]) {
      Module["setStatus"]("Running...");
      setTimeout(() => {
        setTimeout(() => Module["setStatus"](""), 1);
        doRun();
      }, 1);
    } else {
      doRun();
    }
  }
  __name(run, "run");
  var wasmExports;
  wasmExports = await createWasm();
  run();
  if (runtimeInitialized) {
    moduleRtn = Module;
  } else {
    moduleRtn = new Promise((resolve9, reject) => {
      readyPromiseResolve = resolve9;
      readyPromiseReject = reject;
    });
  }
  return moduleRtn;
}
__name(Module2, "Module");
var web_tree_sitter_default = Module2;
var Module3 = null;
async function initializeBinding(moduleOptions) {
  return Module3 ??= await web_tree_sitter_default(moduleOptions);
}
__name(initializeBinding, "initializeBinding");
function checkModule() {
  return !!Module3;
}
__name(checkModule, "checkModule");
var TRANSFER_BUFFER;
var LANGUAGE_VERSION;
var MIN_COMPATIBLE_VERSION;
var Parser = class {
  static {
    __name(this, "Parser");
  }
  /** @internal */
  [0] = 0;
  // Internal handle for Wasm
  /** @internal */
  [1] = 0;
  // Internal handle for Wasm
  /** @internal */
  logCallback = null;
  /** The parser's current language. */
  language = null;
  /**
   * This must always be called before creating a Parser.
   *
   * You can optionally pass in options to configure the Wasm module, the most common
   * one being `locateFile` to help the module find the `.wasm` file.
   */
  static async init(moduleOptions) {
    setModule(await initializeBinding(moduleOptions));
    TRANSFER_BUFFER = C._ts_init();
    LANGUAGE_VERSION = C.getValue(TRANSFER_BUFFER, "i32");
    MIN_COMPATIBLE_VERSION = C.getValue(TRANSFER_BUFFER + SIZE_OF_INT, "i32");
  }
  /**
   * Create a new parser.
   */
  constructor() {
    this.initialize();
  }
  /** @internal */
  initialize() {
    if (!checkModule()) {
      throw new Error("cannot construct a Parser before calling `init()`");
    }
    C._ts_parser_new_wasm();
    this[0] = C.getValue(TRANSFER_BUFFER, "i32");
    this[1] = C.getValue(TRANSFER_BUFFER + SIZE_OF_INT, "i32");
  }
  /** Delete the parser, freeing its resources. */
  delete() {
    C._ts_parser_delete(this[0]);
    C._free(this[1]);
    this[0] = 0;
    this[1] = 0;
  }
  /**
   * Set the language that the parser should use for parsing.
   *
   * If the language was not successfully assigned, an error will be thrown.
   * This happens if the language was generated with an incompatible
   * version of the Tree-sitter CLI. Check the language's version using
   * {@link Language#version} and compare it to this library's
   * {@link LANGUAGE_VERSION} and {@link MIN_COMPATIBLE_VERSION} constants.
   */
  setLanguage(language) {
    let address;
    if (!language) {
      address = 0;
      this.language = null;
    } else if (language.constructor === Language) {
      address = language[0];
      const version = C._ts_language_abi_version(address);
      if (version < MIN_COMPATIBLE_VERSION || LANGUAGE_VERSION < version) {
        throw new Error(
          `Incompatible language version ${version}. Compatibility range ${MIN_COMPATIBLE_VERSION} through ${LANGUAGE_VERSION}.`
        );
      }
      this.language = language;
    } else {
      throw new Error("Argument must be a Language");
    }
    C._ts_parser_set_language(this[0], address);
    return this;
  }
  /**
   * Parse a slice of UTF8 text.
   *
   * @param {string | ParseCallback} callback - The UTF8-encoded text to parse or a callback function.
   *
   * @param {Tree | null} [oldTree] - A previous syntax tree parsed from the same document. If the text of the
   *   document has changed since `oldTree` was created, then you must edit `oldTree` to match
   *   the new text using {@link Tree#edit}.
   *
   * @param {ParseOptions} [options] - Options for parsing the text.
   *  This can be used to set the included ranges, or a progress callback.
   *
   * @returns {Tree | null} A {@link Tree} if parsing succeeded, or `null` if:
   *  - The parser has not yet had a language assigned with {@link Parser#setLanguage}.
   *  - The progress callback returned true.
   */
  parse(callback, oldTree, options) {
    if (typeof callback === "string") {
      C.currentParseCallback = (index) => callback.slice(index);
    } else if (typeof callback === "function") {
      C.currentParseCallback = callback;
    } else {
      throw new Error("Argument must be a string or a function");
    }
    if (options?.progressCallback) {
      C.currentProgressCallback = options.progressCallback;
    } else {
      C.currentProgressCallback = null;
    }
    if (this.logCallback) {
      C.currentLogCallback = this.logCallback;
      C._ts_parser_enable_logger_wasm(this[0], 1);
    } else {
      C.currentLogCallback = null;
      C._ts_parser_enable_logger_wasm(this[0], 0);
    }
    let rangeCount = 0;
    let rangeAddress = 0;
    if (options?.includedRanges) {
      rangeCount = options.includedRanges.length;
      rangeAddress = C._calloc(rangeCount, SIZE_OF_RANGE);
      let address = rangeAddress;
      for (let i2 = 0; i2 < rangeCount; i2++) {
        marshalRange(address, options.includedRanges[i2]);
        address += SIZE_OF_RANGE;
      }
    }
    const treeAddress = C._ts_parser_parse_wasm(
      this[0],
      this[1],
      oldTree ? oldTree[0] : 0,
      rangeAddress,
      rangeCount
    );
    if (!treeAddress) {
      C.currentParseCallback = null;
      C.currentLogCallback = null;
      C.currentProgressCallback = null;
      return null;
    }
    if (!this.language) {
      throw new Error("Parser must have a language to parse");
    }
    const result = new Tree(INTERNAL, treeAddress, this.language, C.currentParseCallback);
    C.currentParseCallback = null;
    C.currentLogCallback = null;
    C.currentProgressCallback = null;
    return result;
  }
  /**
   * Instruct the parser to start the next parse from the beginning.
   *
   * If the parser previously failed because of a callback, 
   * then by default, it will resume where it left off on the
   * next call to {@link Parser#parse} or other parsing functions.
   * If you don't want to resume, and instead intend to use this parser to
   * parse some other document, you must call `reset` first.
   */
  reset() {
    C._ts_parser_reset(this[0]);
  }
  /** Get the ranges of text that the parser will include when parsing. */
  getIncludedRanges() {
    C._ts_parser_included_ranges_wasm(this[0]);
    const count = C.getValue(TRANSFER_BUFFER, "i32");
    const buffer = C.getValue(TRANSFER_BUFFER + SIZE_OF_INT, "i32");
    const result = new Array(count);
    if (count > 0) {
      let address = buffer;
      for (let i2 = 0; i2 < count; i2++) {
        result[i2] = unmarshalRange(address);
        address += SIZE_OF_RANGE;
      }
      C._free(buffer);
    }
    return result;
  }
  /** Set the logging callback that a parser should use during parsing. */
  setLogger(callback) {
    if (!callback) {
      this.logCallback = null;
    } else if (typeof callback !== "function") {
      throw new Error("Logger callback must be a function");
    } else {
      this.logCallback = callback;
    }
    return this;
  }
  /** Get the parser's current logger. */
  getLogger() {
    return this.logCallback;
  }
};
var PREDICATE_STEP_TYPE_CAPTURE = 1;
var PREDICATE_STEP_TYPE_STRING = 2;
var QUERY_WORD_REGEX = /[\w-]+/g;
var CaptureQuantifier = {
  Zero: 0,
  ZeroOrOne: 1,
  ZeroOrMore: 2,
  One: 3,
  OneOrMore: 4
};
var isCaptureStep = /* @__PURE__ */ __name((step) => step.type === "capture", "isCaptureStep");
var isStringStep = /* @__PURE__ */ __name((step) => step.type === "string", "isStringStep");
var QueryErrorKind = {
  Syntax: 1,
  NodeName: 2,
  FieldName: 3,
  CaptureName: 4,
  PatternStructure: 5
};
var QueryError = class _QueryError extends Error {
  constructor(kind, info2, index, length) {
    super(_QueryError.formatMessage(kind, info2));
    this.kind = kind;
    this.info = info2;
    this.index = index;
    this.length = length;
    this.name = "QueryError";
  }
  static {
    __name(this, "QueryError");
  }
  /** Formats an error message based on the error kind and info */
  static formatMessage(kind, info2) {
    switch (kind) {
      case QueryErrorKind.NodeName:
        return `Bad node name '${info2.word}'`;
      case QueryErrorKind.FieldName:
        return `Bad field name '${info2.word}'`;
      case QueryErrorKind.CaptureName:
        return `Bad capture name @${info2.word}`;
      case QueryErrorKind.PatternStructure:
        return `Bad pattern structure at offset ${info2.suffix}`;
      case QueryErrorKind.Syntax:
        return `Bad syntax at offset ${info2.suffix}`;
    }
  }
};
function parseAnyPredicate(steps, index, operator, textPredicates) {
  if (steps.length !== 3) {
    throw new Error(
      `Wrong number of arguments to \`#${operator}\` predicate. Expected 2, got ${steps.length - 1}`
    );
  }
  if (!isCaptureStep(steps[1])) {
    throw new Error(
      `First argument of \`#${operator}\` predicate must be a capture. Got "${steps[1].value}"`
    );
  }
  const isPositive = operator === "eq?" || operator === "any-eq?";
  const matchAll = !operator.startsWith("any-");
  if (isCaptureStep(steps[2])) {
    const captureName1 = steps[1].name;
    const captureName2 = steps[2].name;
    textPredicates[index].push((captures) => {
      const nodes1 = [];
      const nodes2 = [];
      for (const c of captures) {
        if (c.name === captureName1) nodes1.push(c.node);
        if (c.name === captureName2) nodes2.push(c.node);
      }
      const compare = /* @__PURE__ */ __name((n1, n2, positive) => {
        return positive ? n1.text === n2.text : n1.text !== n2.text;
      }, "compare");
      return matchAll ? nodes1.every((n1) => nodes2.some((n2) => compare(n1, n2, isPositive))) : nodes1.some((n1) => nodes2.some((n2) => compare(n1, n2, isPositive)));
    });
  } else {
    const captureName = steps[1].name;
    const stringValue = steps[2].value;
    const matches = /* @__PURE__ */ __name((n) => n.text === stringValue, "matches");
    const doesNotMatch = /* @__PURE__ */ __name((n) => n.text !== stringValue, "doesNotMatch");
    textPredicates[index].push((captures) => {
      const nodes = [];
      for (const c of captures) {
        if (c.name === captureName) nodes.push(c.node);
      }
      const test = isPositive ? matches : doesNotMatch;
      return matchAll ? nodes.every(test) : nodes.some(test);
    });
  }
}
__name(parseAnyPredicate, "parseAnyPredicate");
function parseMatchPredicate(steps, index, operator, textPredicates) {
  if (steps.length !== 3) {
    throw new Error(
      `Wrong number of arguments to \`#${operator}\` predicate. Expected 2, got ${steps.length - 1}.`
    );
  }
  if (steps[1].type !== "capture") {
    throw new Error(
      `First argument of \`#${operator}\` predicate must be a capture. Got "${steps[1].value}".`
    );
  }
  if (steps[2].type !== "string") {
    throw new Error(
      `Second argument of \`#${operator}\` predicate must be a string. Got @${steps[2].name}.`
    );
  }
  const isPositive = operator === "match?" || operator === "any-match?";
  const matchAll = !operator.startsWith("any-");
  const captureName = steps[1].name;
  const regex = new RegExp(steps[2].value);
  textPredicates[index].push((captures) => {
    const nodes = [];
    for (const c of captures) {
      if (c.name === captureName) nodes.push(c.node.text);
    }
    const test = /* @__PURE__ */ __name((text, positive) => {
      return positive ? regex.test(text) : !regex.test(text);
    }, "test");
    if (nodes.length === 0) return !isPositive;
    return matchAll ? nodes.every((text) => test(text, isPositive)) : nodes.some((text) => test(text, isPositive));
  });
}
__name(parseMatchPredicate, "parseMatchPredicate");
function parseAnyOfPredicate(steps, index, operator, textPredicates) {
  if (steps.length < 2) {
    throw new Error(
      `Wrong number of arguments to \`#${operator}\` predicate. Expected at least 1. Got ${steps.length - 1}.`
    );
  }
  if (steps[1].type !== "capture") {
    throw new Error(
      `First argument of \`#${operator}\` predicate must be a capture. Got "${steps[1].value}".`
    );
  }
  const isPositive = operator === "any-of?";
  const captureName = steps[1].name;
  const stringSteps = steps.slice(2);
  if (!stringSteps.every(isStringStep)) {
    throw new Error(
      `Arguments to \`#${operator}\` predicate must be strings.".`
    );
  }
  const values = stringSteps.map((s) => s.value);
  textPredicates[index].push((captures) => {
    const nodes = [];
    for (const c of captures) {
      if (c.name === captureName) nodes.push(c.node.text);
    }
    if (nodes.length === 0) return !isPositive;
    return nodes.every((text) => values.includes(text)) === isPositive;
  });
}
__name(parseAnyOfPredicate, "parseAnyOfPredicate");
function parseIsPredicate(steps, index, operator, assertedProperties, refutedProperties) {
  if (steps.length < 2 || steps.length > 3) {
    throw new Error(
      `Wrong number of arguments to \`#${operator}\` predicate. Expected 1 or 2. Got ${steps.length - 1}.`
    );
  }
  if (!steps.every(isStringStep)) {
    throw new Error(
      `Arguments to \`#${operator}\` predicate must be strings.".`
    );
  }
  const properties = operator === "is?" ? assertedProperties : refutedProperties;
  if (!properties[index]) properties[index] = {};
  properties[index][steps[1].value] = steps[2]?.value ?? null;
}
__name(parseIsPredicate, "parseIsPredicate");
function parseSetDirective(steps, index, setProperties) {
  if (steps.length < 2 || steps.length > 3) {
    throw new Error(`Wrong number of arguments to \`#set!\` predicate. Expected 1 or 2. Got ${steps.length - 1}.`);
  }
  if (!steps.every(isStringStep)) {
    throw new Error(`Arguments to \`#set!\` predicate must be strings.".`);
  }
  if (!setProperties[index]) setProperties[index] = {};
  setProperties[index][steps[1].value] = steps[2]?.value ?? null;
}
__name(parseSetDirective, "parseSetDirective");
function parsePattern(index, stepType, stepValueId, captureNames, stringValues, steps, textPredicates, predicates, setProperties, assertedProperties, refutedProperties) {
  if (stepType === PREDICATE_STEP_TYPE_CAPTURE) {
    const name2 = captureNames[stepValueId];
    steps.push({ type: "capture", name: name2 });
  } else if (stepType === PREDICATE_STEP_TYPE_STRING) {
    steps.push({ type: "string", value: stringValues[stepValueId] });
  } else if (steps.length > 0) {
    if (steps[0].type !== "string") {
      throw new Error("Predicates must begin with a literal value");
    }
    const operator = steps[0].value;
    switch (operator) {
      case "any-not-eq?":
      case "not-eq?":
      case "any-eq?":
      case "eq?":
        parseAnyPredicate(steps, index, operator, textPredicates);
        break;
      case "any-not-match?":
      case "not-match?":
      case "any-match?":
      case "match?":
        parseMatchPredicate(steps, index, operator, textPredicates);
        break;
      case "not-any-of?":
      case "any-of?":
        parseAnyOfPredicate(steps, index, operator, textPredicates);
        break;
      case "is?":
      case "is-not?":
        parseIsPredicate(steps, index, operator, assertedProperties, refutedProperties);
        break;
      case "set!":
        parseSetDirective(steps, index, setProperties);
        break;
      default:
        predicates[index].push({ operator, operands: steps.slice(1) });
    }
    steps.length = 0;
  }
}
__name(parsePattern, "parsePattern");
var Query = class {
  static {
    __name(this, "Query");
  }
  /** @internal */
  [0] = 0;
  // Internal handle for Wasm
  /** @internal */
  exceededMatchLimit;
  /** @internal */
  textPredicates;
  /** The names of the captures used in the query. */
  captureNames;
  /** The quantifiers of the captures used in the query. */
  captureQuantifiers;
  /**
   * The other user-defined predicates associated with the given index.
   *
   * This includes predicates with operators other than:
   * - `match?`
   * - `eq?` and `not-eq?`
   * - `any-of?` and `not-any-of?`
   * - `is?` and `is-not?`
   * - `set!`
   */
  predicates;
  /** The properties for predicates with the operator `set!`. */
  setProperties;
  /** The properties for predicates with the operator `is?`. */
  assertedProperties;
  /** The properties for predicates with the operator `is-not?`. */
  refutedProperties;
  /** The maximum number of in-progress matches for this cursor. */
  matchLimit;
  /**
   * Create a new query from a string containing one or more S-expression
   * patterns.
   *
   * The query is associated with a particular language, and can only be run
   * on syntax nodes parsed with that language. References to Queries can be
   * shared between multiple threads.
   *
   * @link {@see https://tree-sitter.github.io/tree-sitter/using-parsers/queries}
   */
  constructor(language, source) {
    const sourceLength = C.lengthBytesUTF8(source);
    const sourceAddress = C._malloc(sourceLength + 1);
    C.stringToUTF8(source, sourceAddress, sourceLength + 1);
    const address = C._ts_query_new(
      language[0],
      sourceAddress,
      sourceLength,
      TRANSFER_BUFFER,
      TRANSFER_BUFFER + SIZE_OF_INT
    );
    if (!address) {
      const errorId = C.getValue(TRANSFER_BUFFER + SIZE_OF_INT, "i32");
      const errorByte = C.getValue(TRANSFER_BUFFER, "i32");
      const errorIndex = C.UTF8ToString(sourceAddress, errorByte).length;
      const suffix = source.slice(errorIndex, errorIndex + 100).split("\n")[0];
      const word = suffix.match(QUERY_WORD_REGEX)?.[0] ?? "";
      C._free(sourceAddress);
      switch (errorId) {
        case QueryErrorKind.Syntax:
          throw new QueryError(QueryErrorKind.Syntax, { suffix: `${errorIndex}: '${suffix}'...` }, errorIndex, 0);
        case QueryErrorKind.NodeName:
          throw new QueryError(errorId, { word }, errorIndex, word.length);
        case QueryErrorKind.FieldName:
          throw new QueryError(errorId, { word }, errorIndex, word.length);
        case QueryErrorKind.CaptureName:
          throw new QueryError(errorId, { word }, errorIndex, word.length);
        case QueryErrorKind.PatternStructure:
          throw new QueryError(errorId, { suffix: `${errorIndex}: '${suffix}'...` }, errorIndex, 0);
      }
    }
    const stringCount = C._ts_query_string_count(address);
    const captureCount = C._ts_query_capture_count(address);
    const patternCount = C._ts_query_pattern_count(address);
    const captureNames = new Array(captureCount);
    const captureQuantifiers = new Array(patternCount);
    const stringValues = new Array(stringCount);
    for (let i2 = 0; i2 < captureCount; i2++) {
      const nameAddress = C._ts_query_capture_name_for_id(
        address,
        i2,
        TRANSFER_BUFFER
      );
      const nameLength = C.getValue(TRANSFER_BUFFER, "i32");
      captureNames[i2] = C.UTF8ToString(nameAddress, nameLength);
    }
    for (let i2 = 0; i2 < patternCount; i2++) {
      const captureQuantifiersArray = new Array(captureCount);
      for (let j = 0; j < captureCount; j++) {
        const quantifier = C._ts_query_capture_quantifier_for_id(address, i2, j);
        captureQuantifiersArray[j] = quantifier;
      }
      captureQuantifiers[i2] = captureQuantifiersArray;
    }
    for (let i2 = 0; i2 < stringCount; i2++) {
      const valueAddress = C._ts_query_string_value_for_id(
        address,
        i2,
        TRANSFER_BUFFER
      );
      const nameLength = C.getValue(TRANSFER_BUFFER, "i32");
      stringValues[i2] = C.UTF8ToString(valueAddress, nameLength);
    }
    const setProperties = new Array(patternCount);
    const assertedProperties = new Array(patternCount);
    const refutedProperties = new Array(patternCount);
    const predicates = new Array(patternCount);
    const textPredicates = new Array(patternCount);
    for (let i2 = 0; i2 < patternCount; i2++) {
      const predicatesAddress = C._ts_query_predicates_for_pattern(address, i2, TRANSFER_BUFFER);
      const stepCount = C.getValue(TRANSFER_BUFFER, "i32");
      predicates[i2] = [];
      textPredicates[i2] = [];
      const steps = new Array();
      let stepAddress = predicatesAddress;
      for (let j = 0; j < stepCount; j++) {
        const stepType = C.getValue(stepAddress, "i32");
        stepAddress += SIZE_OF_INT;
        const stepValueId = C.getValue(stepAddress, "i32");
        stepAddress += SIZE_OF_INT;
        parsePattern(
          i2,
          stepType,
          stepValueId,
          captureNames,
          stringValues,
          steps,
          textPredicates,
          predicates,
          setProperties,
          assertedProperties,
          refutedProperties
        );
      }
      Object.freeze(textPredicates[i2]);
      Object.freeze(predicates[i2]);
      Object.freeze(setProperties[i2]);
      Object.freeze(assertedProperties[i2]);
      Object.freeze(refutedProperties[i2]);
    }
    C._free(sourceAddress);
    this[0] = address;
    this.captureNames = captureNames;
    this.captureQuantifiers = captureQuantifiers;
    this.textPredicates = textPredicates;
    this.predicates = predicates;
    this.setProperties = setProperties;
    this.assertedProperties = assertedProperties;
    this.refutedProperties = refutedProperties;
    this.exceededMatchLimit = false;
  }
  /** Delete the query, freeing its resources. */
  delete() {
    C._ts_query_delete(this[0]);
    this[0] = 0;
  }
  /**
   * Iterate over all of the matches in the order that they were found.
   *
   * Each match contains the index of the pattern that matched, and a list of
   * captures. Because multiple patterns can match the same set of nodes,
   * one match may contain captures that appear *before* some of the
   * captures from a previous match.
   *
   * @param {Node} node - The node to execute the query on.
   *
   * @param {QueryOptions} options - Options for query execution.
   */
  matches(node, options = {}) {
    const startPosition = options.startPosition ?? ZERO_POINT;
    const endPosition = options.endPosition ?? ZERO_POINT;
    const startIndex = options.startIndex ?? 0;
    const endIndex = options.endIndex ?? 0;
    const startContainingPosition = options.startContainingPosition ?? ZERO_POINT;
    const endContainingPosition = options.endContainingPosition ?? ZERO_POINT;
    const startContainingIndex = options.startContainingIndex ?? 0;
    const endContainingIndex = options.endContainingIndex ?? 0;
    const matchLimit = options.matchLimit ?? 4294967295;
    const maxStartDepth = options.maxStartDepth ?? 4294967295;
    const progressCallback = options.progressCallback;
    if (typeof matchLimit !== "number") {
      throw new Error("Arguments must be numbers");
    }
    this.matchLimit = matchLimit;
    if (endIndex !== 0 && startIndex > endIndex) {
      throw new Error("`startIndex` cannot be greater than `endIndex`");
    }
    if (endPosition !== ZERO_POINT && (startPosition.row > endPosition.row || startPosition.row === endPosition.row && startPosition.column > endPosition.column)) {
      throw new Error("`startPosition` cannot be greater than `endPosition`");
    }
    if (endContainingIndex !== 0 && startContainingIndex > endContainingIndex) {
      throw new Error("`startContainingIndex` cannot be greater than `endContainingIndex`");
    }
    if (endContainingPosition !== ZERO_POINT && (startContainingPosition.row > endContainingPosition.row || startContainingPosition.row === endContainingPosition.row && startContainingPosition.column > endContainingPosition.column)) {
      throw new Error("`startContainingPosition` cannot be greater than `endContainingPosition`");
    }
    if (progressCallback) {
      C.currentQueryProgressCallback = progressCallback;
    }
    marshalNode(node);
    C._ts_query_matches_wasm(
      this[0],
      node.tree[0],
      startPosition.row,
      startPosition.column,
      endPosition.row,
      endPosition.column,
      startIndex,
      endIndex,
      startContainingPosition.row,
      startContainingPosition.column,
      endContainingPosition.row,
      endContainingPosition.column,
      startContainingIndex,
      endContainingIndex,
      matchLimit,
      maxStartDepth
    );
    const rawCount = C.getValue(TRANSFER_BUFFER, "i32");
    const startAddress = C.getValue(TRANSFER_BUFFER + SIZE_OF_INT, "i32");
    const didExceedMatchLimit = C.getValue(TRANSFER_BUFFER + 2 * SIZE_OF_INT, "i32");
    const result = new Array(rawCount);
    this.exceededMatchLimit = Boolean(didExceedMatchLimit);
    let filteredCount = 0;
    let address = startAddress;
    for (let i2 = 0; i2 < rawCount; i2++) {
      const patternIndex = C.getValue(address, "i32");
      address += SIZE_OF_INT;
      const captureCount = C.getValue(address, "i32");
      address += SIZE_OF_INT;
      const captures = new Array(captureCount);
      address = unmarshalCaptures(this, node.tree, address, patternIndex, captures);
      if (this.textPredicates[patternIndex].every((p) => p(captures))) {
        result[filteredCount] = { patternIndex, captures };
        const setProperties = this.setProperties[patternIndex];
        result[filteredCount].setProperties = setProperties;
        const assertedProperties = this.assertedProperties[patternIndex];
        result[filteredCount].assertedProperties = assertedProperties;
        const refutedProperties = this.refutedProperties[patternIndex];
        result[filteredCount].refutedProperties = refutedProperties;
        filteredCount++;
      }
    }
    result.length = filteredCount;
    C._free(startAddress);
    C.currentQueryProgressCallback = null;
    return result;
  }
  /**
   * Iterate over all of the individual captures in the order that they
   * appear.
   *
   * This is useful if you don't care about which pattern matched, and just
   * want a single, ordered sequence of captures.
   *
   * @param {Node} node - The node to execute the query on.
   *
   * @param {QueryOptions} options - Options for query execution.
   */
  captures(node, options = {}) {
    const startPosition = options.startPosition ?? ZERO_POINT;
    const endPosition = options.endPosition ?? ZERO_POINT;
    const startIndex = options.startIndex ?? 0;
    const endIndex = options.endIndex ?? 0;
    const startContainingPosition = options.startContainingPosition ?? ZERO_POINT;
    const endContainingPosition = options.endContainingPosition ?? ZERO_POINT;
    const startContainingIndex = options.startContainingIndex ?? 0;
    const endContainingIndex = options.endContainingIndex ?? 0;
    const matchLimit = options.matchLimit ?? 4294967295;
    const maxStartDepth = options.maxStartDepth ?? 4294967295;
    const progressCallback = options.progressCallback;
    if (typeof matchLimit !== "number") {
      throw new Error("Arguments must be numbers");
    }
    this.matchLimit = matchLimit;
    if (endIndex !== 0 && startIndex > endIndex) {
      throw new Error("`startIndex` cannot be greater than `endIndex`");
    }
    if (endPosition !== ZERO_POINT && (startPosition.row > endPosition.row || startPosition.row === endPosition.row && startPosition.column > endPosition.column)) {
      throw new Error("`startPosition` cannot be greater than `endPosition`");
    }
    if (endContainingIndex !== 0 && startContainingIndex > endContainingIndex) {
      throw new Error("`startContainingIndex` cannot be greater than `endContainingIndex`");
    }
    if (endContainingPosition !== ZERO_POINT && (startContainingPosition.row > endContainingPosition.row || startContainingPosition.row === endContainingPosition.row && startContainingPosition.column > endContainingPosition.column)) {
      throw new Error("`startContainingPosition` cannot be greater than `endContainingPosition`");
    }
    if (progressCallback) {
      C.currentQueryProgressCallback = progressCallback;
    }
    marshalNode(node);
    C._ts_query_captures_wasm(
      this[0],
      node.tree[0],
      startPosition.row,
      startPosition.column,
      endPosition.row,
      endPosition.column,
      startIndex,
      endIndex,
      startContainingPosition.row,
      startContainingPosition.column,
      endContainingPosition.row,
      endContainingPosition.column,
      startContainingIndex,
      endContainingIndex,
      matchLimit,
      maxStartDepth
    );
    const count = C.getValue(TRANSFER_BUFFER, "i32");
    const startAddress = C.getValue(TRANSFER_BUFFER + SIZE_OF_INT, "i32");
    const didExceedMatchLimit = C.getValue(TRANSFER_BUFFER + 2 * SIZE_OF_INT, "i32");
    const result = new Array();
    this.exceededMatchLimit = Boolean(didExceedMatchLimit);
    const captures = new Array();
    let address = startAddress;
    for (let i2 = 0; i2 < count; i2++) {
      const patternIndex = C.getValue(address, "i32");
      address += SIZE_OF_INT;
      const captureCount = C.getValue(address, "i32");
      address += SIZE_OF_INT;
      const captureIndex = C.getValue(address, "i32");
      address += SIZE_OF_INT;
      captures.length = captureCount;
      address = unmarshalCaptures(this, node.tree, address, patternIndex, captures);
      if (this.textPredicates[patternIndex].every((p) => p(captures))) {
        const capture = captures[captureIndex];
        const setProperties = this.setProperties[patternIndex];
        capture.setProperties = setProperties;
        const assertedProperties = this.assertedProperties[patternIndex];
        capture.assertedProperties = assertedProperties;
        const refutedProperties = this.refutedProperties[patternIndex];
        capture.refutedProperties = refutedProperties;
        result.push(capture);
      }
    }
    C._free(startAddress);
    C.currentQueryProgressCallback = null;
    return result;
  }
  /** Get the predicates for a given pattern. */
  predicatesForPattern(patternIndex) {
    return this.predicates[patternIndex];
  }
  /**
   * Disable a certain capture within a query.
   *
   * This prevents the capture from being returned in matches, and also
   * avoids any resource usage associated with recording the capture.
   */
  disableCapture(captureName) {
    const captureNameLength = C.lengthBytesUTF8(captureName);
    const captureNameAddress = C._malloc(captureNameLength + 1);
    C.stringToUTF8(captureName, captureNameAddress, captureNameLength + 1);
    C._ts_query_disable_capture(this[0], captureNameAddress, captureNameLength);
    C._free(captureNameAddress);
  }
  /**
   * Disable a certain pattern within a query.
   *
   * This prevents the pattern from matching, and also avoids any resource
   * usage associated with the pattern. This throws an error if the pattern
   * index is out of bounds.
   */
  disablePattern(patternIndex) {
    if (patternIndex >= this.predicates.length) {
      throw new Error(
        `Pattern index is ${patternIndex} but the pattern count is ${this.predicates.length}`
      );
    }
    C._ts_query_disable_pattern(this[0], patternIndex);
  }
  /**
   * Check if, on its last execution, this cursor exceeded its maximum number
   * of in-progress matches.
   */
  didExceedMatchLimit() {
    return this.exceededMatchLimit;
  }
  /** Get the byte offset where the given pattern starts in the query's source. */
  startIndexForPattern(patternIndex) {
    if (patternIndex >= this.predicates.length) {
      throw new Error(
        `Pattern index is ${patternIndex} but the pattern count is ${this.predicates.length}`
      );
    }
    return C._ts_query_start_byte_for_pattern(this[0], patternIndex);
  }
  /** Get the byte offset where the given pattern ends in the query's source. */
  endIndexForPattern(patternIndex) {
    if (patternIndex >= this.predicates.length) {
      throw new Error(
        `Pattern index is ${patternIndex} but the pattern count is ${this.predicates.length}`
      );
    }
    return C._ts_query_end_byte_for_pattern(this[0], patternIndex);
  }
  /** Get the number of patterns in the query. */
  patternCount() {
    return C._ts_query_pattern_count(this[0]);
  }
  /** Get the index for a given capture name. */
  captureIndexForName(captureName) {
    return this.captureNames.indexOf(captureName);
  }
  /** Check if a given pattern within a query has a single root node. */
  isPatternRooted(patternIndex) {
    return C._ts_query_is_pattern_rooted(this[0], patternIndex) === 1;
  }
  /** Check if a given pattern within a query has a single root node. */
  isPatternNonLocal(patternIndex) {
    return C._ts_query_is_pattern_non_local(this[0], patternIndex) === 1;
  }
  /**
   * Check if a given step in a query is 'definite'.
   *
   * A query step is 'definite' if its parent pattern will be guaranteed to
   * match successfully once it reaches the step.
   */
  isPatternGuaranteedAtStep(byteIndex) {
    return C._ts_query_is_pattern_guaranteed_at_step(this[0], byteIndex) === 1;
  }
};

// dist/parser-helpers.js
import { existsSync as existsSync2, readFileSync, statSync } from "node:fs";
import { dirname as dirname2, resolve, join } from "node:path";
var CLASS_TYPES = /* @__PURE__ */ new Set(["class_declaration", "class"]);
var FUNCTION_TYPES = /* @__PURE__ */ new Set([
  "function_declaration",
  "method_definition",
  "arrow_function"
]);
var IMPORT_TYPES = /* @__PURE__ */ new Set(["import_statement"]);
var CALL_TYPES = /* @__PURE__ */ new Set(["call_expression", "new_expression"]);
var TYPE_TYPES = /* @__PURE__ */ new Set([
  "type_alias_declaration",
  "interface_declaration",
  "enum_declaration"
]);
var TEST_FILE_PATTERNS = [
  /\.test\./,
  /\.spec\./,
  /__tests__\//,
  /\/tests?\//
];
var TEST_FUNCTION_NAMES = /* @__PURE__ */ new Set([
  "describe",
  "it",
  "test",
  "beforeEach",
  "afterEach",
  "beforeAll",
  "afterAll"
]);
function isTestFile(filePath) {
  return TEST_FILE_PATTERNS.some((p) => p.test(filePath));
}
function isTestFunction(name2, filePath) {
  if (isTestFile(filePath)) {
    if (TEST_FUNCTION_NAMES.has(name2))
      return true;
    if (name2.startsWith("test"))
      return true;
  }
  return false;
}
function qualify(name2, filePath, enclosingClass) {
  if (enclosingClass)
    return `${filePath}::${enclosingClass}.${name2}`;
  return `${filePath}::${name2}`;
}
function getNodeText(node) {
  return node.text;
}
function getName(node, _kind) {
  for (const child of node.children) {
    if (child.type === "identifier" || child.type === "type_identifier" || child.type === "property_identifier") {
      return getNodeText(child);
    }
  }
  return null;
}
function getArrowFunctionName(node) {
  const parent = node.parent;
  if (!parent)
    return null;
  if (parent.type === "variable_declarator") {
    const nameNode = parent.childForFieldName("name");
    if (nameNode)
      return getNodeText(nameNode);
  }
  return null;
}
function getParams(node) {
  for (const child of node.children) {
    if (child.type === "formal_parameters" || child.type === "parameters") {
      return getNodeText(child);
    }
  }
  return null;
}
function getReturnType(node) {
  for (const child of node.children) {
    if (child.type === "type_annotation" || child.type === "return_type") {
      return getNodeText(child);
    }
  }
  return null;
}
function getBases(node) {
  const bases = [];
  for (const child of node.children) {
    if (child.type === "extends_clause" || child.type === "implements_clause") {
      for (const sub of child.children) {
        if (sub.type === "identifier" || sub.type === "type_identifier" || sub.type === "nested_identifier") {
          bases.push(getNodeText(sub));
        }
      }
    }
  }
  return bases;
}
function extractImportTarget(node) {
  for (const child of node.children) {
    if (child.type === "string" || child.type === "string_fragment") {
      return getNodeText(child).replace(/^['"]|['"]$/g, "");
    }
  }
  return null;
}
function collectJsImportNames(clauseNode, module2, importMap) {
  for (const child of clauseNode.children) {
    if (child.type === "identifier") {
      importMap.set(getNodeText(child), module2);
    } else if (child.type === "named_imports") {
      for (const spec of child.children) {
        if (spec.type === "import_specifier") {
          const names = [];
          for (const s of spec.children) {
            if (s.type === "identifier" || s.type === "property_identifier") {
              names.push(getNodeText(s));
            }
          }
          if (names.length > 0) {
            importMap.set(names[names.length - 1], module2);
          }
        }
      }
    } else if (child.type === "namespace_import") {
      for (const sub of child.children) {
        if (sub.type === "identifier") {
          importMap.set(getNodeText(sub), module2);
        }
      }
    }
  }
}
function getCallName(node) {
  const fn = node.childForFieldName("function") ?? node.children[0];
  if (!fn)
    return null;
  if (fn.type === "identifier")
    return getNodeText(fn);
  if (fn.type === "member_expression") {
    const prop = fn.childForFieldName("property");
    if (prop)
      return getNodeText(prop);
  }
  return null;
}
var aliasCache = /* @__PURE__ */ new Map();
function loadPathAliases(projectRoot) {
  const cached = aliasCache.get(projectRoot);
  if (cached)
    return cached;
  const aliases = [];
  const candidates = ["tsconfig.json", "tsconfig.base.json", "jsconfig.json"];
  for (const name2 of candidates) {
    const configPath = join(projectRoot, name2);
    if (!existsSync2(configPath))
      continue;
    try {
      const raw = readFileSync(configPath, "utf-8");
      const cleaned = raw.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
      const config = JSON.parse(cleaned);
      const paths = config?.compilerOptions?.paths;
      if (!paths)
        continue;
      for (const [pattern, targets] of Object.entries(paths)) {
        const prefix = pattern.replace(/\*$/, "");
        aliases.push({ prefix, targets: targets.map((t) => t.replace(/\*$/, "")) });
      }
      break;
    } catch {
      continue;
    }
  }
  aliasCache.set(projectRoot, aliases);
  return aliases;
}
function resolveAlias(module2, callerFilePath) {
  let dir = dirname2(callerFilePath);
  let projectRoot = null;
  for (let i2 = 0; i2 < 20; i2++) {
    if (existsSync2(join(dir, "tsconfig.json")) || existsSync2(join(dir, "package.json"))) {
      projectRoot = dir;
      break;
    }
    const parent = dirname2(dir);
    if (parent === dir)
      break;
    dir = parent;
  }
  if (!projectRoot)
    return null;
  const aliases = loadPathAliases(projectRoot);
  for (const { prefix, targets } of aliases) {
    if (module2.startsWith(prefix)) {
      const rest = module2.slice(prefix.length);
      for (const target of targets) {
        const resolved = resolve(projectRoot, target, rest);
        const extensions = [".ts", ".tsx", ".js", ".jsx"];
        if (existsSync2(resolved) && !isDirectory(resolved))
          return resolved;
        for (const ext of extensions) {
          if (existsSync2(resolved + ext))
            return resolved + ext;
        }
        for (const ext of extensions) {
          const indexPath = resolve(resolved, `index${ext}`);
          if (existsSync2(indexPath))
            return indexPath;
        }
      }
    }
  }
  return null;
}
function resolveModuleToFile(module2, callerFilePath) {
  if (module2.startsWith(".")) {
    const callerDir = dirname2(callerFilePath);
    const base = resolve(callerDir, module2);
    const extensions = [".ts", ".tsx", ".js", ".jsx"];
    if (existsSync2(base) && !isDirectory(base))
      return base;
    for (const ext of extensions) {
      const target = base + ext;
      if (existsSync2(target))
        return target;
    }
    const strippedBase = base.replace(/\.jsx?$/, "");
    if (strippedBase !== base) {
      for (const ext of extensions) {
        const target = strippedBase + ext;
        if (existsSync2(target))
          return target;
      }
    }
    for (const ext of extensions) {
      const target = resolve(base, `index${ext}`);
      if (existsSync2(target))
        return target;
    }
    return null;
  }
  return resolveAlias(module2, callerFilePath);
}
function isDirectory(p) {
  try {
    return statSync(p).isDirectory();
  } catch {
    return false;
  }
}

// dist/parser-handlers.js
function extractJsDocSummary(node) {
  const parent = node.parent;
  const isExported = parent?.type === "export_statement" || parent?.type === "lexical_declaration" && parent?.parent?.type === "export_statement";
  if (!isExported)
    return void 0;
  const exportNode = parent?.type === "export_statement" ? parent : parent?.parent;
  const commentNode = exportNode?.previousNamedSibling ?? node.previousNamedSibling;
  if (!commentNode || commentNode.type !== "comment")
    return void 0;
  const text = getNodeText(commentNode);
  if (!text.startsWith("/**"))
    return void 0;
  const content = text.replace(/^\/\*\*\s*/, "").replace(/\s*\*\/$/, "").split("\n").map((line) => line.replace(/^\s*\*\s?/, "").trim()).filter((line) => line && !line.startsWith("@")).join(" ").trim();
  if (!content)
    return void 0;
  const firstSentence = content.match(/^(.+?\.)\s/)?.[1] ?? content;
  return firstSentence.length > 150 ? firstSentence.slice(0, 147) + "..." : firstSentence;
}
function heuristicSummary(node, name2, params) {
  const parent = node.parent;
  const isExported = parent?.type === "export_statement" || parent?.type === "lexical_declaration" && parent?.parent?.type === "export_statement";
  if (!isExported)
    return void 0;
  const words = name2.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/([A-Z])([A-Z][a-z])/g, "$1 $2").toLowerCase().split(/\s+/);
  if (words.length <= 1)
    return void 0;
  let summary = words.join(" ");
  if (words[0] === "use" && words.length <= 3) {
    summary += " hook";
  }
  return summary;
}
function handleClass(walk, child, language, filePath, nodes, edges, enclosingClass, importMap, definedNames, depth) {
  const name2 = getName(child, "class");
  if (!name2)
    return false;
  nodes.push({
    kind: "Class",
    name: name2,
    file_path: filePath,
    line_start: child.startPosition.row + 1,
    line_end: child.endPosition.row + 1,
    language,
    parent_name: enclosingClass ?? void 0,
    is_test: false
  });
  edges.push({
    kind: "CONTAINS",
    source: filePath,
    target: qualify(name2, filePath, enclosingClass),
    file_path: filePath,
    line: child.startPosition.row + 1
  });
  for (const base of getBases(child)) {
    edges.push({
      kind: "INHERITS",
      source: qualify(name2, filePath, enclosingClass),
      target: base,
      file_path: filePath,
      line: child.startPosition.row + 1
    });
  }
  walk(child, language, filePath, nodes, edges, name2, null, importMap, definedNames, depth + 1);
  return true;
}
function handleType(child, filePath, nodes, edges, enclosingClass, language) {
  const name2 = getName(child, "type");
  if (!name2)
    return false;
  nodes.push({
    kind: "Type",
    name: name2,
    file_path: filePath,
    line_start: child.startPosition.row + 1,
    line_end: child.endPosition.row + 1,
    language,
    parent_name: enclosingClass ?? void 0,
    is_test: false
  });
  const container = enclosingClass ? qualify(enclosingClass, filePath, null) : filePath;
  edges.push({
    kind: "CONTAINS",
    source: container,
    target: qualify(name2, filePath, enclosingClass),
    file_path: filePath,
    line: child.startPosition.row + 1
  });
  return true;
}
function handleFunction(walk, child, nodeType, language, filePath, nodes, edges, enclosingClass, importMap, definedNames, depth) {
  const name2 = nodeType === "arrow_function" ? getArrowFunctionName(child) : getName(child, "function");
  if (!name2)
    return false;
  const isTest = isTestFunction(name2, filePath);
  const qualified = qualify(name2, filePath, enclosingClass);
  const params = getParams(child) ?? void 0;
  const summary = isTest ? void 0 : extractJsDocSummary(child) ?? heuristicSummary(child, name2, params);
  nodes.push({
    kind: isTest ? "Test" : "Function",
    name: name2,
    file_path: filePath,
    line_start: child.startPosition.row + 1,
    line_end: child.endPosition.row + 1,
    language,
    parent_name: enclosingClass ?? void 0,
    params,
    return_type: getReturnType(child) ?? void 0,
    summary,
    is_test: isTest
  });
  const container = enclosingClass ? qualify(enclosingClass, filePath, null) : filePath;
  edges.push({
    kind: "CONTAINS",
    source: container,
    target: qualified,
    file_path: filePath,
    line: child.startPosition.row + 1
  });
  walk(child, language, filePath, nodes, edges, enclosingClass, name2, importMap, definedNames, depth + 1);
  return true;
}
function handleLexicalDeclaration(walk, child, language, filePath, nodes, edges, enclosingClass, importMap, definedNames, depth) {
  for (const decl of child.children) {
    if (decl.type !== "variable_declarator")
      continue;
    const nameNode = decl.childForFieldName("name");
    const valueNode = decl.childForFieldName("value");
    if (!nameNode || valueNode?.type !== "arrow_function")
      continue;
    const name2 = getNodeText(nameNode);
    const isTest = isTestFunction(name2, filePath);
    const qualified = qualify(name2, filePath, enclosingClass);
    const arrowParams = getParams(valueNode) ?? void 0;
    const summary = isTest ? void 0 : extractJsDocSummary(child) ?? heuristicSummary(child, name2, arrowParams);
    nodes.push({
      kind: isTest ? "Test" : "Function",
      name: name2,
      file_path: filePath,
      line_start: valueNode.startPosition.row + 1,
      line_end: valueNode.endPosition.row + 1,
      language,
      parent_name: enclosingClass ?? void 0,
      params: arrowParams,
      return_type: getReturnType(valueNode) ?? void 0,
      summary,
      is_test: isTest
    });
    const container = enclosingClass ? qualify(enclosingClass, filePath, null) : filePath;
    edges.push({
      kind: "CONTAINS",
      source: container,
      target: qualified,
      file_path: filePath,
      line: valueNode.startPosition.row + 1
    });
    walk(valueNode, language, filePath, nodes, edges, enclosingClass, name2, importMap, definedNames, depth + 1);
  }
}
function handleImport(child, filePath, edges) {
  const module2 = extractImportTarget(child);
  if (!module2)
    return;
  const resolved = resolveModuleToFile(module2, filePath);
  edges.push({
    kind: "IMPORTS_FROM",
    source: filePath,
    target: resolved ?? module2,
    file_path: filePath,
    line: child.startPosition.row + 1
  });
}
function handleCall(resolveTarget2, child, filePath, enclosingClass, enclosingFunc, importMap, definedNames, edges) {
  const callName = getCallName(child);
  if (!callName || !enclosingFunc)
    return;
  const caller = qualify(enclosingFunc, filePath, enclosingClass);
  const target = resolveTarget2(callName, filePath, importMap, definedNames);
  edges.push({
    kind: "CALLS",
    source: caller,
    target,
    file_path: filePath,
    line: child.startPosition.row + 1
  });
}
function resolveCallTargets(nodes, edges, filePath) {
  const symbols = /* @__PURE__ */ new Map();
  for (const node of nodes) {
    if (node.kind === "Function" || node.kind === "Class" || node.kind === "Type" || node.kind === "Test") {
      const qn = qualify(node.name, filePath, node.parent_name ?? null);
      if (!symbols.has(node.name))
        symbols.set(node.name, qn);
    }
  }
  for (let i2 = 0; i2 < edges.length; i2++) {
    const edge = edges[i2];
    if (edge.kind === "CALLS" && !edge.target.includes("::")) {
      const resolved = symbols.get(edge.target);
      if (resolved)
        edges[i2] = { ...edge, target: resolved };
    }
  }
}
function generateTestEdges(nodes, edges) {
  const testQNames = /* @__PURE__ */ new Set();
  for (const n of nodes) {
    if (n.is_test)
      testQNames.add(qualify(n.name, n.file_path, n.parent_name ?? null));
  }
  const newEdges = [];
  for (const edge of edges) {
    if (edge.kind === "CALLS" && testQNames.has(edge.source)) {
      newEdges.push({
        kind: "TESTED_BY",
        source: edge.target,
        target: edge.source,
        file_path: edge.file_path,
        line: edge.line
      });
    }
  }
  edges.push(...newEdges);
}

// dist/parser.js
var EXT_TO_LANG = {
  ".ts": "typescript",
  ".tsx": "tsx",
  ".js": "javascript",
  ".jsx": "jsx"
};
var PARSEABLE_EXTENSIONS = new Set(Object.keys(EXT_TO_LANG));
var SQL_EXTENSIONS = /* @__PURE__ */ new Set([".sql", ".prisma"]);
var PKG_FILENAMES = /* @__PURE__ */ new Set(["package.json", "pnpm-workspace.yaml", "turbo.json"]);
var CONFIG_FILENAMES_QUICK = /* @__PURE__ */ new Set([
  "tsconfig.json",
  "tsconfig.base.json",
  "tsconfig.app.json",
  ".env.example",
  ".env.local.example",
  ".env.template",
  "vercel.json"
]);
var CONFIG_PREFIXES = ["next.config", "tailwind.config"];
function isConfigFile(filePath) {
  const name2 = basename(filePath);
  if (CONFIG_FILENAMES_QUICK.has(name2))
    return true;
  for (const prefix of CONFIG_PREFIXES) {
    if (name2.startsWith(prefix))
      return true;
  }
  if (/^\.env\.(example|template|local\.example|sample)$/.test(name2))
    return true;
  return false;
}
var MD_EXTENSIONS = /* @__PURE__ */ new Set([".md", ".mdx"]);
var SH_EXTENSIONS = /* @__PURE__ */ new Set([".sh"]);
var YAML_EXTENSIONS = /* @__PURE__ */ new Set([".yaml", ".yml"]);
var TF_EXTENSIONS = /* @__PURE__ */ new Set([".tf"]);
function isDockerfileName(filePath) {
  const name2 = basename(filePath);
  return name2 === "Dockerfile" || name2.startsWith("Dockerfile.") || name2.toLowerCase() === "dockerfile";
}
function isParseable(filePath) {
  const ext = extname(filePath).toLowerCase();
  if (PARSEABLE_EXTENSIONS.has(ext) || SQL_EXTENSIONS.has(ext))
    return true;
  if (SH_EXTENSIONS.has(ext))
    return true;
  if (PKG_FILENAMES.has(basename(filePath)))
    return true;
  if (isConfigFile(filePath))
    return true;
  if (MD_EXTENSIONS.has(ext))
    return true;
  if (basename(filePath) === "hooks.json" && filePath.includes("/hooks/"))
    return true;
  if (YAML_EXTENSIONS.has(ext))
    return true;
  if (TF_EXTENSIONS.has(ext))
    return true;
  if (isDockerfileName(filePath))
    return true;
  return false;
}
function detectLanguage(filePath) {
  return EXT_TO_LANG[extname(filePath).toLowerCase()] ?? null;
}
function fileHash(filePath) {
  const content = readFileSync2(filePath);
  return createHash("sha256").update(content).digest("hex");
}
var __dirname2 = typeof import.meta.url !== "undefined" ? fileURLToPath(new URL(".", import.meta.url)) : process.cwd();
var WASM_PATHS = {
  typescript: join2(__dirname2, "tree-sitter-typescript.wasm"),
  tsx: join2(__dirname2, "tree-sitter-tsx.wasm"),
  javascript: join2(__dirname2, "tree-sitter-javascript.wasm"),
  jsx: join2(__dirname2, "tree-sitter-javascript.wasm")
};
var parserInitialized = false;
var CodeParser = class _CodeParser {
  languages = /* @__PURE__ */ new Map();
  moduleCache = /* @__PURE__ */ new Map();
  async init() {
    if (!parserInitialized) {
      await Parser.init();
      parserInitialized = true;
    }
    for (const [lang, wasmPath] of Object.entries(WASM_PATHS)) {
      if (!this.languages.has(lang)) {
        try {
          const language = await Language.load(wasmPath);
          this.languages.set(lang, language);
        } catch {
        }
      }
    }
  }
  getParser(language) {
    const lang = this.languages.get(language);
    if (!lang)
      return null;
    const parser = new Parser();
    parser.setLanguage(lang);
    return parser;
  }
  parseFile(filePath) {
    let source;
    try {
      source = readFileSync2(filePath);
    } catch {
      return { nodes: [], edges: [] };
    }
    return this.parseBytes(filePath, source);
  }
  parseBytes(filePath, source) {
    const language = detectLanguage(filePath);
    if (!language)
      return { nodes: [], edges: [] };
    const parser = this.getParser(language);
    if (!parser)
      return { nodes: [], edges: [] };
    const tree = parser.parse(source.toString());
    if (!tree)
      return { nodes: [], edges: [] };
    const nodes = [];
    const edges = [];
    const testFile = isTestFile(filePath);
    const lineCount7 = source.toString().split("\n").length;
    nodes.push({
      kind: "File",
      name: basename(filePath),
      file_path: filePath,
      line_start: 1,
      line_end: lineCount7,
      language,
      is_test: testFile
    });
    const importMap = /* @__PURE__ */ new Map();
    const definedNames = /* @__PURE__ */ new Set();
    this.collectFileScope(tree.rootNode, importMap, definedNames);
    const walkFn = this.extractFromTree.bind(this);
    walkFn(tree.rootNode, language, filePath, nodes, edges, null, null, importMap, definedNames, 0);
    resolveCallTargets(nodes, edges, filePath);
    if (testFile) {
      generateTestEdges(nodes, edges);
    }
    return { nodes, edges };
  }
  // ── File scope pre-scan ──────────────────────────────────────────
  collectFileScope(root, importMap, definedNames) {
    for (const child of root.children) {
      const nodeType = child.type;
      let target = child;
      if (nodeType === "export_statement") {
        for (const inner of child.children) {
          if (CLASS_TYPES.has(inner.type) || FUNCTION_TYPES.has(inner.type) || TYPE_TYPES.has(inner.type) || inner.type === "lexical_declaration") {
            target = inner;
            break;
          }
        }
      }
      if (CLASS_TYPES.has(target.type) || FUNCTION_TYPES.has(target.type)) {
        const name2 = getName(target, CLASS_TYPES.has(target.type) ? "class" : "function");
        if (name2)
          definedNames.add(name2);
      }
      if (target.type === "lexical_declaration") {
        for (const decl of target.children) {
          if (decl.type === "variable_declarator") {
            const nameNode = decl.childForFieldName("name");
            const valueNode = decl.childForFieldName("value");
            if (nameNode && valueNode?.type === "arrow_function") {
              definedNames.add(getNodeText(nameNode));
            }
          }
        }
      }
      if (TYPE_TYPES.has(target.type)) {
        const name2 = getName(target, "type");
        if (name2)
          definedNames.add(name2);
      }
      if (IMPORT_TYPES.has(nodeType)) {
        const module2 = extractImportTarget(child);
        if (module2) {
          for (const c of child.children) {
            if (c.type === "import_clause") {
              collectJsImportNames(c, module2, importMap);
            }
          }
        }
      }
    }
  }
  // ── Recursive AST walk ───────────────────────────────────────────
  static MAX_DEPTH = 180;
  extractFromTree(root, language, filePath, nodes, edges, enclosingClass, enclosingFunc, importMap, definedNames, depth) {
    if (depth > _CodeParser.MAX_DEPTH)
      return;
    const walkFn = this.extractFromTree.bind(this);
    const resolveCallFn = this.resolveCallTarget.bind(this);
    for (const child of root.children) {
      const nodeType = child.type;
      if (nodeType === "export_statement") {
        walkFn(child, language, filePath, nodes, edges, enclosingClass, enclosingFunc, importMap, definedNames, depth + 1);
        continue;
      }
      if (CLASS_TYPES.has(nodeType)) {
        if (handleClass(walkFn, child, language, filePath, nodes, edges, enclosingClass, importMap, definedNames, depth))
          continue;
      }
      if (TYPE_TYPES.has(nodeType)) {
        if (handleType(child, filePath, nodes, edges, enclosingClass, language))
          continue;
      }
      if (FUNCTION_TYPES.has(nodeType)) {
        if (handleFunction(walkFn, child, nodeType, language, filePath, nodes, edges, enclosingClass, importMap, definedNames, depth))
          continue;
      }
      if (nodeType === "lexical_declaration") {
        handleLexicalDeclaration(walkFn, child, language, filePath, nodes, edges, enclosingClass, importMap, definedNames, depth);
      }
      if (IMPORT_TYPES.has(nodeType)) {
        handleImport(child, filePath, edges);
        continue;
      }
      if (CALL_TYPES.has(nodeType)) {
        handleCall(resolveCallFn, child, filePath, enclosingClass, enclosingFunc, importMap, definedNames, edges);
      }
      walkFn(child, language, filePath, nodes, edges, enclosingClass, enclosingFunc, importMap, definedNames, depth + 1);
    }
  }
  // ── Call target resolution ───────────────────────────────────────
  resolveCallTarget(callName, filePath, importMap, definedNames) {
    if (definedNames.has(callName))
      return qualify(callName, filePath, null);
    if (importMap.has(callName)) {
      const resolved = this.resolveModuleCached(importMap.get(callName), filePath);
      if (resolved)
        return qualify(callName, resolved, null);
    }
    return callName;
  }
  resolveModuleCached(module2, callerFilePath) {
    const cacheKey = `${dirname3(callerFilePath)}:${module2}`;
    if (this.moduleCache.has(cacheKey))
      return this.moduleCache.get(cacheKey);
    const resolved = resolveModuleToFile(module2, callerFilePath);
    if (this.moduleCache.size > 15e3)
      this.moduleCache.clear();
    this.moduleCache.set(cacheKey, resolved);
    return resolved;
  }
};

// dist/sql-parser.js
import { readFileSync as readFileSync3 } from "node:fs";
import { basename as basename2, extname as extname2 } from "node:path";
function qualify2(name2, filePath, parent) {
  return parent ? `${filePath}::${parent}.${name2}` : `${filePath}::${name2}`;
}
function lineAt(content, charIndex) {
  let line = 1;
  for (let i2 = 0; i2 < charIndex && i2 < content.length; i2++) {
    if (content[i2] === "\n")
      line++;
  }
  return line;
}
function lineCount(content) {
  return content.split("\n").length;
}
var SQL_EXTENSIONS2 = /* @__PURE__ */ new Set([".sql"]);
var PRISMA_EXTENSIONS = /* @__PURE__ */ new Set([".prisma"]);
function isSqlParseable(filePath) {
  const ext = extname2(filePath).toLowerCase();
  return SQL_EXTENSIONS2.has(ext) || PRISMA_EXTENSIONS.has(ext);
}
function parseSqlFile(filePath) {
  let content;
  try {
    content = readFileSync3(filePath, "utf-8");
  } catch {
    return { nodes: [], edges: [] };
  }
  const ext = extname2(filePath).toLowerCase();
  if (ext === ".prisma") {
    return parsePrismaSchema(filePath, content);
  }
  return parseSql(filePath, content);
}
function parseSql(filePath, content) {
  const nodes = [];
  const edges = [];
  const lines = lineCount(content);
  const isMigration = filePath.includes("migration");
  nodes.push({
    kind: isMigration ? "Migration" : "File",
    name: basename2(filePath),
    file_path: filePath,
    line_start: 1,
    line_end: lines,
    language: "sql",
    is_test: false,
    extra: isMigration ? { migration: true } : void 0
  });
  const tableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?["']?(\w+)["']?\s*\(([\s\S]*?)(?:\n\);|\n\))/gi;
  for (const match of content.matchAll(tableRegex)) {
    const tableName = match[1];
    const tableBody = match[2];
    const line = lineAt(content, match.index);
    const endLine = lineAt(content, match.index + match[0].length);
    nodes.push({
      kind: "Table",
      name: tableName,
      file_path: filePath,
      line_start: line,
      line_end: endLine,
      language: "sql",
      is_test: false,
      extra: { columns: [] }
    });
    edges.push({
      kind: "CONTAINS",
      source: filePath,
      target: qualify2(tableName, filePath, null),
      file_path: filePath,
      line
    });
    parseColumns(tableBody, tableName, filePath, line, nodes, edges);
    parseForeignKeys(tableBody, tableName, filePath, line, edges);
  }
  const alterAddColRegex = /ALTER\s+TABLE\s+(?:(?:IF\s+EXISTS|ONLY)\s+)?(?:public\.)?["']?(\w+)["']?\s+ADD\s+(?:COLUMN\s+)?(?:IF\s+NOT\s+EXISTS\s+)?["']?(\w+)["']?\s+(\w[\w\s[\]]*?)(?:;|\s+(?:DEFAULT|NOT|UNIQUE|CHECK|REFERENCES|CONSTRAINT|PRIMARY))/gi;
  for (const match of content.matchAll(alterAddColRegex)) {
    const tableName = match[1];
    const colName = match[2];
    const colType = match[3].trim();
    const line = lineAt(content, match.index);
    nodes.push({
      kind: "Column",
      name: colName,
      file_path: filePath,
      line_start: line,
      line_end: line,
      language: "sql",
      parent_name: tableName,
      return_type: colType,
      is_test: false
    });
    edges.push({
      kind: "CONTAINS",
      source: qualify2(tableName, filePath, null),
      target: qualify2(colName, filePath, tableName),
      file_path: filePath,
      line
    });
  }
  const alterFkRegex = /ALTER\s+TABLE\s+(?:(?:IF\s+EXISTS|ONLY)\s+)?(?:public\.)?["']?(\w+)["']?\s+ADD\s+CONSTRAINT\s+\w+\s+FOREIGN\s+KEY\s*\(["']?(\w+)["']?\)\s*REFERENCES\s+(?:public\.)?["']?(\w+)["']?/gi;
  for (const match of content.matchAll(alterFkRegex)) {
    const sourceTable = match[1];
    const _column = match[2];
    const targetTable = match[3];
    const line = lineAt(content, match.index);
    edges.push({
      kind: "REFERENCES",
      source: qualify2(sourceTable, filePath, null),
      target: qualify2(targetTable, filePath, null),
      file_path: filePath,
      line,
      extra: { column: _column, type: "foreign_key" }
    });
  }
  const indexRegex = /CREATE\s+(?:UNIQUE\s+)?INDEX\s+(?:CONCURRENTLY\s+)?(?:IF\s+NOT\s+EXISTS\s+)?["']?(\w+)["']?\s+ON\s+(?:public\.)?["']?(\w+)["']?\s*(?:USING\s+\w+\s*)?\(([^)]+)\)/gi;
  for (const match of content.matchAll(indexRegex)) {
    const indexName = match[1];
    const tableName = match[2];
    const columns = match[3].trim();
    const line = lineAt(content, match.index);
    const isUnique = /UNIQUE/i.test(match[0]);
    nodes.push({
      kind: "Index",
      name: indexName,
      file_path: filePath,
      line_start: line,
      line_end: line,
      language: "sql",
      parent_name: tableName,
      params: columns,
      is_test: false,
      extra: { unique: isUnique, columns: columns.split(",").map((c) => c.trim()) }
    });
    edges.push({
      kind: "INDEXES",
      source: qualify2(indexName, filePath, null),
      target: qualify2(tableName, filePath, null),
      file_path: filePath,
      line
    });
  }
  const enableRlsRegex = /ALTER\s+TABLE\s+(?:public\.)?["']?(\w+)["']?\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/gi;
  const rlsTables = /* @__PURE__ */ new Set();
  for (const match of content.matchAll(enableRlsRegex)) {
    rlsTables.add(match[1]);
  }
  const policyRegex = /CREATE\s+POLICY\s+["']?(\w+)["']?\s+ON\s+(?:public\.)?["']?(\w+)["']?\s+(?:AS\s+\w+\s+)?(?:FOR\s+(\w+)\s+)?(?:TO\s+([\w,\s]+)\s+)?(?:USING\s*\(([\s\S]*?)\))?(?:\s*WITH\s+CHECK\s*\(([\s\S]*?)\))?/gi;
  for (const match of content.matchAll(policyRegex)) {
    const policyName = match[1];
    const tableName = match[2];
    const operation = match[3] ?? "ALL";
    const roles = match[4]?.trim() ?? "public";
    const usingExpr = match[5]?.trim();
    const checkExpr = match[6]?.trim();
    const line = lineAt(content, match.index);
    const endLine = lineAt(content, match.index + match[0].length);
    nodes.push({
      kind: "RLSPolicy",
      name: policyName,
      file_path: filePath,
      line_start: line,
      line_end: endLine,
      language: "sql",
      parent_name: tableName,
      modifiers: `${operation} TO ${roles}`,
      is_test: false,
      extra: {
        operation: operation.toUpperCase(),
        roles: roles.split(",").map((r) => r.trim()),
        using: usingExpr ?? null,
        check: checkExpr ?? null,
        uses_auth_uid: !!(usingExpr?.includes("auth.uid()") || checkExpr?.includes("auth.uid()")),
        uses_feed: !!(usingExpr?.includes("feed") || checkExpr?.includes("feed"))
      }
    });
    edges.push({
      kind: "SECURES",
      source: qualify2(policyName, filePath, null),
      target: qualify2(tableName, filePath, null),
      file_path: filePath,
      line
    });
  }
  const funcRegex = /CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+(?:public\.)?["']?(\w+)["']?\s*\(([^)]*)\)\s*RETURNS\s+([\w\s]+?)(?:\s+AS|\s+LANGUAGE|\s+\$\$)/gi;
  for (const match of content.matchAll(funcRegex)) {
    const funcName = match[1];
    const params = match[2].trim();
    const returnType = match[3].trim();
    const line = lineAt(content, match.index);
    const afterMatch = content.slice(match.index + match[0].length);
    const endMarker = afterMatch.search(/\$\$\s*;|\bEND\b\s*;/i);
    const endLine = endMarker >= 0 ? lineAt(content, match.index + match[0].length + endMarker) : line;
    nodes.push({
      kind: "DbFunction",
      name: funcName,
      file_path: filePath,
      line_start: line,
      line_end: endLine,
      language: "sql",
      params: params || void 0,
      return_type: returnType,
      is_test: false,
      extra: {
        is_trigger: returnType.toLowerCase().includes("trigger")
      }
    });
    edges.push({
      kind: "CONTAINS",
      source: filePath,
      target: qualify2(funcName, filePath, null),
      file_path: filePath,
      line
    });
  }
  const triggerRegex = /CREATE\s+(?:OR\s+REPLACE\s+)?TRIGGER\s+["']?(\w+)["']?\s+(?:BEFORE|AFTER|INSTEAD\s+OF)\s+\w+[\s\w]*?\s+ON\s+(?:public\.)?["']?(\w+)["']?[\s\S]*?EXECUTE\s+(?:FUNCTION|PROCEDURE)\s+(?:public\.)?["']?(\w+)["']?/gi;
  for (const match of content.matchAll(triggerRegex)) {
    const _triggerName = match[1];
    const tableName = match[2];
    const funcName = match[3];
    const line = lineAt(content, match.index);
    edges.push({
      kind: "CALLS",
      source: qualify2(funcName, filePath, null),
      target: qualify2(tableName, filePath, null),
      file_path: filePath,
      line,
      extra: { trigger: _triggerName }
    });
  }
  const grantRegex = /GRANT\s+([\w,\s]+)\s+ON\s+(?:TABLE\s+)?(?:public\.)?["']?(\w+)["']?\s+TO\s+([\w,\s]+)/gi;
  for (const match of content.matchAll(grantRegex)) {
    const permissions = match[1].trim();
    const tableName = match[2];
    const grantees = match[3].trim();
    const line = lineAt(content, match.index);
    edges.push({
      kind: "SECURES",
      source: `grant::${grantees}`,
      target: qualify2(tableName, filePath, null),
      file_path: filePath,
      line,
      extra: { type: "grant", permissions, grantees: grantees.split(",").map((g) => g.trim()) }
    });
  }
  return { nodes, edges };
}
function parseColumns(tableBody, tableName, filePath, tableStartLine, nodes, edges) {
  const lines = tableBody.split("\n");
  for (let i2 = 0; i2 < lines.length; i2++) {
    const line = lines[i2].trim();
    if (!line || line.startsWith("--"))
      continue;
    if (/^\s*(CONSTRAINT|PRIMARY\s+KEY|UNIQUE|CHECK|FOREIGN\s+KEY|EXCLUDE)/i.test(line))
      continue;
    const colMatch = line.match(/^["']?(\w+)["']?\s+(\w[\w\s[\]()]*?)(?:\s+(?:NOT\s+NULL|NULL|DEFAULT|UNIQUE|CHECK|REFERENCES|PRIMARY|GENERATED|CONSTRAINT)|,?\s*$)/i);
    if (!colMatch)
      continue;
    const colName = colMatch[1];
    const colType = colMatch[2].trim();
    if (/^(CONSTRAINT|PRIMARY|UNIQUE|CHECK|FOREIGN|EXCLUDE|LIKE)$/i.test(colName))
      continue;
    const colLine = tableStartLine + i2 + 1;
    nodes.push({
      kind: "Column",
      name: colName,
      file_path: filePath,
      line_start: colLine,
      line_end: colLine,
      language: "sql",
      parent_name: tableName,
      return_type: colType,
      is_test: false,
      extra: {
        nullable: !/NOT\s+NULL/i.test(line),
        has_default: /DEFAULT/i.test(line)
      }
    });
    edges.push({
      kind: "CONTAINS",
      source: qualify2(tableName, filePath, null),
      target: qualify2(colName, filePath, tableName),
      file_path: filePath,
      line: colLine
    });
    const tableNode = nodes.find((n) => n.kind === "Table" && n.name === tableName);
    if (tableNode?.extra) {
      tableNode.extra.columns.push(colName);
    }
  }
}
function parseForeignKeys(tableBody, tableName, filePath, tableStartLine, edges) {
  const inlineRefRegex = /["']?(\w+)["']?\s+\w+.*?REFERENCES\s+(?:public\.)?["']?(\w+)["']?/gi;
  for (const match of tableBody.matchAll(inlineRefRegex)) {
    const column = match[1];
    const targetTable = match[2];
    edges.push({
      kind: "REFERENCES",
      source: qualify2(tableName, filePath, null),
      target: qualify2(targetTable, filePath, null),
      file_path: filePath,
      line: tableStartLine,
      extra: { column, type: "foreign_key" }
    });
  }
  const constraintFkRegex = /FOREIGN\s+KEY\s*\(["']?(\w+)["']?\)\s*REFERENCES\s+(?:public\.)?["']?(\w+)["']?/gi;
  for (const match of tableBody.matchAll(constraintFkRegex)) {
    const column = match[1];
    const targetTable = match[2];
    edges.push({
      kind: "REFERENCES",
      source: qualify2(tableName, filePath, null),
      target: qualify2(targetTable, filePath, null),
      file_path: filePath,
      line: tableStartLine,
      extra: { column, type: "foreign_key" }
    });
  }
}
function parsePrismaSchema(filePath, content) {
  const nodes = [];
  const edges = [];
  const lines = lineCount(content);
  nodes.push({
    kind: "File",
    name: basename2(filePath),
    file_path: filePath,
    line_start: 1,
    line_end: lines,
    language: "prisma",
    is_test: false
  });
  const modelRegex = /model\s+(\w+)\s*\{([\s\S]*?)\n\}/g;
  for (const match of content.matchAll(modelRegex)) {
    const modelName = match[1];
    const modelBody = match[2];
    const line = lineAt(content, match.index);
    const endLine = lineAt(content, match.index + match[0].length);
    nodes.push({
      kind: "Table",
      name: modelName,
      file_path: filePath,
      line_start: line,
      line_end: endLine,
      language: "prisma",
      is_test: false,
      extra: { columns: [], orm: "prisma" }
    });
    edges.push({
      kind: "CONTAINS",
      source: filePath,
      target: qualify2(modelName, filePath, null),
      file_path: filePath,
      line
    });
    const fieldLines = modelBody.split("\n");
    for (let i2 = 0; i2 < fieldLines.length; i2++) {
      const fieldLine = fieldLines[i2].trim();
      if (!fieldLine || fieldLine.startsWith("//") || fieldLine.startsWith("@@"))
        continue;
      const fieldMatch = fieldLine.match(/^(\w+)\s+(\w+[\w[\]?]*)/);
      if (!fieldMatch)
        continue;
      const fieldName = fieldMatch[1];
      const fieldType = fieldMatch[2];
      const fieldLineNum = line + i2 + 1;
      nodes.push({
        kind: "Column",
        name: fieldName,
        file_path: filePath,
        line_start: fieldLineNum,
        line_end: fieldLineNum,
        language: "prisma",
        parent_name: modelName,
        return_type: fieldType,
        is_test: false
      });
      edges.push({
        kind: "CONTAINS",
        source: qualify2(modelName, filePath, null),
        target: qualify2(fieldName, filePath, modelName),
        file_path: filePath,
        line: fieldLineNum
      });
      if (fieldLine.includes("@relation")) {
        const relTarget = fieldType.replace("?", "").replace("[]", "");
        edges.push({
          kind: "REFERENCES",
          source: qualify2(modelName, filePath, null),
          target: qualify2(relTarget, filePath, null),
          file_path: filePath,
          line: fieldLineNum,
          extra: { column: fieldName, type: "relation" }
        });
      }
      const tableNode = nodes.find((n) => n.kind === "Table" && n.name === modelName);
      if (tableNode?.extra) {
        tableNode.extra.columns.push(fieldName);
      }
    }
  }
  const enumRegex = /enum\s+(\w+)\s*\{([\s\S]*?)\n\}/g;
  for (const match of content.matchAll(enumRegex)) {
    const enumName = match[1];
    const line = lineAt(content, match.index);
    const endLine = lineAt(content, match.index + match[0].length);
    nodes.push({
      kind: "Type",
      name: enumName,
      file_path: filePath,
      line_start: line,
      line_end: endLine,
      language: "prisma",
      is_test: false,
      extra: { prisma_enum: true }
    });
    edges.push({
      kind: "CONTAINS",
      source: filePath,
      target: qualify2(enumName, filePath, null),
      file_path: filePath,
      line
    });
  }
  return { nodes, edges };
}

// dist/pkg-parser.js
import { readFileSync as readFileSync4, existsSync as existsSync3 } from "node:fs";
import { basename as basename3, dirname as dirname4, join as join3 } from "node:path";
var PKG_FILES = /* @__PURE__ */ new Set(["package.json"]);
var WORKSPACE_FILES = /* @__PURE__ */ new Set(["pnpm-workspace.yaml", "turbo.json"]);
function isPkgParseable(filePath) {
  const name2 = basename3(filePath);
  return PKG_FILES.has(name2) || WORKSPACE_FILES.has(name2);
}
function qualify3(name2, filePath, parent) {
  return parent ? `${filePath}::${parent}.${name2}` : `${filePath}::${name2}`;
}
function lineCount2(content) {
  return content.split("\n").length;
}
function parsePkgFile(filePath) {
  let content;
  try {
    content = readFileSync4(filePath, "utf-8");
  } catch {
    return { nodes: [], edges: [] };
  }
  const name2 = basename3(filePath);
  if (name2 === "package.json") {
    return parsePackageJson(filePath, content);
  }
  if (name2 === "pnpm-workspace.yaml") {
    return parsePnpmWorkspace(filePath, content);
  }
  if (name2 === "turbo.json") {
    return parseTurboJson(filePath, content);
  }
  return { nodes: [], edges: [] };
}
function parsePackageJson(filePath, content) {
  const nodes = [];
  const edges = [];
  const lines = lineCount2(content);
  let pkg;
  try {
    pkg = JSON.parse(content);
  } catch {
    return { nodes: [], edges: [] };
  }
  const pkgName = pkg.name ?? basename3(dirname4(filePath));
  const pkgVersion = pkg.version ?? "0.0.0";
  const isWorkspaceRoot = !!pkg.workspaces;
  const isMonorepoRoot = isWorkspaceRoot || existsSync3(join3(dirname4(filePath), "turbo.json"));
  nodes.push({
    kind: isMonorepoRoot ? "Workspace" : "Package",
    name: pkgName,
    file_path: filePath,
    line_start: 1,
    line_end: lines,
    language: "json",
    return_type: pkgVersion,
    is_test: false,
    extra: {
      version: pkgVersion,
      private: pkg.private ?? false,
      isWorkspaceRoot: isMonorepoRoot,
      depCount: Object.keys(pkg.dependencies ?? {}).length,
      devDepCount: Object.keys(pkg.devDependencies ?? {}).length,
      peerDepCount: Object.keys(pkg.peerDependencies ?? {}).length
    }
  });
  nodes.push({
    kind: "File",
    name: basename3(filePath),
    file_path: filePath,
    line_start: 1,
    line_end: lines,
    language: "json",
    is_test: false
  });
  edges.push({
    kind: "CONTAINS",
    source: filePath,
    target: qualify3(pkgName, filePath, null),
    file_path: filePath,
    line: 1
  });
  parseDeps(pkg.dependencies, "production", pkgName, filePath, nodes, edges);
  parseDeps(pkg.devDependencies, "development", pkgName, filePath, nodes, edges);
  parseDeps(pkg.peerDependencies, "peer", pkgName, filePath, nodes, edges);
  if (pkg.scripts) {
    for (const [scriptName, scriptCmd] of Object.entries(pkg.scripts)) {
      nodes.push({
        kind: "Script",
        name: scriptName,
        file_path: filePath,
        line_start: findJsonLine(content, `"${scriptName}"`),
        line_end: findJsonLine(content, `"${scriptName}"`),
        language: "json",
        parent_name: pkgName,
        params: scriptCmd,
        is_test: /test|spec|jest|vitest|playwright/i.test(scriptName),
        extra: {
          command: scriptCmd,
          isTypeGen: /generate|gen\s+types|codegen|prisma\s+generate/i.test(scriptCmd),
          isBuild: /^build$/i.test(scriptName),
          isLint: /lint|eslint/i.test(scriptName)
        }
      });
      edges.push({
        kind: "CONTAINS",
        source: qualify3(pkgName, filePath, null),
        target: qualify3(scriptName, filePath, pkgName),
        file_path: filePath,
        line: findJsonLine(content, `"${scriptName}"`)
      });
    }
  }
  if (pkg.workspaces) {
    const patterns = Array.isArray(pkg.workspaces) ? pkg.workspaces : pkg.workspaces.packages ?? [];
    for (const pattern of patterns) {
      nodes.push({
        kind: "Workspace",
        name: pattern,
        file_path: filePath,
        line_start: findJsonLine(content, `"${pattern}"`),
        line_end: findJsonLine(content, `"${pattern}"`),
        language: "json",
        parent_name: pkgName,
        is_test: false,
        extra: { glob: pattern }
      });
      edges.push({
        kind: "CONTAINS",
        source: qualify3(pkgName, filePath, null),
        target: qualify3(pattern, filePath, pkgName),
        file_path: filePath,
        line: findJsonLine(content, `"${pattern}"`)
      });
    }
  }
  return { nodes, edges };
}
function parseDeps(deps, depType, pkgName, filePath, nodes, edges) {
  if (!deps)
    return;
  for (const [depName, versionRange] of Object.entries(deps)) {
    nodes.push({
      kind: "Package",
      name: depName,
      file_path: filePath,
      line_start: 0,
      line_end: 0,
      language: "json",
      parent_name: pkgName,
      return_type: versionRange,
      is_test: false,
      extra: {
        version: versionRange,
        depType,
        isFramework: isFrameworkDep(depName),
        isInternal: versionRange.startsWith("workspace:")
      }
    });
    edges.push({
      kind: "DEPENDS_ON",
      source: qualify3(pkgName, filePath, null),
      target: `pkg::${depName}`,
      file_path: filePath,
      line: 0,
      extra: {
        version: versionRange,
        depType,
        isInternal: versionRange.startsWith("workspace:")
      }
    });
  }
}
var FRAMEWORK_DEPS = /* @__PURE__ */ new Set([
  "next",
  "react",
  "react-dom",
  "vue",
  "nuxt",
  "svelte",
  "@sveltejs/kit",
  "angular",
  "@angular/core",
  "astro",
  "vite",
  "expo",
  "expo-router",
  "react-native",
  "electron",
  "@supabase/supabase-js",
  "@supabase/ssr",
  "prisma",
  "@prisma/client",
  "drizzle-orm",
  "express",
  "fastify",
  "hono",
  "nestjs",
  "tailwindcss",
  "@tailwindcss/postcss",
  "@tanstack/react-query",
  "@tanstack/vue-query",
  "typescript",
  "zod",
  "vitest",
  "jest",
  "playwright",
  "@playwright/test"
]);
function isFrameworkDep(name2) {
  return FRAMEWORK_DEPS.has(name2);
}
function parsePnpmWorkspace(filePath, content) {
  const nodes = [];
  const edges = [];
  const lines = lineCount2(content);
  nodes.push({
    kind: "File",
    name: basename3(filePath),
    file_path: filePath,
    line_start: 1,
    line_end: lines,
    language: "yaml",
    is_test: false
  });
  const packagePatterns = [];
  const inPackages = content.includes("packages:");
  if (inPackages) {
    const packageLines = content.match(/^\s+-\s+['"]?([^'"#\n]+)['"]?/gm);
    if (packageLines) {
      for (const line of packageLines) {
        const match = line.match(/^\s+-\s+['"]?([^'"#\n]+)['"]?/);
        if (match) {
          packagePatterns.push(match[1].trim());
        }
      }
    }
  }
  for (const pattern of packagePatterns) {
    nodes.push({
      kind: "Workspace",
      name: pattern,
      file_path: filePath,
      line_start: findYamlLine(content, pattern),
      line_end: findYamlLine(content, pattern),
      language: "yaml",
      is_test: false,
      extra: { glob: pattern, source: "pnpm-workspace" }
    });
  }
  return { nodes, edges };
}
function parseTurboJson(filePath, content) {
  const nodes = [];
  const edges = [];
  const lines = lineCount2(content);
  let turbo;
  try {
    turbo = JSON.parse(content);
  } catch {
    return { nodes: [], edges: [] };
  }
  nodes.push({
    kind: "File",
    name: basename3(filePath),
    file_path: filePath,
    line_start: 1,
    line_end: lines,
    language: "json",
    is_test: false,
    extra: { turbo: true }
  });
  const tasks = turbo.tasks ?? turbo.pipeline ?? {};
  for (const taskName of Object.keys(tasks)) {
    const taskConfig = tasks[taskName];
    nodes.push({
      kind: "Script",
      name: taskName,
      file_path: filePath,
      line_start: findJsonLine(content, `"${taskName}"`),
      line_end: findJsonLine(content, `"${taskName}"`),
      language: "json",
      is_test: false,
      extra: {
        turboTask: true,
        dependsOn: taskConfig?.dependsOn ?? [],
        outputs: taskConfig?.outputs ?? [],
        cache: taskConfig?.cache ?? true
      }
    });
    const dependsOn = taskConfig?.dependsOn ?? [];
    for (const dep of dependsOn) {
      edges.push({
        kind: "DEPENDS_ON",
        source: qualify3(taskName, filePath, null),
        target: dep.startsWith("^") ? `turbo::${dep}` : qualify3(dep, filePath, null),
        file_path: filePath,
        line: findJsonLine(content, `"${taskName}"`),
        extra: { topological: dep.startsWith("^") }
      });
    }
  }
  return { nodes, edges };
}
function findJsonLine(content, needle) {
  const idx = content.indexOf(needle);
  if (idx < 0)
    return 0;
  let line = 1;
  for (let i2 = 0; i2 < idx; i2++) {
    if (content[i2] === "\n")
      line++;
  }
  return line;
}
function findYamlLine(content, needle) {
  return findJsonLine(content, needle);
}

// dist/config-parser.js
import { readFileSync as readFileSync5 } from "node:fs";
import { basename as basename4, extname as extname3 } from "node:path";
var CONFIG_FILENAMES = /* @__PURE__ */ new Set([
  "tsconfig.json",
  "tsconfig.base.json",
  "tsconfig.app.json",
  ".env.example",
  ".env.local.example",
  ".env.template",
  "vercel.json"
]);
var CONFIG_PREFIXES2 = [
  "next.config",
  "tailwind.config"
];
function isConfigParseable(filePath) {
  const name2 = basename4(filePath);
  if (CONFIG_FILENAMES.has(name2))
    return true;
  for (const prefix of CONFIG_PREFIXES2) {
    if (name2.startsWith(prefix))
      return true;
  }
  if (/^\.env\.(example|template|local\.example|sample)$/.test(name2))
    return true;
  return false;
}
function qualify4(name2, filePath, parent) {
  return parent ? `${filePath}::${parent}.${name2}` : `${filePath}::${name2}`;
}
function lineCount3(content) {
  return content.split("\n").length;
}
function findLine(content, needle) {
  const idx = content.indexOf(needle);
  if (idx < 0)
    return 0;
  let line = 1;
  for (let i2 = 0; i2 < idx; i2++) {
    if (content[i2] === "\n")
      line++;
  }
  return line;
}
function stripJsonComments(input) {
  let result = "";
  let i2 = 0;
  const len = input.length;
  while (i2 < len) {
    if (input[i2] === '"') {
      result += '"';
      i2++;
      while (i2 < len && input[i2] !== '"') {
        if (input[i2] === "\\") {
          result += input[i2] + (input[i2 + 1] ?? "");
          i2 += 2;
        } else {
          result += input[i2];
          i2++;
        }
      }
      if (i2 < len) {
        result += '"';
        i2++;
      }
      continue;
    }
    if (input[i2] === "/" && input[i2 + 1] === "/") {
      while (i2 < len && input[i2] !== "\n")
        i2++;
      continue;
    }
    if (input[i2] === "/" && input[i2 + 1] === "*") {
      i2 += 2;
      while (i2 < len && !(input[i2] === "*" && input[i2 + 1] === "/"))
        i2++;
      i2 += 2;
      continue;
    }
    result += input[i2];
    i2++;
  }
  return result.replace(/,(\s*[}\]])/g, "$1");
}
function parseConfigFile(filePath) {
  let content;
  try {
    content = readFileSync5(filePath, "utf-8");
  } catch {
    return { nodes: [], edges: [] };
  }
  const name2 = basename4(filePath);
  if (name2.startsWith("tsconfig"))
    return parseTsConfig(filePath, content);
  if (name2.startsWith("next.config"))
    return parseNextConfig(filePath, content);
  if (name2.startsWith("tailwind.config"))
    return parseTailwindConfig(filePath, content);
  if (name2.startsWith(".env"))
    return parseEnvFile(filePath, content);
  if (name2 === "vercel.json")
    return parseVercelJson(filePath, content);
  return { nodes: [], edges: [] };
}
function parseTsConfig(filePath, content) {
  const nodes = [];
  const edges = [];
  const lines = lineCount3(content);
  let config;
  try {
    config = JSON.parse(stripJsonComments(content));
  } catch {
    return { nodes: [], edges: [] };
  }
  const compilerOptions = config.compilerOptions ?? {};
  nodes.push({
    kind: "File",
    name: basename4(filePath),
    file_path: filePath,
    line_start: 1,
    line_end: lines,
    language: "json",
    is_test: false,
    extra: {
      configType: "tsconfig",
      strict: compilerOptions.strict ?? false,
      target: compilerOptions.target ?? null,
      module: compilerOptions.module ?? null,
      moduleResolution: compilerOptions.moduleResolution ?? null,
      jsx: compilerOptions.jsx ?? null,
      extends: config.extends ?? null,
      paths: compilerOptions.paths ? Object.keys(compilerOptions.paths) : [],
      include: config.include ?? [],
      exclude: config.exclude ?? []
    }
  });
  const paths = compilerOptions.paths;
  if (paths) {
    for (const [alias, targets] of Object.entries(paths)) {
      nodes.push({
        kind: "Type",
        name: alias,
        file_path: filePath,
        line_start: findLine(content, `"${alias}"`),
        line_end: findLine(content, `"${alias}"`),
        language: "json",
        parent_name: "tsconfig",
        return_type: Array.isArray(targets) ? targets[0] : String(targets),
        is_test: false,
        extra: { configType: "path-alias", targets }
      });
      edges.push({
        kind: "CONTAINS",
        source: filePath,
        target: qualify4(alias, filePath, "tsconfig"),
        file_path: filePath,
        line: findLine(content, `"${alias}"`)
      });
    }
  }
  if (config.extends) {
    edges.push({
      kind: "DEPENDS_ON",
      source: filePath,
      target: `config::${config.extends}`,
      file_path: filePath,
      line: findLine(content, `"extends"`),
      extra: { type: "extends" }
    });
  }
  return { nodes, edges };
}
function parseNextConfig(filePath, content) {
  const nodes = [];
  const edges = [];
  const lines = lineCount3(content);
  const experimental = content.match(/experimental\s*:\s*\{([^}]*)\}/s);
  const experimentalFlags = [];
  if (experimental) {
    const flagMatches = experimental[1].matchAll(/(\w+)\s*:\s*true/g);
    for (const m of flagMatches)
      experimentalFlags.push(m[1]);
  }
  const hasImages = /images\s*:/i.test(content);
  const hasRedirects = /redirects\s*\(/i.test(content) || /redirects\s*:/i.test(content);
  const hasHeaders = /headers\s*\(/i.test(content) || /headers\s*:/i.test(content);
  const hasRewrites = /rewrites\s*\(/i.test(content) || /rewrites\s*:/i.test(content);
  const hasWebpack = /webpack\s*\(/i.test(content) || /webpack\s*:/i.test(content);
  const hasTurbopack = /turbopack/i.test(content);
  const hasOutput = content.match(/output\s*:\s*['"](\w+)['"]/);
  nodes.push({
    kind: "File",
    name: basename4(filePath),
    file_path: filePath,
    line_start: 1,
    line_end: lines,
    language: extname3(filePath) === ".ts" ? "typescript" : "javascript",
    is_test: false,
    extra: {
      configType: "next.config",
      experimentalFlags,
      hasImages,
      hasRedirects,
      hasHeaders,
      hasRewrites,
      hasWebpack,
      hasTurbopack,
      output: hasOutput?.[1] ?? null
    }
  });
  return { nodes, edges };
}
function parseTailwindConfig(filePath, content) {
  const nodes = [];
  const edges = [];
  const lines = lineCount3(content);
  const contentPaths = [];
  const contentMatch = content.match(/content\s*:\s*\[([\s\S]*?)\]/);
  if (contentMatch) {
    const pathMatches = contentMatch[1].matchAll(/['"]([^'"]+)['"]/g);
    for (const m of pathMatches)
      contentPaths.push(m[1]);
  }
  const plugins = [];
  const pluginMatch = content.match(/plugins\s*:\s*\[([\s\S]*?)\]/);
  if (pluginMatch) {
    const pluginMatches = pluginMatch[1].matchAll(/require\(['"]([^'"]+)['"]\)|(\w+)\(/g);
    for (const m of pluginMatches)
      plugins.push(m[1] ?? m[2]);
  }
  const hasExtend = /extend\s*:/i.test(content);
  const hasCustomColors = /colors\s*:/i.test(content);
  const hasCustomFonts = /fontFamily\s*:/i.test(content);
  nodes.push({
    kind: "File",
    name: basename4(filePath),
    file_path: filePath,
    line_start: 1,
    line_end: lines,
    language: extname3(filePath) === ".ts" ? "typescript" : "javascript",
    is_test: false,
    extra: {
      configType: "tailwind.config",
      contentPaths,
      plugins,
      hasExtend,
      hasCustomColors,
      hasCustomFonts
    }
  });
  return { nodes, edges };
}
function parseEnvFile(filePath, content) {
  const nodes = [];
  const edges = [];
  const lines = lineCount3(content);
  nodes.push({
    kind: "File",
    name: basename4(filePath),
    file_path: filePath,
    line_start: 1,
    line_end: lines,
    language: "env",
    is_test: false,
    extra: { configType: "env" }
  });
  const envVars = [];
  const contentLines = content.split("\n");
  for (let i2 = 0; i2 < contentLines.length; i2++) {
    const line = contentLines[i2].trim();
    if (!line || line.startsWith("#"))
      continue;
    const match = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (!match)
      continue;
    const varName = match[1];
    const value = match[2];
    const hasDefault = value.length > 0 && value !== '""' && value !== "''";
    const lineNum = i2 + 1;
    envVars.push({ name: varName, line: lineNum, hasDefault });
    nodes.push({
      kind: "Type",
      name: varName,
      file_path: filePath,
      line_start: lineNum,
      line_end: lineNum,
      language: "env",
      parent_name: "env",
      is_test: false,
      extra: {
        configType: "env-var",
        hasDefault,
        isPublic: varName.startsWith("NEXT_PUBLIC_") || varName.startsWith("EXPO_PUBLIC_"),
        category: categorizeEnvVar(varName)
      }
    });
    edges.push({
      kind: "CONTAINS",
      source: filePath,
      target: qualify4(varName, filePath, "env"),
      file_path: filePath,
      line: lineNum
    });
  }
  return { nodes, edges };
}
function categorizeEnvVar(name2) {
  if (/SUPABASE/i.test(name2))
    return "supabase";
  if (/DATABASE|DB_|POSTGRES/i.test(name2))
    return "database";
  if (/AUTH|SECRET|JWT|SESSION/i.test(name2))
    return "auth";
  if (/STRIPE|PAYMENT/i.test(name2))
    return "payment";
  if (/REDIS|CACHE/i.test(name2))
    return "cache";
  if (/SMTP|EMAIL|RESEND|SENDGRID/i.test(name2))
    return "email";
  if (/API_KEY|API_SECRET|TOKEN/i.test(name2))
    return "api-key";
  if (/S3|STORAGE|BUCKET|CLOUDINARY/i.test(name2))
    return "storage";
  if (/NEXT_PUBLIC_|EXPO_PUBLIC_/i.test(name2))
    return "public";
  if (/URL|HOST|PORT|DOMAIN/i.test(name2))
    return "connection";
  return "other";
}
function parseVercelJson(filePath, content) {
  const nodes = [];
  const lines = lineCount3(content);
  let config;
  try {
    config = JSON.parse(content);
  } catch {
    return { nodes: [], edges: [] };
  }
  nodes.push({
    kind: "File",
    name: basename4(filePath),
    file_path: filePath,
    line_start: 1,
    line_end: lines,
    language: "json",
    is_test: false,
    extra: {
      configType: "vercel",
      framework: config.framework ?? null,
      buildCommand: config.buildCommand ?? null,
      outputDirectory: config.outputDirectory ?? null,
      hasRewrites: !!config.rewrites,
      hasRedirects: !!config.redirects,
      hasHeaders: !!config.headers,
      hasCrons: !!config.crons,
      regions: config.regions ?? []
    }
  });
  return { nodes, edges: [] };
}

// dist/md-parser.js
import { readFileSync as readFileSync6 } from "node:fs";
import { basename as basename5, dirname as dirname5, extname as extname4 } from "node:path";
var MD_EXTENSIONS2 = /* @__PURE__ */ new Set([".md", ".mdx"]);
var INDEXED_MD_NAMES = /* @__PURE__ */ new Set([
  "claude.md",
  "readme.md",
  "changelog.md",
  "contributing.md",
  "architecture.md",
  "design.md",
  "decisions.md"
]);
var INDEXED_MD_DIRS = [
  "/docs/",
  "/doc/",
  "/documentation/",
  "/decisions/",
  "/adr/",
  "/adrs/",
  "/appendices/",
  "/appendix/",
  "/specs/",
  "/spec/",
  "/tasks-plans/",
  "/.claude/"
];
function isMdParseable(filePath) {
  const ext = extname4(filePath).toLowerCase();
  if (!MD_EXTENSIONS2.has(ext))
    return false;
  const name2 = basename5(filePath).toLowerCase();
  const lowerPath = filePath.toLowerCase();
  if (INDEXED_MD_NAMES.has(name2))
    return true;
  for (const dir of INDEXED_MD_DIRS) {
    if (lowerPath.includes(dir))
      return true;
  }
  const rel = lowerPath;
  if (!rel.includes("node_modules") && !rel.includes(".git/") && !rel.includes("dist/")) {
    const parts2 = filePath.split("/");
    const mdIndex = parts2.findIndex((p) => p.toLowerCase().endsWith(".md"));
    if (mdIndex >= 0 && mdIndex <= parts2.length - 1) {
      return true;
    }
  }
  return false;
}
function qualify5(name2, filePath, parent) {
  return parent ? `${filePath}::${parent}.${name2}` : `${filePath}::${name2}`;
}
function classifySection(heading, body2) {
  const h = heading.toLowerCase();
  const b = body2.toLowerCase().slice(0, 500);
  if (/\b(rule|constraint|must|never|always|critical|important)\b/i.test(h))
    return "rule";
  if (/\b(rule|constraint)\b/i.test(h) || b.includes("must") && b.includes("never"))
    return "rule";
  if (/\b(convention|pattern|standard|practice|style)\b/i.test(h))
    return "convention";
  if (/\b(decision|adr|status:\s*(accepted|deprecated|proposed))\b/i.test(h + " " + b))
    return "decision";
  if (/\b(reference|resource|link|see also)\b/i.test(h))
    return "reference";
  if (/\b(setup|install|getting started|quickstart|prerequisite)\b/i.test(h))
    return "setup";
  if (/\b(overview|about|introduction|what is|summary)\b/i.test(h))
    return "overview";
  if (/\b(api|endpoint|route|method)\b/i.test(h))
    return "api";
  return "section";
}
function parseMdFile(filePath) {
  let content;
  try {
    content = readFileSync6(filePath, "utf-8");
  } catch {
    return { nodes: [], edges: [] };
  }
  const nodes = [];
  const edges = [];
  const lines = content.split("\n");
  const totalLines = lines.length;
  const name2 = basename5(filePath);
  const docType = classifyDocType(filePath);
  let contentStart = 0;
  if (lines[0]?.trim() === "---") {
    for (let i2 = 1; i2 < lines.length; i2++) {
      if (lines[i2].trim() === "---") {
        contentStart = i2 + 1;
        break;
      }
    }
  }
  nodes.push({
    kind: "File",
    name: name2,
    file_path: filePath,
    line_start: 1,
    line_end: totalLines,
    language: "markdown",
    is_test: false,
    extra: {
      docType,
      sections: 0,
      // will be updated
      hasRules: false,
      hasConventions: false,
      hasCode: content.includes("```"),
      hasTables: content.includes("| ")
    }
  });
  const sections = [];
  let currentSection = null;
  let inCodeBlock = false;
  for (let i2 = contentStart; i2 < lines.length; i2++) {
    const line = lines[i2];
    if (line.trimStart().startsWith("```")) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock)
      continue;
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      if (currentSection) {
        currentSection.lineEnd = i2;
        currentSection.body = lines.slice(currentSection.lineStart, i2).join("\n");
        sections.push(currentSection);
      }
      currentSection = {
        heading: headingMatch[2].trim(),
        level: headingMatch[1].length,
        lineStart: i2 + 1,
        lineEnd: totalLines,
        body: ""
      };
    }
  }
  if (currentSection) {
    currentSection.lineEnd = totalLines;
    currentSection.body = lines.slice(currentSection.lineStart - 1).join("\n");
    sections.push(currentSection);
  }
  let ruleCount = 0;
  let conventionCount = 0;
  for (const section of sections) {
    const sectionType = classifySection(section.heading, section.body);
    const sectionName = sanitizeName(section.heading);
    if (sectionType === "rule")
      ruleCount++;
    if (sectionType === "convention")
      conventionCount++;
    const codeBlocks = (section.body.match(/```[\s\S]*?```/g) ?? []).length;
    const bulletPoints = (section.body.match(/^\s*[-*]\s/gm) ?? []).length;
    const fileRefs = extractFileReferences(section.body);
    nodes.push({
      kind: "Type",
      name: sectionName,
      file_path: filePath,
      line_start: section.lineStart,
      line_end: section.lineEnd,
      language: "markdown",
      parent_name: name2,
      modifiers: `h${section.level} ${sectionType}`,
      is_test: false,
      extra: {
        docSection: true,
        sectionType,
        heading: section.heading,
        level: section.level,
        codeBlocks,
        bulletPoints,
        hasImperatives: /\b(MUST|NEVER|ALWAYS|DO NOT|REQUIRED|CRITICAL)\b/.test(section.body),
        contentLength: section.body.length
      }
    });
    edges.push({
      kind: "CONTAINS",
      source: filePath,
      target: qualify5(sectionName, filePath, name2),
      file_path: filePath,
      line: section.lineStart
    });
    for (const ref of fileRefs) {
      edges.push({
        kind: "REFERENCES",
        source: qualify5(sectionName, filePath, name2),
        target: ref.path,
        file_path: filePath,
        line: ref.line,
        extra: { type: "file-reference", raw: ref.raw }
      });
    }
  }
  const fileNode = nodes[0];
  if (fileNode?.extra) {
    fileNode.extra.sections = sections.length;
    fileNode.extra.hasRules = ruleCount > 0;
    fileNode.extra.hasConventions = conventionCount > 0;
    fileNode.extra.ruleCount = ruleCount;
    fileNode.extra.conventionCount = conventionCount;
  }
  return { nodes, edges };
}
function classifyDocType(filePath) {
  const name2 = basename5(filePath).toLowerCase();
  const dir = dirname5(filePath).toLowerCase();
  if (name2 === "claude.md")
    return "claude-md";
  if (name2 === "readme.md")
    return "readme";
  if (name2 === "changelog.md")
    return "changelog";
  if (name2 === "contributing.md")
    return "contributing";
  if (dir.includes("/decisions/") || dir.includes("/adr"))
    return "adr";
  if (dir.includes("/tasks-plans/"))
    return "task";
  if (dir.includes("/specs/") || dir.includes("/spec/"))
    return "spec";
  if (dir.includes("/.claude/"))
    return "claude-config";
  return "documentation";
}
function extractFileReferences(body2) {
  const refs = [];
  const seen = /* @__PURE__ */ new Set();
  const lines = body2.split("\n");
  for (let i2 = 0; i2 < lines.length; i2++) {
    const line = lines[i2];
    const pathMatches = line.matchAll(/(?:^|\s|`|"|')([./]?(?:[\w@.-]+\/)+[\w.-]+\.(?:ts|tsx|js|jsx|json|sql|md|yaml|yml|env|toml|prisma|css|scss))\b/g);
    for (const match of pathMatches) {
      const path = match[1];
      if (!seen.has(path)) {
        seen.add(path);
        refs.push({ path, line: i2 + 1, raw: match[0].trim() });
      }
    }
    const backtickMatches = line.matchAll(/`([\w/.-]+\.(?:ts|tsx|js|jsx|json|sql|md|yaml|yml|env|toml|prisma|css|scss))`/g);
    for (const match of backtickMatches) {
      const path = match[1];
      if (!seen.has(path)) {
        seen.add(path);
        refs.push({ path, line: i2 + 1, raw: match[0] });
      }
    }
  }
  return refs;
}
function sanitizeName(heading) {
  return heading.replace(/[`*_#[\](){}]/g, "").replace(/\s+/g, " ").trim().slice(0, 80);
}

// dist/sh-parser.js
import { readFileSync as readFileSync8 } from "node:fs";
import { basename as basename7, dirname as dirname7, extname as extname5, resolve as resolve3 } from "node:path";

// dist/sh-script-parser.js
import { readFileSync as readFileSync7 } from "node:fs";
import { basename as basename6, dirname as dirname6, resolve as resolve2 } from "node:path";
function qualify6(name2, filePath, parent) {
  return parent ? `${filePath}::${parent}.${name2}` : `${filePath}::${name2}`;
}
function parseShellScript(filePath) {
  let content;
  try {
    content = readFileSync7(filePath, "utf-8");
  } catch {
    return { nodes: [], edges: [] };
  }
  const nodes = [];
  const edges = [];
  const lines = content.split("\n");
  const totalLines = lines.length;
  const name2 = basename6(filePath);
  const purpose = detectPurpose(filePath, content);
  const isHook = filePath.includes("/hooks/") || purpose === "hook";
  nodes.push({
    kind: "File",
    name: name2,
    file_path: filePath,
    line_start: 1,
    line_end: totalLines,
    language: "bash",
    is_test: false,
    extra: {
      scriptType: isHook ? "hook" : "script",
      purpose,
      hasSetE: content.includes("set -e") || content.includes("set -euo"),
      hasPipefail: content.includes("pipefail"),
      usesJq: content.includes("jq ") || content.includes("jq -"),
      readsStdin: content.includes("$(cat)") || content.includes("read ")
    }
  });
  let currentFunc = null;
  let inFunction = false;
  let braceDepth = 0;
  for (let i2 = 0; i2 < lines.length; i2++) {
    const line = lines[i2];
    const trimmed = line.trim();
    const lineNum = i2 + 1;
    if (trimmed.startsWith("#") || trimmed === "")
      continue;
    const funcMatch = trimmed.match(/^(?:function\s+)?(\w+)\s*\(\s*\)\s*\{?\s*$|^function\s+(\w+)\s*\{?\s*$/);
    if (funcMatch) {
      const funcName = funcMatch[1] ?? funcMatch[2];
      if (funcName && !isBuiltinKeyword(funcName)) {
        const funcEnd = findFunctionEnd(lines, i2);
        nodes.push({
          kind: "Function",
          name: funcName,
          file_path: filePath,
          line_start: lineNum,
          line_end: funcEnd,
          language: "bash",
          parent_name: void 0,
          is_test: false,
          extra: { shellFunction: true }
        });
        edges.push({
          kind: "CONTAINS",
          source: filePath,
          target: qualify6(funcName, filePath, null),
          file_path: filePath,
          line: lineNum
        });
        currentFunc = funcName;
        inFunction = true;
        braceDepth = 1;
        continue;
      }
    }
    if (inFunction) {
      for (const ch of trimmed) {
        if (ch === "{")
          braceDepth++;
        if (ch === "}")
          braceDepth--;
      }
      if (braceDepth <= 0) {
        currentFunc = null;
        inFunction = false;
      }
    }
    const sourceMatch = trimmed.match(/^(?:source|\.)\s+["']?([^"'\s;#]+)["']?/);
    if (sourceMatch) {
      const sourcePath = resolveShellPath(sourceMatch[1], filePath);
      edges.push({
        kind: "IMPORTS_FROM",
        source: filePath,
        target: sourcePath,
        file_path: filePath,
        line: lineNum
      });
      continue;
    }
    const execMatch = trimmed.match(/\b(bash|sh|node|python3?|ruby|npx|pnpm|npm|yarn|go\s+run|cargo\s+run)\s+["']?([^"'\s;#|&]+)/);
    if (execMatch) {
      const command = execMatch[1];
      const target = execMatch[2];
      const caller = currentFunc ? qualify6(currentFunc, filePath, null) : filePath;
      if (target.match(/\.\w+$|^[.$/]/)) {
        const resolvedTarget = resolveShellPath(target, filePath);
        edges.push({
          kind: "CALLS",
          source: caller,
          target: resolvedTarget,
          file_path: filePath,
          line: lineNum,
          extra: { via: command }
        });
      }
    }
    const pathRefs = trimmed.matchAll(/["']([./][\w/.${}-]+\.(?:sh|ts|js|json|py|go|rs|yaml|yml|toml|sql))\b["']?/g);
    for (const match of pathRefs) {
      const refPath = match[1];
      if (refPath.includes("*"))
        continue;
      const resolvedRef = resolveShellPath(refPath, filePath);
      const caller = currentFunc ? qualify6(currentFunc, filePath, null) : filePath;
      edges.push({
        kind: "REFERENCES",
        source: caller,
        target: resolvedRef,
        file_path: filePath,
        line: lineNum,
        extra: { type: "file-reference" }
      });
    }
  }
  return { nodes, edges };
}
function findFunctionEnd(lines, startLine) {
  let depth = 0;
  let foundOpen = false;
  for (let i2 = startLine; i2 < lines.length; i2++) {
    const line = lines[i2];
    for (const ch of line) {
      if (ch === "{") {
        depth++;
        foundOpen = true;
      }
      if (ch === "}")
        depth--;
    }
    if (foundOpen && depth <= 0)
      return i2 + 1;
  }
  return lines.length;
}
function resolveShellPath(raw, fromFile) {
  if (raw.includes("CLAUDE_PLUGIN_ROOT") || raw.includes("PLUGIN_ROOT")) {
    return raw;
  }
  if (raw.startsWith("./") || raw.startsWith("../")) {
    return resolve2(dirname6(fromFile), raw);
  }
  if (raw.startsWith("$"))
    return raw;
  if (raw.startsWith("/"))
    return raw;
  return resolve2(dirname6(fromFile), raw);
}
function detectPurpose(filePath, content) {
  const name2 = basename6(filePath, ".sh").toLowerCase();
  const firstLines = content.slice(0, 500).toLowerCase();
  if (filePath.includes("/hooks/"))
    return "hook";
  if (name2.includes("init") || name2.includes("setup"))
    return "initialization";
  if (name2.includes("build") || name2.includes("compile"))
    return "build";
  if (name2.includes("test") || name2.includes("spec"))
    return "test";
  if (name2.includes("deploy") || name2.includes("release"))
    return "deployment";
  if (name2.includes("lint") || name2.includes("check") || name2.includes("guard"))
    return "guard";
  if (name2.includes("generate") || name2.includes("scaffold"))
    return "codegen";
  if (name2.includes("sync") || name2.includes("update"))
    return "sync";
  if (firstLines.includes("pretooluse") || firstLines.includes("posttooluse"))
    return "hook";
  return "utility";
}
function isBuiltinKeyword(name2) {
  const BUILTINS = /* @__PURE__ */ new Set([
    "if",
    "then",
    "else",
    "elif",
    "fi",
    "for",
    "while",
    "do",
    "done",
    "case",
    "esac",
    "in",
    "select",
    "until",
    "coproc",
    "time"
  ]);
  return BUILTINS.has(name2);
}

// dist/sh-parser.js
function isShParseable(filePath) {
  const ext = extname5(filePath).toLowerCase();
  if (ext === ".sh")
    return true;
  if (basename7(filePath) === "hooks.json" && filePath.includes("/hooks/"))
    return true;
  return false;
}
function parseShFile(filePath) {
  if (basename7(filePath) === "hooks.json") {
    return parseHooksJson(filePath);
  }
  return parseShellScript(filePath);
}
function qualify7(name2, filePath, parent) {
  return parent ? `${filePath}::${parent}.${name2}` : `${filePath}::${name2}`;
}
function findLineInContent(content, needle) {
  const idx = content.indexOf(needle);
  if (idx < 0)
    return 1;
  let line = 1;
  for (let i2 = 0; i2 < idx; i2++) {
    if (content[i2] === "\n")
      line++;
  }
  return line;
}
function parseHooksJson(filePath) {
  let content;
  try {
    content = readFileSync8(filePath, "utf-8");
  } catch {
    return { nodes: [], edges: [] };
  }
  let config;
  try {
    config = JSON.parse(content);
  } catch {
    return { nodes: [], edges: [] };
  }
  const nodes = [];
  const edges = [];
  const lines = content.split("\n");
  const name2 = basename7(filePath);
  nodes.push({
    kind: "File",
    name: name2,
    file_path: filePath,
    line_start: 1,
    line_end: lines.length,
    language: "json",
    is_test: false,
    extra: { configType: "hooks" }
  });
  if (!config.hooks)
    return { nodes, edges };
  for (const [eventType, matchers] of Object.entries(config.hooks)) {
    if (!Array.isArray(matchers))
      continue;
    for (const matcherGroup of matchers) {
      const matcher = matcherGroup.matcher ?? "*";
      const hookList = matcherGroup.hooks ?? [];
      for (const hook of hookList) {
        if (hook.type !== "command" || !hook.command)
          continue;
        const scriptMatch = hook.command.match(/(?:bash|sh|node|python3?)\s+["']?(?:\$\{?\w+\}?\/)?([^"'\s]+\.(?:sh|js|py|ts))["']?/);
        if (scriptMatch) {
          const scriptRelPath = scriptMatch[1];
          const hooksDir = dirname7(filePath);
          const pluginRoot = dirname7(hooksDir);
          const scriptAbsPath = resolve3(pluginRoot, scriptRelPath);
          const hookName = `${eventType}:${matcher}\u2192${basename7(scriptRelPath)}`;
          nodes.push({
            kind: "Script",
            name: hookName,
            file_path: filePath,
            line_start: findLineInContent(content, scriptRelPath),
            line_end: findLineInContent(content, scriptRelPath),
            language: "json",
            is_test: false,
            extra: {
              hookEvent: eventType,
              hookMatcher: matcher,
              scriptPath: scriptRelPath
            }
          });
          edges.push({
            kind: "CONTAINS",
            source: filePath,
            target: qualify7(hookName, filePath, null),
            file_path: filePath,
            line: findLineInContent(content, scriptRelPath)
          });
          edges.push({
            kind: "CALLS",
            source: qualify7(hookName, filePath, null),
            target: scriptAbsPath,
            file_path: filePath,
            line: findLineInContent(content, scriptRelPath),
            extra: {
              hookEvent: eventType,
              hookMatcher: matcher
            }
          });
        }
      }
    }
  }
  return { nodes, edges };
}

// dist/yaml-parser.js
import { readFileSync as readFileSync9 } from "node:fs";
import { basename as basename8, extname as extname6 } from "node:path";
function isYamlParseable(filePath) {
  const ext = extname6(filePath).toLowerCase();
  return ext === ".yaml" || ext === ".yml";
}
function qualify8(name2, filePath, parent) {
  return parent ? `${filePath}::${parent}.${name2}` : `${filePath}::${name2}`;
}
function findLineNumber(content, needle) {
  const idx = content.indexOf(needle);
  if (idx === -1)
    return 1;
  return content.substring(0, idx).split("\n").length;
}
function lineCount4(content) {
  return content.split("\n").length;
}
var API_VERSION_RE = /^apiVersion:\s*(\S+)/m;
var KIND_RE = /^kind:\s*(\S+)/m;
var NAME_RE = /^\s+name:\s*(\S+)/m;
var NAMESPACE_RE = /^\s+namespace:\s*(\S+)/m;
var CONFIGMAP_NAME_RE = /configMapRef:\s*\n\s+name:\s*(\S+)/g;
var CONFIGMAP_VOL_RE = /configMap:\s*\n\s+name:\s*(\S+)/g;
var SECRET_REF_RE = /secretRef:\s*\n\s+name:\s*(\S+)/g;
var SECRET_NAME_RE = /secretName:\s*(\S+)/g;
var SERVICE_ACCOUNT_RE = /serviceAccountName:\s*(\S+)/g;
var CLAIM_NAME_RE = /claimName:\s*(\S+)/g;
function parseYamlFile(filePath) {
  let content;
  try {
    content = readFileSync9(filePath, "utf-8");
  } catch {
    return { nodes: [], edges: [] };
  }
  if (!API_VERSION_RE.test(content) || !KIND_RE.test(content)) {
    return { nodes: [], edges: [] };
  }
  const nodes = [];
  const edges = [];
  const fileName = basename8(filePath);
  const totalLines = lineCount4(content);
  const fileQN = filePath;
  nodes.push({
    kind: "File",
    name: fileName,
    file_path: filePath,
    line_start: 1,
    line_end: totalLines,
    language: "yaml",
    is_test: false
  });
  const documents = content.split(/^---\s*$/m);
  let lineOffset = 0;
  for (const doc of documents) {
    if (!doc.trim()) {
      lineOffset += lineCount4(doc);
      continue;
    }
    const apiVersionMatch = API_VERSION_RE.exec(doc);
    const kindMatch = KIND_RE.exec(doc);
    if (!apiVersionMatch || !kindMatch) {
      lineOffset += lineCount4(doc);
      continue;
    }
    const apiVersion = apiVersionMatch[1];
    const kind = kindMatch[1];
    const nameMatch = NAME_RE.exec(doc);
    const name2 = nameMatch ? nameMatch[1] : "unnamed";
    const nsMatch = NAMESPACE_RE.exec(doc);
    const namespace = nsMatch ? nsMatch[1] : "default";
    const resourceName = `${kind}/${name2}`;
    const docLines = lineCount4(doc);
    const lineStart = lineOffset + 1;
    const lineEnd = lineOffset + docLines;
    const resourceQN = qualify8(resourceName, filePath, fileName);
    nodes.push({
      kind: "Resource",
      name: resourceName,
      file_path: filePath,
      line_start: lineStart,
      line_end: lineEnd,
      language: "yaml",
      parent_name: fileName,
      summary: `${kind} in namespace ${namespace}`,
      is_test: false,
      extra: { apiVersion, kind, namespace, resourceName: name2 }
    });
    edges.push({
      kind: "CONTAINS",
      source: fileQN,
      target: resourceQN,
      file_path: filePath,
      line: lineStart
    });
    const refs = extractReferences(doc);
    for (const ref of refs) {
      edges.push({
        kind: "REFERENCES",
        source: resourceQN,
        target: ref.target,
        file_path: filePath,
        line: lineOffset + findLineNumber(doc, ref.match),
        extra: { refType: ref.type }
      });
    }
    lineOffset += docLines;
  }
  return { nodes, edges };
}
function extractReferences(doc) {
  const refs = [];
  const seen = /* @__PURE__ */ new Set();
  function addRef(type, name2, match) {
    const key = `${type}:${name2}`;
    if (!seen.has(key)) {
      seen.add(key);
      refs.push({ type, target: `ConfigMap/${name2}`, match });
      if (type === "configMap")
        refs[refs.length - 1].target = `ConfigMap/${name2}`;
      else if (type === "secret")
        refs[refs.length - 1].target = `Secret/${name2}`;
      else if (type === "serviceAccount")
        refs[refs.length - 1].target = `ServiceAccount/${name2}`;
      else if (type === "pvc")
        refs[refs.length - 1].target = `PersistentVolumeClaim/${name2}`;
    }
  }
  for (const re of [CONFIGMAP_NAME_RE, CONFIGMAP_VOL_RE]) {
    re.lastIndex = 0;
    let m2;
    while ((m2 = re.exec(doc)) !== null) {
      addRef("configMap", m2[1], m2[0]);
    }
  }
  for (const re of [SECRET_REF_RE, SECRET_NAME_RE]) {
    re.lastIndex = 0;
    let m2;
    while ((m2 = re.exec(doc)) !== null) {
      addRef("secret", m2[1], m2[0]);
    }
  }
  SERVICE_ACCOUNT_RE.lastIndex = 0;
  let m;
  while ((m = SERVICE_ACCOUNT_RE.exec(doc)) !== null) {
    addRef("serviceAccount", m[1], m[0]);
  }
  CLAIM_NAME_RE.lastIndex = 0;
  while ((m = CLAIM_NAME_RE.exec(doc)) !== null) {
    addRef("pvc", m[1], m[0]);
  }
  return refs;
}

// dist/hcl-parser.js
import { readFileSync as readFileSync10 } from "node:fs";
import { basename as basename9, extname as extname7 } from "node:path";
function isHclParseable(filePath) {
  return extname7(filePath).toLowerCase() === ".tf";
}
function qualify9(name2, filePath, parent) {
  return parent ? `${filePath}::${parent}.${name2}` : `${filePath}::${name2}`;
}
function lineCount5(content) {
  return content.split("\n").length;
}
var BLOCK_RE = /^(resource|data|module|variable|output|provider)\s+"([^"]+)"(?:\s+"([^"]+)")?\s*\{/gm;
var LOCALS_RE = /^(locals)\s*\{/gm;
var VAR_REF_RE = /var\.(\w+)/g;
var MODULE_REF_RE = /module\.(\w+)/g;
var LOCAL_REF_RE = /local\.(\w+)/g;
var DATA_REF_RE = /data\.(\w+)\.(\w+)/g;
var SOURCE_RE = /source\s*=\s*"([^"]+)"/;
function parseHclFile(filePath) {
  let content;
  try {
    content = readFileSync10(filePath, "utf-8");
  } catch {
    return { nodes: [], edges: [] };
  }
  const nodes = [];
  const edges = [];
  const fileName = basename9(filePath);
  const totalLines = lineCount5(content);
  const lines = content.split("\n");
  const fileQN = filePath;
  nodes.push({
    kind: "File",
    name: fileName,
    file_path: filePath,
    line_start: 1,
    line_end: totalLines,
    language: "hcl",
    is_test: false
  });
  const blocks = extractBlocks(content, lines);
  for (const block of blocks) {
    const nodeKind = getNodeKind(block.blockType);
    const nodeName = getBlockName(block);
    const nodeQN = qualify9(nodeName, filePath, fileName);
    nodes.push({
      kind: nodeKind,
      name: nodeName,
      file_path: filePath,
      line_start: block.lineStart,
      line_end: block.lineEnd,
      language: "hcl",
      parent_name: fileName,
      summary: `Terraform ${block.blockType}: ${block.firstLabel || ""}`,
      is_test: false,
      extra: {
        blockType: block.blockType,
        resourceType: block.firstLabel,
        resourceName: block.secondLabel
      }
    });
    edges.push({
      kind: "CONTAINS",
      source: fileQN,
      target: nodeQN,
      file_path: filePath,
      line: block.lineStart
    });
    const bodyRefs = extractBlockReferences(block.body, filePath, block.lineStart);
    for (const ref of bodyRefs) {
      edges.push({
        kind: "REFERENCES",
        source: nodeQN,
        target: qualify9(ref.target, filePath, fileName),
        file_path: filePath,
        line: ref.line,
        extra: { refType: ref.type }
      });
    }
    if (block.blockType === "module") {
      const sourceMatch = SOURCE_RE.exec(block.body);
      if (sourceMatch && sourceMatch[1].startsWith("./")) {
        edges.push({
          kind: "IMPORTS_FROM",
          source: nodeQN,
          target: sourceMatch[1],
          file_path: filePath,
          line: block.lineStart,
          extra: { moduleSource: sourceMatch[1] }
        });
      }
    }
  }
  return { nodes, edges };
}
function extractBlocks(content, lines) {
  const blocks = [];
  BLOCK_RE.lastIndex = 0;
  let m;
  while ((m = BLOCK_RE.exec(content)) !== null) {
    const lineStart = content.substring(0, m.index).split("\n").length;
    const blockEnd = findBlockEnd(lines, lineStart - 1);
    const body2 = lines.slice(lineStart - 1, blockEnd).join("\n");
    blocks.push({
      blockType: m[1],
      firstLabel: m[2],
      secondLabel: m[3] || null,
      lineStart,
      lineEnd: blockEnd,
      body: body2
    });
  }
  LOCALS_RE.lastIndex = 0;
  while ((m = LOCALS_RE.exec(content)) !== null) {
    const lineStart = content.substring(0, m.index).split("\n").length;
    const blockEnd = findBlockEnd(lines, lineStart - 1);
    const body2 = lines.slice(lineStart - 1, blockEnd).join("\n");
    blocks.push({
      blockType: "locals",
      firstLabel: null,
      secondLabel: null,
      lineStart,
      lineEnd: blockEnd,
      body: body2
    });
  }
  return blocks;
}
function findBlockEnd(lines, lineIdx) {
  let depth = 0;
  for (let i2 = lineIdx; i2 < lines.length; i2++) {
    for (const ch of lines[i2]) {
      if (ch === "{")
        depth++;
      else if (ch === "}")
        depth--;
    }
    if (depth === 0 && i2 > lineIdx)
      return i2 + 1;
  }
  return lines.length;
}
function getNodeKind(blockType) {
  if (blockType === "resource" || blockType === "data" || blockType === "module") {
    return "Module";
  }
  return "Type";
}
function getBlockName(block) {
  switch (block.blockType) {
    case "resource":
      return `${block.firstLabel}.${block.secondLabel}`;
    case "data":
      return `data.${block.firstLabel}.${block.secondLabel}`;
    case "module":
      return `module.${block.firstLabel}`;
    case "variable":
      return `var.${block.firstLabel}`;
    case "output":
      return `output.${block.firstLabel}`;
    case "provider":
      return `provider.${block.firstLabel}`;
    case "locals":
      return "locals";
    default:
      return block.firstLabel || block.blockType;
  }
}
function extractBlockReferences(body2, _filePath, blockStart) {
  const refs = [];
  const seen = /* @__PURE__ */ new Set();
  const bodyLines = body2.split("\n");
  for (let i2 = 0; i2 < bodyLines.length; i2++) {
    const line = bodyLines[i2];
    const lineNum = blockStart + i2;
    VAR_REF_RE.lastIndex = 0;
    let m;
    while ((m = VAR_REF_RE.exec(line)) !== null) {
      const key = `var.${m[1]}`;
      if (!seen.has(key)) {
        seen.add(key);
        refs.push({ type: "variable", target: key, line: lineNum });
      }
    }
    MODULE_REF_RE.lastIndex = 0;
    while ((m = MODULE_REF_RE.exec(line)) !== null) {
      const key = `module.${m[1]}`;
      if (!seen.has(key)) {
        seen.add(key);
        refs.push({ type: "module", target: key, line: lineNum });
      }
    }
    LOCAL_REF_RE.lastIndex = 0;
    while ((m = LOCAL_REF_RE.exec(line)) !== null) {
      const key = `local.${m[1]}`;
      if (!seen.has(key)) {
        seen.add(key);
        refs.push({ type: "local", target: key, line: lineNum });
      }
    }
    DATA_REF_RE.lastIndex = 0;
    while ((m = DATA_REF_RE.exec(line)) !== null) {
      const key = `data.${m[1]}.${m[2]}`;
      if (!seen.has(key)) {
        seen.add(key);
        refs.push({ type: "data", target: key, line: lineNum });
      }
    }
  }
  return refs;
}

// dist/dockerfile-parser.js
import { readFileSync as readFileSync11 } from "node:fs";
import { basename as basename10 } from "node:path";
var DOCKERFILE_NAMES = /* @__PURE__ */ new Set([
  "Dockerfile",
  "Dockerfile.dev",
  "Dockerfile.prod",
  "Dockerfile.test",
  "Dockerfile.ci"
]);
function isDockerfileParseable(filePath) {
  const name2 = basename10(filePath);
  if (DOCKERFILE_NAMES.has(name2))
    return true;
  if (name2.startsWith("Dockerfile."))
    return true;
  if (name2.toLowerCase() === "dockerfile")
    return true;
  return false;
}
function qualify10(name2, filePath, parent) {
  return parent ? `${filePath}::${parent}.${name2}` : `${filePath}::${name2}`;
}
function lineCount6(content) {
  return content.split("\n").length;
}
function parseDockerfile(filePath) {
  let content;
  try {
    content = readFileSync11(filePath, "utf-8");
  } catch {
    return { nodes: [], edges: [] };
  }
  const nodes = [];
  const edges = [];
  const fileName = basename10(filePath);
  const totalLines = lineCount6(content);
  const lines = content.split("\n");
  const fileQN = filePath;
  nodes.push({
    kind: "File",
    name: fileName,
    file_path: filePath,
    line_start: 1,
    line_end: totalLines,
    language: "dockerfile",
    is_test: false
  });
  const stages = extractStages(content, lines);
  const stageNames = new Set(stages.map((s) => s.alias).filter(Boolean));
  for (const stage of stages) {
    const stageName = stage.alias || stage.baseImage;
    const stageQN = qualify10(stageName, filePath, fileName);
    nodes.push({
      kind: "Stage",
      name: stageName,
      file_path: filePath,
      line_start: stage.lineStart,
      line_end: stage.lineEnd,
      language: "dockerfile",
      parent_name: fileName,
      summary: `FROM ${stage.baseImage}`,
      is_test: false,
      extra: {
        baseImage: stage.baseImage,
        alias: stage.alias,
        exposedPorts: stage.exposedPorts
      }
    });
    edges.push({
      kind: "CONTAINS",
      source: fileQN,
      target: stageQN,
      file_path: filePath,
      line: stage.lineStart
    });
    if (stageNames.has(stage.baseImage)) {
      edges.push({
        kind: "REFERENCES",
        source: stageQN,
        target: qualify10(stage.baseImage, filePath, fileName),
        file_path: filePath,
        line: stage.lineStart,
        extra: { refType: "FROM" }
      });
    }
    for (const copyFrom of stage.copyFromRefs) {
      const targetName = stageNames.has(copyFrom.name) ? copyFrom.name : copyFrom.name;
      edges.push({
        kind: "REFERENCES",
        source: stageQN,
        target: qualify10(targetName, filePath, fileName),
        file_path: filePath,
        line: copyFrom.line,
        extra: { refType: "COPY --from" }
      });
    }
  }
  return { nodes, edges };
}
function extractStages(content, lines) {
  const stages = [];
  const fromPositions = [];
  for (let i2 = 0; i2 < lines.length; i2++) {
    const line = lines[i2].trim();
    const match = /^FROM\s+(\S+)(?:\s+AS\s+(\S+))?$/i.exec(line);
    if (match) {
      fromPositions.push({
        baseImage: match[1],
        alias: match[2] || null,
        lineNum: i2 + 1
      });
    }
  }
  for (let i2 = 0; i2 < fromPositions.length; i2++) {
    const start2 = fromPositions[i2].lineNum;
    const end = i2 + 1 < fromPositions.length ? fromPositions[i2 + 1].lineNum - 1 : lines.length;
    const stageLines = lines.slice(start2 - 1, end);
    const exposedPorts = [];
    const copyFromRefs = [];
    for (let j = 0; j < stageLines.length; j++) {
      const sl = stageLines[j].trim();
      const exposeMatch = /^EXPOSE\s+(.+)/i.exec(sl);
      if (exposeMatch) {
        exposedPorts.push(...exposeMatch[1].trim().split(/\s+/));
      }
      const copyMatch = /^COPY\s+--from=(\S+)/i.exec(sl);
      if (copyMatch) {
        copyFromRefs.push({ name: copyMatch[1], line: start2 + j });
      }
    }
    stages.push({
      baseImage: fromPositions[i2].baseImage,
      alias: fromPositions[i2].alias,
      lineStart: start2,
      lineEnd: end,
      exposedPorts,
      copyFromRefs
    });
  }
  return stages;
}

// dist/entities.js
import { readFileSync as readFileSync12 } from "node:fs";
import { relative } from "node:path";
var STRIP_PREFIXES = /* @__PURE__ */ new Set(["user_", "admin_", "public_", "auth_"]);
function normalizeEntityName(raw) {
  let name2 = raw.toLowerCase().trim();
  for (const prefix of STRIP_PREFIXES) {
    if (name2.startsWith(prefix) && name2.length > prefix.length + 2) {
      name2 = name2.slice(prefix.length);
      break;
    }
  }
  if (name2.endsWith("ies") && name2.length > 4) {
    name2 = name2.slice(0, -3) + "y";
  } else if (name2.endsWith("s") && !name2.endsWith("ss") && !name2.endsWith("us") && !name2.endsWith("is") && name2.length > 3) {
    name2 = name2.slice(0, -1);
  }
  return name2;
}
function displayName(normalized) {
  const capitalized = normalized.charAt(0).toUpperCase() + normalized.slice(1);
  if (capitalized.endsWith("y") && !capitalized.endsWith("ey")) {
    return capitalized.slice(0, -1) + "ies";
  }
  return capitalized + "s";
}
function primaryEntity(tableName) {
  const normalized = normalizeEntityName(tableName);
  const parts2 = normalized.split("_");
  return parts2[0];
}
var SKIP_ROUTE_SEGMENTS = /* @__PURE__ */ new Set([
  "app",
  "api",
  "src",
  "pages",
  "(admin)",
  "(auth)",
  "(protected)",
  "(public)",
  "(external)",
  "(internal)",
  "(marketing)",
  "[id]",
  "[slug]",
  "[id_prefix]",
  "layout",
  "loading",
  "error",
  "not-found"
]);
var SKIP_COMPONENT_PREFIXES = /* @__PURE__ */ new Set([
  "admin",
  "shared",
  "ui",
  "layout",
  "common",
  "portal",
  "service",
  "diy"
]);
function detectRole(filePath, node) {
  const rel = filePath.toLowerCase();
  if (node.kind === "Table" || node.kind === "Column")
    return "table";
  if (node.kind === "RLSPolicy")
    return "policy";
  if (node.kind === "Index")
    return "index";
  if (node.kind === "DbFunction")
    return "db-function";
  if (node.kind === "Migration")
    return "migration";
  if (node.is_test || rel.includes("test") || rel.includes("spec"))
    return "test";
  if (rel.includes("/migrations/") || rel.endsWith(".sql"))
    return "migration";
  if (/\/app\/.*\/(page|layout)\.(tsx?|jsx?)$/.test(rel))
    return "page";
  if (rel.includes("/api/") || /\/route\.(ts|js)x?$/.test(rel))
    return "api";
  if (rel.includes("/hooks/") || /\/use[A-Z]/.test(filePath))
    return "hook";
  if (rel.includes("/components/"))
    return "component";
  if (rel.includes("/types/") || rel.endsWith(".types.ts") || rel.endsWith(".d.ts"))
    return "type";
  if (node.kind === "Type")
    return "type";
  return "lib";
}
function detectAndStoreEntities(store, repoRoot) {
  store.removeEntityData();
  const entities = /* @__PURE__ */ new Map();
  const allFiles = store.getAllFiles();
  for (const filePath of allFiles) {
    const rel = relative(repoRoot, filePath);
    if (!rel.includes("migration") && !filePath.endsWith(".sql"))
      continue;
    try {
      const content = readFileSync12(filePath, "utf-8");
      const tableMatches = content.matchAll(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?(\w+)/gi);
      for (const match of tableMatches) {
        const tableName = match[1];
        const primary = primaryEntity(tableName);
        if (primary.length < 3)
          continue;
        if (!entities.has(primary)) {
          entities.set(primary, {
            name: primary,
            display_name: displayName(primary),
            source: "migration",
            tables: [tableName]
          });
        } else {
          entities.get(primary).tables.push(tableName);
        }
      }
      const prismaMatches = content.matchAll(/model\s+(\w+)\s*\{/g);
      for (const match of prismaMatches) {
        const name2 = normalizeEntityName(match[1]);
        if (name2.length < 3)
          continue;
        if (!entities.has(name2)) {
          entities.set(name2, {
            name: name2,
            display_name: displayName(name2),
            source: "migration",
            tables: [match[1]]
          });
        }
      }
    } catch {
    }
  }
  for (const filePath of allFiles) {
    const rel = relative(repoRoot, filePath);
    if (!/\/(page|route)\.(tsx?|jsx?)$/.test(rel))
      continue;
    const segments = rel.split("/").filter((s) => !SKIP_ROUTE_SEGMENTS.has(s) && !s.startsWith("[") && !s.startsWith("("));
    const routeSegment = segments[segments.length - 2];
    if (!routeSegment || routeSegment.length < 3)
      continue;
    const name2 = normalizeEntityName(routeSegment);
    if (!entities.has(name2)) {
      entities.set(name2, {
        name: name2,
        display_name: displayName(name2),
        source: "route",
        tables: []
      });
    }
  }
  for (const filePath of allFiles) {
    const rel = relative(repoRoot, filePath);
    if (!rel.includes("/components/"))
      continue;
    const afterComponents = rel.split("/components/")[1];
    if (!afterComponents)
      continue;
    const parts2 = afterComponents.split("/");
    let dirName = parts2[0];
    if (SKIP_COMPONENT_PREFIXES.has(dirName.toLowerCase()) && parts2.length > 1) {
      dirName = parts2[1];
    }
    if (!dirName || dirName.includes(".") || dirName.length < 3)
      continue;
    const name2 = normalizeEntityName(dirName);
    if (!entities.has(name2)) {
      entities.set(name2, {
        name: name2,
        display_name: displayName(name2),
        source: "directory",
        tables: []
      });
    }
  }
  for (const filePath of allFiles) {
    const rel = relative(repoRoot, filePath);
    if (!rel.includes("/hooks/"))
      continue;
    const afterHooks = rel.split("/hooks/")[1];
    if (!afterHooks)
      continue;
    const parts2 = afterHooks.split("/");
    if (parts2.length > 1) {
      const skipDirs = /* @__PURE__ */ new Set(["query", "mutation", "mutations", "queries"]);
      for (const p of parts2) {
        if (!skipDirs.has(p) && !p.includes(".") && p.length >= 3) {
          const name2 = normalizeEntityName(p);
          if (!entities.has(name2)) {
            entities.set(name2, {
              name: name2,
              display_name: displayName(name2),
              source: "hook",
              tables: []
            });
          }
          break;
        }
      }
    }
  }
  for (const entity of entities.values()) {
    store.upsertEntity(entity.name, entity.display_name, entity.source);
  }
  const entityNames = [...entities.keys()];
  let memberCount = 0;
  for (const filePath of allFiles) {
    const rel = relative(repoRoot, filePath).toLowerCase();
    const nodes = store.getNodesByFile(filePath);
    for (const node of nodes) {
      const role = detectRole(filePath, node);
      for (const entityName of entityNames) {
        const entity = entities.get(entityName);
        let confidence = 0;
        if (rel.includes(`/${entityName}/`) || rel.includes(`/${entityName}s/`)) {
          confidence = Math.max(confidence, entity.source === "migration" || entity.source === "route" ? 1 : 0.9);
        }
        for (const table of entity.tables) {
          const normalizedTable = table.toLowerCase();
          if (rel.includes(normalizedTable) || rel.includes(normalizedTable.replace(/_/g, "-"))) {
            confidence = Math.max(confidence, 0.9);
          }
        }
        if (node.kind !== "File") {
          const nodeName = node.name.toLowerCase();
          if (nodeName.includes(entityName) || nodeName.includes(entityName + "s")) {
            confidence = Math.max(confidence, 0.8);
          }
        }
        if (node.name.startsWith("use")) {
          const hookTarget = normalizeEntityName(node.name.slice(3));
          if (hookTarget === entityName) {
            confidence = Math.max(confidence, 0.9);
          }
        }
        if (node.name.endsWith("Keys") || node.name.endsWith("keys")) {
          const keyTarget = normalizeEntityName(node.name.replace(/[Kk]eys$/, ""));
          if (keyTarget === entityName) {
            confidence = Math.max(confidence, 0.9);
          }
        }
        if (confidence >= 0.5) {
          store.upsertEntityMember(entityName, node.qualified_name, role, confidence);
          memberCount++;
        }
      }
    }
  }
  return { entityCount: entities.size, memberCount };
}

// dist/incremental.js
var GRAPH_DIR = ".composure/graph";
var LEGACY_GRAPH_DIR = ".code-review-graph";
var DEFAULT_IGNORES = /* @__PURE__ */ new Set([
  "node_modules",
  ".git",
  ".next",
  ".expo",
  "dist",
  "build",
  ".composure",
  ".code-review-graph",
  "__pycache__",
  ".turbo",
  ".vercel",
  "coverage"
]);
function shouldIgnore(filePath) {
  const parts2 = filePath.split("/");
  return parts2.some((p) => DEFAULT_IGNORES.has(p));
}
function findRepoRoot(start2) {
  let dir = start2 ? resolve4(start2) : process.cwd();
  while (true) {
    if (existsSync4(join4(dir, ".git")))
      return dir;
    const parent = dirname8(dir);
    if (parent === dir)
      return null;
    dir = parent;
  }
}
function findProjectRoot(start2) {
  return findRepoRoot(start2) ?? process.cwd();
}
function ensureGraphDir(repoRoot) {
  const dir = join4(repoRoot, GRAPH_DIR);
  const legacyDir = join4(repoRoot, LEGACY_GRAPH_DIR);
  if (!existsSync4(dir)) {
    mkdirSync2(dir, { recursive: true });
    writeFileSync2(join4(dir, ".gitignore"), "*\n");
  }
  const legacyDb = join4(legacyDir, "graph.db");
  const newDb = join4(dir, "graph.db");
  if (existsSync4(legacyDb) && !existsSync4(newDb)) {
    for (const file of readdirSync(legacyDir)) {
      if (file === ".gitignore")
        continue;
      renameSync(join4(legacyDir, file), join4(dir, file));
    }
    try {
      rmSync(legacyDir, { recursive: true });
    } catch {
    }
  }
  return dir;
}
function getDbPath(repoRoot) {
  return join4(ensureGraphDir(repoRoot), "graph.db");
}
function execGit(args2, cwd) {
  try {
    return execFileSync("git", args2, {
      cwd,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
      timeout: 3e4
    }).trim();
  } catch {
    return "";
  }
}
function getChangedFiles(repoRoot, base = "HEAD~1") {
  const output = execGit(["diff", "--name-only", base], repoRoot);
  if (!output)
    return [];
  return output.split("\n").filter(Boolean).map((f) => resolve4(repoRoot, f));
}
function getStagedAndUnstaged(repoRoot) {
  const output = execGit(["status", "--porcelain"], repoRoot);
  if (!output)
    return [];
  return output.split("\n").filter(Boolean).map((line) => line.slice(3).trim()).filter(Boolean).map((f) => resolve4(repoRoot, f));
}
function collectAllFiles(repoRoot) {
  const output = execGit(["ls-files"], repoRoot);
  if (!output)
    return [];
  const extraIgnores = loadIgnorePatterns(repoRoot);
  return output.split("\n").filter(Boolean).map((f) => resolve4(repoRoot, f)).filter((f) => {
    const rel = relative2(repoRoot, f);
    if (shouldIgnore(rel))
      return false;
    if (!isParseable(f))
      return false;
    if (extraIgnores.some((pattern) => rel.includes(pattern)))
      return false;
    try {
      return statSync2(f).isFile();
    } catch {
      return false;
    }
  });
}
function loadIgnorePatterns(repoRoot) {
  let ignorePath = join4(repoRoot, ".composureignore");
  if (!existsSync4(ignorePath)) {
    ignorePath = join4(repoRoot, ".code-review-graphignore");
  }
  if (!existsSync4(ignorePath))
    return [];
  try {
    return readFileSync13(ignorePath, "utf-8").split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#"));
  } catch {
    return [];
  }
}
function findDependents(store, filePath) {
  const edges = store.getEdgesByTarget(filePath);
  const dependents = /* @__PURE__ */ new Set();
  for (const e of edges) {
    if (e.kind === "IMPORTS_FROM") {
      dependents.add(e.file_path);
    }
  }
  return [...dependents];
}
function routeParse(filePath, tsParser) {
  if (isSqlParseable(filePath))
    return parseSqlFile(filePath);
  if (isPkgParseable(filePath))
    return parsePkgFile(filePath);
  if (isConfigParseable(filePath))
    return parseConfigFile(filePath);
  if (isMdParseable(filePath))
    return parseMdFile(filePath);
  if (isShParseable(filePath))
    return parseShFile(filePath);
  if (isYamlParseable(filePath))
    return parseYamlFile(filePath);
  if (isHclParseable(filePath))
    return parseHclFile(filePath);
  if (isDockerfileParseable(filePath))
    return parseDockerfile(filePath);
  if (tsParser)
    return tsParser.parseFile(filePath);
  return { nodes: [], edges: [] };
}
async function fullBuild(repoRoot, store) {
  const parser = new CodeParser();
  await parser.init();
  const files = collectAllFiles(repoRoot);
  const errors = [];
  let parsed = 0;
  const existingFiles = new Set(store.getAllFiles());
  const currentFiles = new Set(files);
  for (const f of existingFiles) {
    if (!currentFiles.has(f)) {
      store.removeFileData(f);
    }
  }
  for (const f of files) {
    try {
      const { nodes, edges } = routeParse(f, parser);
      if (nodes.length > 0) {
        const hash = fileHash(f);
        store.storeFileNodesEdges(f, nodes, edges, hash);
        parsed++;
      }
    } catch (err2) {
      errors.push(`${f}: ${err2 instanceof Error ? err2.message : String(err2)}`);
    }
  }
  const entityResult = detectAndStoreEntities(store, repoRoot);
  const now = (/* @__PURE__ */ new Date()).toISOString();
  store.setMetadata("last_updated", now);
  store.setMetadata("last_build_type", "full");
  const stats = store.getStats();
  return {
    build_type: "full",
    files_parsed: parsed,
    total_nodes: stats.total_nodes,
    total_edges: stats.total_edges,
    errors,
    entities_detected: entityResult.entityCount,
    entity_members: entityResult.memberCount
  };
}
async function incrementalUpdate(repoRoot, store, base = "HEAD~1", changedFiles) {
  const parser = new CodeParser();
  await parser.init();
  const errors = [];
  let changed = changedFiles ?? [
    .../* @__PURE__ */ new Set([
      ...getChangedFiles(repoRoot, base),
      ...getStagedAndUnstaged(repoRoot)
    ])
  ];
  changed = changed.filter((f) => isParseable(f) && !shouldIgnore(relative2(repoRoot, f)));
  const dependentFiles = /* @__PURE__ */ new Set();
  for (const f of changed) {
    for (const dep of findDependents(store, f)) {
      if (!changed.includes(dep)) {
        dependentFiles.add(dep);
      }
    }
  }
  const allToUpdate = [...changed, ...dependentFiles];
  let updated = 0;
  for (const f of allToUpdate) {
    if (!existsSync4(f)) {
      store.removeFileData(f);
      continue;
    }
    try {
      const currentHash = fileHash(f);
      const existingNode = store.getNode(f);
      if (existingNode?.file_hash === currentHash)
        continue;
      const { nodes, edges } = routeParse(f, parser);
      if (nodes.length > 0) {
        store.storeFileNodesEdges(f, nodes, edges, currentHash);
        updated++;
      }
    } catch (err2) {
      errors.push(`${f}: ${err2 instanceof Error ? err2.message : String(err2)}`);
    }
  }
  const entityResult = detectAndStoreEntities(store, repoRoot);
  const now = (/* @__PURE__ */ new Date()).toISOString();
  store.setMetadata("last_updated", now);
  store.setMetadata("last_build_type", "incremental");
  const stats = store.getStats();
  return {
    build_type: "incremental",
    files_parsed: updated,
    total_nodes: stats.total_nodes,
    total_edges: stats.total_edges,
    errors,
    changed_files: changed.map((f) => relative2(repoRoot, f)),
    dependent_files: [...dependentFiles].map((f) => relative2(repoRoot, f)),
    entities_detected: entityResult.entityCount,
    entity_members: entityResult.memberCount
  };
}

// dist/tools/build-or-update-graph.js
async function buildOrUpdateGraph(params) {
  const root = findProjectRoot(params.repo_root);
  const dbPath = getDbPath(root);
  let store;
  try {
    store = new GraphStore(dbPath);
  } catch (err2) {
    return {
      status: "error",
      error: `Cannot open graph database: ${err2 instanceof Error ? err2.message : String(err2)}`
    };
  }
  try {
    const result = params.full_rebuild ? await fullBuild(root, store) : await incrementalUpdate(root, store, params.base ?? "HEAD~1");
    const verb = result.build_type === "full" ? "Built" : "Updated";
    const summary = [
      `${verb} graph: ${result.files_parsed} files parsed`,
      `${result.total_nodes} nodes, ${result.total_edges} edges`,
      result.errors.length > 0 ? `${result.errors.length} errors` : "no errors"
    ].join(". ");
    return {
      status: "ok",
      summary,
      build_type: result.build_type,
      files_parsed: result.files_parsed,
      total_nodes: result.total_nodes,
      total_edges: result.total_edges,
      errors: result.errors,
      changed_files: result.changed_files,
      dependent_files: result.dependent_files
    };
  } finally {
    store.close();
  }
}

// dist/tools/search-references.js
import { execFileSync as execFileSync2 } from "node:child_process";
import { existsSync as existsSync5 } from "node:fs";
import { relative as relative3, resolve as resolve5 } from "node:path";
function classifyFileRole(filePath) {
  if (/\/skills\//.test(filePath))
    return "skill";
  if (/\/hooks\//.test(filePath))
    return "hook";
  if (/\/components\//.test(filePath))
    return "component";
  if (/\/(app|pages)\/.*\/(page|layout|route)\.\w+$/.test(filePath))
    return "route";
  if (/\.(test|spec)\./.test(filePath))
    return "test";
  if (/\/lib\//.test(filePath))
    return "lib";
  if (/\.(config|rc)\.\w+$/.test(filePath))
    return "config";
  if (/\/defaults\//.test(filePath))
    return "defaults";
  if (/\/templates\//.test(filePath))
    return "template";
  if (/\/steps\//.test(filePath))
    return "skill-step";
  if (/\/references\//.test(filePath))
    return "reference";
  return "source";
}
function globToRegex(glob) {
  const escaped = glob.replace(/\./g, "\\.").replace(/\*\*\//g, "(.*/)?").replace(/\*/g, "[^/]*");
  return new RegExp(escaped + "$");
}
function findRg() {
  const candidates = [
    "/usr/local/bin/rg",
    "/opt/homebrew/bin/rg",
    `${process.env.HOME}/.cargo/bin/rg`
  ];
  for (const p of candidates) {
    if (existsSync5(p))
      return p;
  }
  try {
    execFileSync2("rg", ["--version"], { encoding: "utf-8", stdio: "pipe" });
    return "rg";
  } catch {
    return null;
  }
}
function searchWithRipgrep(root, pattern, scope, contextLines, maxResults) {
  const rgPath = findRg();
  if (rgPath) {
    return searchWithRg(rgPath, root, pattern, scope, contextLines, maxResults);
  }
  return searchWithGrep(root, pattern, scope, contextLines, maxResults);
}
function searchWithRg(rgPath, root, pattern, scope, contextLines, maxResults) {
  const args2 = [
    "--no-heading",
    "-n",
    ...contextLines > 0 ? [`-C${contextLines}`] : [],
    "--max-count",
    String(maxResults),
    "--glob",
    "!node_modules",
    "--glob",
    "!.git",
    "--glob",
    "!dist",
    "--glob",
    "!*.map",
    ...scope ? ["--glob", scope] : [],
    pattern,
    root
  ];
  try {
    const output = execFileSync2(rgPath, args2, {
      encoding: "utf-8",
      maxBuffer: 1024 * 1024,
      stdio: ["pipe", "pipe", "pipe"]
    });
    return parseRipgrepOutput(output, root, contextLines);
  } catch (err2) {
    const e = err2;
    if (e.status === 1)
      return [];
    if (e.stdout)
      return parseRipgrepOutput(e.stdout, root, contextLines);
    return [];
  }
}
function searchWithGrep(root, pattern, scope, contextLines, maxResults) {
  const args2 = [
    "-rn",
    ...contextLines > 0 ? [`-C${contextLines}`] : [],
    "--include=*.ts",
    "--include=*.tsx",
    "--include=*.js",
    "--include=*.jsx",
    "--include=*.md",
    "--include=*.sh",
    "--include=*.json",
    "--exclude-dir=node_modules",
    "--exclude-dir=.git",
    "--exclude-dir=dist",
    `-m${maxResults}`,
    pattern,
    root
  ];
  try {
    const output = execFileSync2("grep", args2, {
      encoding: "utf-8",
      maxBuffer: 1024 * 1024,
      stdio: ["pipe", "pipe", "pipe"]
    });
    let matches = parseRipgrepOutput(output, root, contextLines);
    if (scope) {
      const re = globToRegex(scope);
      matches = matches.filter((m) => re.test(m.file));
    }
    return matches;
  } catch {
    return [];
  }
}
function parseRipgrepOutput(output, root, contextLines) {
  const matches = [];
  const lines = output.split("\n").filter(Boolean);
  if (contextLines === 0) {
    for (const line of lines) {
      const m = line.match(/^(.+?):(\d+):(.*)$/);
      if (m) {
        matches.push({
          file: relative3(root, m[1]),
          line: parseInt(m[2], 10),
          text: m[3]
        });
      }
    }
  } else {
    let currentMatch = null;
    const beforeLines = [];
    for (const line of lines) {
      if (line === "--") {
        if (currentMatch)
          matches.push(currentMatch);
        currentMatch = null;
        beforeLines.length = 0;
        continue;
      }
      const matchLine = line.match(/^(.+?):(\d+):(.*)$/);
      const ctxLine = line.match(/^(.+?)-(\d+)-(.*)$/);
      if (matchLine) {
        currentMatch = {
          file: relative3(root, matchLine[1]),
          line: parseInt(matchLine[2], 10),
          text: matchLine[3],
          context_before: beforeLines.length > 0 ? beforeLines.join("\n") : void 0
        };
        beforeLines.length = 0;
      } else if (ctxLine) {
        if (currentMatch) {
          currentMatch.context_after = (currentMatch.context_after ?? "") + (currentMatch.context_after ? "\n" : "") + ctxLine[3];
        } else {
          beforeLines.push(ctxLine[3]);
        }
      }
    }
    if (currentMatch)
      matches.push(currentMatch);
  }
  return matches;
}
function searchReferences(params) {
  const root = findProjectRoot(params.repo_root);
  const dbPath = getDbPath(root);
  const contextLines = params.context_lines ?? 1;
  const maxResults = params.max_results ?? 50;
  const matches = searchWithRipgrep(root, params.pattern, params.scope, contextLines, maxResults);
  if (matches.length === 0) {
    return {
      status: "ok",
      summary: `No matches for "${params.pattern}"`,
      pattern: params.pattern,
      results: []
    };
  }
  let store = null;
  try {
    store = new GraphStore(dbPath);
  } catch {
  }
  const results = matches.map((m) => {
    const absPath = resolve5(root, m.file);
    let containingNode = null;
    let entity = null;
    let importersCount = 0;
    if (store) {
      const fileNodes = store.getNodesByFile(absPath);
      for (const node of fileNodes) {
        if (node.kind === "File")
          continue;
        if (node.line_start <= m.line && node.line_end >= m.line) {
          containingNode = node.name;
          break;
        }
      }
      const fileNode = fileNodes.find((n) => n.kind === "File");
      if (fileNode) {
        try {
          const rows = store.getDb().prepare("SELECT COUNT(*) as cnt FROM edges WHERE target_qualified = ? AND kind = 'IMPORTS_FROM'").all(fileNode.qualified_name);
          importersCount = rows[0]?.cnt ?? 0;
        } catch {
        }
      }
      try {
        const entityRows = store.getDb().prepare("SELECT entity_name FROM entity_members WHERE node_qualified_name = ? LIMIT 1").all(fileNode?.qualified_name ?? "");
        entity = entityRows[0]?.entity_name ?? null;
      } catch {
      }
    }
    return {
      file: m.file,
      line: m.line,
      text: m.text,
      ...m.context_before ? { context_before: m.context_before } : {},
      ...m.context_after ? { context_after: m.context_after } : {},
      containing_node: containingNode,
      entity,
      importers_count: importersCount,
      role: classifyFileRole(m.file)
    };
  });
  if (store)
    store.close();
  return {
    status: "ok",
    summary: `Found ${results.length} matches for "${params.pattern}"`,
    pattern: params.pattern,
    results
  };
}

// dist/bfs.js
function buildAdjacencyList(edges) {
  const forward = /* @__PURE__ */ new Map();
  const reverse = /* @__PURE__ */ new Map();
  for (const e of edges) {
    let fwd = forward.get(e.source_qualified);
    if (!fwd) {
      fwd = /* @__PURE__ */ new Set();
      forward.set(e.source_qualified, fwd);
    }
    fwd.add(e.target_qualified);
    let rev = reverse.get(e.target_qualified);
    if (!rev) {
      rev = /* @__PURE__ */ new Set();
      reverse.set(e.target_qualified, rev);
    }
    rev.add(e.source_qualified);
  }
  return { forward, reverse };
}
function getShortestPath(store, fromQN, toQN, maxDepth = 10) {
  const allEdges = store.getAllEdges();
  const adj = buildAdjacencyList(allEdges);
  const parent = /* @__PURE__ */ new Map();
  const visited = /* @__PURE__ */ new Set([fromQN]);
  let frontier = /* @__PURE__ */ new Set([fromQN]);
  let found = false;
  for (let depth = 0; depth < maxDepth && frontier.size > 0; depth++) {
    const nextFrontier = /* @__PURE__ */ new Set();
    for (const qn of frontier) {
      for (const neighbors of [adj.forward.get(qn), adj.reverse.get(qn)]) {
        if (!neighbors)
          continue;
        for (const neighbor of neighbors) {
          if (visited.has(neighbor))
            continue;
          visited.add(neighbor);
          parent.set(neighbor, qn);
          nextFrontier.add(neighbor);
          if (neighbor === toQN) {
            found = true;
            break;
          }
        }
        if (found)
          break;
      }
      if (found)
        break;
    }
    if (found)
      break;
    frontier = nextFrontier;
  }
  if (!found) {
    return { path: [], edges: [], depth: 0, found: false };
  }
  const pathQNs = [toQN];
  let current = toQN;
  while (current !== fromQN && parent.has(current)) {
    current = parent.get(current);
    pathQNs.unshift(current);
  }
  const pathNodes = [];
  for (const qn of pathQNs) {
    const node = store.getNode(qn);
    if (node)
      pathNodes.push(node);
  }
  const pathSet = new Set(pathQNs);
  const pathEdges = allEdges.filter((e) => pathSet.has(e.source_qualified) && pathSet.has(e.target_qualified));
  return { path: pathNodes, edges: pathEdges, depth: pathQNs.length - 1, found: true };
}
function getImpactRadius(store, changedFiles, maxDepth = 2, maxNodes = 500) {
  const allEdges = store.getAllEdges();
  const adj = buildAdjacencyList(allEdges);
  const seeds = /* @__PURE__ */ new Set();
  for (const f of changedFiles) {
    for (const node of store.getNodesByFile(f)) {
      seeds.add(node.qualified_name);
    }
  }
  const visited = /* @__PURE__ */ new Set();
  let frontier = new Set(seeds);
  const impacted = /* @__PURE__ */ new Set();
  for (let depth = 0; depth < maxDepth && frontier.size > 0; depth++) {
    const nextFrontier = /* @__PURE__ */ new Set();
    for (const qn of frontier) {
      visited.add(qn);
      const fwd = adj.forward.get(qn);
      if (fwd) {
        for (const neighbor of fwd) {
          if (!visited.has(neighbor)) {
            nextFrontier.add(neighbor);
            impacted.add(neighbor);
          }
        }
      }
      const rev = adj.reverse.get(qn);
      if (rev) {
        for (const pred of rev) {
          if (!visited.has(pred)) {
            nextFrontier.add(pred);
            impacted.add(pred);
          }
        }
      }
    }
    if (visited.size + nextFrontier.size > maxNodes) {
      break;
    }
    frontier = nextFrontier;
  }
  const changedNodes = [];
  for (const qn of seeds) {
    const node = store.getNode(qn);
    if (node)
      changedNodes.push(node);
  }
  const impactedNodes = [];
  for (const qn of impacted) {
    if (seeds.has(qn))
      continue;
    const node = store.getNode(qn);
    if (node)
      impactedNodes.push(node);
  }
  const totalImpacted = impactedNodes.length;
  const truncated = totalImpacted > maxNodes;
  const finalImpacted = truncated ? impactedNodes.slice(0, maxNodes) : impactedNodes;
  const impactedFiles = [
    ...new Set(finalImpacted.map((n) => n.file_path))
  ];
  const allQns = /* @__PURE__ */ new Set([
    ...seeds,
    ...finalImpacted.map((n) => n.qualified_name)
  ]);
  const relevantEdges = store.getEdgesAmong(allQns);
  return {
    changed_nodes: changedNodes,
    impacted_nodes: finalImpacted,
    impacted_files: impactedFiles,
    edges: relevantEdges,
    truncated,
    total_impacted: totalImpacted
  };
}

// dist/tools/get-dependency-chain.js
function getDependencyChain(params) {
  const root = findProjectRoot(params.repo_root);
  const dbPath = getDbPath(root);
  let store;
  try {
    store = new GraphStore(dbPath);
  } catch (err2) {
    return {
      status: "error",
      error: `Cannot open graph database: ${err2 instanceof Error ? err2.message : String(err2)}`
    };
  }
  try {
    const fromNode = resolveTarget(store, params.from);
    const toNode = resolveTarget(store, params.to);
    if (!fromNode) {
      const candidates = store.searchNodes(params.from, 5);
      if (candidates.length > 0) {
        return {
          status: "ambiguous",
          summary: `Multiple matches for '${params.from}'. Please use a qualified name.`,
          candidates: candidates.map(nodeToDict)
        };
      }
      return {
        status: "not_found",
        summary: `No node found matching '${params.from}'`
      };
    }
    if (!toNode) {
      const candidates = store.searchNodes(params.to, 5);
      if (candidates.length > 0) {
        return {
          status: "ambiguous",
          summary: `Multiple matches for '${params.to}'. Please use a qualified name.`,
          candidates: candidates.map(nodeToDict)
        };
      }
      return {
        status: "not_found",
        summary: `No node found matching '${params.to}'`
      };
    }
    const result = getShortestPath(store, fromNode.qualified_name, toNode.qualified_name, params.max_depth ?? 10);
    if (!result.found) {
      return {
        status: "ok",
        summary: `No path found between '${fromNode.name}' and '${toNode.name}' within ${params.max_depth ?? 10} hops`,
        from: nodeToDict(fromNode),
        to: nodeToDict(toNode),
        path: [],
        edges: [],
        connected: false
      };
    }
    const pathNames = result.path.map((n) => n.name);
    const summary = `${pathNames.join(" \u2192 ")} (${result.depth} hop${result.depth === 1 ? "" : "s"})`;
    return {
      status: "ok",
      summary,
      from: nodeToDict(fromNode),
      to: nodeToDict(toNode),
      path: result.path.map(nodeToDict),
      edges: result.edges.map(edgeToDict),
      depth: result.depth,
      connected: true
    };
  } finally {
    store.close();
  }
}
function resolveTarget(store, target) {
  let node = store.getNode(target);
  if (node)
    return node;
  const fileNodes = store.getNodesByFile(target);
  const fileNode = fileNodes.find((n) => n.kind === "File");
  if (fileNode)
    return fileNode;
  const candidates = store.searchNodes(target, 2);
  if (candidates.length === 1)
    return candidates[0];
  return null;
}

// dist/tools/query-graph.js
import { resolve as resolve6 } from "node:path";
var BUILTIN_NAMES = /* @__PURE__ */ new Set([
  "map",
  "filter",
  "reduce",
  "forEach",
  "find",
  "some",
  "every",
  "includes",
  "push",
  "pop",
  "shift",
  "splice",
  "slice",
  "concat",
  "join",
  "sort",
  "reverse",
  "keys",
  "values",
  "entries",
  "toString",
  "valueOf",
  "hasOwnProperty",
  "console",
  "log",
  "warn",
  "error",
  "JSON",
  "parse",
  "stringify",
  "parseInt",
  "parseFloat",
  "setTimeout",
  "setInterval",
  "clearTimeout",
  "clearInterval",
  "Promise",
  "then",
  "catch",
  "finally",
  "require"
]);
var QUERY_DESCRIPTIONS = {
  callers_of: "Find all functions that call a given function",
  callees_of: "Find all functions called by a given function",
  imports_of: "Find all imports of a given file or module",
  importers_of: "Find all files that import a given file or module",
  children_of: "Find all nodes contained in a file or class",
  tests_for: "Find all tests for a given function or class",
  inheritors_of: "Find classes that inherit from a given class",
  file_summary: "Get a summary of all nodes in a file",
  references_of: "Grep for a string pattern with graph context enrichment",
  dependency_chain: "Shortest path between two nodes in the graph"
};
function edgesByTarget(store, qn, edgeKind) {
  const results = [];
  const edges = [];
  for (const e of store.getEdgesByTarget(qn)) {
    if (e.kind === edgeKind) {
      edges.push(edgeToDict(e));
      const node = store.getNode(e.source_qualified);
      if (node)
        results.push(nodeToDict(node));
    }
  }
  return { results, edges };
}
function edgesBySource(store, qn, edgeKind) {
  const results = [];
  const edges = [];
  for (const e of store.getEdgesBySource(qn)) {
    if (e.kind === edgeKind) {
      edges.push(edgeToDict(e));
      const node = store.getNode(e.target_qualified);
      if (node)
        results.push(nodeToDict(node));
    }
  }
  return { results, edges };
}
function callersOf(store, qn, nodeName) {
  const { results, edges } = edgesByTarget(store, qn, "CALLS");
  if (nodeName) {
    for (const e of store.searchEdgesByTargetName(nodeName, "CALLS")) {
      if (e.target_qualified !== qn) {
        edges.push(edgeToDict(e));
        const caller = store.getNode(e.source_qualified);
        if (caller)
          results.push(nodeToDict(caller));
      }
    }
  }
  return { results, edges };
}
function fileSummary(store, filePath) {
  const results = store.getNodesByFile(filePath).map(nodeToDict);
  return { results, edges: [] };
}
function inheritorsOf(store, qn) {
  const results = [];
  const edges = [];
  for (const e of store.getEdgesByTarget(qn)) {
    if (e.kind === "INHERITS" || e.kind === "IMPLEMENTS") {
      edges.push(edgeToDict(e));
      const node = store.getNode(e.source_qualified);
      if (node)
        results.push(nodeToDict(node));
    }
  }
  return { results, edges };
}
function queryGraph(params) {
  const { pattern, target } = params;
  const root = findProjectRoot(params.repo_root);
  const dbPath = getDbPath(root);
  if (!(pattern in QUERY_DESCRIPTIONS)) {
    return {
      status: "error",
      error: `Unknown pattern '${pattern}'. Available: ${Object.keys(QUERY_DESCRIPTIONS).join(", ")}`
    };
  }
  if (pattern === "references_of") {
    return searchReferences({
      pattern: target,
      scope: params.scope,
      context_lines: params.context_lines,
      max_results: params.max_results,
      repo_root: params.repo_root
    });
  }
  if (pattern === "dependency_chain") {
    if (!params.target_to) {
      return {
        status: "error",
        error: "dependency_chain requires target_to (destination node)."
      };
    }
    return getDependencyChain({
      from: target,
      to: params.target_to,
      max_depth: 10,
      repo_root: params.repo_root
    });
  }
  if (pattern === "callers_of" && BUILTIN_NAMES.has(target) && !target.includes("::")) {
    return {
      status: "ok",
      pattern,
      target,
      description: QUERY_DESCRIPTIONS[pattern],
      summary: `'${target}' is a common builtin \u2014 callers_of skipped to avoid noise.`,
      results: [],
      edges: []
    };
  }
  let store;
  try {
    store = new GraphStore(dbPath);
  } catch (err2) {
    return {
      status: "error",
      error: `Cannot open graph database: ${err2 instanceof Error ? err2.message : String(err2)}`
    };
  }
  try {
    let node = store.getNode(target);
    let resolvedTarget = target;
    if (!node) {
      const absTarget = resolve6(root, target);
      node = store.getNode(absTarget);
      if (node)
        resolvedTarget = absTarget;
    }
    if (!node) {
      const candidates = store.searchNodes(target, 5);
      if (candidates.length === 1) {
        node = candidates[0];
        resolvedTarget = node.qualified_name;
      } else if (candidates.length > 1) {
        return {
          status: "ambiguous",
          summary: `Multiple matches for '${target}'. Please use a qualified name.`,
          candidates: candidates.map(nodeToDict)
        };
      }
    }
    if (!node && pattern !== "file_summary") {
      return { status: "not_found", summary: `No node found matching '${target}'.` };
    }
    const qn = node?.qualified_name ?? resolvedTarget;
    let result;
    switch (pattern) {
      case "callers_of":
        result = callersOf(store, qn, node?.name ?? null);
        break;
      case "callees_of":
        result = edgesBySource(store, qn, "CALLS");
        break;
      case "imports_of":
        result = edgesBySource(store, qn, "IMPORTS_FROM");
        break;
      case "importers_of":
        result = edgesByTarget(store, qn, "IMPORTS_FROM");
        break;
      case "children_of":
        result = edgesBySource(store, qn, "CONTAINS");
        break;
      case "tests_for":
        result = edgesBySource(store, qn, "TESTED_BY");
        break;
      case "inheritors_of":
        result = inheritorsOf(store, qn);
        break;
      case "file_summary":
        result = fileSummary(store, node?.file_path ?? resolvedTarget);
        break;
      default:
        result = { results: [], edges: [] };
    }
    return {
      status: "ok",
      pattern,
      target,
      description: QUERY_DESCRIPTIONS[pattern],
      summary: `${pattern}(${target}): ${result.results.length} results, ${result.edges.length} edges`,
      results: result.results,
      edges: result.edges
    };
  } finally {
    store.close();
  }
}

// dist/tools/get-review-context.js
import { readFileSync as readFileSync14 } from "node:fs";
import { relative as relative4, resolve as resolve7 } from "node:path";
function getReviewContext(params) {
  const root = findProjectRoot(params.repo_root);
  const dbPath = getDbPath(root);
  const base = params.base ?? "HEAD~1";
  const includeSource = params.include_source ?? true;
  const maxLines = params.max_lines_per_file ?? 200;
  let store;
  try {
    store = new GraphStore(dbPath);
  } catch (err2) {
    return {
      status: "error",
      error: `Cannot open graph database: ${err2 instanceof Error ? err2.message : String(err2)}`
    };
  }
  try {
    let changedFiles = params.changed_files?.map((f) => resolve7(root, f));
    if (!changedFiles || changedFiles.length === 0) {
      changedFiles = [
        .../* @__PURE__ */ new Set([
          ...getChangedFiles(root, base),
          ...getStagedAndUnstaged(root)
        ])
      ];
    }
    if (changedFiles.length === 0) {
      return {
        status: "ok",
        summary: "No changed files detected.",
        context: {
          changed_files: [],
          impacted_files: [],
          graph: { changed_nodes: [], impacted_nodes: [], edges: [] },
          source_snippets: {},
          review_guidance: {}
        }
      };
    }
    const impact = getImpactRadius(store, changedFiles, params.max_depth ?? 2);
    const sourceSnippets = {};
    if (includeSource) {
      for (const f of changedFiles) {
        try {
          const content = readFileSync14(f, "utf-8");
          const lines = content.split("\n");
          const snippet = lines.length > maxLines ? lines.slice(0, maxLines).join("\n") + `
... (${lines.length - maxLines} more lines)` : content;
          sourceSnippets[relative4(root, f)] = snippet;
        } catch {
        }
      }
    }
    const guidance = {};
    const wideImpact = impact.impacted_files.length > 5;
    if (wideImpact) {
      guidance["wide_impact"] = [
        `This change impacts ${impact.impacted_files.length} files \u2014 review carefully for breaking changes.`
      ];
    }
    const untestedFunctions = [];
    for (const n of impact.changed_nodes) {
      if (n.kind === "Function" && !n.is_test) {
        const testedBy = store.getEdgesBySource(n.qualified_name);
        const hasTest = testedBy.some((e) => e.kind === "TESTED_BY");
        if (!hasTest) {
          untestedFunctions.push(n.name);
        }
      }
    }
    if (untestedFunctions.length > 0) {
      guidance["test_coverage"] = [
        `${untestedFunctions.length} changed functions have no test coverage: ${untestedFunctions.join(", ")}`
      ];
    }
    const summary = [
      `${changedFiles.length} changed files`,
      `${impact.impacted_files.length} impacted files`,
      `${impact.changed_nodes.length} changed nodes`,
      untestedFunctions.length > 0 ? `${untestedFunctions.length} untested functions` : null
    ].filter(Boolean).join(", ");
    return {
      status: "ok",
      summary,
      context: {
        changed_files: changedFiles.map((f) => relative4(root, f)),
        impacted_files: impact.impacted_files.map((f) => relative4(root, f)),
        graph: {
          changed_nodes: impact.changed_nodes.map(nodeToDict),
          impacted_nodes: impact.impacted_nodes.map(nodeToDict),
          edges: impact.edges.map(edgeToDict)
        },
        source_snippets: sourceSnippets,
        review_guidance: guidance
      }
    };
  } finally {
    store.close();
  }
}

// dist/tools/get-impact-radius.js
import { relative as relative5 } from "node:path";
function getImpactRadiusTool(params) {
  const root = findProjectRoot(params.repo_root);
  const dbPath = getDbPath(root);
  const base = params.base ?? "HEAD~1";
  let store;
  try {
    store = new GraphStore(dbPath);
  } catch (err2) {
    return {
      status: "error",
      error: `Cannot open graph database: ${err2 instanceof Error ? err2.message : String(err2)}`
    };
  }
  try {
    let changedFiles = params.changed_files;
    if (!changedFiles || changedFiles.length === 0) {
      changedFiles = [
        .../* @__PURE__ */ new Set([
          ...getChangedFiles(root, base),
          ...getStagedAndUnstaged(root)
        ])
      ];
    }
    if (changedFiles.length === 0) {
      return {
        status: "ok",
        summary: "No changed files detected.",
        changed_files: [],
        changed_nodes: [],
        impacted_nodes: [],
        impacted_files: [],
        edges: []
      };
    }
    const result = getImpactRadius(store, changedFiles, params.max_depth ?? 2);
    const summary = [
      `${result.changed_nodes.length} changed nodes`,
      `${result.impacted_nodes.length} impacted nodes`,
      `${result.impacted_files.length} impacted files`,
      result.truncated ? "(truncated)" : ""
    ].filter(Boolean).join(", ");
    return {
      status: "ok",
      summary,
      changed_files: changedFiles.map((f) => relative5(root, f)),
      changed_nodes: result.changed_nodes.map(nodeToDict),
      impacted_nodes: result.impacted_nodes.map(nodeToDict),
      impacted_files: result.impacted_files.map((f) => relative5(root, f)),
      edges: result.edges.map(edgeToDict),
      truncated: result.truncated,
      total_impacted: result.total_impacted
    };
  } finally {
    store.close();
  }
}

// dist/tools/find-large-functions.js
function findLargeFunctions(params) {
  const root = findProjectRoot(params.repo_root);
  const dbPath = getDbPath(root);
  const minLines = params.min_lines ?? 150;
  let store;
  try {
    store = new GraphStore(dbPath);
  } catch (err2) {
    return {
      status: "error",
      error: `Cannot open graph database: ${err2 instanceof Error ? err2.message : String(err2)}`
    };
  }
  try {
    const nodes = store.getNodesBySize(minLines, void 0, params.kind, params.file_pattern);
    const results = nodes.map((n) => nodeToDict(n));
    const summary = `Found ${results.length} nodes with ${minLines}+ lines`;
    return {
      status: "ok",
      summary,
      min_lines: minLines,
      results
    };
  } finally {
    store.close();
  }
}

// dist/tools/semantic-search-nodes.js
function semanticSearchNodes(params) {
  const root = findProjectRoot(params.repo_root);
  const dbPath = getDbPath(root);
  let store;
  try {
    store = new GraphStore(dbPath);
  } catch (err2) {
    return {
      status: "error",
      error: `Cannot open graph database: ${err2 instanceof Error ? err2.message : String(err2)}`
    };
  }
  try {
    let nodes = store.searchNodes(params.query, params.limit ?? 20);
    if (params.kind) {
      nodes = nodes.filter((n) => n.kind === params.kind);
    }
    const results = nodes.map((n) => nodeToDict(n));
    const summary = `Found ${results.length} nodes matching "${params.query}"`;
    return {
      status: "ok",
      summary,
      query: params.query,
      search_mode: "keyword",
      results
    };
  } finally {
    store.close();
  }
}

// dist/tools/list-graph-stats.js
function listGraphStats(params) {
  const root = findProjectRoot(params.repo_root);
  const dbPath = getDbPath(root);
  let store;
  try {
    store = new GraphStore(dbPath);
  } catch (err2) {
    return {
      status: "error",
      error: `Cannot open graph database: ${err2 instanceof Error ? err2.message : String(err2)}`
    };
  }
  try {
    const stats = store.getStats();
    const summary = [
      `Graph: ${stats.total_nodes} nodes, ${stats.total_edges} edges`,
      `Files: ${stats.files_count}`,
      `Languages: ${stats.languages.join(", ") || "none"}`,
      `Last updated: ${stats.last_updated ?? "never"}`
    ].join(". ");
    return {
      status: "ok",
      summary,
      ...stats
    };
  } finally {
    store.close();
  }
}

// dist/tools/generate-graph-html.js
import { writeFileSync as writeFileSync3 } from "node:fs";
import { basename as basename11, dirname as dirname9, join as join5, relative as relative6, resolve as resolve8 } from "node:path";

// dist/html-styles.js
function buildStyles() {
  return `<style>
  :root, [data-theme="dark"] {
    --bg: #0a0e1a; --bg-alt: rgba(10,14,26,0.95); --bg-panel: rgba(10,14,26,0.85);
    --text: #e2e8f0; --text-dim: #94a3b8; --text-muted: #64748b; --text-faint: #475569; --text-ghost: #334155;
    --border: rgba(255,255,255,0.08); --border-soft: rgba(255,255,255,0.06); --border-input: rgba(255,255,255,0.1);
    --surface: rgba(255,255,255,0.03); --surface-hover: rgba(255,255,255,0.06);
    --accent: #f37029; --accent-bg: rgba(243,112,41,0.12); --accent-border: rgba(243,112,41,0.35);
    --edge: rgba(255,255,255,0.06); --edge-dim: rgba(255,255,255,0.03); --edge-hl: rgba(243,112,41,0.55);
    --node-border: 33; --node-bg: 14;
    --badge-green: #22c55e; --badge-green-bg: rgba(34,197,94,0.08); --badge-green-border: rgba(34,197,94,0.3);
  }
  [data-theme="light"] {
    --bg: #f8fafc; --bg-alt: rgba(241,245,249,0.97); --bg-panel: rgba(248,250,252,0.92);
    --text: #0f172a; --text-dim: #475569; --text-muted: #64748b; --text-faint: #94a3b8; --text-ghost: #cbd5e1;
    --border: rgba(0,0,0,0.08); --border-soft: rgba(0,0,0,0.05); --border-input: rgba(0,0,0,0.12);
    --surface: rgba(0,0,0,0.03); --surface-hover: rgba(0,0,0,0.06);
    --accent: #ea580c; --accent-bg: rgba(234,88,12,0.08); --accent-border: rgba(234,88,12,0.3);
    --edge: rgba(0,0,0,0.08); --edge-dim: rgba(0,0,0,0.03); --edge-hl: rgba(234,88,12,0.5);
    --node-border: 30; --node-bg: 10;
    --badge-green: #16a34a; --badge-green-bg: rgba(22,163,74,0.08); --badge-green-border: rgba(22,163,74,0.3);
  }

  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; background: var(--bg); color: var(--text); overflow: hidden; transition: background 0.2s, color 0.2s; }

  /* \u2500\u2500 Header \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
  .header { padding: 16px 28px; border-bottom: 1px solid var(--border); display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
  .header h1 { font-size: 18px; font-weight: 700; display: flex; align-items: center; gap: 10px; }
  .header h1 .logo { width: 26px; height: 26px; border-radius: 6px; background: var(--accent); display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 14px; color: var(--bg); flex-shrink: 0; }
  .header h1 .brand { color: var(--accent); }
  .header .sep { color: var(--text-ghost); font-weight: 300; }
  .header .subtitle { color: var(--text-muted); font-size: 14px; font-weight: 400; }
  .header .stats { margin-left: auto; display: flex; gap: 18px; font-size: 12px; color: var(--text-muted); align-items: center; }
  .header .stats strong { color: var(--text); font-weight: 600; }
  .header .badge { font-size: 10px; color: var(--badge-green); border: 1px solid var(--badge-green-border); border-radius: 10px; padding: 2px 10px; background: var(--badge-green-bg); }
  .theme-btn { width: 30px; height: 30px; border-radius: 7px; border: 1px solid var(--border-input); background: var(--surface); color: var(--text-muted); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.15s; }
  .theme-btn:hover { color: var(--accent); border-color: var(--accent-border); }
  .theme-btn svg { width: 15px; height: 15px; }

  /* \u2500\u2500 View toggle \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
  .view-toggle { display: flex; gap: 3px; background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 2px; }
  .vt-btn { width: 28px; height: 28px; border-radius: 6px; border: none; background: transparent; color: var(--text-muted); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.15s; }
  .vt-btn:hover { color: var(--text); }
  .vt-btn.active { background: var(--accent-bg); color: var(--accent); }
  .vt-btn svg { width: 15px; height: 15px; }

  .search-box { padding: 5px 14px; border-radius: 16px; border: 1px solid var(--border-input); background: var(--surface); color: var(--text); font-size: 11px; width: 180px; outline: none; font-family: inherit; }
  .search-box:focus { border-color: var(--accent-border); }
  .search-box::placeholder { color: var(--text-ghost); }

  /* \u2500\u2500 Graph \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
  .main { display: flex; height: calc(100vh - 58px); }
  .graph-panel { flex: 1; position: relative; overflow: auto; cursor: grab; display: none; }
  .graph-panel:active { cursor: grabbing; }
  .graph-canvas { position: absolute; top: 0; left: 0; }
  .edge-canvas { position: absolute; top: 0; left: 0; pointer-events: none; }

  /* \u2500\u2500 Tree sidebar \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
  .tree-sidebar { width: 260px; flex-shrink: 0; border-right: 1px solid var(--border); display: flex; flex-direction: column; background: var(--bg); }
  .tree-sidebar-header { padding: 8px 14px; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); border-bottom: 1px solid var(--border-soft); }
  .tree-panel { flex: 1; overflow-y: auto; padding: 6px 0; font-size: 12px; }
  .tree-dir { display: flex; align-items: center; gap: 3px; padding: 2px 10px; cursor: pointer; color: var(--text-dim); user-select: none; line-height: 22px; }
  .tree-dir:hover { background: var(--surface); color: var(--text); }
  .tree-dir-arrow { width: 16px; font-size: 8px; flex-shrink: 0; transition: transform 0.15s; color: var(--text-muted); display: inline-flex; align-items: center; justify-content: center; transform: rotate(90deg); }
  .tree-dir-arrow.collapsed { transform: rotate(0deg); }
  .tree-dir-name { font-weight: 500; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .tree-dir-badge { font-size: 9px; color: var(--text-faint); margin-left: auto; flex-shrink: 0; }
  .tree-children { padding-left: 12px; margin-left: 6px; border-left: 1px solid var(--border-soft); }
  .tree-children.collapsed { display: none; }
  .tree-file { display: flex; align-items: center; gap: 6px; padding: 2px 10px 2px 20px; cursor: pointer; color: var(--text-dim); transition: background 0.1s; line-height: 22px; }
  .tree-file:hover { background: var(--surface); color: var(--text); }
  .tree-file.selected { background: var(--accent-bg); color: var(--accent); }
  .tree-file .tf-dot { width: 5px; height: 5px; border-radius: 50%; flex-shrink: 0; }
  .tree-file .tf-name { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .tree-file .tf-lines { font-size: 9px; color: var(--text-faint); font-family: 'SF Mono', Menlo, monospace; flex-shrink: 0; }

  /* \u2500\u2500 Nodes \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
  .node { position: absolute; width: 190px; height: 34px; border-radius: 7px; cursor: pointer; transition: opacity 0.15s, box-shadow 0.15s; display: flex; align-items: center; gap: 8px; padding: 0 12px; user-select: none; font-size: 11px; font-weight: 500; border: 1px solid transparent; color: var(--text); }
  .node:hover { filter: brightness(1.25); box-shadow: 0 0 14px var(--surface-hover); }
  .node .dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
  .node .lbl { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1; }
  .node.selected { border-width: 2px; z-index: 5; }
  .node.dimmed { opacity: 0.12; pointer-events: none; }

  /* \u2500\u2500 Column headers \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
  .col-header { position: absolute; font-size: 12px; font-weight: 700; letter-spacing: 0.03em; opacity: 0.8; font-family: 'SF Mono', 'Fira Code', Menlo, monospace; }
  .col-line { position: absolute; height: 2px; opacity: 0.25; border-radius: 1px; }

  /* \u2500\u2500 Detail panel \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
  .detail-panel { width: 380px; border-left: 1px solid var(--border); padding: 0; overflow-y: auto; display: none; flex-shrink: 0; background: var(--bg-panel); }
  .detail-panel.open { display: block; }
  .dp-inner { padding: 22px; }
  .dp-title { font-size: 17px; font-weight: 700; margin-bottom: 4px; }
  .dp-path { font-size: 11px; color: var(--text-faint); font-family: 'SF Mono', Menlo, monospace; margin-bottom: 14px; word-break: break-all; }
  .dp-badges { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 16px; }
  .dp-badge { display: inline-block; padding: 2px 10px; border-radius: 10px; font-size: 10px; font-weight: 600; }
  .dp-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 18px; }
  .dp-stat { padding: 10px 12px; border-radius: 8px; background: var(--surface); border: 1px solid var(--border-soft); }
  .dp-stat-label { font-size: 10px; color: var(--text-faint); text-transform: uppercase; letter-spacing: 0.06em; font-weight: 600; }
  .dp-stat-value { font-size: 18px; font-weight: 700; color: var(--text); margin-top: 2px; }
  .dp-section-title { font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-faint); margin: 16px 0 8px; font-weight: 600; }
  .dp-dep-item { padding: 5px 0; font-size: 12px; color: var(--text-dim); display: flex; align-items: center; gap: 8px; cursor: pointer; border-bottom: 1px solid var(--border-soft); }
  .dp-dep-item:hover { color: var(--accent); }
  .dp-dep-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
  .dp-flag { padding: 8px 12px; border-radius: 7px; margin-bottom: 5px; font-size: 11px; line-height: 1.4; }

  /* \u2500\u2500 Legend (right side, above zoom) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
  .legend { position: fixed; bottom: 60px; right: 14px; background: var(--bg-alt); border: 1px solid var(--border); border-radius: 10px; font-size: 10px; z-index: 10; backdrop-filter: blur(8px); min-width: 130px; }
  .legend-toggle { display: flex; align-items: center; justify-content: space-between; padding: 7px 12px; cursor: pointer; user-select: none; color: var(--text-muted); font-size: 10px; font-weight: 600; letter-spacing: 0.04em; gap: 8px; }
  .legend-toggle:hover { color: var(--text); }
  .legend-toggle svg { width: 12px; height: 12px; transition: transform 0.2s; }
  .legend-toggle.collapsed svg { transform: rotate(180deg); }
  .legend-body { padding: 0 12px 8px; }
  .legend-body.hidden { display: none; }
  .legend-item { display: flex; align-items: center; gap: 7px; margin: 3px 0; color: var(--text-muted); cursor: pointer; padding: 2px 4px; border-radius: 4px; transition: all 0.15s; user-select: none; }
  .legend-item:hover { color: var(--text); background: var(--surface); }
  .legend-item.hidden-cat { opacity: 0.35; text-decoration: line-through; }
  .legend-color { width: 10px; height: 10px; border-radius: 3px; flex-shrink: 0; }

  /* \u2500\u2500 Entities panel \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
  .entities-panel { display: none; position: absolute; top: 58px; left: 0; right: 0; bottom: 0; overflow-y: auto; padding: 28px; background: var(--bg); z-index: 5; }
  .entities-panel.open { display: block; }
  .ep-header { font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); margin-bottom: 16px; }
  .ep-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 14px; }
  .ep-card { padding: 18px; border-radius: 10px; border: 1px solid var(--border); background: var(--surface); cursor: pointer; transition: all 0.15s; }
  .ep-card:hover { border-color: var(--accent-border); background: var(--surface-hover); }
  .ep-card.selected { border-color: var(--accent); background: var(--accent-bg); }
  .ep-card-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
  .ep-card-name { font-size: 16px; font-weight: 700; }
  .ep-card-source { font-size: 9px; padding: 2px 8px; border-radius: 8px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; }
  .ep-card-source.migration { background: rgba(59,130,246,0.12); color: #3b82f6; border: 1px solid rgba(59,130,246,0.3); }
  .ep-card-source.route { background: rgba(243,112,41,0.12); color: #f37029; border: 1px solid rgba(243,112,41,0.3); }
  .ep-card-source.directory { background: rgba(139,92,246,0.12); color: #8b5cf6; border: 1px solid rgba(139,92,246,0.3); }
  .ep-card-source.hook { background: rgba(6,182,212,0.12); color: #06b6d4; border: 1px solid rgba(6,182,212,0.3); }
  .ep-card-count { font-size: 11px; color: var(--text-dim); margin-bottom: 10px; }
  .ep-roles { display: flex; flex-wrap: wrap; gap: 5px; }
  .ep-role { font-size: 9px; padding: 2px 8px; border-radius: 6px; font-weight: 500; background: var(--surface-hover); color: var(--text-dim); border: 1px solid var(--border-soft); }

  /* \u2500\u2500 Zoom \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
  .zoom-controls { position: fixed; bottom: 14px; right: 14px; display: flex; gap: 4px; z-index: 10; }
  .zoom-controls button { width: 32px; height: 32px; border-radius: 7px; border: 1px solid var(--border); background: var(--bg-alt); color: var(--text-muted); font-size: 16px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-family: inherit; backdrop-filter: blur(8px); }
  .zoom-controls button:hover { color: var(--accent); border-color: var(--accent-border); }

  /* \u2500\u2500 Footer \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
  .footer { position: fixed; bottom: 14px; left: 14px; font-size: 10px; color: var(--text-ghost); z-index: 5; }
</style>`;
}

// dist/html-scripts.js
function buildScriptData(nodes, catsPresent, entities) {
  const colorsObj = {};
  const labelsObj = {};
  for (const c of catsPresent) {
    const m = CATEGORY_META[c] ?? { label: c, color: "#94a3b8" };
    colorsObj[c] = m.color;
    labelsObj[c] = m.label;
  }
  return `
var NODES=${jsonInject(nodes)},COLORS=${jsonInject(colorsObj)},CAT_LABELS=${jsonInject(labelsObj)},CAT_ORDER=${jsonInject(catsPresent)};
var ENTITIES=${jsonInject(entities)};
var EDGES=[],nodeMap={},reverseDeps={};
NODES.forEach(function(n){nodeMap[n.id]=n;});
NODES.forEach(function(n){(n.imports||[]).forEach(function(t){if(nodeMap[t])EDGES.push({source:n.id,target:t});});});
NODES.forEach(function(n){reverseDeps[n.id]=[];});
EDGES.forEach(function(e){if(reverseDeps[e.target])reverseDeps[e.target].push(e.source);});
var NODE_W=190,NODE_H=34,COL_GAP=220,ROW_GAP=42,PAD_X=44,PAD_Y=52;
var currentFilter="all",selectedNode=null,selectedEntity=null,entityMemberSet=null,searchTerm="",zoom=0.85;
var hiddenCats=new Set();
`;
}
function buildScriptControls() {
  return `
var searchBox=document.getElementById("searchBox");

// \u2500\u2500 Theme toggle \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
var themeBtn=document.getElementById("themeToggle");
var moonPath='M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z';
var sunPath='M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42';
(function initTheme(){
  var saved=localStorage.getItem("composure-theme");
  if(saved)document.documentElement.setAttribute("data-theme",saved);
  updateThemeIcon();
})();
function updateThemeIcon(){
  var isDark=document.documentElement.getAttribute("data-theme")!=="light";
  document.getElementById("themeIcon").innerHTML=isDark
    ?'<path d="'+moonPath+'"/>'
    :'<circle cx="12" cy="12" r="5"/><path d="'+sunPath+'"/>';
}
themeBtn.addEventListener("click",function(){
  var isDark=document.documentElement.getAttribute("data-theme")!=="light";
  document.documentElement.setAttribute("data-theme",isDark?"light":"dark");
  localStorage.setItem("composure-theme",isDark?"light":"dark");
  updateThemeIcon();
  render();
});

// \u2500\u2500 Search \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
searchBox.addEventListener("input",function(e){searchTerm=e.target.value.toLowerCase();render();});

// \u2500\u2500 Zoom \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
document.getElementById("zoomIn").addEventListener("click",function(){zoom=Math.min(zoom+0.15,2);render();});
document.getElementById("zoomOut").addEventListener("click",function(){zoom=Math.max(zoom-0.15,0.3);render();});
document.getElementById("zoomReset").addEventListener("click",function(){zoom=0.85;render();});
document.getElementById("graphPanel").addEventListener("wheel",function(e){
  if(e.ctrlKey||e.metaKey){e.preventDefault();zoom=Math.max(0.3,Math.min(2,zoom+(e.deltaY<0?0.08:-0.08)));render();}
},{passive:false});

// \u2500\u2500 Legend toggle + clickable category items \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
document.getElementById("legendToggle").addEventListener("click",function(){
  document.getElementById("legendBody").classList.toggle("hidden");
  document.getElementById("legendToggle").classList.toggle("collapsed");
});
document.querySelectorAll(".legend-item").forEach(function(el){
  el.addEventListener("click",function(){
    var cat=el.getAttribute("data-cat");
    if(hiddenCats.has(cat)){hiddenCats.delete(cat);el.classList.remove("hidden-cat");}
    else{hiddenCats.add(cat);el.classList.add("hidden-cat");}
    selectedNode=null;
    document.getElementById("detailPanel").classList.remove("open");
    render();
  });
});
`;
}
function buildScriptGraphLogic() {
  return `
function layoutNodes(filter){
  var visible=NODES.filter(function(n){return !hiddenCats.has(n.cat);});
  if(searchTerm)visible=visible.filter(function(n){return n.label.toLowerCase().includes(searchTerm)||n.path.toLowerCase().includes(searchTerm);});
  var groups={},positions={};
  visible.forEach(function(n){(groups[n.cat]=groups[n.cat]||[]).push(n);});
  var cols=CAT_ORDER.filter(function(c){return groups[c];});
  cols.forEach(function(cat,ci){(groups[cat]||[]).forEach(function(n,ri){positions[n.id]={x:PAD_X+ci*COL_GAP,y:PAD_Y+ri*ROW_GAP};});});
  return{positions:positions,visible:visible,cols:cols};
}
function bfsRadius(startId,maxDepth){
  var visited=new Set([startId]),frontier=[startId];
  for(var d=0;d<maxDepth;d++){
    var next=[];
    frontier.forEach(function(nid){
      var node=nodeMap[nid];
      if(node)(node.imports||[]).forEach(function(t){if(!visited.has(t)){visited.add(t);next.push(t);}});
      (reverseDeps[nid]||[]).forEach(function(s){if(!visited.has(s)){visited.add(s);next.push(s);}});
    });
    frontier=next;if(frontier.length===0)break;
  }
  return visited;
}
function selectNode(id){selectedNode=id;render();}
`;
}
function buildScriptDetailPanel() {
  return `
function buildDetail(node){
  var panel=document.getElementById("detailPanel");panel.innerHTML="";panel.classList.add("open");
  var color=COLORS[node.cat]||"#94a3b8";
  var deps=(node.imports||[]).map(function(i){return nodeMap[i];}).filter(Boolean);
  var consumers=(reverseDeps[node.id]||[]).map(function(i){return nodeMap[i];}).filter(Boolean);
  var radius=bfsRadius(node.id,2);
  var inner=document.createElement("div");inner.className="dp-inner";
  var h2=document.createElement("div");h2.className="dp-title";h2.style.color=color;h2.textContent=node.label;inner.appendChild(h2);
  var fp=document.createElement("div");fp.className="dp-path";fp.textContent=node.path;inner.appendChild(fp);
  var badges=document.createElement("div");badges.className="dp-badges";
  function addBadge(t,bg,fg){var s=document.createElement("span");s.className="dp-badge";s.textContent=t;s.style.background=bg;s.style.color=fg;badges.appendChild(s);}
  addBadge(CAT_LABELS[node.cat]||node.cat,color+"22",color);
  addBadge(node.language,"var(--surface-hover)","var(--text-dim)");
  if(node.isTest)addBadge("test","rgba(34,211,238,0.12)","#22d3ee");
  inner.appendChild(badges);
  var sg=document.createElement("div");sg.className="dp-stats";
  function addStat(l,v){var el=document.createElement("div");el.className="dp-stat";el.innerHTML='<div class="dp-stat-label">'+l+'</div><div class="dp-stat-value">'+v+'</div>';sg.appendChild(el);}
  addStat("Lines",node.lines);addStat("Functions",node.functions);addStat("Imports",deps.length);
  addStat("Imported by",consumers.length);addStat("Blast radius",radius.size);
  if(node.classes>0)addStat("Classes",node.classes);if(node.types>0)addStat("Types",node.types);
  inner.appendChild(sg);
  function addDepSection(title,items){
    if(!items.length)return;
    var st=document.createElement("div");st.className="dp-section-title";st.textContent=title;inner.appendChild(st);
    items.forEach(function(d){
      var li=document.createElement("div");li.className="dp-dep-item";
      li.addEventListener("click",function(){selectNode(d.id);});
      var dot=document.createElement("div");dot.className="dp-dep-dot";dot.style.background=COLORS[d.cat]||"#94a3b8";
      li.appendChild(dot);li.appendChild(document.createTextNode(d.label));inner.appendChild(li);
    });
  }
  addDepSection("Imports",deps);addDepSection("Imported by",consumers);
  if(consumers.length>=5){
    var sev=consumers.length>=10?"critical":"warn";
    var fc={warn:["rgba(251,191,36,0.08)","rgba(251,191,36,0.2)","#fbbf24"],critical:["rgba(239,68,68,0.08)","rgba(239,68,68,0.2)","#ef4444"]}[sev];
    var ft=document.createElement("div");ft.className="dp-section-title";ft.textContent="Review Notes";ft.style.marginTop="20px";inner.appendChild(ft);
    var fl=document.createElement("div");fl.className="dp-flag";fl.style.cssText="background:"+fc[0]+";border:1px solid "+fc[1]+";color:"+fc[2];
    fl.textContent="High fan-in: "+consumers.length+" files depend on this"+(sev==="critical"?" \\u2014 changes here have wide blast radius":"");inner.appendChild(fl);
  }
  if(deps.length===0&&consumers.length===0){
    var ft2=document.createElement("div");ft2.className="dp-section-title";ft2.textContent="Review Notes";ft2.style.marginTop="20px";inner.appendChild(ft2);
    var fl2=document.createElement("div");fl2.className="dp-flag";fl2.style.cssText="background:var(--surface);border:1px solid var(--border-soft);color:var(--text-muted)";
    fl2.textContent="Isolated file \\u2014 no import relationships detected";inner.appendChild(fl2);
  }
  panel.appendChild(inner);
}
`;
}
function buildScriptTreeView() {
  return `
var currentView="tree";

function buildTreeData(){
  var root={name:"",children:{},files:[],stats:{count:0,lines:0}};
  var visible=NODES.filter(function(n){return !hiddenCats.has(n.cat);});
  if(searchTerm)visible=visible.filter(function(n){return n.label.toLowerCase().includes(searchTerm)||n.path.toLowerCase().includes(searchTerm);});
  visible.forEach(function(n){
    var parts=n.path.split("/");
    var cur=root;
    for(var i=0;i<parts.length-1;i++){
      if(!cur.children[parts[i]])cur.children[parts[i]]={name:parts[i],children:{},files:[],stats:{count:0,lines:0}};
      cur=cur.children[parts[i]];
    }
    cur.files.push(n);
  });
  function calcStats(node){
    var c=node.files.length,l=0;
    node.files.forEach(function(f){l+=f.lines;});
    Object.keys(node.children).forEach(function(k){
      var s=calcStats(node.children[k]);c+=s.count;l+=s.lines;
    });
    node.stats={count:c,lines:l};
    return node.stats;
  }
  calcStats(root);
  return root;
}

var expandedDirs=new Set();

function renderTreeView(){
  var panel=document.getElementById("treePanel");
  panel.innerHTML="";
  var tree=buildTreeData();
  function renderDir(dir,container,path){
    var keys=Object.keys(dir.children).sort();
    keys.forEach(function(k){
      var child=dir.children[k];
      var dirPath=path?path+"/"+k:k;
      var isExpanded=expandedDirs.has(dirPath)||!!searchTerm;
      var row=document.createElement("div");row.className="tree-dir";
      var arrow=document.createElement("span");
      arrow.className="tree-dir-arrow"+(isExpanded?"":" collapsed");
      arrow.textContent="\\u25B6";
      row.appendChild(arrow);
      var nameEl=document.createElement("span");nameEl.className="tree-dir-name";nameEl.textContent=k;row.appendChild(nameEl);
      var badge=document.createElement("span");badge.className="tree-dir-badge";
      badge.textContent=child.stats.count+" files";row.appendChild(badge);
      row.addEventListener("click",function(){
        if(expandedDirs.has(dirPath))expandedDirs.delete(dirPath);else expandedDirs.add(dirPath);
        renderTreeView();
      });
      container.appendChild(row);
      var childContainer=document.createElement("div");
      childContainer.className="tree-children"+(isExpanded?"":" collapsed");
      renderDir(child,childContainer,dirPath);
      child.files.sort(function(a,b){return a.label.localeCompare(b.label);}).forEach(function(f){
        var fileRow=document.createElement("div");fileRow.className="tree-file";
        if(selectedNode===f.id)fileRow.classList.add("selected");
        var dot=document.createElement("div");dot.className="tf-dot";dot.style.background=COLORS[f.cat]||"#94a3b8";
        fileRow.appendChild(dot);
        var name=document.createElement("span");name.className="tf-name";name.textContent=f.label;fileRow.appendChild(name);
        var lines=document.createElement("span");lines.className="tf-lines";lines.textContent=f.lines;fileRow.appendChild(lines);
        fileRow.addEventListener("click",function(e){e.stopPropagation();selectedNode=f.id;buildDetail(f);renderTreeView();});
        childContainer.appendChild(fileRow);
      });
      container.appendChild(childContainer);
    });
    dir.files.sort(function(a,b){return a.label.localeCompare(b.label);}).forEach(function(f){
      var fileRow=document.createElement("div");fileRow.className="tree-file";
      if(selectedNode===f.id)fileRow.classList.add("selected");
      var dot=document.createElement("div");dot.className="tf-dot";dot.style.background=COLORS[f.cat]||"#94a3b8";
      fileRow.appendChild(dot);
      var name=document.createElement("span");name.className="tf-name";name.textContent=f.label;fileRow.appendChild(name);
      var lines=document.createElement("span");lines.className="tf-lines";lines.textContent=f.lines;fileRow.appendChild(lines);
      fileRow.addEventListener("click",function(e){e.stopPropagation();selectedNode=f.id;buildDetail(f);renderTreeView();});
      container.appendChild(fileRow);
    });
  }
  renderDir(tree,panel,"");
}

// \u2500\u2500 View toggle (tree sidebar always visible, graph/entities panels toggle) \u2500
var currentView="tree";
document.querySelectorAll(".vt-btn").forEach(function(btn){
  btn.addEventListener("click",function(){
    var view=btn.getAttribute("data-view");
    if(view===currentView)return;
    currentView=view;
    document.querySelectorAll(".vt-btn").forEach(function(b){b.classList.remove("active");});
    btn.classList.add("active");
    var gp=document.getElementById("graphPanel");
    var ep=document.getElementById("entitiesPanel");
    var zc=document.querySelector(".zoom-controls");
    var main=document.querySelector(".main");
    if(view==="graph"){
      gp.style.display="block";ep.classList.remove("open");main.style.display="flex";zc.style.display="";
      render();
    }else if(view==="entities"){
      gp.style.display="none";ep.classList.add("open");main.style.display="none";zc.style.display="none";
      renderEntityView();
    }else{
      gp.style.display="none";ep.classList.remove("open");main.style.display="flex";zc.style.display="none";
    }
  });
});
`;
}
function buildScriptRender() {
  return `
function render(){
  renderTreeView();
  if(currentView==="tree")return;
  var isDark=document.documentElement.getAttribute("data-theme")!=="light";
  var layout=layoutNodes(currentFilter),positions=layout.positions,visible=layout.visible,cols=layout.cols;
  var graphCanvas=document.getElementById("graphCanvas");
  var connectedSet=selectedNode?bfsRadius(selectedNode,1):null;
  graphCanvas.innerHTML="";
  cols.forEach(function(cat,ci){
    var color=COLORS[cat]||"#94a3b8";
    var hdr=document.createElement("div");hdr.className="col-header";
    hdr.style.cssText="left:"+(PAD_X+ci*COL_GAP)+"px;top:16px;color:"+color;hdr.textContent=CAT_LABELS[cat]||cat;graphCanvas.appendChild(hdr);
    var line=document.createElement("div");line.className="col-line";
    line.style.cssText="left:"+(PAD_X+ci*COL_GAP)+"px;top:36px;width:"+NODE_W+"px;background:"+color;graphCanvas.appendChild(line);
  });
  visible.forEach(function(n){
    var pos=positions[n.id];if(!pos)return;
    var color=COLORS[n.cat]||"#94a3b8",el=document.createElement("div");el.className="node";
    if(selectedNode===n.id)el.classList.add("selected");
    if(connectedSet&&!connectedSet.has(n.id))el.classList.add("dimmed");
    el.style.cssText="left:"+pos.x+"px;top:"+pos.y+"px;background:"+color+(isDark?"14":"10")+";border-color:"+(selectedNode===n.id?color:color+(isDark?"33":"30"))+";color:var(--text)";
    var dot=document.createElement("div");dot.className="dot";dot.style.background=color;el.appendChild(dot);
    var lbl=document.createElement("div");lbl.className="lbl";lbl.textContent=n.label;lbl.title=n.path;el.appendChild(lbl);
    el.addEventListener("click",function(e){e.stopPropagation();selectedNode=n.id;buildDetail(n);render();});
    graphCanvas.appendChild(el);
  });
  var maxX=0,maxY=0;
  Object.values(positions).forEach(function(p){if(p.x+NODE_W>maxX)maxX=p.x+NODE_W;if(p.y+NODE_H>maxY)maxY=p.y+NODE_H;});
  maxX+=PAD_X+40;maxY+=PAD_Y+40;
  graphCanvas.style.width=maxX+"px";graphCanvas.style.height=maxY+"px";
  graphCanvas.style.transform="scale("+zoom+")";graphCanvas.style.transformOrigin="0 0";
  var canvas=document.getElementById("edgeCanvas"),dpr=window.devicePixelRatio||1;
  canvas.width=maxX*zoom*dpr;canvas.height=maxY*zoom*dpr;
  canvas.style.width=maxX*zoom+"px";canvas.style.height=maxY*zoom+"px";
  var ctx=canvas.getContext("2d");ctx.scale(dpr*zoom,dpr*zoom);ctx.clearRect(0,0,maxX,maxY);
  var edgeColor=isDark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.08)";
  var edgeDim=isDark?"rgba(255,255,255,0.03)":"rgba(0,0,0,0.03)";
  var edgeHl=isDark?"rgba(243,112,41,0.55)":"rgba(234,88,12,0.5)";
  EDGES.forEach(function(e){
    var s=positions[e.source],t=positions[e.target];if(!s||!t)return;
    var hl=selectedNode&&(e.source===selectedNode||e.target===selectedNode);
    if(connectedSet&&!hl){ctx.strokeStyle=edgeDim;ctx.lineWidth=1;}
    else if(hl){ctx.strokeStyle=edgeHl;ctx.lineWidth=2.5;}
    else{ctx.strokeStyle=edgeColor;ctx.lineWidth=1.2;}
    var sx=s.x+NODE_W/2,sy=s.y+NODE_H/2,tx=t.x+NODE_W/2,ty=t.y+NODE_H/2,dx=tx-sx;
    ctx.beginPath();ctx.moveTo(sx,sy);ctx.bezierCurveTo(sx+dx*0.4,sy,sx+dx*0.6,ty,tx,ty);ctx.stroke();
  });
}
document.getElementById("graphPanel").addEventListener("click",function(e){
  if(e.target===document.getElementById("graphPanel")||e.target===document.getElementById("edgeCanvas")){
    selectedNode=null;document.getElementById("detailPanel").classList.remove("open");render();
  }
});
render();
`;
}
function buildScriptEntityView() {
  return `
function renderEntityView(){
  var panel=document.getElementById("entitiesPanel");
  if(!ENTITIES||!ENTITIES.length){
    panel.innerHTML='<div class="ep-header">No entities detected. Run build_or_update_graph with full_rebuild=true.</div>';
    return;
  }
  var html='<div class="ep-header">'+ENTITIES.length+' domain entities detected</div><div class="ep-grid">';
  ENTITIES.forEach(function(e){
    var roles=Object.keys(e.roles||{}).map(function(r){
      return '<span class="ep-role">'+r+' '+e.roles[r]+'</span>';
    }).join("");
    var sel=selectedEntity===e.name?" selected":"";
    html+='<div class="ep-card'+sel+'" data-entity="'+e.name+'">'
      +'<div class="ep-card-header"><span class="ep-card-name">'+e.displayName+'</span>'
      +'<span class="ep-card-source '+e.source+'">'+e.source+'</span></div>'
      +'<div class="ep-card-count">'+e.memberCount+' files across '+Object.keys(e.roles||{}).length+' roles</div>'
      +'<div class="ep-roles">'+roles+'</div></div>';
  });
  html+='</div>';
  panel.innerHTML=html;
  panel.querySelectorAll(".ep-card").forEach(function(card){
    card.addEventListener("click",function(){
      var name=card.getAttribute("data-entity");
      if(selectedEntity===name){selectedEntity=null;}
      else{selectedEntity=name;}
      // Highlight entity members in tree by filtering
      if(selectedEntity){
        var ent=ENTITIES.find(function(e){return e.name===selectedEntity;});
        if(ent){entityMemberSet=new Set(ent.memberIds);}
      }else{entityMemberSet=null;}
      renderEntityView();
    });
  });
}
`;
}
function buildScript(nodes, catsPresent, entities) {
  return [
    buildScriptData(nodes, catsPresent, entities),
    buildScriptControls(),
    buildScriptGraphLogic(),
    buildScriptDetailPanel(),
    buildScriptTreeView(),
    buildScriptEntityView(),
    buildScriptRender()
  ].join("\n");
}

// dist/html-template.js
var CATEGORY_META = {
  pages: { label: "Pages", color: "#f37029" },
  api: { label: "API Routes", color: "#ef4444" },
  components: { label: "Components", color: "#8b5cf6" },
  hooks: { label: "Hooks", color: "#06b6d4" },
  lib: { label: "Core Lib", color: "#22c55e" },
  auth: { label: "Auth", color: "#f59e0b" },
  data: { label: "Data Layer", color: "#3b82f6" },
  types: { label: "Types", color: "#eab308" },
  config: { label: "Config", color: "#64748b" },
  tests: { label: "Tests", color: "#22d3ee" },
  styles: { label: "Styles", color: "#f472b6" },
  source: { label: "Source", color: "#94a3b8" }
};
var DEFAULT_CAT_ORDER = [
  "pages",
  "api",
  "components",
  "hooks",
  "lib",
  "auth",
  "data",
  "types",
  "config",
  "tests",
  "styles",
  "source"
];
function esc(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function jsonInject(data) {
  return JSON.stringify(data).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026");
}
function buildHeader(repoName, generatedAt, filesCount, edgeCount, catCount) {
  return `<div class="header">
  <h1>
    <span class="logo">C</span>
    <span class="brand">Composure</span>
    <span class="sep">\u2014</span>
    <span class="subtitle">Code Review Graph</span>
  </h1>
  <span class="badge">${esc(generatedAt)}</span>
  <div class="view-toggle" id="viewToggle">
    <button class="vt-btn" data-view="graph" title="Dependency graph">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="5" cy="6" r="2"/><circle cx="12" cy="18" r="2"/><circle cx="19" cy="6" r="2"/><path d="M5 8v2a4 4 0 004 4h6a4 4 0 004-4V8"/><line x1="12" y1="14" x2="12" y2="16"/></svg>
    </button>
    <button class="vt-btn active" data-view="tree" title="File explorer">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>
    </button>
    <button class="vt-btn" data-view="entities" title="Domain entities">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
    </button>
  </div>
  <div class="stats">
    <span><strong id="statFiles">${filesCount}</strong> files</span>
    <span><strong id="statEdges">${edgeCount}</strong> connections</span>
    <span><strong>${catCount}</strong> categories</span>
    <input class="search-box" id="searchBox" placeholder="Search files\u2026" type="text" />
    <button class="theme-btn" id="themeToggle" title="Toggle theme">
      <svg id="themeIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
      </svg>
    </button>
  </div>
</div>`;
}
function buildLegend(cats) {
  const items = cats.map((c) => {
    const m = CATEGORY_META[c] ?? { label: c, color: "#94a3b8" };
    return `    <div class="legend-item" data-cat="${esc(c)}"><div class="legend-color" style="background:${m.color}"></div> ${esc(m.label)}</div>`;
  }).join("\n");
  return `<div class="legend" id="legend">
  <div class="legend-toggle" id="legendToggle">
    <span>Legend</span>
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
  </div>
  <div class="legend-body" id="legendBody">
${items}
  </div>
</div>`;
}
function buildZoomControls() {
  return `<div class="zoom-controls" style="display:none">
  <button id="zoomOut" title="Zoom out">\u2212</button>
  <button id="zoomReset" title="Reset zoom">\u27F3</button>
  <button id="zoomIn" title="Zoom in">+</button>
</div>`;
}
function generateGraphHtml(data) {
  const { nodes, entities, repoName, generatedAt, stats } = data;
  const catSet = new Set(nodes.map((n) => n.cat));
  const catsPresent = DEFAULT_CAT_ORDER.filter((c) => catSet.has(c));
  const edgeCount = nodes.reduce((sum, n) => sum + n.imports.length, 0);
  return `<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(repoName)} \u2014 Code Review Graph</title>
${buildStyles()}
</head>
<body>

${buildHeader(repoName, generatedAt, stats.filesCount, edgeCount, catsPresent.length)}

<div class="main">
  <div class="tree-sidebar" id="treeSidebar">
    <div class="tree-sidebar-header">
      <span class="tree-sidebar-title">Explorer</span>
    </div>
    <div class="tree-panel" id="treePanel"></div>
  </div>
  <div class="graph-panel" id="graphPanel">
    <canvas class="edge-canvas" id="edgeCanvas"></canvas>
    <div class="graph-canvas" id="graphCanvas"></div>
  </div>
  <div class="detail-panel" id="detailPanel"></div>
</div>
<div class="entities-panel" id="entitiesPanel"></div>

${buildLegend(catsPresent)}
${buildZoomControls()}

<div class="footer">
  <span>github.com/hrconsultnj/composure</span>
</div>

<script>
${buildScript(nodes, catsPresent, entities)}
</script>
</body>
</html>`;
}

// dist/tools/generate-graph-html.js
var CATEGORY_RULES = [
  {
    key: "tests",
    match: (p, n) => /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(n) || p.includes("__tests__/") || p.startsWith("tests/") || p.startsWith("test/")
  },
  {
    key: "config",
    match: (p, n) => /\.(config)\.(ts|js|mjs|cjs)$/.test(n) || n.startsWith("tsconfig") || n.startsWith("tailwind") || n.startsWith(".eslint") || n.startsWith(".prettier") || n === "next.config.ts" || n === "next.config.js" || n === "next.config.mjs" || n === "vite.config.ts" || n === "postcss.config.js" || n === "postcss.config.mjs"
  },
  {
    key: "styles",
    match: (_p, n) => /\.(css|scss|sass|less)$/.test(n)
  },
  {
    key: "types",
    match: (p, n) => p.startsWith("types/") || p.includes("/types/") || n.endsWith(".types.ts") || n.endsWith(".d.ts")
  },
  {
    key: "pages",
    match: (p, n) => n === "page.tsx" || n === "page.ts" || n === "page.jsx" || n === "page.js" || p.startsWith("pages/") || // Layout files are page-adjacent
    n === "layout.tsx" || n === "layout.ts"
  },
  {
    key: "api",
    match: (p, n) => n === "route.ts" || n === "route.tsx" || n === "route.js" || p.startsWith("api/") || p.includes("/api/")
  },
  {
    key: "auth",
    match: (p, n) => p.startsWith("auth/") || p.includes("/auth/") || n === "middleware.ts" || n === "middleware.js" || n === "proxy.ts" || n === "proxy.js"
  },
  {
    key: "hooks",
    match: (p, n) => p.startsWith("hooks/") || p.includes("/hooks/") || /^use[A-Z]/.test(n.replace(/\.(ts|tsx|js|jsx)$/, ""))
  },
  {
    key: "data",
    match: (p) => p.startsWith("db/") || p.includes("/db/") || p.startsWith("supabase/") || p.includes("/supabase/") || p.startsWith("prisma/") || p.includes("/prisma/") || p.startsWith("drizzle/") || p.includes("/drizzle/")
  },
  {
    key: "components",
    match: (p) => p.startsWith("components/") || p.includes("/components/")
  },
  {
    key: "lib",
    match: (p) => p.startsWith("lib/") || p.includes("/lib/") || p.startsWith("utils/") || p.includes("/utils/") || p.startsWith("helpers/") || p.includes("/helpers/")
  }
  // Fallback handled separately
];
function detectCategory(relPath) {
  const name2 = basename11(relPath);
  for (const rule of CATEGORY_RULES) {
    if (rule.match(relPath, name2))
      return rule.key;
  }
  return "source";
}
function resolveImportTarget(specifier, sourceFile, fileSet) {
  if (!specifier.startsWith("."))
    return null;
  const sourceDir = dirname9(sourceFile);
  const base = resolve8(sourceDir, specifier);
  if (fileSet.has(base))
    return base;
  const stripped = base.replace(/\.(js|mjs|jsx)$/, "");
  const extensions = [".ts", ".tsx", ".js", ".jsx"];
  for (const ext of extensions) {
    if (fileSet.has(stripped + ext))
      return stripped + ext;
  }
  for (const ext of extensions) {
    if (fileSet.has(join5(stripped, `index${ext}`)))
      return join5(stripped, `index${ext}`);
  }
  return null;
}
function extractVisNodes(store, repoRoot) {
  const allFiles = store.getAllFiles();
  const fileSet = new Set(allFiles);
  const allEdges = store.getAllEdges();
  const importMap = /* @__PURE__ */ new Map();
  for (const e of allEdges) {
    if (e.kind !== "IMPORTS_FROM")
      continue;
    if (!fileSet.has(e.source_qualified))
      continue;
    let resolvedTarget = null;
    if (fileSet.has(e.target_qualified)) {
      resolvedTarget = e.target_qualified;
    } else {
      resolvedTarget = resolveImportTarget(e.target_qualified, e.source_qualified, fileSet);
    }
    if (!resolvedTarget || resolvedTarget === e.source_qualified)
      continue;
    let set = importMap.get(e.source_qualified);
    if (!set) {
      set = /* @__PURE__ */ new Set();
      importMap.set(e.source_qualified, set);
    }
    set.add(resolvedTarget);
  }
  const nodes = [];
  let totalEdgeCount = 0;
  for (const filePath of allFiles) {
    const fileNodes = store.getNodesByFile(filePath);
    const fileNode = fileNodes.find((n) => n.kind === "File");
    if (!fileNode)
      continue;
    const relPath = relative6(repoRoot, filePath);
    const lines = fileNode.line_end - fileNode.line_start + 1;
    const functions = fileNodes.filter((n) => n.kind === "Function").length;
    const classes = fileNodes.filter((n) => n.kind === "Class").length;
    const types = fileNodes.filter((n) => n.kind === "Type").length;
    const isTest = fileNodes.some((n) => n.is_test);
    const imports = Array.from(importMap.get(filePath) ?? []);
    totalEdgeCount += imports.length;
    const name2 = basename11(filePath);
    const isGenericName = /^(page|route|index|layout|loading|error|not-found)\.(ts|tsx|js|jsx)$/.test(name2);
    const parts2 = relPath.split("/");
    const label = isGenericName && parts2.length >= 2 ? parts2[parts2.length - 2] + "/" + name2 : name2;
    nodes.push({
      id: filePath,
      label,
      path: relPath,
      cat: detectCategory(relPath),
      lines,
      functions,
      classes,
      types,
      isTest,
      language: fileNode.language || "ts",
      imports
    });
  }
  return { nodes, edgeCount: totalEdgeCount };
}
function generateGraphHtmlTool(params) {
  const root = findProjectRoot(params.repo_root);
  const dbPath = getDbPath(root);
  let store;
  try {
    store = new GraphStore(dbPath);
  } catch (err2) {
    return {
      status: "error",
      error: `Cannot open graph database: ${err2 instanceof Error ? err2.message : String(err2)}. Run /build-graph first.`
    };
  }
  try {
    const stats = store.getStats();
    if (stats.total_nodes === 0) {
      return {
        status: "error",
        error: "Graph is empty. Run /build-graph first to populate it."
      };
    }
    const { nodes, edgeCount } = extractVisNodes(store, root);
    const allEntities = store.getAllEntities();
    const entities = allEntities.map((e) => {
      const roles = store.getEntityRoleCounts(e.name);
      const members = store.getEntityMembers(e.name, 0.5);
      const memberFileIds = [...new Set(members.map((m) => m.node.file_path))];
      return {
        name: e.name,
        displayName: e.display_name,
        source: e.source,
        memberCount: e.member_count,
        roles,
        memberIds: memberFileIds
      };
    });
    const repoName = basename11(root);
    const html = generateGraphHtml({
      nodes,
      entities,
      repoName,
      generatedAt: (/* @__PURE__ */ new Date()).toLocaleDateString("en-US", {
        month: "short",
        year: "numeric"
      }),
      stats: {
        totalNodes: stats.total_nodes,
        totalEdges: stats.total_edges,
        filesCount: nodes.length
      }
    });
    const outputPath = params.output_path ?? join5(root, ".composure", "graph", "graph.html");
    writeFileSync3(outputPath, html, "utf-8");
    const catCounts = {};
    for (const n of nodes) {
      catCounts[n.cat] = (catCounts[n.cat] ?? 0) + 1;
    }
    const catSummary = DEFAULT_CAT_ORDER.filter((c) => catCounts[c]).map((c) => `${CATEGORY_META[c]?.label ?? c}: ${catCounts[c]}`).join(", ");
    return {
      status: "ok",
      output_path: outputPath,
      summary: `Generated graph visualization: ${nodes.length} files, ${edgeCount} connections. Categories: ${catSummary}`,
      files: nodes.length,
      connections: edgeCount,
      categories: catCounts
    };
  } finally {
    store.close();
  }
}

// dist/tools/entity-scope.js
function entityScope(params) {
  const root = findProjectRoot(params.repo_root);
  const dbPath = getDbPath(root);
  let store;
  try {
    store = new GraphStore(dbPath);
  } catch (err2) {
    return {
      status: "error",
      error: `Cannot open graph database: ${err2 instanceof Error ? err2.message : String(err2)}`
    };
  }
  try {
    const minConfidence = params.min_confidence ?? 0.5;
    if (!params.entity) {
      const entities = store.getAllEntities();
      if (entities.length === 0) {
        return {
          status: "ok",
          summary: "No entities detected. Run build_or_update_graph with full_rebuild=true first.",
          entities: []
        };
      }
      const entitiesWithRoles = entities.map((e) => ({
        ...e,
        roles: store.getEntityRoleCounts(e.name)
      }));
      return {
        status: "ok",
        summary: `${entities.length} entities discovered`,
        entities: entitiesWithRoles
      };
    }
    const entityName = params.entity.toLowerCase().trim();
    const allEntities = store.getAllEntities();
    const entity = allEntities.find((e) => e.name === entityName);
    if (!entity) {
      const candidates = allEntities.filter((e) => e.name.includes(entityName));
      if (candidates.length > 0) {
        return {
          status: "ambiguous",
          summary: `Entity "${entityName}" not found. Did you mean one of these?`,
          candidates: candidates.map((c) => c.name)
        };
      }
      return {
        status: "not_found",
        summary: `Entity "${entityName}" not found. Run entity_scope() with no arguments to list all entities.`
      };
    }
    const members = store.getEntityMembers(entityName, minConfidence);
    const roles = store.getEntityRoleCounts(entityName);
    const membersByRole = {};
    for (const m of members) {
      if (!membersByRole[m.role])
        membersByRole[m.role] = [];
      membersByRole[m.role].push({
        ...nodeToDict(m.node),
        confidence: m.confidence
      });
    }
    const sharedWith = /* @__PURE__ */ new Set();
    for (const m of members) {
      const otherEntities = store.getEntitiesForNode(m.node.qualified_name);
      for (const oe of otherEntities) {
        if (oe.entity_name !== entityName) {
          sharedWith.add(oe.entity_name);
        }
      }
    }
    return {
      status: "ok",
      summary: `entity "${entityName}": ${members.length} members across ${Object.keys(roles).length} roles`,
      entity: entityName,
      display_name: entity.display_name,
      source: entity.source,
      roles,
      members_by_role: membersByRole,
      shared_with: [...sharedWith].sort()
    };
  } finally {
    store.close();
  }
}

// dist/tools/run-audit.js
import { existsSync as existsSync7, readFileSync as readFileSync16 } from "node:fs";
import { join as join7, relative as relative9 } from "node:path";

// dist/audit-store.js
function insertFinding(store, f) {
  const db = store.getDb();
  const now = Date.now() / 1e3;
  const info2 = db.prepare(`INSERT INTO audit_findings
       (audit_run_id, category, finding_type, severity, node_qualified_name, file_path, title, detail, score_impact, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(f.audit_run_id, f.category, f.finding_type, f.severity, f.node_qualified_name ?? null, f.file_path ?? null, f.title, JSON.stringify(f.detail ?? {}), f.score_impact, now);
  return Number(info2.lastInsertRowid);
}
function getFindings(store, runId, category) {
  const db = store.getDb();
  const sql = category ? "SELECT * FROM audit_findings WHERE audit_run_id = ? AND category = ? ORDER BY severity, score_impact DESC" : "SELECT * FROM audit_findings WHERE audit_run_id = ? ORDER BY category, severity, score_impact DESC";
  const params = category ? [runId, category] : [runId];
  const rows = db.prepare(sql).all(...params);
  return rows.map(rowToFinding);
}
function getFindingCounts(store, runId) {
  const db = store.getDb();
  const rows = db.prepare(`SELECT category, severity, COUNT(*) as c
       FROM audit_findings WHERE audit_run_id = ?
       GROUP BY category, severity`).all(runId);
  const result = {};
  for (const r of rows) {
    if (!result[r.category])
      result[r.category] = {};
    result[r.category][r.severity] = r.c;
  }
  return result;
}
function insertTestCoverage(store, tc) {
  const db = store.getDb();
  const now = Date.now() / 1e3;
  const info2 = db.prepare(`INSERT INTO test_coverage
       (audit_run_id, node_qualified_name, file_path, has_test_edge, coverage_pct, test_count, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`).run(tc.audit_run_id, tc.node_qualified_name, tc.file_path, tc.has_test_edge ? 1 : 0, tc.coverage_pct, tc.test_count, now);
  return Number(info2.lastInsertRowid);
}
function getTestCoverageGaps(store, runId) {
  const db = store.getDb();
  const rows = db.prepare("SELECT * FROM test_coverage WHERE audit_run_id = ? AND has_test_edge = 0 ORDER BY file_path").all(runId);
  return rows.map(rowToCoverage);
}
function insertScore(store, s) {
  const db = store.getDb();
  const now = Date.now() / 1e3;
  const info2 = db.prepare(`INSERT INTO audit_scores
       (audit_run_id, category, raw_score, weight, adjusted_weight, grade, grade_color, finding_count, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(s.audit_run_id, s.category, s.raw_score, s.weight, s.adjusted_weight, s.grade, s.grade_color, s.finding_count, now);
  return Number(info2.lastInsertRowid);
}
function getScores(store, runId) {
  const db = store.getDb();
  const rows = db.prepare("SELECT * FROM audit_scores WHERE audit_run_id = ? ORDER BY category").all(runId);
  return rows.map(rowToScore);
}
function getOverallScore(store, runId) {
  const scores = getScores(store, runId);
  if (scores.length === 0)
    return { score: 0, grade: "F", color: "#ef4444" };
  const overall = scores.reduce((sum, s) => sum + s.raw_score * s.adjusted_weight, 0);
  const { grade, color } = gradeFor(overall);
  return { score: Math.round(overall * 10) / 10, grade, color };
}
function getLatestRunId(store) {
  const db = store.getDb();
  const row = db.prepare("SELECT audit_run_id FROM audit_scores ORDER BY created_at DESC LIMIT 1").get();
  return row?.audit_run_id ?? null;
}
function gradeFor(score) {
  if (score >= 90)
    return { grade: "A", color: "#22c55e" };
  if (score >= 80)
    return { grade: "B", color: "#3b82f6" };
  if (score >= 70)
    return { grade: "C", color: "#eab308" };
  if (score >= 60)
    return { grade: "D", color: "#f97316" };
  return { grade: "F", color: "#ef4444" };
}
function rowToFinding(row) {
  return {
    id: row.id,
    audit_run_id: row.audit_run_id,
    category: row.category,
    finding_type: row.finding_type,
    severity: row.severity,
    node_qualified_name: row.node_qualified_name ?? void 0,
    file_path: row.file_path ?? void 0,
    title: row.title,
    detail: JSON.parse(row.detail || "{}"),
    score_impact: row.score_impact,
    created_at: row.created_at
  };
}
function rowToCoverage(row) {
  return {
    id: row.id,
    audit_run_id: row.audit_run_id,
    node_qualified_name: row.node_qualified_name,
    file_path: row.file_path,
    has_test_edge: Boolean(row.has_test_edge),
    coverage_pct: row.coverage_pct ?? null,
    test_count: row.test_count,
    created_at: row.created_at
  };
}
function rowToScore(row) {
  return {
    id: row.id,
    audit_run_id: row.audit_run_id,
    category: row.category,
    raw_score: row.raw_score,
    weight: row.weight,
    adjusted_weight: row.adjusted_weight,
    grade: row.grade,
    grade_color: row.grade_color,
    finding_count: row.finding_count,
    created_at: row.created_at
  };
}

// dist/tools/audit-analyzers.js
import { execFileSync as execFileSync3 } from "node:child_process";
import { existsSync as existsSync6, readFileSync as readFileSync15 } from "node:fs";
import { join as join6, relative as relative7 } from "node:path";
var IMPACTS = {
  FILE_400: 5,
  FILE_600: 15,
  FILE_800: 30,
  FUNC_150: 3,
  TASKS_PER_5: 1,
  CVE_CRITICAL: 25,
  CVE_HIGH: 10,
  CVE_MODERATE: 3,
  SEMGREP_ERROR: 15,
  SEMGREP_WARNING: 5,
  SEMGREP_INFO: 1,
  MISSING_HEADER: 3,
  UNTESTED_FUNC: 2,
  PREFLIGHT_FAIL: 15,
  PREFLIGHT_WARN: 5,
  GRAB_BAG: 8,
  MIXED_CONCERNS: 5,
  INLINE_CANDIDATE: 2,
  COLOCATE_CANDIDATE: 2,
  MISPLACED_APP_CONTENT: 5
};
function execSafe(cmd, args2, cwd) {
  try {
    return execFileSync3(cmd, args2, {
      cwd,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
      timeout: 6e4
    }).trim();
  } catch {
    return null;
  }
}
function findPkgManager(root) {
  if (existsSync6(join6(root, "pnpm-lock.yaml")))
    return "pnpm";
  if (existsSync6(join6(root, "yarn.lock")))
    return "yarn";
  if (existsSync6(join6(root, "package-lock.json")))
    return "npm";
  return null;
}
function toSeverity(raw) {
  if (typeof raw === "string") {
    const lower = raw.toLowerCase();
    if (lower === "critical" || lower === "high" || lower === "moderate" || lower === "low" || lower === "info") {
      return lower;
    }
  }
  return "moderate";
}
function recommendForSize(lines, threshold, kind) {
  const ratio = lines / threshold;
  if (ratio > 2.5) {
    return {
      recommendation: "split",
      reason: `${lines} lines is ${ratio.toFixed(1)}x the ${threshold}-line limit. This needs decomposition.`
    };
  }
  if (ratio > 1.5) {
    return {
      recommendation: "split-on-next-touch",
      reason: `${lines} lines is ${ratio.toFixed(1)}x the limit. Split when you're already editing this ${kind}.`
    };
  }
  return {
    recommendation: "monitor",
    reason: `Just over the ${threshold}-line limit. Not urgent \u2014 watch for growth.`
  };
}
var NEXTJS_CONVENTION_FILES = /* @__PURE__ */ new Set([
  "page.tsx",
  "layout.tsx",
  "loading.tsx",
  "error.tsx",
  "not-found.tsx",
  "global-error.tsx",
  "template.tsx",
  "default.tsx",
  "opengraph-image.tsx",
  "twitter-image.tsx",
  "icon.tsx",
  "apple-icon.tsx",
  "sitemap.tsx",
  "robots.tsx",
  "manifest.tsx"
]);
function analyzeFileOrganization(store, runId, repoRoot) {
  const configPath = join6(repoRoot, ".claude", "no-bandaids.json");
  if (!existsSync6(configPath))
    return 0;
  try {
    const config = JSON.parse(readFileSync15(configPath, "utf-8"));
    const frameworks = config.frameworks || {};
    const isNextJs = Object.values(frameworks).some((fw) => fw.frontend === "nextjs");
    if (!isNextJs)
      return 0;
  } catch {
    return 0;
  }
  const db = store.getDb();
  let findingCount = 0;
  const rows = db.prepare(`SELECT qualified_name, file_path, name
       FROM nodes
       WHERE kind = 'File'
         AND name LIKE '%.tsx'
         AND file_path LIKE '%/app/%'
       ORDER BY file_path`).all();
  for (const f of rows) {
    if (NEXTJS_CONVENTION_FILES.has(f.name))
      continue;
    insertFinding(store, {
      audit_run_id: runId,
      category: "code-quality",
      finding_type: "misplaced-app-content",
      severity: "moderate",
      node_qualified_name: f.qualified_name,
      file_path: relative7(repoRoot, f.file_path),
      title: `Content component '${f.name}' in app/ \u2014 move to components/`,
      detail: {
        recommendation: "split",
        reason: `Route directories should only contain Next.js convention files. Move '${f.name}' to components/pages/ or components/features/ and import from the route's page.tsx.`
      },
      score_impact: IMPACTS.MISPLACED_APP_CONTENT
    });
    findingCount++;
  }
  return findingCount;
}
function analyzeTestCoverage(store, runId, repoRoot) {
  const db = store.getDb();
  let findingCount = 0;
  const rows = db.prepare(`SELECT n.qualified_name, n.name, n.file_path,
              COUNT(e.id) as test_count
       FROM nodes n
       LEFT JOIN edges e ON e.target_qualified = n.qualified_name AND e.kind = 'TESTED_BY'
       WHERE n.kind = 'Function' AND n.is_test = 0
       GROUP BY n.qualified_name`).all();
  for (const r of rows) {
    insertTestCoverage(store, {
      audit_run_id: runId,
      node_qualified_name: r.qualified_name,
      file_path: relative7(repoRoot, r.file_path),
      has_test_edge: r.test_count > 0,
      coverage_pct: null,
      test_count: r.test_count
    });
    if (r.test_count === 0) {
      insertFinding(store, {
        audit_run_id: runId,
        category: "testing",
        finding_type: "untested-function",
        severity: "low",
        node_qualified_name: r.qualified_name,
        file_path: relative7(repoRoot, r.file_path),
        title: `Function "${r.name}" has no test coverage`,
        detail: { name: r.name },
        score_impact: IMPACTS.UNTESTED_FUNC
      });
      findingCount++;
    }
  }
  return findingCount;
}
function analyzeSecurityCLI(store, runId, repoRoot) {
  let findingCount = 0;
  const pkgManager = findPkgManager(repoRoot);
  if (pkgManager) {
    const output = execSafe(pkgManager, ["audit", "--json"], repoRoot);
    if (output) {
      try {
        const data = JSON.parse(output);
        const vulns = data.vulnerabilities ?? data.advisories ?? {};
        for (const [name2, info2] of Object.entries(vulns)) {
          const severity = toSeverity(info2.severity);
          const impact = severity === "critical" ? IMPACTS.CVE_CRITICAL : severity === "high" ? IMPACTS.CVE_HIGH : IMPACTS.CVE_MODERATE;
          insertFinding(store, {
            audit_run_id: runId,
            category: "security",
            finding_type: `cve-${severity}`,
            severity,
            title: `${severity.toUpperCase()} vulnerability in ${name2}`,
            detail: {
              package: name2,
              severity,
              fix_available: Boolean(info2.fixAvailable)
            },
            score_impact: impact
          });
          findingCount++;
        }
      } catch {
      }
    }
  }
  return findingCount;
}

// dist/tools/audit-cohesion.js
import { relative as relative8 } from "node:path";
function recommendAction(findingType, lines, cohesionRatio, funcCount, fanOut) {
  if (findingType === "grab-bag") {
    if (lines > 500 && cohesionRatio < 0.1) {
      return {
        action: "split",
        reason: `${lines} lines with ${Math.round(cohesionRatio * 100)}% cohesion \u2014 functions are unrelated. Split into domain-specific modules.`,
        severity: "high",
        impact: IMPACTS.GRAB_BAG
      };
    }
    if (lines > 300) {
      return {
        action: "split-on-next-touch",
        reason: `Over 300 lines with low cohesion. Split when you're already editing this file.`,
        severity: "moderate",
        impact: IMPACTS.GRAB_BAG
      };
    }
    return {
      action: "monitor",
      reason: `${funcCount} functions but only ${lines} lines \u2014 small utility file. Monitor for growth.`,
      severity: "low",
      impact: Math.round(IMPACTS.GRAB_BAG / 2)
    };
  }
  if (findingType === "mixed-concerns") {
    if (lines > 400 && (fanOut ?? 0) >= 6) {
      return {
        action: "split",
        reason: `${lines} lines reaching into ${fanOut} different files \u2014 too many responsibilities. Extract focused modules.`,
        severity: "moderate",
        impact: IMPACTS.MIXED_CONCERNS
      };
    }
    if (funcCount <= 3) {
      return {
        action: "ignore",
        reason: `Only ${funcCount} functions \u2014 this is a pipeline/orchestrator, high fan-out is expected.`,
        severity: "info",
        impact: 0
      };
    }
    return {
      action: "monitor",
      reason: `Moderate fan-out. Not urgent \u2014 revisit if the file keeps growing.`,
      severity: "low",
      impact: Math.round(IMPACTS.MIXED_CONCERNS / 2)
    };
  }
  return {
    action: "monitor",
    reason: "Review manually.",
    severity: "info",
    impact: 0
  };
}
function analyzeCohesion(store, db, runId, repoRoot) {
  let findingCount = 0;
  const filesWithManyFunctions = db.prepare(`SELECT f.file_path, f.qualified_name as file_qn, COUNT(n.id) as func_count
       FROM nodes f
       JOIN nodes n ON n.file_path = f.file_path AND n.kind IN ('Function', 'Test')
       WHERE f.kind = 'File' AND f.language IN ('typescript', 'tsx', 'javascript', 'jsx')
       GROUP BY f.file_path
       HAVING func_count >= 8
       ORDER BY func_count DESC`).all();
  for (const file of filesWithManyFunctions) {
    const funcQns = db.prepare(`SELECT qualified_name FROM nodes
         WHERE file_path = ? AND kind IN ('Function', 'Test')`).all(file.file_path);
    const qnSet = new Set(funcQns.map((r) => r.qualified_name));
    const internalCalls = db.prepare(`SELECT COUNT(*) as cnt FROM edges
         WHERE kind = 'CALLS'
           AND source_qualified IN (${funcQns.map(() => "?").join(",")})
           AND target_qualified IN (${funcQns.map(() => "?").join(",")})`).get(...funcQns.map((r) => r.qualified_name), ...funcQns.map((r) => r.qualified_name));
    const cohesionRatio = file.func_count > 0 ? internalCalls.cnt / file.func_count : 0;
    if (cohesionRatio < 0.3) {
      const fileSize = db.prepare("SELECT (line_end - line_start + 1) as lines FROM nodes WHERE qualified_name = ?").get(file.file_qn);
      const lines = fileSize?.lines ?? 0;
      const rec = recommendAction("grab-bag", lines, cohesionRatio, file.func_count);
      insertFinding(store, {
        audit_run_id: runId,
        category: "code-quality",
        finding_type: "grab-bag",
        severity: rec.severity,
        node_qualified_name: file.file_qn,
        file_path: relative8(repoRoot, file.file_path),
        title: `"Grab bag" file: ${file.func_count} functions, only ${internalCalls.cnt} internal calls (${Math.round(cohesionRatio * 100)}% cohesion)`,
        detail: {
          function_count: file.func_count,
          internal_calls: internalCalls.cnt,
          cohesion_ratio: Math.round(cohesionRatio * 100) / 100,
          lines,
          recommendation: rec.action,
          reason: rec.reason
        },
        score_impact: rec.impact
      });
      findingCount++;
    }
  }
  const fanOutRows = db.prepare(`SELECT f.file_path, f.qualified_name as file_qn,
              COUNT(DISTINCT e.file_path) as call_files
       FROM nodes f
       JOIN nodes n ON n.file_path = f.file_path AND n.kind = 'Function'
       JOIN edges e ON e.source_qualified = n.qualified_name AND e.kind = 'CALLS'
         AND e.target_qualified NOT LIKE (f.file_path || '%')
       WHERE f.kind = 'File' AND f.language IN ('typescript', 'tsx', 'javascript', 'jsx')
       GROUP BY f.file_path
       HAVING call_files >= 4
       ORDER BY call_files DESC`).all();
  for (const row of fanOutRows) {
    const funcCount = db.prepare(`SELECT COUNT(*) as cnt FROM nodes
         WHERE file_path = ? AND kind = 'Function'`).get(row.file_path);
    if (funcCount.cnt >= 5) {
      const fileSize = db.prepare("SELECT (line_end - line_start + 1) as lines FROM nodes WHERE qualified_name = ?").get(row.file_qn);
      const lines = fileSize?.lines ?? 0;
      const rec = recommendAction("mixed-concerns", lines, 0, funcCount.cnt, row.call_files);
      insertFinding(store, {
        audit_run_id: runId,
        category: "code-quality",
        finding_type: "mixed-concerns",
        severity: rec.severity,
        node_qualified_name: row.file_qn,
        file_path: relative8(repoRoot, row.file_path),
        title: `Mixed concerns: ${funcCount.cnt} functions calling into ${row.call_files} different files`,
        detail: {
          function_count: funcCount.cnt,
          external_file_targets: row.call_files,
          lines,
          recommendation: rec.action,
          reason: rec.reason
        },
        score_impact: rec.impact
      });
      findingCount++;
    }
  }
  const singleCallerRows = db.prepare(`SELECT n.qualified_name, n.name, n.file_path,
              COUNT(DISTINCT e.file_path) as caller_files,
              MIN(e.file_path) as sole_caller_file
       FROM nodes n
       JOIN edges e ON e.target_qualified = n.qualified_name AND e.kind = 'CALLS'
       WHERE n.kind = 'Function' AND n.is_test = 0
         AND n.language IN ('typescript', 'tsx', 'javascript', 'jsx')
       GROUP BY n.qualified_name
       HAVING caller_files = 1
         AND sole_caller_file != n.file_path`).all();
  const singleCallerByFile = /* @__PURE__ */ new Map();
  for (const row of singleCallerRows) {
    const existing = singleCallerByFile.get(row.file_path) ?? [];
    existing.push(row);
    singleCallerByFile.set(row.file_path, existing);
  }
  for (const [filePath, funcs] of singleCallerByFile) {
    if (funcs.length >= 3) {
      for (const f of funcs) {
        insertFinding(store, {
          audit_run_id: runId,
          category: "code-quality",
          finding_type: "inline-candidate",
          severity: "info",
          node_qualified_name: f.qualified_name,
          file_path: relative8(repoRoot, f.file_path),
          title: `"${f.name}" only called from ${relative8(repoRoot, f.sole_caller_file)} \u2014 co-locate?`,
          detail: {
            function_name: f.name,
            sole_caller: relative8(repoRoot, f.sole_caller_file),
            recommendation: "move-on-next-touch",
            reason: "Function has a single consumer. Co-locate when you're already editing either file \u2014 not worth a dedicated refactor."
          },
          score_impact: IMPACTS.INLINE_CANDIDATE
        });
        findingCount++;
      }
    }
  }
  const singleImporterTypes = db.prepare(`SELECT n.qualified_name, n.name, n.file_path,
              COUNT(DISTINCT e.file_path) as importer_files,
              MIN(e.file_path) as sole_importer
       FROM nodes n
       JOIN edges e ON e.target_qualified LIKE ('%' || n.name || '%')
         AND e.kind = 'IMPORTS_FROM'
       WHERE n.kind = 'Type'
         AND n.language IN ('typescript', 'tsx')
       GROUP BY n.qualified_name
       HAVING importer_files = 1
         AND sole_importer != n.file_path`).all();
  const typesByFile = /* @__PURE__ */ new Map();
  for (const row of singleImporterTypes) {
    const existing = typesByFile.get(row.file_path) ?? [];
    existing.push(row);
    typesByFile.set(row.file_path, existing);
  }
  for (const [filePath, types] of typesByFile) {
    if (types.length >= 3) {
      insertFinding(store, {
        audit_run_id: runId,
        category: "code-quality",
        finding_type: "colocate-types",
        severity: "info",
        file_path: relative8(repoRoot, filePath),
        title: `${types.length} types each only imported by one file \u2014 co-locate with consumers?`,
        detail: {
          type_count: types.length,
          types: types.slice(0, 5).map((t) => ({
            name: t.name,
            sole_importer: relative8(repoRoot, t.sole_importer)
          })),
          recommendation: "move-on-next-touch",
          reason: "Types have single consumers. Move them when you're already editing the consumer file."
        },
        score_impact: IMPACTS.COLOCATE_CANDIDATE
      });
      findingCount++;
    }
  }
  return findingCount;
}

// dist/tools/audit-scoring.js
var CATEGORY_WEIGHTS = {
  "code-quality": 0.3,
  security: 0.25,
  testing: 0.25,
  deployment: 0.2
};
function computeScores(store, runId, availableCategories) {
  const db = store.getDb();
  const totalWeight = [...availableCategories].reduce((sum, cat) => sum + CATEGORY_WEIGHTS[cat], 0);
  for (const category of availableCategories) {
    const row = db.prepare(`SELECT COALESCE(SUM(score_impact), 0) as total, COUNT(*) as cnt
         FROM audit_findings
         WHERE audit_run_id = ? AND category = ?`).get(runId, category);
    let score = Math.max(0, 100 - row.total);
    if (category === "testing") {
      const testNodes = db.prepare("SELECT COUNT(*) as c FROM nodes WHERE kind = 'Test'").get();
      if (testNodes.c === 0)
        score = 0;
    }
    if (category === "security") {
      const criticals = db.prepare(`SELECT COUNT(*) as c FROM audit_findings
           WHERE audit_run_id = ? AND category = 'security' AND severity = 'critical'`).get(runId);
      if (criticals.c > 0)
        score = Math.min(score, 59);
    }
    const { grade, color } = gradeFor(score);
    const adjustedWeight = CATEGORY_WEIGHTS[category] / totalWeight;
    insertScore(store, {
      audit_run_id: runId,
      category,
      raw_score: score,
      weight: CATEGORY_WEIGHTS[category],
      adjusted_weight: adjustedWeight,
      grade,
      grade_color: color,
      finding_count: row.cnt
    });
  }
}

// dist/tools/run-audit.js
function analyzeCodeQuality(store, runId, repoRoot) {
  const db = store.getDb();
  let findingCount = 0;
  const fileRows = db.prepare(`SELECT qualified_name, file_path, (line_end - line_start + 1) as lines
       FROM nodes WHERE kind = 'File' AND (line_end - line_start + 1) > 400
       ORDER BY lines DESC`).all();
  for (const f of fileRows) {
    let impact;
    let severity;
    let findingType;
    if (f.lines > 800) {
      impact = IMPACTS.FILE_800;
      severity = "critical";
      findingType = "oversized-file-800";
    } else if (f.lines > 600) {
      impact = IMPACTS.FILE_600;
      severity = "high";
      findingType = "oversized-file-600";
    } else {
      impact = IMPACTS.FILE_400;
      severity = "moderate";
      findingType = "oversized-file-400";
    }
    const sizeRec = recommendForSize(f.lines, f.lines > 800 ? 800 : f.lines > 600 ? 600 : 400, "file");
    insertFinding(store, {
      audit_run_id: runId,
      category: "code-quality",
      finding_type: findingType,
      severity,
      node_qualified_name: f.qualified_name,
      file_path: relative9(repoRoot, f.file_path),
      title: `File ${f.lines} lines (>${findingType.split("-").pop()} limit)`,
      detail: {
        lines: f.lines,
        recommendation: sizeRec.recommendation,
        reason: sizeRec.reason
      },
      score_impact: impact
    });
    findingCount++;
  }
  findingCount += analyzeCohesion(store, db, runId, repoRoot);
  const funcRows = db.prepare(`SELECT qualified_name, name, file_path, (line_end - line_start + 1) as lines
       FROM nodes WHERE kind = 'Function' AND (line_end - line_start + 1) > 150
       ORDER BY lines DESC`).all();
  for (const f of funcRows) {
    const funcRec = recommendForSize(f.lines, 150, "function");
    insertFinding(store, {
      audit_run_id: runId,
      category: "code-quality",
      finding_type: "oversized-function",
      severity: "moderate",
      node_qualified_name: f.qualified_name,
      file_path: relative9(repoRoot, f.file_path),
      title: `Function "${f.name}" is ${f.lines} lines (>150 limit)`,
      detail: {
        lines: f.lines,
        name: f.name,
        recommendation: funcRec.recommendation,
        reason: funcRec.reason
      },
      score_impact: IMPACTS.FUNC_150
    });
    findingCount++;
  }
  const tasksPath = join7(repoRoot, "tasks-plans", "tasks.md");
  if (existsSync7(tasksPath)) {
    try {
      const content = readFileSync16(tasksPath, "utf-8");
      const openCount = (content.match(/^- \[ \]/gm) || []).length;
      if (openCount > 0) {
        const impact = Math.floor(openCount / 5) * IMPACTS.TASKS_PER_5;
        insertFinding(store, {
          audit_run_id: runId,
          category: "code-quality",
          finding_type: "open-tasks",
          severity: "low",
          title: `${openCount} open quality tasks in task queue`,
          detail: { open_count: openCount },
          score_impact: impact
        });
        findingCount++;
      }
    } catch {
    }
  }
  return findingCount;
}
async function runAudit(params) {
  const root = findProjectRoot(params.repo_root);
  const dbPath = getDbPath(root);
  let store;
  try {
    store = new GraphStore(dbPath);
  } catch (err2) {
    return {
      status: "error",
      error: `Cannot open graph database: ${err2 instanceof Error ? err2.message : String(err2)}. Run build_or_update_graph first.`
    };
  }
  try {
    const stats = store.getStats();
    if (stats.total_nodes === 0) {
      return {
        status: "error",
        error: "Graph is empty. Run build_or_update_graph with full_rebuild=true first."
      };
    }
    const runId = (/* @__PURE__ */ new Date()).toISOString();
    const availableCategories = /* @__PURE__ */ new Set(["code-quality"]);
    analyzeCodeQuality(store, runId, root);
    analyzeFileOrganization(store, runId, root);
    if (params.include_testing !== false) {
      analyzeTestCoverage(store, runId, root);
      availableCategories.add("testing");
    }
    if (params.include_security !== false) {
      analyzeSecurityCLI(store, runId, root);
      if (findPkgManager(root)) {
        availableCategories.add("security");
      }
    }
    computeScores(store, runId, availableCategories);
    const findingCounts = getFindingCounts(store, runId);
    const scores = store.getDb().prepare("SELECT * FROM audit_scores WHERE audit_run_id = ? ORDER BY category").all(runId);
    const overallScore = scores.reduce((sum, s) => sum + s.raw_score * s.adjusted_weight, 0);
    const { grade: overallGrade, color: overallColor } = gradeFor(overallScore);
    const categorySummary = scores.map((s) => ({
      category: s.category,
      score: s.raw_score,
      grade: s.grade,
      grade_color: s.grade_color,
      findings: s.finding_count
    }));
    const totalFindings = Object.values(findingCounts).reduce((s, c) => s + Object.values(c).reduce((a, b) => a + b, 0), 0);
    const allFindings = store.getDb().prepare("SELECT detail FROM audit_findings WHERE audit_run_id = ? AND detail IS NOT NULL").all(runId);
    const recCounts = { split: 0, "split-on-next-touch": 0, monitor: 0, ignore: 0 };
    for (const f of allFindings) {
      try {
        const detail = JSON.parse(f.detail);
        if (detail.recommendation && recCounts[detail.recommendation] !== void 0) {
          recCounts[detail.recommendation]++;
        }
      } catch {
      }
    }
    return {
      status: "ok",
      run_id: runId,
      overall_score: Math.round(overallScore * 10) / 10,
      overall_grade: overallGrade,
      overall_color: overallColor,
      categories: categorySummary,
      finding_counts: findingCounts,
      recommendations: {
        split: recCounts.split,
        split_on_next_touch: recCounts["split-on-next-touch"],
        monitor: recCounts.monitor,
        ignore: recCounts.ignore,
        summary: recCounts.split > 0 ? `${recCounts.split} files need splitting. ${recCounts["split-on-next-touch"]} can wait until next touch. ${recCounts.monitor} to monitor.` : recCounts["split-on-next-touch"] > 0 ? `No urgent splits. ${recCounts["split-on-next-touch"]} files to split on next touch. ${recCounts.monitor} to monitor.` : `No splits needed. ${recCounts.monitor} files to monitor for growth.`
      },
      summary: `Audit complete: ${overallGrade} (${Math.round(overallScore)}). ${totalFindings} findings across ${availableCategories.size} categories.`
    };
  } finally {
    store.close();
  }
}

// dist/tools/generate-audit-html.js
import { existsSync as existsSync8, readFileSync as readFileSync17, writeFileSync as writeFileSync4, mkdirSync as mkdirSync3 } from "node:fs";
import { basename as basename12, dirname as dirname10, join as join8 } from "node:path";
function findTemplateDir() {
  const candidates = [
    join8(dirname10(import.meta.dirname ?? __dirname), "..", "..", "skills", "report", "templates"),
    // Fallback: check CLAUDE_PLUGIN_ROOT
    process.env.CLAUDE_PLUGIN_ROOT ? join8(process.env.CLAUDE_PLUGIN_ROOT, "skills", "report", "templates") : ""
  ].filter(Boolean);
  for (const dir of candidates) {
    if (existsSync8(join8(dir, "audit-header.html")))
      return dir;
  }
  return null;
}
function readTemplate(dir, name2) {
  return readFileSync17(join8(dir, name2), "utf-8");
}
function coverageColor(pct) {
  if (pct >= 80)
    return "#22c55e";
  if (pct >= 60)
    return "#eab308";
  if (pct >= 40)
    return "#f97316";
  return "#ef4444";
}
function buildReplacementMap(store, runId, repoRoot) {
  const scores = getScores(store, runId);
  const overall = getOverallScore(store, runId);
  const findingCounts = getFindingCounts(store, runId);
  const findings = getFindings(store, runId);
  const gaps = getTestCoverageGaps(store, runId);
  const scoreMap = {};
  for (const s of scores) {
    scoreMap[s.category] = { grade: s.grade, color: s.grade_color, score: s.raw_score };
  }
  const cq = scoreMap["code-quality"] ?? { grade: "N/A", color: "#64748b", score: 0 };
  const sec = scoreMap["security"] ?? { grade: "N/A", color: "#64748b", score: 0 };
  const test = scoreMap["testing"] ?? { grade: "N/A", color: "#64748b", score: 0 };
  const deploy = scoreMap["deployment"] ?? { grade: "N/A", color: "#64748b", score: 0 };
  const cqFindings = findingCounts["code-quality"] ?? {};
  const secFindings = findingCounts["security"] ?? {};
  const securityRows = findings.filter((f) => f.category === "security").slice(0, 10).map((f) => `<tr><td><span class="badge badge-${f.severity}">${f.severity}</span></td><td>${escHtml(f.title)}</td><td class="path">${escHtml(f.file_path ?? "dependency")}</td></tr>`).join("\n");
  const untestedRows = gaps.slice(0, 15).map((g) => `<tr><td class="path">${escHtml(g.file_path)}</td><td>${escHtml(g.node_qualified_name.split("::").pop() ?? "")}</td></tr>`).join("\n");
  const repoName = basename12(repoRoot);
  return {
    "{{PROJECT_NAME}}": escHtml(repoName),
    "{{OVERALL_GRADE}}": overall.grade,
    "{{OVERALL_SCORE}}": String(overall.score),
    "{{OVERALL_COLOR}}": overall.color,
    "{{QUALITY_GRADE}}": cq.grade,
    "{{QUALITY_GRADE_COLOR}}": cq.color,
    "{{QUALITY_SCORE}}": String(Math.round(cq.score)),
    "{{SECURITY_GRADE}}": sec.grade,
    "{{SECURITY_GRADE_COLOR}}": sec.color,
    "{{SECURITY_SCORE}}": String(Math.round(sec.score)),
    "{{TESTING_GRADE}}": test.grade,
    "{{TESTING_GRADE_COLOR}}": test.color,
    "{{TESTING_SCORE}}": String(Math.round(test.score)),
    "{{DEPLOYMENT_GRADE}}": deploy.grade,
    "{{DEPLOYMENT_GRADE_COLOR}}": deploy.color,
    "{{DEPLOYMENT_SCORE}}": String(Math.round(deploy.score)),
    "{{COUNT_CRITICAL}}": String(cqFindings["critical"] ?? 0),
    "{{COUNT_HIGH}}": String(cqFindings["high"] ?? 0),
    "{{COUNT_MODERATE}}": String(cqFindings["moderate"] ?? 0),
    "{{CVE_CRITICAL}}": String(secFindings["critical"] ?? 0),
    "{{CVE_HIGH}}": String(secFindings["high"] ?? 0),
    "{{CVE_MODERATE}}": String(secFindings["moderate"] ?? 0),
    "{{SECURITY_ROWS}}": securityRows || "<tr><td colspan='3'>No findings</td></tr>",
    "{{UNTESTED_ROWS}}": untestedRows || "<tr><td colspan='2'>All functions have test coverage</td></tr>",
    "{{UNTESTED_COUNT}}": String(gaps.length),
    "{{COV_LINES}}": "0",
    "{{COV_LINES_COLOR}}": coverageColor(0),
    "{{COV_FUNCS}}": "0",
    "{{COV_FUNCS_COLOR}}": coverageColor(0),
    "{{COV_BRANCHES}}": "0",
    "{{COV_BRANCHES_COLOR}}": coverageColor(0),
    "{{TOTAL_FINDINGS}}": String(findings.length),
    "{{AUDIT_DATE}}": (/* @__PURE__ */ new Date()).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric"
    })
  };
}
function escHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function generateAuditHtml(params) {
  const root = findProjectRoot(params.repo_root);
  const dbPath = getDbPath(root);
  let store;
  try {
    store = new GraphStore(dbPath);
  } catch (err2) {
    return {
      status: "error",
      error: `Cannot open graph database: ${err2 instanceof Error ? err2.message : String(err2)}`
    };
  }
  try {
    const runId = params.audit_run_id ?? getLatestRunId(store);
    if (!runId) {
      return {
        status: "error",
        error: "No audit run found. Run run_audit first."
      };
    }
    const templateDir = findTemplateDir();
    if (!templateDir) {
      return {
        status: "error",
        error: "Cannot find audit HTML templates. Expected at skills/report/templates/."
      };
    }
    const header = readTemplate(templateDir, "audit-header.html");
    const tabs = readTemplate(templateDir, "audit-tabs.html");
    const panels = readTemplate(templateDir, "audit-tab-panels.html");
    const footer = readTemplate(templateDir, "audit-footer.html");
    const replacements = buildReplacementMap(store, runId, root);
    let html = header + tabs + panels + footer;
    for (const [placeholder, value] of Object.entries(replacements)) {
      html = html.replaceAll(placeholder, value);
    }
    const outputDir = join8(root, "tasks-plans", "audits");
    if (!existsSync8(outputDir))
      mkdirSync3(outputDir, { recursive: true });
    const timestamp = (/* @__PURE__ */ new Date()).toISOString().slice(0, 16).replace("T", "-").replace(":", "");
    const outputPath = params.output_path ?? join8(outputDir, `audit-${timestamp}.html`);
    writeFileSync4(outputPath, html, "utf-8");
    const overall = getOverallScore(store, runId);
    return {
      status: "ok",
      output_path: outputPath,
      overall_grade: overall.grade,
      overall_score: overall.score,
      summary: `Audit report generated: ${overall.grade} (${overall.score}). Saved to ${outputPath}`
    };
  } finally {
    store.close();
  }
}

// dist/cli.js
var commands = {
  // Build & update
  build_or_update_graph: (args2) => buildOrUpdateGraph(args2),
  // Query tools
  query_graph: (args2) => queryGraph(args2),
  semantic_search_nodes: (args2) => semanticSearchNodes(args2),
  search_references: (args2) => searchReferences(args2),
  get_dependency_chain: (args2) => getDependencyChain(args2),
  entity_scope: (args2) => entityScope(args2),
  // Impact & review
  get_impact_radius: (args2) => getImpactRadiusTool(args2),
  get_review_context: (args2) => getReviewContext(args2),
  find_large_functions: (args2) => findLargeFunctions(args2),
  // Stats & visualization
  list_graph_stats: (args2) => listGraphStats(args2),
  generate_graph_html: (args2) => generateGraphHtmlTool(args2),
  // Audit
  run_audit: (args2) => runAudit(args2),
  generate_audit_html: (args2) => generateAuditHtml(args2),
  // Memory links (Graph → Cortex bridge)
  create_memory_link: (args2) => {
    const a = args2;
    const root = findProjectRoot(a.repo_root);
    const store = new GraphStore(getDbPath(root));
    try {
      const id = store.createMemoryLink(a);
      return { status: "ok", link_id: id, message: "Memory link created in graph" };
    } finally {
      store.close();
    }
  },
  get_memory_links: (args2) => {
    const a = args2;
    const root = findProjectRoot(a.repo_root);
    const store = new GraphStore(getDbPath(root));
    try {
      const links = a.node_qualified_name ? store.getMemoryLinksForNode(a.node_qualified_name) : a.file_path ? store.getMemoryLinksForFile(a.file_path) : [];
      return { status: "ok", summary: `${links.length} memory links`, links };
    } finally {
      store.close();
    }
  }
};
async function main() {
  const command = process.argv[2];
  const argsJson = process.argv[3];
  if (!command || command === "--help" || command === "-h") {
    console.error("Usage: composure-graph-cli <command> [json-args]");
    console.error("\nCommands:");
    console.error("  Build & update:");
    console.error("    build_or_update_graph    Build or incrementally update the code graph");
    console.error("\n  Query tools:");
    console.error("    query_graph              Run predefined graph queries (callers_of, callees_of, etc.)");
    console.error("    semantic_search_nodes    Search for code entities by name");
    console.error("    search_references        Grep with graph context enrichment");
    console.error("    get_dependency_chain     Shortest path between two code entities");
    console.error("    entity_scope             Get all code related to a business entity");
    console.error("\n  Impact & review:");
    console.error("    get_impact_radius        Blast radius of changed files");
    console.error("    get_review_context       Token-efficient review context for changes");
    console.error("    find_large_functions     Find oversized functions needing decomposition");
    console.error("\n  Stats & visualization:");
    console.error("    list_graph_stats         Aggregate graph statistics");
    console.error("    generate_graph_html      Generate HTML visualization");
    console.error("\n  Audit:");
    console.error("    run_audit                Run comprehensive code audit");
    console.error("    generate_audit_html      Generate HTML audit report");
    process.exit(command ? 0 : 1);
  }
  const handler = commands[command];
  if (!handler) {
    console.error(`Unknown command: ${command}`);
    console.error(`Available: ${Object.keys(commands).join(", ")}`);
    process.exit(1);
  }
  let args2 = {};
  if (argsJson) {
    try {
      args2 = JSON.parse(argsJson);
    } catch {
      console.error(`Invalid JSON args: ${argsJson}`);
      process.exit(1);
    }
  }
  try {
    const result = await handler(args2);
    process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  } catch (err2) {
    console.error(`Error: ${err2 instanceof Error ? err2.message : String(err2)}`);
    process.exit(1);
  }
}
main();

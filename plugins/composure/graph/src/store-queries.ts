/**
 * Read-only query functions for the knowledge graph SQLite store.
 *
 * Extracted from store.ts to separate reads from writes.
 * All functions take a DatabaseSync instance as their first argument.
 */

import type { DatabaseSync } from "node:sqlite";
import type { GraphEdge, GraphNode, GraphStats } from "./types.js";
import { rowToNode, rowToEdge } from "./serialization.js";

// ── Node queries ──────────────────────────────────────────────────

export function getNode(db: DatabaseSync, qualifiedName: string): GraphNode | null {
  const row = db
    .prepare("SELECT * FROM nodes WHERE qualified_name = ?")
    .get(qualifiedName) as Record<string, unknown> | undefined;
  return row ? rowToNode(row) : null;
}

export function getNodesByFile(db: DatabaseSync, filePath: string): GraphNode[] {
  const rows = db
    .prepare("SELECT * FROM nodes WHERE file_path = ?")
    .all(filePath) as Record<string, unknown>[];
  return rows.map(rowToNode);
}

export function getAllFiles(db: DatabaseSync): string[] {
  const rows = db
    .prepare("SELECT DISTINCT file_path FROM nodes ORDER BY file_path")
    .all() as { file_path: string }[];
  return rows.map((r) => r.file_path);
}

export function searchNodes(db: DatabaseSync, query: string, limit = 20): GraphNode[] {
  const words = query.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  const conditions = words.map(
    () => "(name LIKE ? OR qualified_name LIKE ? OR summary LIKE ?)",
  );
  const params: (string | number)[] = [];
  for (const w of words) {
    params.push(`%${w}%`, `%${w}%`, `%${w}%`);
  }

  const sql = `SELECT * FROM nodes WHERE ${conditions.join(" AND ")} LIMIT ?`;
  params.push(limit);

  const rows = db.prepare(sql).all(...params) as Record<string, unknown>[];
  return rows.map(rowToNode);
}

export function getNodesBySize(
  db: DatabaseSync,
  minLines: number,
  maxLines?: number,
  kind?: string,
  filePathPattern?: string,
  limit = 50,
): GraphNode[] {
  const conditions: string[] = [
    "(line_end - line_start + 1) >= ?",
  ];
  const params: (string | number)[] = [minLines];

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

  const rows = db.prepare(sql).all(...params) as Record<string, unknown>[];
  return rows.map(rowToNode);
}

// ── Edge queries ──────────────────────────────────────────────────

export function getEdgesBySource(db: DatabaseSync, qualifiedName: string): GraphEdge[] {
  const rows = db
    .prepare("SELECT * FROM edges WHERE source_qualified = ?")
    .all(qualifiedName) as Record<string, unknown>[];
  return rows.map(rowToEdge);
}

export function getEdgesByTarget(db: DatabaseSync, qualifiedName: string): GraphEdge[] {
  const rows = db
    .prepare("SELECT * FROM edges WHERE target_qualified = ?")
    .all(qualifiedName) as Record<string, unknown>[];
  return rows.map(rowToEdge);
}

export function searchEdgesByTargetName(db: DatabaseSync, name: string, kind = "CALLS"): GraphEdge[] {
  const rows = db
    .prepare(
      "SELECT * FROM edges WHERE kind = ? AND (target_qualified LIKE ? OR target_qualified = ?)",
    )
    .all(kind, `%::${name}`, name) as Record<string, unknown>[];
  return rows.map(rowToEdge);
}

export function getAllEdges(db: DatabaseSync): GraphEdge[] {
  const rows = db
    .prepare("SELECT * FROM edges")
    .all() as Record<string, unknown>[];
  return rows.map(rowToEdge);
}

export function getEdgesAmong(db: DatabaseSync, qualifiedNames: Set<string>): GraphEdge[] {
  if (qualifiedNames.size === 0) return [];

  db.exec("CREATE TEMP TABLE IF NOT EXISTS _qn_filter (qn TEXT PRIMARY KEY)");
  db.exec("DELETE FROM _qn_filter");

  const insert = db.prepare("INSERT OR IGNORE INTO _qn_filter (qn) VALUES (?)");
  db.exec("BEGIN");
  for (const n of qualifiedNames) insert.run(n);
  db.exec("COMMIT");

  const rows = db
    .prepare(
      `SELECT e.* FROM edges e
       WHERE e.source_qualified IN (SELECT qn FROM _qn_filter)
         AND e.target_qualified IN (SELECT qn FROM _qn_filter)`,
    )
    .all() as Record<string, unknown>[];

  db.exec("DELETE FROM _qn_filter");
  return rows.map(rowToEdge);
}

// ── Entity queries ────────────────────────────────────────────────

export function getAllEntities(db: DatabaseSync): Array<{
  name: string;
  display_name: string;
  source: string;
  member_count: number;
}> {
  return db
    .prepare(
      `SELECT e.name, e.display_name, e.source,
              COUNT(em.node_qualified_name) as member_count
       FROM entities e
       LEFT JOIN entity_members em ON em.entity_name = e.name
       GROUP BY e.name
       ORDER BY member_count DESC`,
    )
    .all() as Array<{
    name: string;
    display_name: string;
    source: string;
    member_count: number;
  }>;
}

export function getEntityMembers(
  db: DatabaseSync,
  entityName: string,
  minConfidence = 0.5,
): Array<{ node: GraphNode; role: string; confidence: number }> {
  const rows = db
    .prepare(
      `SELECT n.*, em.role, em.confidence
       FROM entity_members em
       JOIN nodes n ON n.qualified_name = em.node_qualified_name
       WHERE em.entity_name = ? AND em.confidence >= ?
       ORDER BY em.role, n.file_path`,
    )
    .all(entityName, minConfidence) as Array<
    Record<string, unknown> & { role: string; confidence: number }
  >;
  return rows.map((r) => ({
    node: rowToNode(r),
    role: r.role as string,
    confidence: r.confidence as number,
  }));
}

export function getEntitiesForNode(
  db: DatabaseSync,
  qualifiedName: string,
): Array<{ entity_name: string; role: string; confidence: number }> {
  return db
    .prepare(
      `SELECT entity_name, role, confidence
       FROM entity_members
       WHERE node_qualified_name = ?`,
    )
    .all(qualifiedName) as Array<{
    entity_name: string;
    role: string;
    confidence: number;
  }>;
}

export function getEntityRoleCounts(
  db: DatabaseSync,
  entityName: string,
): Record<string, number> {
  const rows = db
    .prepare(
      `SELECT role, COUNT(*) as c FROM entity_members
       WHERE entity_name = ? GROUP BY role`,
    )
    .all(entityName) as Array<{ role: string; c: number }>;
  const result: Record<string, number> = {};
  for (const r of rows) result[r.role] = r.c;
  return result;
}

// ── Stats ─────────────────────────────────────────────────────────

export function getStats(db: DatabaseSync, getMetadata: (key: string) => string | null): GraphStats {
  const totalNodes = (
    db.prepare("SELECT COUNT(*) as c FROM nodes").get() as { c: number }
  ).c;
  const totalEdges = (
    db.prepare("SELECT COUNT(*) as c FROM edges").get() as { c: number }
  ).c;

  const nodesByKind: Record<string, number> = {};
  const nkRows = db
    .prepare("SELECT kind, COUNT(*) as c FROM nodes GROUP BY kind")
    .all() as { kind: string; c: number }[];
  for (const r of nkRows) nodesByKind[r.kind] = r.c;

  const edgesByKind: Record<string, number> = {};
  const ekRows = db
    .prepare("SELECT kind, COUNT(*) as c FROM edges GROUP BY kind")
    .all() as { kind: string; c: number }[];
  for (const r of ekRows) edgesByKind[r.kind] = r.c;

  const langRows = db
    .prepare("SELECT DISTINCT language FROM nodes WHERE language IS NOT NULL AND language != ''")
    .all() as { language: string }[];
  const languages = langRows.map((r) => r.language);

  const filesCount = (
    db
      .prepare("SELECT COUNT(DISTINCT file_path) as c FROM nodes")
      .get() as { c: number }
  ).c;

  const lastUpdated = getMetadata("last_updated");

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

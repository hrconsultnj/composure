/**
 * Read-only query functions for the knowledge graph SQLite store.
 *
 * Extracted from store.ts to separate reads from writes.
 * All functions take a DatabaseSync instance as their first argument.
 */
import { rowToNode, rowToEdge } from "./serialization.js";
// ── Node queries ──────────────────────────────────────────────────
export function getNode(db, qualifiedName) {
    const row = db
        .prepare("SELECT * FROM nodes WHERE qualified_name = ?")
        .get(qualifiedName);
    return row ? rowToNode(row) : null;
}
export function getNodesByFile(db, filePath) {
    const rows = db
        .prepare("SELECT * FROM nodes WHERE file_path = ?")
        .all(filePath);
    return rows.map(rowToNode);
}
export function getAllFiles(db) {
    const rows = db
        .prepare("SELECT DISTINCT file_path FROM nodes ORDER BY file_path")
        .all();
    return rows.map((r) => r.file_path);
}
export function searchNodes(db, query, limit = 20) {
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
export function getNodesBySize(db, minLines, maxLines, kind, filePathPattern, limit = 50) {
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
    const rows = db.prepare(sql).all(...params);
    return rows.map(rowToNode);
}
// ── Edge queries ──────────────────────────────────────────────────
export function getEdgesBySource(db, qualifiedName) {
    const rows = db
        .prepare("SELECT * FROM edges WHERE source_qualified = ?")
        .all(qualifiedName);
    return rows.map(rowToEdge);
}
export function getEdgesByTarget(db, qualifiedName) {
    const rows = db
        .prepare("SELECT * FROM edges WHERE target_qualified = ?")
        .all(qualifiedName);
    return rows.map(rowToEdge);
}
export function searchEdgesByTargetName(db, name, kind = "CALLS") {
    const rows = db
        .prepare("SELECT * FROM edges WHERE kind = ? AND (target_qualified LIKE ? OR target_qualified = ?)")
        .all(kind, `%::${name}`, name);
    return rows.map(rowToEdge);
}
export function getAllEdges(db) {
    const rows = db
        .prepare("SELECT * FROM edges")
        .all();
    return rows.map(rowToEdge);
}
export function getEdgesAmong(db, qualifiedNames) {
    if (qualifiedNames.size === 0)
        return [];
    db.exec("CREATE TEMP TABLE IF NOT EXISTS _qn_filter (qn TEXT PRIMARY KEY)");
    db.exec("DELETE FROM _qn_filter");
    const insert = db.prepare("INSERT OR IGNORE INTO _qn_filter (qn) VALUES (?)");
    db.exec("BEGIN");
    for (const n of qualifiedNames)
        insert.run(n);
    db.exec("COMMIT");
    const rows = db
        .prepare(`SELECT e.* FROM edges e
       WHERE e.source_qualified IN (SELECT qn FROM _qn_filter)
         AND e.target_qualified IN (SELECT qn FROM _qn_filter)`)
        .all();
    db.exec("DELETE FROM _qn_filter");
    return rows.map(rowToEdge);
}
// ── Entity queries ────────────────────────────────────────────────
export function getAllEntities(db) {
    return db
        .prepare(`SELECT e.name, e.display_name, e.source,
              COUNT(em.node_qualified_name) as member_count
       FROM entities e
       LEFT JOIN entity_members em ON em.entity_name = e.name
       GROUP BY e.name
       ORDER BY member_count DESC`)
        .all();
}
export function getEntityMembers(db, entityName, minConfidence = 0.5) {
    const rows = db
        .prepare(`SELECT n.*, em.role, em.confidence
       FROM entity_members em
       JOIN nodes n ON n.qualified_name = em.node_qualified_name
       WHERE em.entity_name = ? AND em.confidence >= ?
       ORDER BY em.role, n.file_path`)
        .all(entityName, minConfidence);
    return rows.map((r) => ({
        node: rowToNode(r),
        role: r.role,
        confidence: r.confidence,
    }));
}
export function getEntitiesForNode(db, qualifiedName) {
    return db
        .prepare(`SELECT entity_name, role, confidence
       FROM entity_members
       WHERE node_qualified_name = ?`)
        .all(qualifiedName);
}
export function getEntityRoleCounts(db, entityName) {
    const rows = db
        .prepare(`SELECT role, COUNT(*) as c FROM entity_members
       WHERE entity_name = ? GROUP BY role`)
        .all(entityName);
    const result = {};
    for (const r of rows)
        result[r.role] = r.c;
    return result;
}
// ── Stats ─────────────────────────────────────────────────────────
export function getStats(db, getMetadata) {
    const totalNodes = db.prepare("SELECT COUNT(*) as c FROM nodes").get().c;
    const totalEdges = db.prepare("SELECT COUNT(*) as c FROM edges").get().c;
    const nodesByKind = {};
    const nkRows = db
        .prepare("SELECT kind, COUNT(*) as c FROM nodes GROUP BY kind")
        .all();
    for (const r of nkRows)
        nodesByKind[r.kind] = r.c;
    const edgesByKind = {};
    const ekRows = db
        .prepare("SELECT kind, COUNT(*) as c FROM edges GROUP BY kind")
        .all();
    for (const r of ekRows)
        edgesByKind[r.kind] = r.c;
    const langRows = db
        .prepare("SELECT DISTINCT language FROM nodes WHERE language IS NOT NULL AND language != ''")
        .all();
    const languages = langRows.map((r) => r.language);
    const filesCount = db
        .prepare("SELECT COUNT(DISTINCT file_path) as c FROM nodes")
        .get().c;
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
//# sourceMappingURL=store-queries.js.map
/**
 * Serialization helpers for graph nodes and edges.
 *
 * Converts between SQLite rows, typed GraphNode/GraphEdge objects,
 * and JSON-safe dictionaries for MCP tool responses.
 */
// ── Qualified name ─────────────────────────────────────────────────
export function makeQualifiedName(node) {
    if (node.kind === "File")
        return node.file_path;
    if (node.parent_name)
        return `${node.file_path}::${node.parent_name}.${node.name}`;
    return `${node.file_path}::${node.name}`;
}
// ── Row → typed object ─────────────────────────────────────────────
export function rowToNode(row) {
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
        is_test: row.is_test === 1,
        file_hash: row.file_hash ?? null,
        extra: JSON.parse(row.extra ?? "{}"),
        updated_at: row.updated_at,
    };
}
export function rowToEdge(row) {
    return {
        id: row.id,
        kind: row.kind,
        source_qualified: row.source_qualified,
        target_qualified: row.target_qualified,
        file_path: row.file_path,
        line: row.line,
        extra: JSON.parse(row.extra ?? "{}"),
        updated_at: row.updated_at,
    };
}
// ── Typed object → JSON dict ───────────────────────────────────────
export function nodeToDict(n) {
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
        is_test: n.is_test,
    };
}
export function edgeToDict(e) {
    return {
        kind: e.kind,
        source: e.source_qualified,
        target: e.target_qualified,
        file_path: e.file_path,
        line: e.line,
    };
}
//# sourceMappingURL=serialization.js.map
/**
 * Serialization helpers for graph nodes and edges.
 *
 * Converts between SQLite rows, typed GraphNode/GraphEdge objects,
 * and JSON-safe dictionaries for MCP tool responses.
 */

import type { GraphEdge, GraphNode, NodeInfo } from "./types.js";

// ── Qualified name ─────────────────────────────────────────────────

export function makeQualifiedName(node: NodeInfo): string {
  if (node.kind === "File") return node.file_path;
  if (node.parent_name) return `${node.file_path}::${node.parent_name}.${node.name}`;
  return `${node.file_path}::${node.name}`;
}

// ── Row → typed object ─────────────────────────────────────────────

export function rowToNode(row: Record<string, unknown>): GraphNode {
  return {
    id: row.id as number,
    kind: row.kind as GraphNode["kind"],
    name: row.name as string,
    qualified_name: row.qualified_name as string,
    file_path: row.file_path as string,
    line_start: row.line_start as number,
    line_end: row.line_end as number,
    language: (row.language as string) ?? "",
    parent_name: (row.parent_name as string) ?? null,
    params: (row.params as string) ?? null,
    return_type: (row.return_type as string) ?? null,
    modifiers: (row.modifiers as string) ?? null,
    is_test: (row.is_test as number) === 1,
    file_hash: (row.file_hash as string) ?? null,
    extra: JSON.parse((row.extra as string) ?? "{}") as Record<string, unknown>,
    updated_at: row.updated_at as number,
  };
}

export function rowToEdge(row: Record<string, unknown>): GraphEdge {
  return {
    id: row.id as number,
    kind: row.kind as GraphEdge["kind"],
    source_qualified: row.source_qualified as string,
    target_qualified: row.target_qualified as string,
    file_path: row.file_path as string,
    line: row.line as number,
    extra: JSON.parse((row.extra as string) ?? "{}") as Record<string, unknown>,
    updated_at: row.updated_at as number,
  };
}

// ── Typed object → JSON dict ───────────────────────────────────────

export function nodeToDict(n: GraphNode): Record<string, unknown> {
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

export function edgeToDict(e: GraphEdge): Record<string, unknown> {
  return {
    kind: e.kind,
    source: e.source_qualified,
    target: e.target_qualified,
    file_path: e.file_path,
    line: e.line,
  };
}

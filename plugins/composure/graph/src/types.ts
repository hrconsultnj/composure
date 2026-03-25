/**
 * Shared type definitions for the code-review-graph.
 *
 * NodeInfo/EdgeInfo are parser outputs (pre-DB).
 * GraphNode/GraphEdge are DB records (with id, qualified_name, timestamps).
 */

// ── Node & Edge kinds ──────────────────────────────────────────────

export type NodeKind = "File" | "Class" | "Function" | "Type" | "Test";

export type EdgeKind =
  | "CALLS"
  | "IMPORTS_FROM"
  | "INHERITS"
  | "IMPLEMENTS"
  | "CONTAINS"
  | "TESTED_BY"
  | "DEPENDS_ON";

// ── Parser output types ────────────────────────────────────────────

export interface NodeInfo {
  kind: NodeKind;
  name: string;
  file_path: string;
  line_start: number;
  line_end: number;
  language?: string;
  parent_name?: string;
  params?: string;
  return_type?: string;
  modifiers?: string;
  is_test: boolean;
  extra?: Record<string, unknown>;
}

export interface EdgeInfo {
  kind: EdgeKind;
  source: string;
  target: string;
  file_path: string;
  line: number;
  extra?: Record<string, unknown>;
}

// ── Database record types ──────────────────────────────────────────

export interface GraphNode {
  id: number;
  kind: NodeKind;
  name: string;
  qualified_name: string;
  file_path: string;
  line_start: number;
  line_end: number;
  language: string;
  parent_name: string | null;
  params: string | null;
  return_type: string | null;
  modifiers: string | null;
  is_test: boolean;
  file_hash: string | null;
  extra: Record<string, unknown>;
  updated_at: number;
}

export interface GraphEdge {
  id: number;
  kind: EdgeKind;
  source_qualified: string;
  target_qualified: string;
  file_path: string;
  line: number;
  extra: Record<string, unknown>;
  updated_at: number;
}

// ── Aggregate types ────────────────────────────────────────────────

export interface GraphStats {
  total_nodes: number;
  total_edges: number;
  nodes_by_kind: Record<string, number>;
  edges_by_kind: Record<string, number>;
  languages: string[];
  files_count: number;
  last_updated: string | null;
}

export interface BuildResult {
  build_type: "full" | "incremental";
  files_parsed: number;
  total_nodes: number;
  total_edges: number;
  errors: string[];
  changed_files?: string[];
  dependent_files?: string[];
}

export interface ImpactResult {
  changed_nodes: GraphNode[];
  impacted_nodes: GraphNode[];
  impacted_files: string[];
  edges: GraphEdge[];
  truncated: boolean;
  total_impacted: number;
}

export type ToolResult = {
  status: "ok" | "error" | "ambiguous" | "not_found";
  [key: string]: unknown;
};

/**
 * Shared type definitions for the code-review-graph.
 *
 * NodeInfo/EdgeInfo are parser outputs (pre-DB).
 * GraphNode/GraphEdge are DB records (with id, qualified_name, timestamps).
 */
export type NodeKind = "File" | "Class" | "Function" | "Type" | "Test" | "Table" | "Column" | "RLSPolicy" | "Index" | "DbFunction" | "Migration" | "Package" | "Workspace" | "Script" | "Resource" | "Module" | "Stage";
export type EdgeKind = "CALLS" | "IMPORTS_FROM" | "INHERITS" | "IMPLEMENTS" | "CONTAINS" | "TESTED_BY" | "DEPENDS_ON" | "REFERENCES" | "SECURES" | "INDEXES";
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
    summary?: string;
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
    summary: string | null;
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
    entities_detected?: number;
    entity_members?: number;
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
export type EntitySource = "migration" | "route" | "directory" | "hook" | "type" | "manual" | "sql";
export type EntityRole = "page" | "component" | "hook" | "type" | "api" | "migration" | "test" | "lib" | "table" | "policy" | "index" | "db-function";
export interface EntityInfo {
    name: string;
    display_name: string;
    source: EntitySource;
}
export interface EntityMember {
    entity_name: string;
    node_qualified_name: string;
    role: EntityRole;
    confidence: number;
}
export type FindingCategory = "code-quality" | "security" | "testing" | "deployment";
export type FindingSeverity = "critical" | "high" | "moderate" | "low" | "info";
export interface AuditFindingInfo {
    audit_run_id: string;
    category: FindingCategory;
    finding_type: string;
    severity: FindingSeverity;
    node_qualified_name?: string;
    file_path?: string;
    title: string;
    detail?: Record<string, unknown>;
    score_impact: number;
}
export interface AuditFinding extends AuditFindingInfo {
    id: number;
    created_at: number;
}
export interface TestCoverageInfo {
    audit_run_id: string;
    node_qualified_name: string;
    file_path: string;
    has_test_edge: boolean;
    coverage_pct: number | null;
    test_count: number;
}
export interface TestCoverage extends TestCoverageInfo {
    id: number;
    created_at: number;
}
export interface AuditScoreInfo {
    audit_run_id: string;
    category: FindingCategory;
    raw_score: number;
    weight: number;
    adjusted_weight: number;
    grade: string;
    grade_color: string;
    finding_count: number;
}
export interface AuditScore extends AuditScoreInfo {
    id: number;
    created_at: number;
}
export interface AuditSummary {
    run_id: string;
    overall_score: number;
    overall_grade: string;
    overall_color: string;
    categories: AuditScore[];
    finding_counts: Record<string, Record<string, number>>;
}
export type RecommendedAction = "split" | "split-on-next-touch" | "monitor" | "ignore";
export interface Recommendation {
    action: RecommendedAction;
    reason: string;
    severity: FindingSeverity;
    impact: number;
}
export interface DbRow {
    [key: string]: unknown;
}
export interface VulnEntry {
    severity?: unknown;
    via?: unknown;
    fixAvailable?: unknown;
}

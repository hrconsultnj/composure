/**
 * Core domain types for Composure Cortex.
 *
 * These are DOMAIN types, not DB-generated types. The Supabase adapter
 * maps between these and the auto-generated database.types.ts.
 * Per Pro pattern 09-type-generation-pipeline.md: never hand-write
 * types that match DB tables — but these are the shared interface
 * that multiple adapters implement.
 */
export type ToolResult = {
    status: "ok" | "error" | "not_found";
    [key: string]: unknown;
};
export type ThinkingSessionStatus = "active" | "completed" | "archived" | "suspended";
export type ThoughtType = "analysis" | "revision" | "hypothesis" | "verification" | "conclusion" | "branch";
export interface ThinkingSession {
    id: string;
    id_prefix: string;
    agent_id: string;
    title: string | null;
    status: ThinkingSessionStatus;
    total_thoughts: number;
    conclusion: string | null;
    metadata: Record<string, unknown>;
    created_at: string;
    updated_at: string;
}
export interface ThinkingStep {
    id: string;
    session_id: string;
    thought_number: number;
    thought: string;
    thought_type: ThoughtType;
    is_revision: boolean;
    revises_thought: number | null;
    branch_id: string | null;
    branch_from_thought: number | null;
    needs_more_thoughts: boolean;
    metadata: Record<string, unknown>;
    created_at: string;
}
export interface ThinkingParams {
    thought: string;
    session_id?: string;
    agent_id?: string;
    title?: string;
    thought_type?: ThoughtType;
    is_revision?: boolean;
    revises_thought?: number;
    branch_id?: string;
    branch_from_thought?: number;
    total_thoughts?: number;
}
export interface SessionSummary {
    session_id: string;
    title: string | null;
    status: ThinkingSessionStatus;
    total_thoughts: number;
    branches: string[];
    revision_count: number;
    conclusion: string | null;
    created_at: string;
}
export type MemoryContentType = "text" | "markdown" | "document" | "conversation" | "fact";
export type RelationshipType = "related_to" | "follows" | "contradicts" | "supports" | "contains" | "derived_from";
export interface MemoryNode {
    id: string;
    id_prefix: string;
    agent_id: string;
    content: string;
    content_type: MemoryContentType;
    metadata: Record<string, unknown>;
    time_range_start: string | null;
    time_range_end: string | null;
    chunk_index: number;
    parent_node_id: string | null;
    status: string;
    created_at: string;
    updated_at: string;
}
export interface MemoryEdge {
    id: string;
    agent_id: string;
    from_node_id: string;
    to_node_id: string;
    relationship_type: RelationshipType;
    weight: number;
    metadata: Record<string, unknown>;
    created_at: string;
}
export interface MemorySearchParams {
    agent_id: string;
    query?: string;
    tags?: string[];
    category?: string;
    time_start?: string;
    time_end?: string;
    include_related?: boolean;
    limit?: number;
}
export interface SemanticSearchParams extends MemorySearchParams {
    query_embedding: number[];
    query_text?: string;
}
export interface MemorySearchResult {
    id: string;
    content: string;
    metadata: Record<string, unknown>;
    time_range_start: string | null;
    time_range_end: string | null;
    relevance_score: number;
    related_nodes: Array<{
        id: string;
        content: string;
        relationship: string;
    }>;
}
export interface SemanticSearchResult extends MemorySearchResult {
    similarity: number;
    text_score: number;
    combined_score: number;
}
export interface CreateNodeParams {
    agent_id: string;
    content: string;
    content_type?: MemoryContentType;
    metadata?: Record<string, unknown>;
    time_range_start?: string;
    time_range_end?: string;
    parent_node_id?: string;
}
export interface UpdateNodeParams {
    content?: string;
    content_type?: MemoryContentType;
    metadata?: Record<string, unknown>;
    time_range_start?: string;
    time_range_end?: string;
    status?: string;
}
export interface CreateEdgeParams {
    agent_id: string;
    from_node_id: string;
    to_node_id: string;
    relationship_type: RelationshipType;
    weight?: number;
    metadata?: Record<string, unknown>;
}

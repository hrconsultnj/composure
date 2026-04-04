/**
 * Supabase storage adapter — Pro tier persistence.
 *
 * Uses @supabase/supabase-js to interact with the existing
 * ai_memory_nodes, ai_memory_edges tables and the new
 * ai_thinking_sessions, ai_thinking_steps tables.
 *
 * Search methods call the existing search_agent_memory() and
 * search_agent_memory_semantic() RPCs — we NEVER reimplement
 * the search logic.
 */
import type { StorageAdapter, SupabaseAdapterConfig } from "./types.js";
import type { ThinkingSession, ThinkingStep, ThinkingSessionStatus, MemoryNode, MemoryEdge, MemorySearchParams, SemanticSearchParams, MemorySearchResult, SemanticSearchResult, CreateNodeParams, UpdateNodeParams, CreateEdgeParams } from "../core/types.js";
export declare class SupabaseAdapter implements StorageAdapter {
    readonly type: "supabase";
    private client;
    constructor(config: SupabaseAdapterConfig);
    createSession(agent_id: string, title?: string): Promise<ThinkingSession>;
    getSession(session_id: string): Promise<{
        session: ThinkingSession;
        steps: ThinkingStep[];
    } | null>;
    listSessions(agent_id: string, status?: ThinkingSessionStatus): Promise<ThinkingSession[]>;
    updateSession(session_id: string, updates: Partial<Pick<ThinkingSession, "title" | "status" | "total_thoughts" | "conclusion">>): Promise<ThinkingSession | null>;
    addStep(session_id: string, step: Omit<ThinkingStep, "id" | "session_id" | "created_at">): Promise<ThinkingStep>;
    getSteps(session_id: string, branch_id?: string): Promise<ThinkingStep[]>;
    createNode(params: CreateNodeParams): Promise<MemoryNode>;
    getNode(node_id: string): Promise<MemoryNode | null>;
    updateNode(node_id: string, params: UpdateNodeParams): Promise<MemoryNode | null>;
    deleteNode(node_id: string): Promise<boolean>;
    createEdge(params: CreateEdgeParams): Promise<MemoryEdge>;
    getEdgesForNode(node_id: string): Promise<MemoryEdge[]>;
    deleteEdge(edge_id: string): Promise<boolean>;
    searchMemory(params: MemorySearchParams): Promise<MemorySearchResult[]>;
    searchSemantic(params: SemanticSearchParams): Promise<SemanticSearchResult[]>;
    traverseGraph(start_node_id: string, depth: number, relationship_types?: string[]): Promise<{
        nodes: MemoryNode[];
        edges: MemoryEdge[];
    }>;
    close(): void;
}

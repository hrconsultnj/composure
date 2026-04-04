/**
 * SQLite storage adapter — Free tier local persistence.
 *
 * Uses Node.js built-in SQLite (>= 22.5) for local storage.
 * Mirrors the Supabase schema structure but without vector search
 * or tsvector — uses simple LIKE matching instead.
 *
 * Stores at .composure/cortex.db in the project root.
 */
import type { StorageAdapter } from "./types.js";
import type { ThinkingSession, ThinkingStep, ThinkingSessionStatus, MemoryNode, MemoryEdge, MemorySearchParams, SemanticSearchParams, MemorySearchResult, SemanticSearchResult, CreateNodeParams, UpdateNodeParams, CreateEdgeParams } from "../core/types.js";
export declare class SqliteAdapter implements StorageAdapter {
    readonly type: "sqlite";
    private db;
    constructor(dbPath?: string);
    private initSchema;
    private parseJson;
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
    searchSemantic(_params: SemanticSearchParams): Promise<SemanticSearchResult[]>;
    traverseGraph(start_node_id: string, depth: number, relationship_types?: string[]): Promise<{
        nodes: MemoryNode[];
        edges: MemoryEdge[];
    }>;
    close(): void;
}

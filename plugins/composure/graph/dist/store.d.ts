/**
 * SQLite-backed knowledge graph storage and query engine.
 *
 * Uses Node.js built-in node:sqlite (DatabaseSync) — zero native dependencies.
 * Write operations (CRUD) live here. Query operations are in store-queries.ts.
 * Serialization helpers (row converters) live in serialization.ts.
 */
import { DatabaseSync } from "node:sqlite";
import type { EdgeInfo, GraphEdge, GraphNode, GraphStats, NodeInfo } from "./types.js";
export { nodeToDict, edgeToDict } from "./serialization.js";
export declare class GraphStore {
    private db;
    constructor(dbPath: string);
    /** Expose the raw database for audit-store and other modules. */
    getDb(): DatabaseSync;
    close(): void;
    commit(): void;
    createMemoryLink(params: {
        node_qualified_name: string;
        cortex_memory_node_id?: string;
        cortex_session_id?: string;
        link_type?: string;
        agent_id: string;
        content_preview?: string;
    }): number;
    getMemoryLinksForNode(node_qualified_name: string): Array<{
        id: number;
        node_qualified_name: string;
        cortex_memory_node_id: string | null;
        cortex_session_id: string | null;
        link_type: string;
        agent_id: string;
        content_preview: string | null;
        created_at: number;
    }>;
    getMemoryLinksForFile(file_path: string): Array<{
        id: number;
        node_qualified_name: string;
        cortex_memory_node_id: string | null;
        cortex_session_id: string | null;
        link_type: string;
        agent_id: string;
        content_preview: string | null;
        created_at: number;
    }>;
    setMetadata(key: string, value: string): void;
    getMetadata(key: string): string | null;
    upsertNode(node: NodeInfo, fileHash?: string): number;
    upsertEdge(edge: EdgeInfo): number;
    removeFileData(filePath: string): void;
    storeFileNodesEdges(filePath: string, nodes: NodeInfo[], edges: EdgeInfo[], fileHash?: string): void;
    upsertEntity(name: string, displayName: string, source: string): void;
    upsertEntityMember(entityName: string, nodeQualifiedName: string, role: string, confidence: number): void;
    removeEntityData(): void;
    getNode(qualifiedName: string): GraphNode | null;
    getNodesByFile(filePath: string): GraphNode[];
    getAllFiles(): string[];
    searchNodes(query: string, limit?: number): GraphNode[];
    getNodesBySize(minLines: number, maxLines?: number, kind?: string, filePathPattern?: string, limit?: number): GraphNode[];
    getEdgesBySource(qualifiedName: string): GraphEdge[];
    getEdgesByTarget(qualifiedName: string): GraphEdge[];
    searchEdgesByTargetName(name: string, kind?: string): GraphEdge[];
    getAllEdges(): GraphEdge[];
    getEdgesAmong(qualifiedNames: Set<string>): GraphEdge[];
    getAllEntities(): {
        name: string;
        display_name: string;
        source: string;
        member_count: number;
    }[];
    getEntityMembers(entityName: string, minConfidence?: number): {
        node: GraphNode;
        role: string;
        confidence: number;
    }[];
    getEntitiesForNode(qualifiedName: string): {
        entity_name: string;
        role: string;
        confidence: number;
    }[];
    getEntityRoleCounts(entityName: string): Record<string, number>;
    getStats(): GraphStats;
}

/**
 * SQLite-backed knowledge graph storage and query engine.
 *
 * Uses Node.js built-in node:sqlite (DatabaseSync) — zero native dependencies.
 * Serialization helpers (row converters, dict formatters) live in serialization.ts.
 */
import type { EdgeInfo, GraphEdge, GraphNode, GraphStats, NodeInfo } from "./types.js";
export { nodeToDict, edgeToDict } from "./serialization.js";
export declare class GraphStore {
    private db;
    constructor(dbPath: string);
    close(): void;
    commit(): void;
    setMetadata(key: string, value: string): void;
    getMetadata(key: string): string | null;
    upsertNode(node: NodeInfo, fileHash?: string): number;
    upsertEdge(edge: EdgeInfo): number;
    removeFileData(filePath: string): void;
    storeFileNodesEdges(filePath: string, nodes: NodeInfo[], edges: EdgeInfo[], fileHash?: string): void;
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
    getStats(): GraphStats;
}

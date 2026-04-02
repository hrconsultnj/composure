/**
 * Read-only query functions for the knowledge graph SQLite store.
 *
 * Extracted from store.ts to separate reads from writes.
 * All functions take a DatabaseSync instance as their first argument.
 */
import type { DatabaseSync } from "node:sqlite";
import type { GraphEdge, GraphNode, GraphStats } from "./types.js";
export declare function getNode(db: DatabaseSync, qualifiedName: string): GraphNode | null;
export declare function getNodesByFile(db: DatabaseSync, filePath: string): GraphNode[];
export declare function getAllFiles(db: DatabaseSync): string[];
export declare function searchNodes(db: DatabaseSync, query: string, limit?: number): GraphNode[];
export declare function getNodesBySize(db: DatabaseSync, minLines: number, maxLines?: number, kind?: string, filePathPattern?: string, limit?: number): GraphNode[];
export declare function getEdgesBySource(db: DatabaseSync, qualifiedName: string): GraphEdge[];
export declare function getEdgesByTarget(db: DatabaseSync, qualifiedName: string): GraphEdge[];
export declare function searchEdgesByTargetName(db: DatabaseSync, name: string, kind?: string): GraphEdge[];
export declare function getAllEdges(db: DatabaseSync): GraphEdge[];
export declare function getEdgesAmong(db: DatabaseSync, qualifiedNames: Set<string>): GraphEdge[];
export declare function getAllEntities(db: DatabaseSync): Array<{
    name: string;
    display_name: string;
    source: string;
    member_count: number;
}>;
export declare function getEntityMembers(db: DatabaseSync, entityName: string, minConfidence?: number): Array<{
    node: GraphNode;
    role: string;
    confidence: number;
}>;
export declare function getEntitiesForNode(db: DatabaseSync, qualifiedName: string): Array<{
    entity_name: string;
    role: string;
    confidence: number;
}>;
export declare function getEntityRoleCounts(db: DatabaseSync, entityName: string): Record<string, number>;
export declare function getStats(db: DatabaseSync, getMetadata: (key: string) => string | null): GraphStats;

/**
 * Serialization helpers for graph nodes and edges.
 *
 * Converts between SQLite rows, typed GraphNode/GraphEdge objects,
 * and JSON-safe dictionaries for MCP tool responses.
 */
import type { GraphEdge, GraphNode, NodeInfo } from "./types.js";
export declare function makeQualifiedName(node: NodeInfo): string;
export declare function rowToNode(row: Record<string, unknown>): GraphNode;
export declare function rowToEdge(row: Record<string, unknown>): GraphEdge;
export declare function nodeToDict(n: GraphNode): Record<string, unknown>;
export declare function edgeToDict(e: GraphEdge): Record<string, unknown>;

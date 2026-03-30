/**
 * Regex-based SQL parser for migration files.
 *
 * Extracts structural information from SQL files without tree-sitter:
 * tables, columns, RLS policies, indexes, foreign keys, and functions.
 * Returns NodeInfo/EdgeInfo in the same format as CodeParser.
 *
 * Supports: Supabase migrations, plain PostgreSQL, Prisma schema files,
 * and Drizzle schema (detected by extension/content).
 */
import type { EdgeInfo, NodeInfo } from "./types.js";
export declare function isSqlParseable(filePath: string): boolean;
export declare function parseSqlFile(filePath: string): {
    nodes: NodeInfo[];
    edges: EdgeInfo[];
};

/**
 * entity_scope MCP tool — query domain entities in the code graph.
 *
 * Without arguments: lists all discovered entities with member counts.
 * With entity name: returns all members grouped by role + shared entities.
 */
import type { ToolResult } from "../types.js";
export declare function entityScope(params: {
    entity?: string;
    min_confidence?: number;
    repo_root?: string;
}): ToolResult;

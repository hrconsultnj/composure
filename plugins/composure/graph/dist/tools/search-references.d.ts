/**
 * search_references — grep + graph context enrichment.
 *
 * Searches for a string pattern across the repo (via ripgrep or fallback),
 * then enriches each match with graph context: containing node, entity
 * membership, importer count, and file role classification.
 */
import type { ToolResult } from "../types.js";
export declare function searchReferences(params: {
    pattern: string;
    scope?: string;
    context_lines?: number;
    max_results?: number;
    repo_root?: string;
}): ToolResult;

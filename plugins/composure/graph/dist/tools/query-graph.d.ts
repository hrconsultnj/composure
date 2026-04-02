import type { ToolResult } from "../types.js";
export declare function queryGraph(params: {
    pattern: string;
    target: string;
    target_to?: string;
    scope?: string;
    context_lines?: number;
    max_results?: number;
    repo_root?: string;
}): ToolResult;

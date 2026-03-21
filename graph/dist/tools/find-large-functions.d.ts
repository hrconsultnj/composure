import type { ToolResult } from "../types.js";
export declare function findLargeFunctions(params: {
    min_lines?: number;
    file_pattern?: string;
    kind?: string;
    repo_root?: string;
}): ToolResult;

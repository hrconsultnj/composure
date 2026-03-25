import type { ToolResult } from "../types.js";
export declare function getReviewContext(params: {
    changed_files?: string[];
    max_depth?: number;
    include_source?: boolean;
    max_lines_per_file?: number;
    repo_root?: string;
    base?: string;
}): ToolResult;

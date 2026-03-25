import type { ToolResult } from "../types.js";
export declare function getImpactRadiusTool(params: {
    changed_files?: string[];
    max_depth?: number;
    repo_root?: string;
    base?: string;
}): ToolResult;

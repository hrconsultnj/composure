import type { ToolResult } from "../types.js";
export declare function buildOrUpdateGraph(params: {
    full_rebuild?: boolean;
    repo_root?: string;
    base?: string;
}): Promise<ToolResult>;

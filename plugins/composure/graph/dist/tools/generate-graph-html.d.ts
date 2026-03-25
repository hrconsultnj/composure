/**
 * MCP tool: generate_graph_html
 *
 * Reads the SQLite graph database and generates a self-contained HTML
 * visualization of the codebase. Shows file-level nodes grouped by
 * auto-detected category with import edges, search, zoom, and detail panel.
 */
import type { ToolResult } from "../types.js";
export declare function generateGraphHtmlTool(params: {
    output_path?: string;
    repo_root?: string;
}): ToolResult;

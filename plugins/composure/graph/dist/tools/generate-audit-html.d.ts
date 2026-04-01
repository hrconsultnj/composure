/**
 * MCP tool: generate_audit_html
 *
 * Reads stored audit findings and scores from graph.db, fills the
 * HTML templates from skills/report/templates/, and writes
 * a self-contained report. Zero tokens — pure template assembly.
 */
import type { ToolResult } from "../types.js";
export declare function generateAuditHtml(params: {
    audit_run_id?: string;
    output_path?: string;
    repo_root?: string;
}): ToolResult;

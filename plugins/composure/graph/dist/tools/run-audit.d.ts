/**
 * MCP tool: run_audit
 *
 * Zero-token audit engine. Computes code quality findings from existing
 * graph data (SQL queries, no file I/O), optionally runs security CLI
 * tools, and stores all results in audit_findings + test_coverage +
 * audit_scores tables.
 */
import type { ToolResult } from "../types.js";
export declare function runAudit(params: {
    include_security?: boolean;
    include_testing?: boolean;
    include_deployment?: boolean;
    url?: string;
    repo_root?: string;
}): Promise<ToolResult>;

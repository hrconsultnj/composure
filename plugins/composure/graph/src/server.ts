#!/usr/bin/env node
/**
 * MCP server for the Composure code-review-graph.
 *
 * Registers 11 tools for building, querying, reviewing, auditing, and
 * visualizing the code knowledge graph. Uses stdio transport.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import { buildOrUpdateGraph } from "./tools/build-or-update-graph.js";
import { queryGraph } from "./tools/query-graph.js";
import { getReviewContext } from "./tools/get-review-context.js";
import { getImpactRadiusTool } from "./tools/get-impact-radius.js";
import { findLargeFunctions } from "./tools/find-large-functions.js";
import { semanticSearchNodes } from "./tools/semantic-search-nodes.js";
import { listGraphStats } from "./tools/list-graph-stats.js";
import { generateGraphHtmlTool } from "./tools/generate-graph-html.js";
import { entityScope } from "./tools/entity-scope.js";
import { runAudit } from "./tools/run-audit.js";
import { generateAuditHtml } from "./tools/generate-audit-html.js";

const server = new McpServer({
  name: "composure-graph",
  version: "1.0.0",
});

// ── Tool 1: build_or_update_graph ──────────────────────────────────

server.tool(
  "build_or_update_graph",
  "Build or incrementally update the code knowledge graph. Call this first to initialize the graph, or after making changes. By default performs an incremental update (only changed files). Set full_rebuild=true to re-parse every file.",
  {
    full_rebuild: z
      .boolean()
      .default(false)
      .describe("If true, re-parse all files. Default: false (incremental)."),
    repo_root: z
      .string()
      .optional()
      .describe("Repository root path. Auto-detected if omitted."),
    base: z
      .string()
      .default("HEAD~1")
      .describe("Git ref to diff against for incremental updates."),
  },
  async (params) => {
    const result = await buildOrUpdateGraph(params);
    return {
      content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
    };
  },
);

// ── Tool 2: query_graph ────────────────────────────────────────────

server.tool(
  "query_graph",
  `Run a predefined graph query to explore code relationships.

Available patterns:
- callers_of: Find functions that call the target
- callees_of: Find functions called by the target
- imports_of: Find what the target imports
- importers_of: Find files that import the target
- children_of: Find nodes contained in a file or class
- tests_for: Find tests for the target
- inheritors_of: Find classes that inherit from the target
- file_summary: Get all nodes in a file`,
  {
    pattern: z
      .enum([
        "callers_of",
        "callees_of",
        "imports_of",
        "importers_of",
        "children_of",
        "tests_for",
        "inheritors_of",
        "file_summary",
      ])
      .describe("Query pattern name."),
    target: z
      .string()
      .describe("Node name, qualified name, or file path to query."),
    repo_root: z
      .string()
      .optional()
      .describe("Repository root path. Auto-detected if omitted."),
  },
  async (params) => {
    const result = queryGraph(params);
    return {
      content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
    };
  },
);

// ── Tool 3: get_review_context ─────────────────────────────────────

server.tool(
  "get_review_context",
  "Generate a focused, token-efficient review context for code changes. Combines impact analysis with source snippets and review guidance. Use this for comprehensive code reviews.",
  {
    changed_files: z
      .array(z.string())
      .optional()
      .describe(
        "Files to review (relative to repo root). Auto-detected from git diff if omitted.",
      ),
    max_depth: z
      .number()
      .int()
      .default(2)
      .describe("Impact radius depth (number of hops)."),
    include_source: z
      .boolean()
      .default(true)
      .describe("Include source code snippets for changed files."),
    max_lines_per_file: z
      .number()
      .int()
      .default(200)
      .describe("Max source lines per file in snippets."),
    repo_root: z
      .string()
      .optional()
      .describe("Repository root path. Auto-detected if omitted."),
    base: z
      .string()
      .default("HEAD~1")
      .describe("Git ref for change detection."),
  },
  async (params) => {
    const result = getReviewContext(params);
    return {
      content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
    };
  },
);

// ── Tool 4: get_impact_radius ──────────────────────────────────────

server.tool(
  "get_impact_radius",
  "Analyze the blast radius of changed files in the codebase. Shows which functions, classes, and files are impacted by changes. Auto-detects changed files from git if not specified.",
  {
    changed_files: z
      .array(z.string())
      .optional()
      .describe(
        "List of changed file paths (relative to repo root). Auto-detected if omitted.",
      ),
    max_depth: z
      .number()
      .int()
      .default(2)
      .describe("Number of hops to traverse in the dependency graph."),
    repo_root: z
      .string()
      .optional()
      .describe("Repository root path. Auto-detected if omitted."),
    base: z
      .string()
      .default("HEAD~1")
      .describe("Git ref for auto-detecting changes."),
  },
  async (params) => {
    const result = getImpactRadiusTool(params);
    return {
      content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
    };
  },
);

// ── Tool 5: find_large_functions ───────────────────────────────────

server.tool(
  "find_large_functions",
  "Find functions and components exceeding a line count threshold. Use this to detect oversized functions that need decomposition. Returns nodes sorted by size (largest first).",
  {
    min_lines: z
      .number()
      .int()
      .default(150)
      .describe("Minimum line count threshold. Default: 150."),
    file_pattern: z
      .string()
      .optional()
      .describe(
        "Optional glob pattern to filter files (e.g. 'src/components/**').",
      ),
    kind: z
      .enum(["Function", "Class", "Test"])
      .optional()
      .describe("Optional filter by node kind."),
    repo_root: z
      .string()
      .optional()
      .describe("Repository root path. Auto-detected if omitted."),
  },
  async (params) => {
    const result = findLargeFunctions(params);
    return {
      content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
    };
  },
);

// ── Tool 6: semantic_search_nodes ──────────────────────────────────

server.tool(
  "semantic_search_nodes",
  "Search for code entities by name using keyword patterns. Matches against node names and qualified names. Use this to find functions, classes, types, or files by name.",
  {
    query: z
      .string()
      .describe(
        "Search string to match against node names. Supports multi-word AND matching.",
      ),
    kind: z
      .enum([
        "File", "Class", "Function", "Type", "Test",
        "Table", "Column", "RLSPolicy", "Index", "DbFunction", "Migration",
        "Package", "Script", "Workspace",
      ])
      .optional()
      .describe("Optional filter by node kind."),
    limit: z.number().int().default(20).describe("Maximum results to return."),
    repo_root: z
      .string()
      .optional()
      .describe("Repository root path. Auto-detected if omitted."),
  },
  async (params) => {
    const result = semanticSearchNodes(params);
    return {
      content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
    };
  },
);

// ── Tool 7: list_graph_stats ───────────────────────────────────────

server.tool(
  "list_graph_stats",
  "Get aggregate statistics about the code knowledge graph. Shows total nodes, edges, languages, files, and last update time. Useful for checking if the graph is built and up to date.",
  {
    repo_root: z
      .string()
      .optional()
      .describe("Repository root path. Auto-detected if omitted."),
  },
  async (params) => {
    const result = listGraphStats(params);
    return {
      content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
    };
  },
);

// ── Tool 8: generate_graph_html ──────────────────────────────────

server.tool(
  "generate_graph_html",
  "Generate a self-contained HTML visualization of the code knowledge graph. Shows file-level nodes grouped by auto-detected category (Pages, API, Components, Hooks, Lib, etc.) with import edges, search, zoom, and blast-radius highlighting. Output is a single .html file that works offline.",
  {
    output_path: z
      .string()
      .optional()
      .describe(
        "Output file path. Default: .code-review-graph/graph.html",
      ),
    repo_root: z
      .string()
      .optional()
      .describe("Repository root path. Auto-detected if omitted."),
  },
  async (params) => {
    const result = generateGraphHtmlTool(params);
    return {
      content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
    };
  },
);

// ── Tool 9: entity_scope ──────────────────────────────────────────

server.tool(
  "entity_scope",
  `Get all code related to a business entity (feature/domain concept).
Entities are auto-detected from migrations, routes, component directories, and hooks.

Without arguments: lists all discovered entities with member counts and role breakdowns.
With entity name: returns all pages, components, hooks, types, API routes, tests, and
utilities grouped by role, plus cross-entity overlaps.

Use this to understand the full scope of a feature before modifying it.`,
  {
    entity: z
      .string()
      .optional()
      .describe(
        "Entity name (e.g. 'contact', 'order'). Omit to list all entities.",
      ),
    min_confidence: z
      .number()
      .default(0.5)
      .describe(
        "Minimum confidence threshold for membership (0.0-1.0). Default: 0.5.",
      ),
    repo_root: z
      .string()
      .optional()
      .describe("Repository root path. Auto-detected if omitted."),
  },
  async (params) => {
    const result = entityScope(params);
    return {
      content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
    };
  },
);

// ── Tool 10: run_audit ────────────────────────────────────────────

server.tool(
  "run_audit",
  "Run a comprehensive code audit using the knowledge graph. Computes code quality findings (oversized files/functions, untested code) from SQL queries. Optionally runs security tools (npm audit). Stores all findings and scores in the graph database. Returns a summary with letter grades.",
  {
    include_security: z.boolean().default(true).describe("Run npm audit if package manager available."),
    include_testing: z.boolean().default(true).describe("Analyze test coverage from TESTED_BY edges."),
    include_deployment: z.boolean().default(false).describe("Run deployment preflight checks."),
    url: z.string().optional().describe("Deployment URL for HTTP header analysis."),
    repo_root: z.string().optional().describe("Repository root. Auto-detected if omitted."),
  },
  async (params) => {
    const result = await runAudit(params);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  },
);

// ── Tool 11: generate_audit_html ──────────────────────────────────

server.tool(
  "generate_audit_html",
  "Generate a self-contained HTML audit report from the latest audit run. Reads findings and scores from the graph database and fills the HTML templates. Zero source code exposure.",
  {
    audit_run_id: z.string().optional().describe("Audit run ID. Default: latest."),
    output_path: z.string().optional().describe("Output HTML file path."),
    repo_root: z.string().optional().describe("Repository root. Auto-detected if omitted."),
  },
  async (params) => {
    const result = generateAuditHtml(params);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  },
);

// ── Start server ───────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("composure-graph server error:", err);
  process.exit(1);
});

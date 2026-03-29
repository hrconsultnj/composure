/**
 * MCP tool: generate_graph_html
 *
 * Reads the SQLite graph database and generates a self-contained HTML
 * visualization of the codebase. Shows file-level nodes grouped by
 * auto-detected category with import edges, search, zoom, and detail panel.
 */

import { writeFileSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";
import { GraphStore } from "../store.js";
import { findProjectRoot, getDbPath } from "../incremental.js";
import {
  generateGraphHtml,
  CATEGORY_META,
  DEFAULT_CAT_ORDER,
} from "../html-template.js";
import type { VisNode, VisEntity } from "../html-template.js";
import type { ToolResult, GraphNode } from "../types.js";

// ── Category detection ────────────────────────────────────────────

interface CategoryRule {
  key: string;
  match: (relPath: string, name: string) => boolean;
}

const CATEGORY_RULES: CategoryRule[] = [
  {
    key: "tests",
    match: (p, n) =>
      /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(n) ||
      p.includes("__tests__/") ||
      p.startsWith("tests/") ||
      p.startsWith("test/"),
  },
  {
    key: "config",
    match: (p, n) =>
      /\.(config)\.(ts|js|mjs|cjs)$/.test(n) ||
      n.startsWith("tsconfig") ||
      n.startsWith("tailwind") ||
      n.startsWith(".eslint") ||
      n.startsWith(".prettier") ||
      n === "next.config.ts" ||
      n === "next.config.js" ||
      n === "next.config.mjs" ||
      n === "vite.config.ts" ||
      n === "postcss.config.js" ||
      n === "postcss.config.mjs",
  },
  {
    key: "styles",
    match: (_p, n) =>
      /\.(css|scss|sass|less)$/.test(n),
  },
  {
    key: "types",
    match: (p, n) =>
      p.startsWith("types/") ||
      p.includes("/types/") ||
      n.endsWith(".types.ts") ||
      n.endsWith(".d.ts"),
  },
  {
    key: "pages",
    match: (p, n) =>
      n === "page.tsx" ||
      n === "page.ts" ||
      n === "page.jsx" ||
      n === "page.js" ||
      p.startsWith("pages/") ||
      // Layout files are page-adjacent
      n === "layout.tsx" ||
      n === "layout.ts",
  },
  {
    key: "api",
    match: (p, n) =>
      n === "route.ts" ||
      n === "route.tsx" ||
      n === "route.js" ||
      p.startsWith("api/") ||
      p.includes("/api/"),
  },
  {
    key: "auth",
    match: (p, n) =>
      p.startsWith("auth/") ||
      p.includes("/auth/") ||
      n === "middleware.ts" ||
      n === "middleware.js" ||
      n === "proxy.ts" ||
      n === "proxy.js",
  },
  {
    key: "hooks",
    match: (p, n) =>
      p.startsWith("hooks/") ||
      p.includes("/hooks/") ||
      (/^use[A-Z]/.test(n.replace(/\.(ts|tsx|js|jsx)$/, ""))),
  },
  {
    key: "data",
    match: (p) =>
      p.startsWith("db/") ||
      p.includes("/db/") ||
      p.startsWith("supabase/") ||
      p.includes("/supabase/") ||
      p.startsWith("prisma/") ||
      p.includes("/prisma/") ||
      p.startsWith("drizzle/") ||
      p.includes("/drizzle/"),
  },
  {
    key: "components",
    match: (p) =>
      p.startsWith("components/") ||
      p.includes("/components/"),
  },
  {
    key: "lib",
    match: (p) =>
      p.startsWith("lib/") ||
      p.includes("/lib/") ||
      p.startsWith("utils/") ||
      p.includes("/utils/") ||
      p.startsWith("helpers/") ||
      p.includes("/helpers/"),
  },
  // Fallback handled separately
];

function detectCategory(relPath: string): string {
  const name = basename(relPath);
  for (const rule of CATEGORY_RULES) {
    if (rule.match(relPath, name)) return rule.key;
  }
  return "source";
}

// ── Import resolution ─────────────────────────────────────────────

/**
 * Resolve an unresolved import specifier to a known file path.
 *
 * The parser stores IMPORTS_FROM targets as raw specifiers (e.g. "./store.js",
 * "../types.js", "node:fs"). We need to resolve relative specifiers to the
 * actual source file paths in the graph. TypeScript uses .js extensions in
 * ESM imports that point to .ts source files, so we strip .js and try .ts/.tsx.
 */
function resolveImportTarget(
  specifier: string,
  sourceFile: string,
  fileSet: Set<string>,
): string | null {
  // Skip non-relative imports (node:*, packages)
  if (!specifier.startsWith(".")) return null;

  const sourceDir = dirname(sourceFile);
  const base = resolve(sourceDir, specifier);

  // Direct match
  if (fileSet.has(base)) return base;

  // Strip .js/.mjs extension and try .ts/.tsx (TypeScript ESM convention)
  const stripped = base.replace(/\.(js|mjs|jsx)$/, "");
  const extensions = [".ts", ".tsx", ".js", ".jsx"];

  for (const ext of extensions) {
    if (fileSet.has(stripped + ext)) return stripped + ext;
  }

  // Try index file (barrel imports)
  for (const ext of extensions) {
    if (fileSet.has(join(stripped, `index${ext}`))) return join(stripped, `index${ext}`);
  }

  return null;
}

// ── Data extraction ───────────────────────────────────────────────

function extractVisNodes(
  store: GraphStore,
  repoRoot: string,
): { nodes: VisNode[]; edgeCount: number } {
  const allFiles = store.getAllFiles();
  const fileSet = new Set(allFiles);

  // Gather all IMPORTS_FROM edges and resolve targets
  const allEdges = store.getAllEdges();

  // Build import map: file → Set<imported file> (resolved)
  const importMap = new Map<string, Set<string>>();
  for (const e of allEdges) {
    if (e.kind !== "IMPORTS_FROM") continue;
    if (!fileSet.has(e.source_qualified)) continue;

    // Try direct match first (target might already be an absolute path)
    let resolvedTarget: string | null = null;
    if (fileSet.has(e.target_qualified)) {
      resolvedTarget = e.target_qualified;
    } else {
      // Resolve relative import specifier
      resolvedTarget = resolveImportTarget(
        e.target_qualified,
        e.source_qualified,
        fileSet,
      );
    }

    if (!resolvedTarget || resolvedTarget === e.source_qualified) continue;

    let set = importMap.get(e.source_qualified);
    if (!set) {
      set = new Set();
      importMap.set(e.source_qualified, set);
    }
    set.add(resolvedTarget);
  }

  // Build nodes
  const nodes: VisNode[] = [];
  let totalEdgeCount = 0;

  for (const filePath of allFiles) {
    const fileNodes = store.getNodesByFile(filePath);
    const fileNode = fileNodes.find((n) => n.kind === "File");
    if (!fileNode) continue;

    const relPath = relative(repoRoot, filePath);
    const lines = fileNode.line_end - fileNode.line_start + 1;
    const functions = fileNodes.filter((n) => n.kind === "Function").length;
    const classes = fileNodes.filter((n) => n.kind === "Class").length;
    const types = fileNodes.filter((n) => n.kind === "Type").length;
    const isTest = fileNodes.some((n) => n.is_test);

    const imports = Array.from(importMap.get(filePath) ?? []);
    totalEdgeCount += imports.length;

    // Show parent dir for generic filenames (page.tsx, route.ts, index.ts, layout.tsx)
    const name = basename(filePath);
    const isGenericName = /^(page|route|index|layout|loading|error|not-found)\.(ts|tsx|js|jsx)$/.test(name);
    const parts = relPath.split("/");
    const label = isGenericName && parts.length >= 2
      ? parts[parts.length - 2] + "/" + name
      : name;

    nodes.push({
      id: filePath,
      label,
      path: relPath,
      cat: detectCategory(relPath),
      lines,
      functions,
      classes,
      types,
      isTest,
      language: fileNode.language || "ts",
      imports,
    });
  }

  return { nodes, edgeCount: totalEdgeCount };
}

// ── Tool export ───────────────────────────────────────────────────

export function generateGraphHtmlTool(params: {
  output_path?: string;
  repo_root?: string;
}): ToolResult {
  const root = findProjectRoot(params.repo_root);
  const dbPath = getDbPath(root);

  let store: GraphStore;
  try {
    store = new GraphStore(dbPath);
  } catch (err) {
    return {
      status: "error",
      error: `Cannot open graph database: ${err instanceof Error ? err.message : String(err)}. Run /build-graph first.`,
    };
  }

  try {
    const stats = store.getStats();
    if (stats.total_nodes === 0) {
      return {
        status: "error",
        error: "Graph is empty. Run /build-graph first to populate it.",
      };
    }

    // Extract visualization data
    const { nodes, edgeCount } = extractVisNodes(store, root);

    // Extract entity data
    const allEntities = store.getAllEntities();
    const entities: VisEntity[] = allEntities.map((e) => {
      const roles = store.getEntityRoleCounts(e.name);
      const members = store.getEntityMembers(e.name, 0.5);
      // Collect unique file IDs for this entity
      const memberFileIds = [...new Set(members.map((m) => m.node.file_path))];
      return {
        name: e.name,
        displayName: e.display_name,
        source: e.source,
        memberCount: e.member_count,
        roles,
        memberIds: memberFileIds,
      };
    });

    // Detect repo name from directory
    const repoName = basename(root);

    // Generate HTML
    const html = generateGraphHtml({
      nodes,
      entities,
      repoName,
      generatedAt: new Date().toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      }),
      stats: {
        totalNodes: stats.total_nodes,
        totalEdges: stats.total_edges,
        filesCount: nodes.length,
      },
    });

    // Write output
    const outputPath =
      params.output_path ?? join(root, ".code-review-graph", "graph.html");

    writeFileSync(outputPath, html, "utf-8");

    // Compute category summary
    const catCounts: Record<string, number> = {};
    for (const n of nodes) {
      catCounts[n.cat] = (catCounts[n.cat] ?? 0) + 1;
    }
    const catSummary = DEFAULT_CAT_ORDER
      .filter((c) => catCounts[c])
      .map((c) => `${CATEGORY_META[c]?.label ?? c}: ${catCounts[c]}`)
      .join(", ");

    return {
      status: "ok",
      output_path: outputPath,
      summary: `Generated graph visualization: ${nodes.length} files, ${edgeCount} connections. Categories: ${catSummary}`,
      files: nodes.length,
      connections: edgeCount,
      categories: catCounts,
    };
  } finally {
    store.close();
  }
}

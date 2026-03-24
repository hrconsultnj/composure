#!/usr/bin/env node
/**
 * Extract graph data from the SQLite DB and write to public/graph-data.json.
 * Runs as a predev/prebuild step so the Vite app has real data.
 */
import { DatabaseSync } from "node:sqlite";
import { writeFileSync, existsSync } from "node:fs";
import { basename, relative, resolve, dirname, join } from "node:path";

// PROJECT_ROOT: the user's project (where the graph DB lives)
// Falls back to two levels up from this script (works when running from plugin repo itself)
const PROJECT_ROOT = process.env.PROJECT_ROOT || resolve(import.meta.dirname, "../..");
const DB_PATH = join(PROJECT_ROOT, ".code-review-graph/graph.db");
// Output always goes to the plugin's app/public/ (next to this script)
const OUT_PATH = join(import.meta.dirname, "../public/graph-data.json");

if (!existsSync(DB_PATH)) {
  console.log("No graph DB found — run /build-graph first. Using empty data.");
  writeFileSync(OUT_PATH, JSON.stringify({
    repoName: basename(PROJECT_ROOT),
    generatedAt: new Date().toISOString().slice(0, 10),
    stats: { totalNodes: 0, totalEdges: 0, filesCount: 0 },
    nodes: [],
  }));
  process.exit(0);
}

// Category detection (mirrors graph/src/tools/generate-graph-html.ts)
// Category detection — ordered by specificity (most specific first)
const RULES = [
  // Tests (check first — test files in any directory)
  { key: "tests", match: (p, n) => /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(n) || p.includes("__tests__/") || p.startsWith("tests/") || p.startsWith("test/") },

  // Config
  { key: "config", match: (p, n) => /\.config\.(ts|js|mjs|cjs)$/.test(n) || n.startsWith("tsconfig") || n.startsWith(".eslint") || n.startsWith(".prettier") || n === "vite.config.ts" },

  // Styles
  { key: "styles", match: (_p, n) => /\.(css|scss|sass|less)$/.test(n) },

  // DB entities (before general data layer)
  { key: "migrations", match: (p) => p.includes("/migrations/") || p.includes("/migrate/") },
  { key: "rls", match: (p, n) => p.includes("/rls/") || n.includes("rls") || n.includes("policy") },
  { key: "triggers", match: (p, n) => p.includes("/triggers/") || n.includes("trigger") },
  { key: "functions_db", match: (p) => p.includes("/functions/") && (p.includes("/supabase/") || p.includes("/db/") || p.includes("/sql/")) },

  // Types
  { key: "types", match: (p, n) => p.startsWith("types/") || p.includes("/types/") || n.endsWith(".types.ts") || n.endsWith(".d.ts") },

  // UI Layer
  { key: "pages", match: (p, n) => n === "page.tsx" || n === "page.ts" || n === "layout.tsx" || n === "layout.ts" || p.startsWith("pages/") },
  { key: "api", match: (p, n) => n === "route.ts" || n === "route.tsx" || p.startsWith("api/") || p.includes("/api/") },

  // Logic Layer
  { key: "actions", match: (p) => p.includes("/actions/") || p.includes("/server-actions/") },
  { key: "schemas", match: (p, n) => p.includes("/schemas/") || p.includes("/validation/") || n.endsWith(".schema.ts") },
  { key: "queries", match: (p, n) => p.includes("/queries/") || n.includes("-queries.ts") || n.includes("-queries.tsx") },
  { key: "mutations", match: (p, n) => p.includes("/mutations/") || n.includes("-mutations.ts") || n.includes("-mutations.tsx") },
  { key: "auth", match: (p, n) => p.includes("/auth/") || n === "middleware.ts" || n === "proxy.ts" },
  { key: "hooks", match: (p, n) => p.includes("/hooks/") || /^use[A-Z]/.test(n.replace(/\.(ts|tsx|js|jsx)$/, "")) },
  { key: "providers", match: (p) => p.includes("/providers/") || p.includes("/context/") },
  { key: "services", match: (p) => p.includes("/services/") },
  { key: "modules", match: (p) => p.includes("/modules/") },
  { key: "constants", match: (p, n) => p.includes("/constants/") || n === "constants.ts" || n === "constants.tsx" },

  // Data Layer
  { key: "data", match: (p) => p.includes("/db/") || p.includes("/supabase/") || p.includes("/prisma/") || p.includes("/drizzle/") || p.includes("/database/") },

  // Components (broad — check late)
  { key: "components", match: (p) => p.includes("/components/") },

  // Lib (broadest — check last)
  { key: "lib", match: (p) => p.includes("/lib/") || p.includes("/utils/") || p.includes("/helpers/") },
];

function detectCategory(relPath) {
  const name = basename(relPath);
  for (const rule of RULES) {
    if (rule.match(relPath, name)) return rule.key;
  }
  return "source";
}

const db = new DatabaseSync(DB_PATH, { open: true });

// Get all file nodes
const files = db.prepare(
  "SELECT file_path, line_start, line_end, language FROM nodes WHERE kind = 'File'"
).all();

// Get function/class/type counts per file
const childCounts = db.prepare(`
  SELECT n.file_path,
    SUM(CASE WHEN n.kind = 'Function' THEN 1 ELSE 0 END) as functions,
    SUM(CASE WHEN n.kind = 'Class' THEN 1 ELSE 0 END) as classes,
    SUM(CASE WHEN n.kind = 'Type' THEN 1 ELSE 0 END) as types
  FROM nodes n
  WHERE n.kind IN ('Function', 'Class', 'Type')
  GROUP BY n.file_path
`).all();

const countMap = {};
for (const c of childCounts) {
  countMap[c.file_path] = { functions: c.functions, classes: c.classes, types: c.types };
}

// Get import edges (IMPORTS_FROM where both source and target are files)
const fileSet = new Set(files.map(f => f.file_path));
const importEdges = db.prepare(
  "SELECT source_qualified, target_qualified FROM edges WHERE kind = 'IMPORTS_FROM'"
).all();

// Build resolved import map
const importMap = {};
for (const e of importEdges) {
  // source_qualified is the importing file, target_qualified is the raw specifier
  // We need to resolve relative specifiers to actual file paths
  if (!fileSet.has(e.source_qualified)) continue;
  const specifier = e.target_qualified;

  // Skip non-relative
  if (!specifier.startsWith(".") && !specifier.startsWith("/")) {
    // Check if it's a direct file path match
    if (fileSet.has(specifier)) {
      (importMap[e.source_qualified] ??= new Set()).add(specifier);
    }
    continue;
  }

  const sourceDir = dirname(e.source_qualified);
  const base = resolve(sourceDir, specifier);

  // Try direct match, then strip .js → .ts
  let resolved = null;
  if (fileSet.has(base)) resolved = base;
  else {
    const stripped = base.replace(/\.(js|mjs|jsx)$/, "");
    for (const ext of [".ts", ".tsx", ".js", ".jsx"]) {
      if (fileSet.has(stripped + ext)) { resolved = stripped + ext; break; }
    }
    if (!resolved) {
      for (const ext of [".ts", ".tsx", ".js", ".jsx"]) {
        if (fileSet.has(join(stripped, `index${ext}`))) { resolved = join(stripped, `index${ext}`); break; }
      }
    }
  }

  if (resolved) {
    (importMap[e.source_qualified] ??= new Set()).add(resolved);
  }
}

// Get all entities (functions, types, classes) with their parent files
const entityRows = db.prepare(
  "SELECT name, kind, file_path, line_start, line_end FROM nodes WHERE kind IN ('Function', 'Type', 'Class') ORDER BY file_path, line_start"
).all();

// Group entities by file using a Map<string, entity[]>
/** @type {Map<string, Array<{name: string, kind: string, lineStart: number, lineEnd: number, lines: number}>>} */
const entityGroups = new Map();
let totalEntities = 0;
for (const e of entityRows) {
  if (!entityGroups.has(e.file_path)) entityGroups.set(e.file_path, []);
  entityGroups.get(e.file_path).push({
    name: e.name,
    kind: e.kind,
    lineStart: e.line_start,
    lineEnd: e.line_end,
    lines: (e.line_end || 0) - (e.line_start || 0) + 1,
  });
  totalEntities++;
}

// Build VisNode array with entities
const nodes = files.map(f => {
  const relPath = relative(PROJECT_ROOT, f.file_path);
  const counts = countMap[f.file_path] || { functions: 0, classes: 0, types: 0 };
  const imports = [...(importMap[f.file_path] || [])];

  const fileEntities = entityGroups.get(f.file_path);
  return {
    id: f.file_path,
    label: basename(f.file_path),
    path: relPath,
    cat: detectCategory(relPath),
    lines: (f.line_end || 0) - (f.line_start || 0) + 1,
    functions: counts.functions,
    classes: counts.classes,
    types: counts.types,
    isTest: /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(basename(f.file_path)),
    language: f.language || "typescript",
    imports,
    entities: fileEntities || undefined,
  };
});

const edgeCount = nodes.reduce((sum, n) => sum + n.imports.length, 0);

// Auto-discover categories from actual data
/** @type {Map<string, number>} */
const catCounts = new Map();
for (const n of nodes) catCounts.set(n.cat, (catCounts.get(n.cat) || 0) + 1);
const categories = [...catCounts.entries()]
  .map(([key, count]) => ({ key, count }))
  .sort((a, b) => b.count - a.count);

const data = {
  repoName: basename(PROJECT_ROOT),
  generatedAt: new Date().toISOString().slice(0, 10),
  stats: {
    totalNodes: nodes.length,
    totalEdges: edgeCount,
    filesCount: nodes.length,
    entityCount: totalEntities,
  },
  categories,
  nodes,
};

writeFileSync(OUT_PATH, JSON.stringify(data, null, 2));
console.log(`Graph data: ${nodes.length} files, ${totalEntities} entities, ${edgeCount} edges, ${categories.length} categories → public/graph-data.json`);

db.close();

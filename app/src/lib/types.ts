/** A node in the graph — can be a file or an entity (function, type, class) */
export interface VisNode {
  id: string;
  label: string;
  path: string;
  cat: string;
  lines: number;
  functions: number;
  classes: number;
  types: number;
  isTest: boolean;
  language: string;
  imports: string[];
  /** Child entities (functions, types, classes) within this file */
  entities?: VisEntity[];
}

/** A code entity within a file — function, type, class */
export interface VisEntity {
  name: string;
  kind: "Function" | "Type" | "Class";
  lineStart: number;
  lineEnd: number;
  lines: number;
}

export interface GraphData {
  nodes: VisNode[];
  repoName: string;
  generatedAt: string;
  stats: {
    totalNodes: number;
    totalEdges: number;
    filesCount: number;
    entityCount: number;
  };
  /** All unique categories discovered in the data */
  categories: CategoryInfo[];
}

export interface CategoryInfo {
  key: string;
  label: string;
  color: string;
  count: number;
}

export interface TreeDir {
  name: string;
  children: Record<string, TreeDir>;
  files: VisNode[];
  stats: { count: number; lines: number };
}

export type Activity = "explorer" | "graph" | "legend";
export type View = "graph" | "tree";

/**
 * Default category colors — used as fallback when a category is discovered
 * dynamically. New categories get assigned from FALLBACK_COLORS.
 */
export const KNOWN_CATEGORIES: Record<string, { label: string; color: string }> = {
  // UI Layer
  pages:        { label: "Pages",        color: "#f37029" },
  api:          { label: "API Routes",   color: "#ef4444" },
  components:   { label: "Components",   color: "#8b5cf6" },
  styles:       { label: "Styles",       color: "#f472b6" },

  // Logic Layer
  hooks:        { label: "Hooks",        color: "#06b6d4" },
  actions:      { label: "Actions",      color: "#fb923c" },
  providers:    { label: "Providers",    color: "#a78bfa" },
  lib:          { label: "Core Lib",     color: "#22c55e" },
  services:     { label: "Services",     color: "#14b8a6" },
  modules:      { label: "Modules",      color: "#0ea5e9" },
  constants:    { label: "Constants",    color: "#78716c" },

  // Data Layer
  queries:      { label: "Queries",      color: "#818cf8" },
  mutations:    { label: "Mutations",    color: "#c084fc" },
  schemas:      { label: "Schemas",      color: "#fbbf24" },
  data:         { label: "Data Layer",   color: "#3b82f6" },
  auth:         { label: "Auth",         color: "#f59e0b" },

  // DB Entities
  migrations:   { label: "Migrations",   color: "#2dd4bf" },
  rls:          { label: "RLS Policies", color: "#34d399" },
  triggers:     { label: "Triggers",     color: "#4ade80" },
  functions_db: { label: "DB Functions", color: "#86efac" },

  // Infra
  config:       { label: "Config",       color: "#64748b" },
  types:        { label: "Types",        color: "#eab308" },
  tests:        { label: "Tests",        color: "#22d3ee" },

  // Fallback
  source:       { label: "Source",       color: "#94a3b8" },
};

/** Colors assigned to dynamically discovered categories not in KNOWN_CATEGORIES */
const DYNAMIC_COLORS = [
  "#e879f9", "#fb7185", "#38bdf8", "#a3e635", "#fdba74",
  "#67e8f9", "#d946ef", "#fca5a5", "#7dd3fc", "#bef264",
];

let _dynamicIdx = 0;

/**
 * Get category metadata — returns known info or generates it dynamically.
 * Capitalizes unknown category keys as labels and assigns rotating colors.
 */
export function getCategoryMeta(key: string): { label: string; color: string } {
  if (KNOWN_CATEGORIES[key]) return KNOWN_CATEGORIES[key];
  const color = DYNAMIC_COLORS[_dynamicIdx % DYNAMIC_COLORS.length];
  _dynamicIdx++;
  const label = key.charAt(0).toUpperCase() + key.slice(1).replace(/[-_]/g, " ");
  // Cache it so repeat calls get the same color
  KNOWN_CATEGORIES[key] = { label, color };
  return { label, color };
}

/**
 * Build CATEGORY_META from actual data — only includes categories present in nodes.
 * This replaces the old static CATEGORY_META.
 */
export function buildCategoryMeta(nodes: VisNode[]): Record<string, { label: string; color: string }> {
  const meta: Record<string, { label: string; color: string }> = {};
  const seen = new Set<string>();
  for (const n of nodes) {
    if (!seen.has(n.cat)) {
      seen.add(n.cat);
      meta[n.cat] = getCategoryMeta(n.cat);
    }
  }
  return meta;
}

/** Preferred category ordering — categories not in this list appear at the end */
const PREFERRED_ORDER = [
  // UI
  "pages", "api", "components", "styles",
  // Logic
  "hooks", "actions", "providers", "lib", "services", "modules", "constants",
  // Data
  "queries", "mutations", "schemas", "data", "auth",
  // DB
  "migrations", "rls", "triggers", "functions_db",
  // Infra
  "config", "types", "tests",
  // Fallback
  "source",
];

/**
 * Order categories: known categories first (in PREFERRED_ORDER), then
 * dynamically discovered categories sorted alphabetically.
 */
export function orderCategories(cats: string[]): string[] {
  const known = PREFERRED_ORDER.filter(c => cats.includes(c));
  const dynamic = cats.filter(c => !PREFERRED_ORDER.includes(c)).sort();
  return [...known, ...dynamic];
}

// Re-export for backward compat — components that used CATEGORY_META directly
export const CATEGORY_META = KNOWN_CATEGORIES;
export const CAT_ORDER = PREFERRED_ORDER;

/**
 * Self-contained HTML graph visualization generator.
 *
 * Produces a single .html file with all CSS + JS inlined.
 * No external dependencies — opens offline in any browser.
 *
 * CSS lives in html-styles.ts, JS scripts in html-scripts.ts.
 */

import { buildStyles } from "./html-styles.js";
import { buildScript } from "./html-scripts.js";

// ── Types ─────────────────────────────────────────────────────────

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
}

export interface VisEntity {
  name: string;
  displayName: string;
  source: string;
  memberCount: number;
  roles: Record<string, number>;
  memberIds: string[];
}

export interface GraphHtmlData {
  nodes: VisNode[];
  entities: VisEntity[];
  repoName: string;
  generatedAt: string;
  stats: {
    totalNodes: number;
    totalEdges: number;
    filesCount: number;
  };
}

// ── Constants ─────────────────────────────────────────────────────

export const CATEGORY_META: Record<string, { label: string; color: string }> = {
  pages:      { label: "Pages",       color: "#f37029" },
  api:        { label: "API Routes",  color: "#ef4444" },
  components: { label: "Components",  color: "#8b5cf6" },
  hooks:      { label: "Hooks",       color: "#06b6d4" },
  lib:        { label: "Core Lib",    color: "#22c55e" },
  auth:       { label: "Auth",        color: "#f59e0b" },
  data:       { label: "Data Layer",  color: "#3b82f6" },
  types:      { label: "Types",       color: "#eab308" },
  config:     { label: "Config",      color: "#64748b" },
  tests:      { label: "Tests",       color: "#22d3ee" },
  styles:     { label: "Styles",      color: "#f472b6" },
  source:     { label: "Source",      color: "#94a3b8" },
};

export const DEFAULT_CAT_ORDER = [
  "pages", "api", "components", "hooks", "lib",
  "auth", "data", "types", "config", "tests", "styles", "source",
];

// ── Helpers ───────────────────────────────────────────────────────

export function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function jsonInject(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026");
}

// ── HTML sections ─────────────────────────────────────────────────

function buildHeader(
  repoName: string,
  generatedAt: string,
  filesCount: number,
  edgeCount: number,
  catCount: number,
): string {
  return `<div class="header">
  <h1>
    <span class="logo">C</span>
    <span class="brand">Composure</span>
    <span class="sep">\u2014</span>
    <span class="subtitle">Code Review Graph</span>
  </h1>
  <span class="badge">${esc(generatedAt)}</span>
  <div class="view-toggle" id="viewToggle">
    <button class="vt-btn" data-view="graph" title="Dependency graph">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="5" cy="6" r="2"/><circle cx="12" cy="18" r="2"/><circle cx="19" cy="6" r="2"/><path d="M5 8v2a4 4 0 004 4h6a4 4 0 004-4V8"/><line x1="12" y1="14" x2="12" y2="16"/></svg>
    </button>
    <button class="vt-btn active" data-view="tree" title="File explorer">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>
    </button>
    <button class="vt-btn" data-view="entities" title="Domain entities">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
    </button>
  </div>
  <div class="stats">
    <span><strong id="statFiles">${filesCount}</strong> files</span>
    <span><strong id="statEdges">${edgeCount}</strong> connections</span>
    <span><strong>${catCount}</strong> categories</span>
    <input class="search-box" id="searchBox" placeholder="Search files\u2026" type="text" />
    <button class="theme-btn" id="themeToggle" title="Toggle theme">
      <svg id="themeIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
      </svg>
    </button>
  </div>
</div>`;
}

function buildLegend(cats: string[]): string {
  const items = cats
    .map((c) => {
      const m = CATEGORY_META[c] ?? { label: c, color: "#94a3b8" };
      return `    <div class="legend-item" data-cat="${esc(c)}"><div class="legend-color" style="background:${m.color}"></div> ${esc(m.label)}</div>`;
    })
    .join("\n");

  return `<div class="legend" id="legend">
  <div class="legend-toggle" id="legendToggle">
    <span>Legend</span>
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
  </div>
  <div class="legend-body" id="legendBody">
${items}
  </div>
</div>`;
}

function buildZoomControls(): string {
  return `<div class="zoom-controls" style="display:none">
  <button id="zoomOut" title="Zoom out">\u2212</button>
  <button id="zoomReset" title="Reset zoom">\u27F3</button>
  <button id="zoomIn" title="Zoom in">+</button>
</div>`;
}

// ── Main export ───────────────────────────────────────────────────

export function generateGraphHtml(data: GraphHtmlData): string {
  const { nodes, entities, repoName, generatedAt, stats } = data;

  const catSet = new Set(nodes.map((n) => n.cat));
  const catsPresent = DEFAULT_CAT_ORDER.filter((c) => catSet.has(c));
  const edgeCount = nodes.reduce((sum, n) => sum + n.imports.length, 0);

  return `<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(repoName)} — Code Review Graph</title>
${buildStyles()}
</head>
<body>

${buildHeader(repoName, generatedAt, stats.filesCount, edgeCount, catsPresent.length)}

<div class="main">
  <div class="tree-sidebar" id="treeSidebar">
    <div class="tree-sidebar-header">
      <span class="tree-sidebar-title">Explorer</span>
    </div>
    <div class="tree-panel" id="treePanel"></div>
  </div>
  <div class="graph-panel" id="graphPanel">
    <canvas class="edge-canvas" id="edgeCanvas"></canvas>
    <div class="graph-canvas" id="graphCanvas"></div>
  </div>
  <div class="detail-panel" id="detailPanel"></div>
</div>
<div class="entities-panel" id="entitiesPanel"></div>

${buildLegend(catsPresent)}
${buildZoomControls()}

<div class="footer">
  <span>github.com/hrconsultnj/composure</span>
</div>

<script>
${buildScript(nodes, catsPresent, entities)}
</script>
</body>
</html>`;
}

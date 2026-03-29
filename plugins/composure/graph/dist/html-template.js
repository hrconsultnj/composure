/**
 * Self-contained HTML graph visualization generator.
 *
 * Produces a single .html file with all CSS + JS inlined.
 * No external dependencies — opens offline in any browser.
 * Supports light/dark themes via CSS custom properties.
 */
// ── Main export ───────────────────────────────────────────────────
export function generateGraphHtml(data) {
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
${buildControls()}

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
// ── Constants ─────────────────────────────────────────────────────
const CATEGORY_META = {
    pages: { label: "Pages", color: "#f37029" },
    api: { label: "API Routes", color: "#ef4444" },
    components: { label: "Components", color: "#8b5cf6" },
    hooks: { label: "Hooks", color: "#06b6d4" },
    lib: { label: "Core Lib", color: "#22c55e" },
    auth: { label: "Auth", color: "#f59e0b" },
    data: { label: "Data Layer", color: "#3b82f6" },
    types: { label: "Types", color: "#eab308" },
    config: { label: "Config", color: "#64748b" },
    tests: { label: "Tests", color: "#22d3ee" },
    styles: { label: "Styles", color: "#f472b6" },
    source: { label: "Source", color: "#94a3b8" },
};
const DEFAULT_CAT_ORDER = [
    "pages", "api", "components", "hooks", "lib",
    "auth", "data", "types", "config", "tests", "styles", "source",
];
export { CATEGORY_META, DEFAULT_CAT_ORDER };
// ── Helpers ───────────────────────────────────────────────────────
function esc(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function jsonInject(data) {
    return JSON.stringify(data).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026");
}
// ── CSS with theme variables ──────────────────────────────────────
function buildStyles() {
    return `<style>
  :root, [data-theme="dark"] {
    --bg: #0a0e1a; --bg-alt: rgba(10,14,26,0.95); --bg-panel: rgba(10,14,26,0.85);
    --text: #e2e8f0; --text-dim: #94a3b8; --text-muted: #64748b; --text-faint: #475569; --text-ghost: #334155;
    --border: rgba(255,255,255,0.08); --border-soft: rgba(255,255,255,0.06); --border-input: rgba(255,255,255,0.1);
    --surface: rgba(255,255,255,0.03); --surface-hover: rgba(255,255,255,0.06);
    --accent: #f37029; --accent-bg: rgba(243,112,41,0.12); --accent-border: rgba(243,112,41,0.35);
    --edge: rgba(255,255,255,0.06); --edge-dim: rgba(255,255,255,0.03); --edge-hl: rgba(243,112,41,0.55);
    --node-border: 33; --node-bg: 14;
    --badge-green: #22c55e; --badge-green-bg: rgba(34,197,94,0.08); --badge-green-border: rgba(34,197,94,0.3);
  }
  [data-theme="light"] {
    --bg: #f8fafc; --bg-alt: rgba(241,245,249,0.97); --bg-panel: rgba(248,250,252,0.92);
    --text: #0f172a; --text-dim: #475569; --text-muted: #64748b; --text-faint: #94a3b8; --text-ghost: #cbd5e1;
    --border: rgba(0,0,0,0.08); --border-soft: rgba(0,0,0,0.05); --border-input: rgba(0,0,0,0.12);
    --surface: rgba(0,0,0,0.03); --surface-hover: rgba(0,0,0,0.06);
    --accent: #ea580c; --accent-bg: rgba(234,88,12,0.08); --accent-border: rgba(234,88,12,0.3);
    --edge: rgba(0,0,0,0.08); --edge-dim: rgba(0,0,0,0.03); --edge-hl: rgba(234,88,12,0.5);
    --node-border: 30; --node-bg: 10;
    --badge-green: #16a34a; --badge-green-bg: rgba(22,163,74,0.08); --badge-green-border: rgba(22,163,74,0.3);
  }

  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; background: var(--bg); color: var(--text); overflow: hidden; transition: background 0.2s, color 0.2s; }

  /* ── Header ─────────────────────────────────────────── */
  .header { padding: 16px 28px; border-bottom: 1px solid var(--border); display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
  .header h1 { font-size: 18px; font-weight: 700; display: flex; align-items: center; gap: 10px; }
  .header h1 .logo { width: 26px; height: 26px; border-radius: 6px; background: var(--accent); display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 14px; color: var(--bg); flex-shrink: 0; }
  .header h1 .brand { color: var(--accent); }
  .header .sep { color: var(--text-ghost); font-weight: 300; }
  .header .subtitle { color: var(--text-muted); font-size: 14px; font-weight: 400; }
  .header .stats { margin-left: auto; display: flex; gap: 18px; font-size: 12px; color: var(--text-muted); align-items: center; }
  .header .stats strong { color: var(--text); font-weight: 600; }
  .header .badge { font-size: 10px; color: var(--badge-green); border: 1px solid var(--badge-green-border); border-radius: 10px; padding: 2px 10px; background: var(--badge-green-bg); }
  .theme-btn { width: 30px; height: 30px; border-radius: 7px; border: 1px solid var(--border-input); background: var(--surface); color: var(--text-muted); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.15s; }
  .theme-btn:hover { color: var(--accent); border-color: var(--accent-border); }
  .theme-btn svg { width: 15px; height: 15px; }

  /* ── View toggle ─────────────────────────────────────── */
  .view-toggle { display: flex; gap: 3px; background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 2px; }
  .vt-btn { width: 28px; height: 28px; border-radius: 6px; border: none; background: transparent; color: var(--text-muted); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.15s; }
  .vt-btn:hover { color: var(--text); }
  .vt-btn.active { background: var(--accent-bg); color: var(--accent); }
  .vt-btn svg { width: 15px; height: 15px; }

  .search-box { padding: 5px 14px; border-radius: 16px; border: 1px solid var(--border-input); background: var(--surface); color: var(--text); font-size: 11px; width: 180px; outline: none; font-family: inherit; }
  .search-box:focus { border-color: var(--accent-border); }
  .search-box::placeholder { color: var(--text-ghost); }

  /* ── Graph ──────────────────────────────────────────── */
  .main { display: flex; height: calc(100vh - 58px); }
  .graph-panel { flex: 1; position: relative; overflow: auto; cursor: grab; display: none; }
  .graph-panel:active { cursor: grabbing; }
  .graph-canvas { position: absolute; top: 0; left: 0; }
  .edge-canvas { position: absolute; top: 0; left: 0; pointer-events: none; }

  /* ── Tree sidebar ─────────────────────────────────────── */
  .tree-sidebar { width: 260px; flex-shrink: 0; border-right: 1px solid var(--border); display: flex; flex-direction: column; background: var(--bg); }
  .tree-sidebar-header { padding: 8px 14px; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); border-bottom: 1px solid var(--border-soft); }
  .tree-panel { flex: 1; overflow-y: auto; padding: 6px 0; font-size: 12px; }
  .tree-dir { display: flex; align-items: center; gap: 3px; padding: 2px 10px; cursor: pointer; color: var(--text-dim); user-select: none; line-height: 22px; }
  .tree-dir:hover { background: var(--surface); color: var(--text); }
  .tree-dir-arrow { width: 16px; font-size: 8px; flex-shrink: 0; transition: transform 0.15s; color: var(--text-muted); display: inline-flex; align-items: center; justify-content: center; transform: rotate(90deg); }
  .tree-dir-arrow.collapsed { transform: rotate(0deg); }
  .tree-dir-name { font-weight: 500; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .tree-dir-badge { font-size: 9px; color: var(--text-faint); margin-left: auto; flex-shrink: 0; }
  .tree-children { padding-left: 12px; margin-left: 6px; border-left: 1px solid var(--border-soft); }
  .tree-children.collapsed { display: none; }
  .tree-file { display: flex; align-items: center; gap: 6px; padding: 2px 10px 2px 20px; cursor: pointer; color: var(--text-dim); transition: background 0.1s; line-height: 22px; }
  .tree-file:hover { background: var(--surface); color: var(--text); }
  .tree-file.selected { background: var(--accent-bg); color: var(--accent); }
  .tree-file .tf-dot { width: 5px; height: 5px; border-radius: 50%; flex-shrink: 0; }
  .tree-file .tf-name { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .tree-file .tf-lines { font-size: 9px; color: var(--text-faint); font-family: 'SF Mono', Menlo, monospace; flex-shrink: 0; }

  /* ── Nodes ──────────────────────────────────────────── */
  .node { position: absolute; width: 190px; height: 34px; border-radius: 7px; cursor: pointer; transition: opacity 0.15s, box-shadow 0.15s; display: flex; align-items: center; gap: 8px; padding: 0 12px; user-select: none; font-size: 11px; font-weight: 500; border: 1px solid transparent; color: var(--text); }
  .node:hover { filter: brightness(1.25); box-shadow: 0 0 14px var(--surface-hover); }
  .node .dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
  .node .lbl { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1; }
  .node.selected { border-width: 2px; z-index: 5; }
  .node.dimmed { opacity: 0.12; pointer-events: none; }

  /* ── Column headers ─────────────────────────────────── */
  .col-header { position: absolute; font-size: 12px; font-weight: 700; letter-spacing: 0.03em; opacity: 0.8; font-family: 'SF Mono', 'Fira Code', Menlo, monospace; }
  .col-line { position: absolute; height: 2px; opacity: 0.25; border-radius: 1px; }

  /* ── Detail panel ───────────────────────────────────── */
  .detail-panel { width: 380px; border-left: 1px solid var(--border); padding: 0; overflow-y: auto; display: none; flex-shrink: 0; background: var(--bg-panel); }
  .detail-panel.open { display: block; }
  .dp-inner { padding: 22px; }
  .dp-title { font-size: 17px; font-weight: 700; margin-bottom: 4px; }
  .dp-path { font-size: 11px; color: var(--text-faint); font-family: 'SF Mono', Menlo, monospace; margin-bottom: 14px; word-break: break-all; }
  .dp-badges { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 16px; }
  .dp-badge { display: inline-block; padding: 2px 10px; border-radius: 10px; font-size: 10px; font-weight: 600; }
  .dp-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 18px; }
  .dp-stat { padding: 10px 12px; border-radius: 8px; background: var(--surface); border: 1px solid var(--border-soft); }
  .dp-stat-label { font-size: 10px; color: var(--text-faint); text-transform: uppercase; letter-spacing: 0.06em; font-weight: 600; }
  .dp-stat-value { font-size: 18px; font-weight: 700; color: var(--text); margin-top: 2px; }
  .dp-section-title { font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-faint); margin: 16px 0 8px; font-weight: 600; }
  .dp-dep-item { padding: 5px 0; font-size: 12px; color: var(--text-dim); display: flex; align-items: center; gap: 8px; cursor: pointer; border-bottom: 1px solid var(--border-soft); }
  .dp-dep-item:hover { color: var(--accent); }
  .dp-dep-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
  .dp-flag { padding: 8px 12px; border-radius: 7px; margin-bottom: 5px; font-size: 11px; line-height: 1.4; }

  /* ── Legend (right side, above zoom) ─────────────────── */
  .legend { position: fixed; bottom: 60px; right: 14px; background: var(--bg-alt); border: 1px solid var(--border); border-radius: 10px; font-size: 10px; z-index: 10; backdrop-filter: blur(8px); min-width: 130px; }
  .legend-toggle { display: flex; align-items: center; justify-content: space-between; padding: 7px 12px; cursor: pointer; user-select: none; color: var(--text-muted); font-size: 10px; font-weight: 600; letter-spacing: 0.04em; gap: 8px; }
  .legend-toggle:hover { color: var(--text); }
  .legend-toggle svg { width: 12px; height: 12px; transition: transform 0.2s; }
  .legend-toggle.collapsed svg { transform: rotate(180deg); }
  .legend-body { padding: 0 12px 8px; }
  .legend-body.hidden { display: none; }
  .legend-item { display: flex; align-items: center; gap: 7px; margin: 3px 0; color: var(--text-muted); cursor: pointer; padding: 2px 4px; border-radius: 4px; transition: all 0.15s; user-select: none; }
  .legend-item:hover { color: var(--text); background: var(--surface); }
  .legend-item.hidden-cat { opacity: 0.35; text-decoration: line-through; }
  .legend-color { width: 10px; height: 10px; border-radius: 3px; flex-shrink: 0; }

  /* ── Entities panel ─────────────────────────────────── */
  .entities-panel { display: none; position: absolute; top: 58px; left: 0; right: 0; bottom: 0; overflow-y: auto; padding: 28px; background: var(--bg); z-index: 5; }
  .entities-panel.open { display: block; }
  .ep-header { font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); margin-bottom: 16px; }
  .ep-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 14px; }
  .ep-card { padding: 18px; border-radius: 10px; border: 1px solid var(--border); background: var(--surface); cursor: pointer; transition: all 0.15s; }
  .ep-card:hover { border-color: var(--accent-border); background: var(--surface-hover); }
  .ep-card.selected { border-color: var(--accent); background: var(--accent-bg); }
  .ep-card-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
  .ep-card-name { font-size: 16px; font-weight: 700; }
  .ep-card-source { font-size: 9px; padding: 2px 8px; border-radius: 8px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; }
  .ep-card-source.migration { background: rgba(59,130,246,0.12); color: #3b82f6; border: 1px solid rgba(59,130,246,0.3); }
  .ep-card-source.route { background: rgba(243,112,41,0.12); color: #f37029; border: 1px solid rgba(243,112,41,0.3); }
  .ep-card-source.directory { background: rgba(139,92,246,0.12); color: #8b5cf6; border: 1px solid rgba(139,92,246,0.3); }
  .ep-card-source.hook { background: rgba(6,182,212,0.12); color: #06b6d4; border: 1px solid rgba(6,182,212,0.3); }
  .ep-card-count { font-size: 11px; color: var(--text-dim); margin-bottom: 10px; }
  .ep-roles { display: flex; flex-wrap: wrap; gap: 5px; }
  .ep-role { font-size: 9px; padding: 2px 8px; border-radius: 6px; font-weight: 500; background: var(--surface-hover); color: var(--text-dim); border: 1px solid var(--border-soft); }

  /* ── Zoom ───────────────────────────────────────────── */
  .zoom-controls { position: fixed; bottom: 14px; right: 14px; display: flex; gap: 4px; z-index: 10; }
  .zoom-controls button { width: 32px; height: 32px; border-radius: 7px; border: 1px solid var(--border); background: var(--bg-alt); color: var(--text-muted); font-size: 16px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-family: inherit; backdrop-filter: blur(8px); }
  .zoom-controls button:hover { color: var(--accent); border-color: var(--accent-border); }

  /* ── Footer ─────────────────────────────────────────── */
  .footer { position: fixed; bottom: 14px; left: 14px; font-size: 10px; color: var(--text-ghost); z-index: 5; }
</style>`;
}
// ── HTML sections ─────────────────────────────────────────────────
function buildHeader(repoName, generatedAt, filesCount, edgeCount, catCount) {
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
function buildControls() {
    return ``;
}
function buildLegend(cats) {
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
function buildZoomControls() {
    return `<div class="zoom-controls" style="display:none">
  <button id="zoomOut" title="Zoom out">\u2212</button>
  <button id="zoomReset" title="Reset zoom">\u27F3</button>
  <button id="zoomIn" title="Zoom in">+</button>
</div>`;
}
// ── JavaScript (decomposed into focused template sections) ────────
// NOTE: The functions below return browser-runtime JavaScript as template
// strings. The untyped `var x = {}` patterns are intentional — this is
// client-side JS that runs in the browser, not TypeScript.
/** Data constants, edge/reverse-dep maps, sizing, state variables. */
function buildScriptData(nodes, catsPresent, entities) {
    const colorsObj = {};
    const labelsObj = {};
    for (const c of catsPresent) {
        const m = CATEGORY_META[c] ?? { label: c, color: "#94a3b8" };
        colorsObj[c] = m.color;
        labelsObj[c] = m.label;
    }
    return `
var NODES=${jsonInject(nodes)},COLORS=${jsonInject(colorsObj)},CAT_LABELS=${jsonInject(labelsObj)},CAT_ORDER=${jsonInject(catsPresent)};
var ENTITIES=${jsonInject(entities)};
var EDGES=[],nodeMap={},reverseDeps={};
NODES.forEach(function(n){nodeMap[n.id]=n;});
NODES.forEach(function(n){(n.imports||[]).forEach(function(t){if(nodeMap[t])EDGES.push({source:n.id,target:t});});});
NODES.forEach(function(n){reverseDeps[n.id]=[];});
EDGES.forEach(function(e){if(reverseDeps[e.target])reverseDeps[e.target].push(e.source);});
var NODE_W=190,NODE_H=34,COL_GAP=220,ROW_GAP=42,PAD_X=44,PAD_Y=52;
var currentFilter="all",selectedNode=null,selectedEntity=null,entityMemberSet=null,searchTerm="",zoom=0.85;
var hiddenCats=new Set();
`;
}
/** Theme toggle, search, zoom, legend toggle + clickable legend items. */
function buildScriptControls() {
    return `
var searchBox=document.getElementById("searchBox");

// ── Theme toggle ──────────────────────────────────────────────
var themeBtn=document.getElementById("themeToggle");
var moonPath='M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z';
var sunPath='M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42';
(function initTheme(){
  var saved=localStorage.getItem("composure-theme");
  if(saved)document.documentElement.setAttribute("data-theme",saved);
  updateThemeIcon();
})();
function updateThemeIcon(){
  var isDark=document.documentElement.getAttribute("data-theme")!=="light";
  document.getElementById("themeIcon").innerHTML=isDark
    ?'<path d="'+moonPath+'"/>'
    :'<circle cx="12" cy="12" r="5"/><path d="'+sunPath+'"/>';
}
themeBtn.addEventListener("click",function(){
  var isDark=document.documentElement.getAttribute("data-theme")!=="light";
  document.documentElement.setAttribute("data-theme",isDark?"light":"dark");
  localStorage.setItem("composure-theme",isDark?"light":"dark");
  updateThemeIcon();
  render();
});

// ── Search ────────────────────────────────────────────────────
searchBox.addEventListener("input",function(e){searchTerm=e.target.value.toLowerCase();render();});

// ── Zoom ──────────────────────────────────────────────────────
document.getElementById("zoomIn").addEventListener("click",function(){zoom=Math.min(zoom+0.15,2);render();});
document.getElementById("zoomOut").addEventListener("click",function(){zoom=Math.max(zoom-0.15,0.3);render();});
document.getElementById("zoomReset").addEventListener("click",function(){zoom=0.85;render();});
document.getElementById("graphPanel").addEventListener("wheel",function(e){
  if(e.ctrlKey||e.metaKey){e.preventDefault();zoom=Math.max(0.3,Math.min(2,zoom+(e.deltaY<0?0.08:-0.08)));render();}
},{passive:false});

// ── Legend toggle + clickable category items ──────────────────
document.getElementById("legendToggle").addEventListener("click",function(){
  document.getElementById("legendBody").classList.toggle("hidden");
  document.getElementById("legendToggle").classList.toggle("collapsed");
});
document.querySelectorAll(".legend-item").forEach(function(el){
  el.addEventListener("click",function(){
    var cat=el.getAttribute("data-cat");
    if(hiddenCats.has(cat)){hiddenCats.delete(cat);el.classList.remove("hidden-cat");}
    else{hiddenCats.add(cat);el.classList.add("hidden-cat");}
    selectedNode=null;
    document.getElementById("detailPanel").classList.remove("open");
    render();
  });
});
`;
}
/** Layout algorithm, BFS blast radius, node selection. */
function buildScriptGraphLogic() {
    return `
function layoutNodes(filter){
  var visible=NODES.filter(function(n){return !hiddenCats.has(n.cat);});
  if(searchTerm)visible=visible.filter(function(n){return n.label.toLowerCase().includes(searchTerm)||n.path.toLowerCase().includes(searchTerm);});
  var groups={},positions={};
  visible.forEach(function(n){(groups[n.cat]=groups[n.cat]||[]).push(n);});
  var cols=CAT_ORDER.filter(function(c){return groups[c];});
  cols.forEach(function(cat,ci){(groups[cat]||[]).forEach(function(n,ri){positions[n.id]={x:PAD_X+ci*COL_GAP,y:PAD_Y+ri*ROW_GAP};});});
  return{positions:positions,visible:visible,cols:cols};
}
function bfsRadius(startId,maxDepth){
  var visited=new Set([startId]),frontier=[startId];
  for(var d=0;d<maxDepth;d++){
    var next=[];
    frontier.forEach(function(nid){
      var node=nodeMap[nid];
      if(node)(node.imports||[]).forEach(function(t){if(!visited.has(t)){visited.add(t);next.push(t);}});
      (reverseDeps[nid]||[]).forEach(function(s){if(!visited.has(s)){visited.add(s);next.push(s);}});
    });
    frontier=next;if(frontier.length===0)break;
  }
  return visited;
}
function selectNode(id){selectedNode=id;render();}
`;
}
/** Detail panel builder — populates the right sidebar on node click. */
function buildScriptDetailPanel() {
    return `
function buildDetail(node){
  var panel=document.getElementById("detailPanel");panel.innerHTML="";panel.classList.add("open");
  var color=COLORS[node.cat]||"#94a3b8";
  var deps=(node.imports||[]).map(function(i){return nodeMap[i];}).filter(Boolean);
  var consumers=(reverseDeps[node.id]||[]).map(function(i){return nodeMap[i];}).filter(Boolean);
  var radius=bfsRadius(node.id,2);
  var inner=document.createElement("div");inner.className="dp-inner";
  var h2=document.createElement("div");h2.className="dp-title";h2.style.color=color;h2.textContent=node.label;inner.appendChild(h2);
  var fp=document.createElement("div");fp.className="dp-path";fp.textContent=node.path;inner.appendChild(fp);
  var badges=document.createElement("div");badges.className="dp-badges";
  function addBadge(t,bg,fg){var s=document.createElement("span");s.className="dp-badge";s.textContent=t;s.style.background=bg;s.style.color=fg;badges.appendChild(s);}
  addBadge(CAT_LABELS[node.cat]||node.cat,color+"22",color);
  addBadge(node.language,"var(--surface-hover)","var(--text-dim)");
  if(node.isTest)addBadge("test","rgba(34,211,238,0.12)","#22d3ee");
  inner.appendChild(badges);
  var sg=document.createElement("div");sg.className="dp-stats";
  function addStat(l,v){var el=document.createElement("div");el.className="dp-stat";el.innerHTML='<div class="dp-stat-label">'+l+'</div><div class="dp-stat-value">'+v+'</div>';sg.appendChild(el);}
  addStat("Lines",node.lines);addStat("Functions",node.functions);addStat("Imports",deps.length);
  addStat("Imported by",consumers.length);addStat("Blast radius",radius.size);
  if(node.classes>0)addStat("Classes",node.classes);if(node.types>0)addStat("Types",node.types);
  inner.appendChild(sg);
  function addDepSection(title,items){
    if(!items.length)return;
    var st=document.createElement("div");st.className="dp-section-title";st.textContent=title;inner.appendChild(st);
    items.forEach(function(d){
      var li=document.createElement("div");li.className="dp-dep-item";
      li.addEventListener("click",function(){selectNode(d.id);});
      var dot=document.createElement("div");dot.className="dp-dep-dot";dot.style.background=COLORS[d.cat]||"#94a3b8";
      li.appendChild(dot);li.appendChild(document.createTextNode(d.label));inner.appendChild(li);
    });
  }
  addDepSection("Imports",deps);addDepSection("Imported by",consumers);
  if(consumers.length>=5){
    var sev=consumers.length>=10?"critical":"warn";
    var fc={warn:["rgba(251,191,36,0.08)","rgba(251,191,36,0.2)","#fbbf24"],critical:["rgba(239,68,68,0.08)","rgba(239,68,68,0.2)","#ef4444"]}[sev];
    var ft=document.createElement("div");ft.className="dp-section-title";ft.textContent="Review Notes";ft.style.marginTop="20px";inner.appendChild(ft);
    var fl=document.createElement("div");fl.className="dp-flag";fl.style.cssText="background:"+fc[0]+";border:1px solid "+fc[1]+";color:"+fc[2];
    fl.textContent="High fan-in: "+consumers.length+" files depend on this"+(sev==="critical"?" \\u2014 changes here have wide blast radius":"");inner.appendChild(fl);
  }
  if(deps.length===0&&consumers.length===0){
    var ft2=document.createElement("div");ft2.className="dp-section-title";ft2.textContent="Review Notes";ft2.style.marginTop="20px";inner.appendChild(ft2);
    var fl2=document.createElement("div");fl2.className="dp-flag";fl2.style.cssText="background:var(--surface);border:1px solid var(--border-soft);color:var(--text-muted)";
    fl2.textContent="Isolated file \\u2014 no import relationships detected";inner.appendChild(fl2);
  }
  panel.appendChild(inner);
}
`;
}
/** Tree view — builds folder hierarchy from paths, renders recursively. */
function buildScriptTreeView() {
    return `
var currentView="tree";

function buildTreeData(){
  var root={name:"",children:{},files:[],stats:{count:0,lines:0}};
  var visible=NODES.filter(function(n){return !hiddenCats.has(n.cat);});
  if(searchTerm)visible=visible.filter(function(n){return n.label.toLowerCase().includes(searchTerm)||n.path.toLowerCase().includes(searchTerm);});
  visible.forEach(function(n){
    var parts=n.path.split("/");
    var cur=root;
    for(var i=0;i<parts.length-1;i++){
      if(!cur.children[parts[i]])cur.children[parts[i]]={name:parts[i],children:{},files:[],stats:{count:0,lines:0}};
      cur=cur.children[parts[i]];
    }
    cur.files.push(n);
  });
  function calcStats(node){
    var c=node.files.length,l=0;
    node.files.forEach(function(f){l+=f.lines;});
    Object.keys(node.children).forEach(function(k){
      var s=calcStats(node.children[k]);c+=s.count;l+=s.lines;
    });
    node.stats={count:c,lines:l};
    return node.stats;
  }
  calcStats(root);
  return root;
}

var expandedDirs=new Set();

function renderTreeView(){
  var panel=document.getElementById("treePanel");
  panel.innerHTML="";
  var tree=buildTreeData();
  function renderDir(dir,container,path){
    var keys=Object.keys(dir.children).sort();
    keys.forEach(function(k){
      var child=dir.children[k];
      var dirPath=path?path+"/"+k:k;
      var isExpanded=expandedDirs.has(dirPath)||!!searchTerm;
      var row=document.createElement("div");row.className="tree-dir";
      var arrow=document.createElement("span");
      arrow.className="tree-dir-arrow"+(isExpanded?"":" collapsed");
      arrow.textContent="\u25B6";
      row.appendChild(arrow);
      var nameEl=document.createElement("span");nameEl.className="tree-dir-name";nameEl.textContent=k;row.appendChild(nameEl);
      var badge=document.createElement("span");badge.className="tree-dir-badge";
      badge.textContent=child.stats.count+" files";row.appendChild(badge);
      row.addEventListener("click",function(){
        if(expandedDirs.has(dirPath))expandedDirs.delete(dirPath);else expandedDirs.add(dirPath);
        renderTreeView();
      });
      container.appendChild(row);
      var childContainer=document.createElement("div");
      childContainer.className="tree-children"+(isExpanded?"":" collapsed");
      renderDir(child,childContainer,dirPath);
      child.files.sort(function(a,b){return a.label.localeCompare(b.label);}).forEach(function(f){
        var fileRow=document.createElement("div");fileRow.className="tree-file";
        if(selectedNode===f.id)fileRow.classList.add("selected");
        var dot=document.createElement("div");dot.className="tf-dot";dot.style.background=COLORS[f.cat]||"#94a3b8";
        fileRow.appendChild(dot);
        var name=document.createElement("span");name.className="tf-name";name.textContent=f.label;fileRow.appendChild(name);
        var lines=document.createElement("span");lines.className="tf-lines";lines.textContent=f.lines;fileRow.appendChild(lines);
        fileRow.addEventListener("click",function(e){e.stopPropagation();selectedNode=f.id;buildDetail(f);renderTreeView();});
        childContainer.appendChild(fileRow);
      });
      container.appendChild(childContainer);
    });
    dir.files.sort(function(a,b){return a.label.localeCompare(b.label);}).forEach(function(f){
      var fileRow=document.createElement("div");fileRow.className="tree-file";
      if(selectedNode===f.id)fileRow.classList.add("selected");
      var dot=document.createElement("div");dot.className="tf-dot";dot.style.background=COLORS[f.cat]||"#94a3b8";
      fileRow.appendChild(dot);
      var name=document.createElement("span");name.className="tf-name";name.textContent=f.label;fileRow.appendChild(name);
      var lines=document.createElement("span");lines.className="tf-lines";lines.textContent=f.lines;fileRow.appendChild(lines);
      fileRow.addEventListener("click",function(e){e.stopPropagation();selectedNode=f.id;buildDetail(f);renderTreeView();});
      container.appendChild(fileRow);
    });
  }
  renderDir(tree,panel,"");
}

// ── View toggle (tree sidebar always visible, graph/entities panels toggle) ─
var currentView="tree";
document.querySelectorAll(".vt-btn").forEach(function(btn){
  btn.addEventListener("click",function(){
    var view=btn.getAttribute("data-view");
    if(view===currentView)return;
    currentView=view;
    document.querySelectorAll(".vt-btn").forEach(function(b){b.classList.remove("active");});
    btn.classList.add("active");
    var gp=document.getElementById("graphPanel");
    var ep=document.getElementById("entitiesPanel");
    var zc=document.querySelector(".zoom-controls");
    var main=document.querySelector(".main");
    if(view==="graph"){
      gp.style.display="block";ep.classList.remove("open");main.style.display="flex";zc.style.display="";
      render();
    }else if(view==="entities"){
      gp.style.display="none";ep.classList.add("open");main.style.display="none";zc.style.display="none";
      renderEntityView();
    }else{
      gp.style.display="none";ep.classList.remove("open");main.style.display="flex";zc.style.display="none";
    }
  });
});
`;
}
/** Main render loop — draws nodes, column headers, and canvas edges. */
function buildScriptRender() {
    return `
function render(){
  renderTreeView();
  if(currentView==="tree")return;
  var isDark=document.documentElement.getAttribute("data-theme")!=="light";
  var layout=layoutNodes(currentFilter),positions=layout.positions,visible=layout.visible,cols=layout.cols;
  var graphCanvas=document.getElementById("graphCanvas");
  var connectedSet=selectedNode?bfsRadius(selectedNode,1):null;
  graphCanvas.innerHTML="";
  cols.forEach(function(cat,ci){
    var color=COLORS[cat]||"#94a3b8";
    var hdr=document.createElement("div");hdr.className="col-header";
    hdr.style.cssText="left:"+(PAD_X+ci*COL_GAP)+"px;top:16px;color:"+color;hdr.textContent=CAT_LABELS[cat]||cat;graphCanvas.appendChild(hdr);
    var line=document.createElement("div");line.className="col-line";
    line.style.cssText="left:"+(PAD_X+ci*COL_GAP)+"px;top:36px;width:"+NODE_W+"px;background:"+color;graphCanvas.appendChild(line);
  });
  visible.forEach(function(n){
    var pos=positions[n.id];if(!pos)return;
    var color=COLORS[n.cat]||"#94a3b8",el=document.createElement("div");el.className="node";
    if(selectedNode===n.id)el.classList.add("selected");
    if(connectedSet&&!connectedSet.has(n.id))el.classList.add("dimmed");
    el.style.cssText="left:"+pos.x+"px;top:"+pos.y+"px;background:"+color+(isDark?"14":"10")+";border-color:"+(selectedNode===n.id?color:color+(isDark?"33":"30"))+";color:var(--text)";
    var dot=document.createElement("div");dot.className="dot";dot.style.background=color;el.appendChild(dot);
    var lbl=document.createElement("div");lbl.className="lbl";lbl.textContent=n.label;lbl.title=n.path;el.appendChild(lbl);
    el.addEventListener("click",function(e){e.stopPropagation();selectedNode=n.id;buildDetail(n);render();});
    graphCanvas.appendChild(el);
  });
  var maxX=0,maxY=0;
  Object.values(positions).forEach(function(p){if(p.x+NODE_W>maxX)maxX=p.x+NODE_W;if(p.y+NODE_H>maxY)maxY=p.y+NODE_H;});
  maxX+=PAD_X+40;maxY+=PAD_Y+40;
  graphCanvas.style.width=maxX+"px";graphCanvas.style.height=maxY+"px";
  graphCanvas.style.transform="scale("+zoom+")";graphCanvas.style.transformOrigin="0 0";
  var canvas=document.getElementById("edgeCanvas"),dpr=window.devicePixelRatio||1;
  canvas.width=maxX*zoom*dpr;canvas.height=maxY*zoom*dpr;
  canvas.style.width=maxX*zoom+"px";canvas.style.height=maxY*zoom+"px";
  var ctx=canvas.getContext("2d");ctx.scale(dpr*zoom,dpr*zoom);ctx.clearRect(0,0,maxX,maxY);
  var edgeColor=isDark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.08)";
  var edgeDim=isDark?"rgba(255,255,255,0.03)":"rgba(0,0,0,0.03)";
  var edgeHl=isDark?"rgba(243,112,41,0.55)":"rgba(234,88,12,0.5)";
  EDGES.forEach(function(e){
    var s=positions[e.source],t=positions[e.target];if(!s||!t)return;
    var hl=selectedNode&&(e.source===selectedNode||e.target===selectedNode);
    if(connectedSet&&!hl){ctx.strokeStyle=edgeDim;ctx.lineWidth=1;}
    else if(hl){ctx.strokeStyle=edgeHl;ctx.lineWidth=2.5;}
    else{ctx.strokeStyle=edgeColor;ctx.lineWidth=1.2;}
    var sx=s.x+NODE_W/2,sy=s.y+NODE_H/2,tx=t.x+NODE_W/2,ty=t.y+NODE_H/2,dx=tx-sx;
    ctx.beginPath();ctx.moveTo(sx,sy);ctx.bezierCurveTo(sx+dx*0.4,sy,sx+dx*0.6,ty,tx,ty);ctx.stroke();
  });
}
document.getElementById("graphPanel").addEventListener("click",function(e){
  if(e.target===document.getElementById("graphPanel")||e.target===document.getElementById("edgeCanvas")){
    selectedNode=null;document.getElementById("detailPanel").classList.remove("open");render();
  }
});
render();
`;
}
/** Entity view builder — renders entity cards in a grid. */
function buildScriptEntityView() {
    return `
function renderEntityView(){
  var panel=document.getElementById("entitiesPanel");
  if(!ENTITIES||!ENTITIES.length){
    panel.innerHTML='<div class="ep-header">No entities detected. Run build_or_update_graph with full_rebuild=true.</div>';
    return;
  }
  var html='<div class="ep-header">'+ENTITIES.length+' domain entities detected</div><div class="ep-grid">';
  ENTITIES.forEach(function(e){
    var roles=Object.keys(e.roles||{}).map(function(r){
      return '<span class="ep-role">'+r+' '+e.roles[r]+'</span>';
    }).join("");
    var sel=selectedEntity===e.name?" selected":"";
    html+='<div class="ep-card'+sel+'" data-entity="'+e.name+'">'
      +'<div class="ep-card-header"><span class="ep-card-name">'+e.displayName+'</span>'
      +'<span class="ep-card-source '+e.source+'">'+e.source+'</span></div>'
      +'<div class="ep-card-count">'+e.memberCount+' files across '+Object.keys(e.roles||{}).length+' roles</div>'
      +'<div class="ep-roles">'+roles+'</div></div>';
  });
  html+='</div>';
  panel.innerHTML=html;
  panel.querySelectorAll(".ep-card").forEach(function(card){
    card.addEventListener("click",function(){
      var name=card.getAttribute("data-entity");
      if(selectedEntity===name){selectedEntity=null;}
      else{selectedEntity=name;}
      // Highlight entity members in tree by filtering
      if(selectedEntity){
        var ent=ENTITIES.find(function(e){return e.name===selectedEntity;});
        if(ent){entityMemberSet=new Set(ent.memberIds);}
      }else{entityMemberSet=null;}
      renderEntityView();
    });
  });
}
`;
}
/** Concatenates all JS sections into the final inline script. */
function buildScript(nodes, catsPresent, entities) {
    return [
        buildScriptData(nodes, catsPresent, entities),
        buildScriptControls(),
        buildScriptGraphLogic(),
        buildScriptDetailPanel(),
        buildScriptTreeView(),
        buildScriptEntityView(),
        buildScriptRender(),
    ].join("\n");
}
//# sourceMappingURL=html-template.js.map
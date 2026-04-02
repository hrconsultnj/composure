/**
 * CSS styles for the graph HTML visualization.
 *
 * Theme variables (dark/light), layout, and component styles
 * returned as an inline <style> block.
 */

export function buildStyles(): string {
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

import { useRef, useState, useMemo, useEffect, useCallback } from "react";
import type { VisNode } from "@/lib/types";
import { CATEGORY_META, CAT_ORDER } from "@/lib/types";
import { GraphControls } from "./graph-controls";

const NODE_W = 200, NODE_H = 40, COL_GAP = 240, ROW_GAP = 48, PAD_X = 44, PAD_Y = 56;

interface GraphCanvasProps {
  nodes: VisNode[];
  nodeMap: Record<string, VisNode>;
  reverseDeps: Record<string, string[]>;
  selectedId: string | null;
  onSelect: (node: VisNode) => void;
  search: string;
  hiddenCats: Set<string>;
  isDark: boolean;
}

function bfsConnected(startId: string, nodeMap: Record<string, VisNode>, reverseDeps: Record<string, string[]>): Set<string> {
  const visited = new Set([startId]);
  let frontier = [startId];
  for (let d = 0; d < 1; d++) {
    const next: string[] = [];
    for (const nid of frontier) {
      const node = nodeMap[nid];
      if (node) for (const t of node.imports) { if (!visited.has(t)) { visited.add(t); next.push(t); } }
      for (const s of reverseDeps[nid] ?? []) { if (!visited.has(s)) { visited.add(s); next.push(s); } }
    }
    frontier = next;
    if (!frontier.length) break;
  }
  return visited;
}

export function GraphCanvas({ nodes, nodeMap, reverseDeps, selectedId, onSelect, search, hiddenCats, isDark }: GraphCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(0.85);

  const { positions, visible, cols, edges } = useMemo(() => {
    let filtered = nodes.filter((n) => !hiddenCats.has(n.cat));
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter((n) => n.label.toLowerCase().includes(q) || n.path.toLowerCase().includes(q));
    }
    const groups: Record<string, VisNode[]> = {};
    for (const n of filtered) (groups[n.cat] ??= []).push(n);
    const activeCols = CAT_ORDER.filter((c) => groups[c]);
    const pos: Record<string, { x: number; y: number }> = {};
    for (let ci = 0; ci < activeCols.length; ci++) {
      for (let ri = 0; ri < groups[activeCols[ci]].length; ri++) {
        pos[groups[activeCols[ci]][ri].id] = { x: PAD_X + ci * COL_GAP, y: PAD_Y + ri * ROW_GAP };
      }
    }
    const edgeList: { source: string; target: string }[] = [];
    for (const n of filtered) for (const imp of n.imports) if (pos[imp]) edgeList.push({ source: n.id, target: imp });
    return { positions: pos, visible: filtered, cols: activeCols, edges: edgeList };
  }, [nodes, hiddenCats, search]);

  const connectedSet = useMemo(
    () => selectedId ? bfsConnected(selectedId, nodeMap, reverseDeps) : null,
    [selectedId, nodeMap, reverseDeps],
  );

  const maxX = useMemo(() => {
    let mx = 0, my = 0;
    for (const p of Object.values(positions)) { if (p.x + NODE_W > mx) mx = p.x + NODE_W; if (p.y + NODE_H > my) my = p.y + NODE_H; }
    return { w: mx + PAD_X + 40, h: my + PAD_Y + 40 };
  }, [positions]);

  // Draw edges on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = maxX.w * zoom * dpr;
    canvas.height = maxX.h * zoom * dpr;
    canvas.style.width = `${maxX.w * zoom}px`;
    canvas.style.height = `${maxX.h * zoom}px`;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr * zoom, dpr * zoom);
    ctx.clearRect(0, 0, maxX.w, maxX.h);

    const edgeColor = isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.10)";
    const edgeDim = isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)";
    const edgeHl = isDark ? "rgba(243,112,41,0.6)" : "rgba(234,88,12,0.55)";

    for (const e of edges) {
      const s = positions[e.source], t = positions[e.target];
      if (!s || !t) continue;
      const hl = selectedId && (e.source === selectedId || e.target === selectedId);
      if (connectedSet && !hl) { ctx.strokeStyle = edgeDim; ctx.lineWidth = 1; }
      else if (hl) { ctx.strokeStyle = edgeHl; ctx.lineWidth = 2.5; }
      else { ctx.strokeStyle = edgeColor; ctx.lineWidth = 1.2; }
      const sx = s.x + NODE_W / 2, sy = s.y + NODE_H / 2, tx = t.x + NODE_W / 2, ty = t.y + NODE_H / 2, dx = tx - sx;
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.bezierCurveTo(sx + dx * 0.4, sy, sx + dx * 0.6, ty, tx, ty); ctx.stroke();
    }
  }, [edges, positions, selectedId, connectedSet, zoom, maxX, isDark]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      setZoom((z) => Math.max(0.3, Math.min(2, z + (e.deltaY < 0 ? 0.08 : -0.08))));
    }
  }, []);

  return (
    <div className="relative flex-1 overflow-hidden">
      <div ref={containerRef} className="h-full overflow-auto cursor-grab active:cursor-grabbing" onWheel={handleWheel}>
        <div className="relative" style={{ width: maxX.w * zoom, height: maxX.h * zoom }}>
          <canvas ref={canvasRef} className="absolute top-0 left-0 pointer-events-none" />
          <div className="absolute top-0 left-0" style={{ width: maxX.w, height: maxX.h, transform: `scale(${zoom})`, transformOrigin: "0 0" }}>
            {/* Column headers */}
            {cols.map((cat, ci) => {
              const color = CATEGORY_META[cat]?.color ?? "#94a3b8";
              return (
                <div key={cat} className="absolute" style={{ left: PAD_X + ci * COL_GAP, top: 16 }}>
                  <div className="text-sm font-bold tracking-normal opacity-90 font-mono" style={{ color }}>{CATEGORY_META[cat]?.label ?? cat}</div>
                  <div className="h-0.5 mt-1 rounded-sm opacity-25" style={{ width: NODE_W, background: color }} />
                </div>
              );
            })}
            {/* Nodes */}
            {visible.map((n) => {
              const pos = positions[n.id];
              if (!pos) return null;
              const color = CATEGORY_META[n.cat]?.color ?? "#94a3b8";
              const isSelected = selectedId === n.id;
              const isDimmed = connectedSet && !connectedSet.has(n.id);
              return (
                <div
                  key={n.id}
                  onClick={(e) => { e.stopPropagation(); onSelect(n); }}
                  className="absolute flex items-center gap-2.5 px-4 rounded-lg cursor-pointer text-sm font-medium text-foreground select-none transition-all duration-150 hover:brightness-110 hover:shadow-md"
                  style={{
                    left: pos.x, top: pos.y, width: NODE_W, height: NODE_H,
                    background: color + (isDark ? "14" : "10"),
                    borderWidth: isSelected ? 2 : 1,
                    borderStyle: "solid",
                    borderColor: isSelected ? color : color + (isDark ? "33" : "30"),
                    opacity: isDimmed ? 0.12 : 1,
                    pointerEvents: isDimmed ? "none" : "auto",
                  }}
                >
                  <span className="w-[7px] h-[7px] rounded-full shrink-0" style={{ background: color }} />
                  <span className="truncate flex-1" title={n.path}>{n.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <GraphControls
        zoom={zoom}
        onZoomIn={() => setZoom((z) => Math.min(z + 0.15, 2))}
        onZoomOut={() => setZoom((z) => Math.max(z - 0.15, 0.3))}
        onZoomReset={() => setZoom(0.85)}
      />
    </div>
  );
}

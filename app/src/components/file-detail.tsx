import { useMemo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { VisNode } from "@/lib/types";
import { CATEGORY_META } from "@/lib/types";

interface FileDetailProps {
  node: VisNode;
  nodeMap: Record<string, VisNode>;
  reverseDeps: Record<string, string[]>;
  onNavigate: (node: VisNode) => void;
}

function bfsRadius(
  startId: string,
  nodeMap: Record<string, VisNode>,
  reverseDeps: Record<string, string[]>,
  maxDepth: number,
): number {
  const visited = new Set([startId]);
  let frontier = [startId];
  for (let d = 0; d < maxDepth; d++) {
    const next: string[] = [];
    for (const nid of frontier) {
      const node = nodeMap[nid];
      if (node) {
        for (const t of node.imports) {
          if (!visited.has(t)) { visited.add(t); next.push(t); }
        }
      }
      for (const s of reverseDeps[nid] ?? []) {
        if (!visited.has(s)) { visited.add(s); next.push(s); }
      }
    }
    frontier = next;
    if (frontier.length === 0) break;
  }
  return visited.size;
}

export function FileDetail({ node, nodeMap, reverseDeps, onNavigate }: FileDetailProps) {
  const color = CATEGORY_META[node.cat]?.color ?? "#94a3b8";
  const catLabel = CATEGORY_META[node.cat]?.label ?? node.cat;

  const imports = useMemo(
    () => node.imports.map((id) => nodeMap[id]).filter(Boolean),
    [node.imports, nodeMap],
  );
  const consumers = useMemo(
    () => (reverseDeps[node.id] ?? []).map((id) => nodeMap[id]).filter(Boolean),
    [node.id, reverseDeps, nodeMap],
  );
  const blastRadius = useMemo(
    () => bfsRadius(node.id, nodeMap, reverseDeps, 2),
    [node.id, nodeMap, reverseDeps],
  );

  return (
    <ScrollArea className="flex-1">
      <div className="p-5 space-y-5">
        {/* Title */}
        <div>
          <h2 className="text-base font-bold" style={{ color }}>{node.label}</h2>
          <p className="text-[11px] font-mono text-muted-foreground/60 break-all mt-1">{node.path}</p>
        </div>

        {/* Badges */}
        <div className="flex gap-1.5 flex-wrap">
          <Badge text={catLabel} bg={color + "22"} fg={color} />
          <Badge text={node.language} bg="var(--accent)" fg="var(--muted-foreground)" />
          {node.isTest && <Badge text="test" bg="rgba(34,211,238,0.12)" fg="#22d3ee" />}
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-2">
          <Stat label="Lines" value={node.lines} />
          <Stat label="Functions" value={node.functions} />
          <Stat label="Imports" value={imports.length} />
          <Stat label="Imported by" value={consumers.length} />
          <Stat label="Blast radius" value={blastRadius} />
          {node.classes > 0 && <Stat label="Classes" value={node.classes} />}
          {node.types > 0 && <Stat label="Types" value={node.types} />}
        </div>

        {/* Dependency lists */}
        <DepSection title="Imports" items={imports} onNavigate={onNavigate} />
        <DepSection title="Imported by" items={consumers} onNavigate={onNavigate} />

        {/* Flags */}
        {consumers.length >= 5 && (
          <div>
            <SectionTitle>Review Notes</SectionTitle>
            <Flag
              severity={consumers.length >= 10 ? "critical" : "warn"}
              text={`High fan-in: ${consumers.length} files depend on this${consumers.length >= 10 ? " — changes here have wide blast radius" : ""}`}
            />
          </div>
        )}
        {imports.length === 0 && consumers.length === 0 && (
          <div>
            <SectionTitle>Review Notes</SectionTitle>
            <div className="text-xs px-3 py-2 rounded-md bg-muted border border-border text-muted-foreground">
              Isolated file — no import relationships detected
            </div>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}

function Badge({ text, bg, fg }: { text: string; bg: string; fg: string }) {
  return (
    <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full" style={{ background: bg, color: fg }}>
      {text}
    </span>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="px-3 py-2.5 rounded-lg bg-muted border border-border">
      <div className="text-xs uppercase tracking-wider font-semibold text-muted-foreground/60">{label}</div>
      <div className="text-lg font-bold text-foreground mt-0.5">{value}</div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-xs uppercase tracking-wider font-semibold text-muted-foreground/60 mb-2">{children}</div>
  );
}

function DepSection({ title, items, onNavigate }: { title: string; items: VisNode[]; onNavigate: (n: VisNode) => void }) {
  if (items.length === 0) return null;
  return (
    <div>
      <SectionTitle>{title} ({items.length})</SectionTitle>
      <div className="space-y-0.5">
        {items.map((d) => {
          const c = CATEGORY_META[d.cat]?.color ?? "#94a3b8";
          return (
            <button
              key={d.id}
              onClick={() => onNavigate(d)}
              className="flex items-center gap-2 w-full text-left px-1 py-1 text-xs text-muted-foreground hover:text-primary rounded-sm transition-colors cursor-pointer"
            >
              <span className="w-[6px] h-[6px] rounded-full shrink-0" style={{ background: c }} />
              <span className="truncate">{d.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Flag({ severity, text }: { severity: "warn" | "critical"; text: string }) {
  const styles = {
    warn: "bg-[rgba(251,191,36,0.08)] border-[rgba(251,191,36,0.2)] text-[#fbbf24]",
    critical: "bg-[rgba(239,68,68,0.08)] border-[rgba(239,68,68,0.2)] text-[#ef4444]",
  };
  return (
    <div className={`text-xs px-3 py-2 rounded-md border ${styles[severity]}`}>{text}</div>
  );
}

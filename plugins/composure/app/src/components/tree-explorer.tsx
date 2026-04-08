'use client'

import { useState, useMemo } from "react";
import { Icon } from "@iconify/react";
import type { VisNode, TreeDir } from "@/lib/types";
import { getCategoryMeta } from "@/lib/types";

interface TreeExplorerProps {
  nodes: VisNode[];
  selectedId: string | null;
  onSelect: (node: VisNode) => void;
  search: string;
}

function buildTree(nodes: VisNode[]): TreeDir {
  const root: TreeDir = { name: "", children: {}, files: [], stats: { count: 0, lines: 0 } };

  for (const n of nodes) {
    const parts = n.path.split("/");
    let cur = root;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!cur.children[parts[i]]) {
        cur.children[parts[i]] = { name: parts[i], children: {}, files: [], stats: { count: 0, lines: 0 } };
      }
      cur = cur.children[parts[i]];
    }
    cur.files.push(n);
  }

  function calcStats(dir: TreeDir): { count: number; lines: number } {
    let count = dir.files.length;
    let lines = dir.files.reduce((s, f) => s + f.lines, 0);
    for (const child of Object.values(dir.children)) {
      const s = calcStats(child);
      count += s.count;
      lines += s.lines;
    }
    dir.stats = { count, lines };
    return dir.stats;
  }
  calcStats(root);
  return root;
}

function DirNode({
  dir,
  path,
  selectedId,
  onSelect,
  defaultOpen,
}: {
  dir: TreeDir;
  path: string;
  selectedId: string | null;
  onSelect: (node: VisNode) => void;
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const sortedDirs = useMemo(
    () => Object.keys(dir.children).sort(),
    [dir.children],
  );
  const sortedFiles = useMemo(
    () => [...dir.files].sort((a, b) => a.label.localeCompare(b.label)),
    [dir.files],
  );

  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 w-full px-1.5 py-1 cursor-pointer rounded-md text-muted-foreground select-none hover:bg-muted hover:text-foreground transition-colors"
      >
        <Icon
          icon="ph:caret-right-bold"
          width={14}
          height={14}
          className={`shrink-0 text-muted-foreground transition-transform duration-150 ${open ? "rotate-90" : ""}`}
        />
        <span className="font-semibold text-foreground text-xs truncate">{dir.name}</span>
        <span className="text-[10px] text-muted-foreground ml-auto shrink-0">
          {dir.stats.count} {dir.stats.count === 1 ? "file" : "files"}
        </span>
      </button>
      {open && (
        <div className="pl-4 border-l border-border ml-[7px]">
          {sortedDirs.map((k) => (
            <DirNode
              key={k}
              dir={dir.children[k]}
              path={path ? `${path}/${k}` : k}
              selectedId={selectedId}
              onSelect={onSelect}
              defaultOpen={false}
            />
          ))}
          {sortedFiles.map((f) => (
            <FileNode key={f.id} node={f} selected={selectedId === f.id} onSelect={onSelect} />
          ))}
        </div>
      )}
    </div>
  );
}

function FileNode({
  node,
  selected,
  onSelect,
}: {
  node: VisNode;
  selected: boolean;
  onSelect: (node: VisNode) => void;
}) {
  const meta = getCategoryMeta(node.cat);

  return (
    <button
      onClick={() => onSelect(node)}
      className={`flex items-center gap-2 w-full pl-5 pr-1.5 py-1 cursor-pointer rounded-md transition-all duration-100 text-xs ${
        selected
          ? "bg-primary/12 text-primary"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      }`}
    >
      <span
        className="size-1.5 rounded-full shrink-0"
        style={{ background: meta.color }}
      />
      <span className="flex-1 truncate text-left">{node.label}</span>
      <span className="text-[10px] text-muted-foreground font-mono shrink-0">{node.lines}</span>
    </button>
  );
}

export function TreeExplorer({ nodes, selectedId, onSelect, search }: TreeExplorerProps) {
  const filtered = useMemo(() => {
    if (!search) return nodes;
    const q = search.toLowerCase();
    return nodes.filter(
      (n) => n.label.toLowerCase().includes(q) || n.path.toLowerCase().includes(q),
    );
  }, [nodes, search]);

  const tree = useMemo(() => buildTree(filtered), [filtered]);

  const topDirs = useMemo(() => Object.keys(tree.children).sort(), [tree.children]);
  const topFiles = useMemo(
    () => [...tree.files].sort((a, b) => a.label.localeCompare(b.label)),
    [tree.files],
  );

  return (
    <div className="flex-1 overflow-y-auto px-4 py-3 text-xs">
      {topDirs.map((k) => (
        <DirNode
          key={k}
          dir={tree.children[k]}
          path={k}
          selectedId={selectedId}
          onSelect={onSelect}
          defaultOpen={!!search}
        />
      ))}
      {topFiles.map((f) => (
        <FileNode key={f.id} node={f} selected={selectedId === f.id} onSelect={onSelect} />
      ))}
    </div>
  );
}

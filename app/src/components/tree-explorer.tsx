import { useState, useMemo } from "react";
import { Icon } from "@iconify/react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { VisNode, TreeDir } from "@/lib/types";
import { CATEGORY_META } from "@/lib/types";

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
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex items-center gap-1 w-full px-2 py-[3px] text-sm hover:bg-accent rounded-sm cursor-pointer text-muted-foreground group">
        <Icon
          icon="ph:caret-right-bold"
          width={10}
          className={`shrink-0 text-muted-foreground transition-transform ${open ? "rotate-90" : ""}`}
        />
        <Icon
          icon={open ? "ph:folder-open-fill" : "ph:folder-fill"}
          width={16}
          className="shrink-0 text-muted-foreground"
        />
        <span className="truncate font-medium text-foreground">{dir.name}</span>
        <span className="ml-auto text-[10px] text-foreground-faint shrink-0">{dir.stats.count}</span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="ml-3 border-l border-border pl-2">
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
      </CollapsibleContent>
    </Collapsible>
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
  const color = CATEGORY_META[node.cat]?.color ?? "#94a3b8";

  return (
    <button
      onClick={() => onSelect(node)}
      className={`flex items-center gap-[6px] w-full px-2 py-[3px] text-sm rounded-sm cursor-pointer transition-colors ${
        selected
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-accent hover:text-foreground"
      }`}
    >
      <span
        className="w-[5px] h-[5px] rounded-full shrink-0"
        style={{ background: color }}
      />
      <span className="truncate">{node.label}</span>
      <span className="ml-auto text-[9px] font-mono text-foreground-faint shrink-0">{node.lines}</span>
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
    <ScrollArea className="flex-1">
      <div className="py-1">
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
    </ScrollArea>
  );
}

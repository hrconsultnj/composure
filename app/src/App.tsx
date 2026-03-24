import { useState, useMemo, useCallback } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { ActivityBar } from "@/components/activity-bar";
import { TreeExplorer } from "@/components/tree-explorer";
import { FileDetail } from "@/components/file-detail";
import { TabBar } from "@/components/tab-bar";
import { LegendPanel } from "@/components/legend-panel";
import { StatusBar } from "@/components/status-bar";
import { GraphCanvas } from "@/components/graph-canvas";
import { useGraphData } from "@/hooks/use-graph-data";
import type { Activity, VisNode } from "@/lib/types";
import { CAT_ORDER } from "@/lib/types";

function isActivity(value: string | null): value is Activity {
  return value === "explorer" || value === "graph" || value === "legend";
}

export default function App() {
  const { data, loading } = useGraphData();

  // Theme
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem("composure-theme");
    if (saved === "light") {
      document.documentElement.classList.remove("dark");
      return false;
    }
    document.documentElement.classList.add("dark");
    return true;
  });
  const toggleTheme = useCallback(() => {
    setIsDark((prev) => {
      const next = !prev;
      localStorage.setItem("composure-theme", next ? "dark" : "light");
      document.documentElement.classList.toggle("dark", next);
      return next;
    });
  }, []);

  // Activity panel
  const [activity, setActivity] = useState<Activity>(() => {
    const saved = localStorage.getItem("composure-activity");
    return isActivity(saved) ? saved : "explorer";
  });

  const handleActivityChange = useCallback((a: Activity) => {
    setActivity(a);
    localStorage.setItem("composure-activity", a);
  }, []);

  // Search
  const [search, setSearch] = useState("");

  // Hidden categories
  const [hiddenCats, setHiddenCats] = useState<Set<string>>(new Set());
  const toggleCat = useCallback((cat: string) => {
    setHiddenCats((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }, []);

  // Open tabs
  const [openTabs, setOpenTabs] = useState<VisNode[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);

  // Derived data
  const allNodes = data?.nodes ?? [];

  const nodes = useMemo(
    () => allNodes.filter((n) => !hiddenCats.has(n.cat)),
    [allNodes, hiddenCats],
  );

  const nodeMap = useMemo(() => {
    const map: Record<string, VisNode> = {};
    for (const n of allNodes) map[n.id] = n;
    return map;
  }, [allNodes]);

  const reverseDeps = useMemo(() => {
    const rev: Record<string, string[]> = {};
    for (const n of allNodes) rev[n.id] = [];
    for (const n of allNodes) {
      for (const imp of n.imports) {
        if (rev[imp]) rev[imp].push(n.id);
      }
    }
    return rev;
  }, [allNodes]);

  const categories = useMemo(() => {
    const cats = new Set(allNodes.map((n) => n.cat));
    return CAT_ORDER.filter((c) => cats.has(c));
  }, [allNodes]);

  const edgeCount = useMemo(
    () => allNodes.reduce((sum, n) => sum + n.imports.length, 0),
    [allNodes],
  );

  const selectFile = useCallback((node: VisNode) => {
    setActiveTabId(node.id);
    setOpenTabs((prev) => {
      if (prev.some((t) => t.id === node.id)) return prev;
      return [...prev, node];
    });
  }, []);

  const closeTab = useCallback((id: string) => {
    setOpenTabs((prev) => {
      const next = prev.filter((t) => t.id !== id);
      if (activeTabId === id) {
        setActiveTabId(next.length > 0 ? next[next.length - 1].id : null);
      }
      return next;
    });
  }, [activeTabId]);

  const activeTab = activeTabId ? nodeMap[activeTabId] : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background text-muted-foreground text-sm">
        Loading graph data...
      </div>
    );
  }

  if (!data || data.nodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen bg-background text-foreground">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 rounded-lg bg-primary mx-auto flex items-center justify-center text-lg font-extrabold text-primary-foreground">C</div>
          <h2 className="text-lg font-semibold">No graph data</h2>
          <p className="text-sm text-muted-foreground max-w-xs">
            Run <code className="px-1.5 py-0.5 rounded bg-muted font-mono text-xs">/build-graph</code> to build the knowledge graph, then <code className="px-1.5 py-0.5 rounded bg-muted font-mono text-xs">/view-graph</code> to launch.
          </p>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider delay={300}>
      <div className="flex flex-col h-screen bg-background">
        {/* Header */}
        <div className="flex items-center h-12 px-4 border-b border-border shrink-0 gap-3">
          <span className="w-5 h-5 rounded bg-primary flex items-center justify-center text-[10px] font-extrabold text-background shrink-0">
            C
          </span>
          <span className="text-base font-bold">
            <span className="text-primary">Composure</span>
            <span className="text-muted-foreground/60 mx-1.5">&mdash;</span>
            <span className="text-muted-foreground font-normal">Code Review Graph</span>
          </span>
          <input
            type="text"
            placeholder="Search files..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ml-auto h-6 w-44 px-2.5 rounded-md text-sm border border-border bg-muted text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-ring"
          />
        </div>

        {/* Main layout */}
        <div className="flex flex-1 overflow-hidden">
          <ActivityBar
            activity={activity}
            onActivityChange={handleActivityChange}
            isDark={isDark}
            onThemeToggle={toggleTheme}
          />

          <ResizablePanelGroup orientation="horizontal" className="flex-1">
            {/* Sidebar */}
            <ResizablePanel defaultSize={20} minSize={15}>
              <div className="flex flex-col h-full border-r border-border bg-background">
                <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
                  {activity === "explorer" ? "Explorer" : activity === "legend" ? "Legend" : "Graph"}
                </div>
                {activity === "explorer" && (
                  <TreeExplorer
                    nodes={nodes}
                    selectedId={activeTabId}
                    onSelect={selectFile}
                    search={search}
                  />
                )}
                {activity === "legend" && (
                  <LegendPanel
                    categories={categories}
                    hiddenCats={hiddenCats}
                    onToggle={toggleCat}
                  />
                )}
                {activity === "graph" && (
                  <LegendPanel
                    categories={categories}
                    hiddenCats={hiddenCats}
                    onToggle={toggleCat}
                  />
                )}
              </div>
            </ResizablePanel>

            <ResizableHandle withHandle />

            {/* Main content area */}
            <ResizablePanel defaultSize={75}>
              <div className="flex flex-col h-full">
                {activity === "graph" ? (
                  <GraphCanvas
                    nodes={nodes}
                    nodeMap={nodeMap}
                    reverseDeps={reverseDeps}
                    selectedId={activeTabId}
                    onSelect={selectFile}
                    search={search}
                    hiddenCats={hiddenCats}
                    isDark={isDark}
                  />
                ) : (
                  <>
                    <TabBar
                      tabs={openTabs}
                      activeId={activeTabId}
                      onSelect={setActiveTabId}
                      onClose={closeTab}
                    />

                    {activeTab ? (
                      <FileDetail
                        node={activeTab}
                        nodeMap={nodeMap}
                        reverseDeps={reverseDeps}
                        onNavigate={selectFile}
                      />
                    ) : (
                      <div className="flex-1 flex items-center justify-center text-muted-foreground/60 text-sm">
                        <div className="text-center space-y-2">
                          <div className="text-4xl opacity-10">
                            <span className="w-8 h-8 rounded bg-primary/20 inline-flex items-center justify-center text-primary text-lg font-bold">C</span>
                          </div>
                          <div>Select a file to view details</div>
                          <div className="text-[11px] text-muted-foreground/60">
                            {data.stats.filesCount} files &middot; {edgeCount} connections &middot; {categories.length} categories
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>

        <StatusBar
          filesCount={data.stats.filesCount}
          edgeCount={edgeCount}
          catCount={categories.length}
        />
      </div>
    </TooltipProvider>
  );
}

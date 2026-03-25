import { useState, useMemo, useCallback } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider, useTheme } from "@/providers/theme-provider";
import { AppLayout } from "@/components/layout/app-layout";
import { TreeExplorer } from "@/components/tree-explorer";
import { GraphCanvas } from "@/components/graph-canvas";
import { FloatingLegend } from "@/components/floating-legend";
import { useGraphData } from "@/hooks/use-graph-data";
import type { View, VisNode } from "@/lib/types";
import { orderCategories } from "@/lib/types";

export default function App() {
  return (
    <ThemeProvider>
      <TooltipProvider delay={300}>
        <GraphApp />
      </TooltipProvider>
    </ThemeProvider>
  );
}

function GraphApp() {
  const { data, loading } = useGraphData();
  const { isDark } = useTheme();

  const [currentView, setCurrentView] = useState<View>(() =>
    localStorage.getItem("composure-view") === "tree" ? "tree" : "graph",
  );
  const handleViewChange = useCallback((v: View) => {
    setCurrentView(v);
    localStorage.setItem("composure-view", v);
  }, []);

  const [search, setSearch] = useState("");
  const [hiddenCats, setHiddenCats] = useState<Set<string>>(new Set());
  const toggleCat = useCallback((cat: string) => {
    setHiddenCats((prev) => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  }, []);

  const [openTabs, setOpenTabs] = useState<VisNode[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);

  const allNodes = data?.nodes ?? [];
  const nodes = useMemo(() => allNodes.filter((n) => !hiddenCats.has(n.cat)), [allNodes, hiddenCats]);
  const nodeMap = useMemo(() => Object.fromEntries(allNodes.map((n) => [n.id, n])), [allNodes]);
  const reverseDeps = useMemo(() => {
    const rev: Record<string, string[]> = {};
    for (const n of allNodes) rev[n.id] = [];
    for (const n of allNodes) for (const imp of n.imports) if (rev[imp]) rev[imp].push(n.id);
    return rev;
  }, [allNodes]);
  const categories = useMemo(() => {
    const cats = [...new Set(allNodes.map((n) => n.cat))];
    return orderCategories(cats);
  }, [allNodes]);
  const edgeCount = useMemo(() => allNodes.reduce((s, n) => s + n.imports.length, 0), [allNodes]);

  const selectFile = useCallback((node: VisNode) => {
    setActiveTabId(node.id);
    setOpenTabs((prev) => prev.some((t) => t.id === node.id) ? prev : [...prev, node]);
  }, []);
  const closeTab = useCallback((id: string) => {
    setOpenTabs((prev) => {
      const next = prev.filter((t) => t.id !== id);
      if (activeTabId === id) setActiveTabId(next.length > 0 ? next[next.length - 1].id : null);
      return next;
    });
  }, [activeTabId]);

  const activeTab = activeTabId ? nodeMap[activeTabId] ?? null : null;

  if (loading) {
    return <div className="flex items-center justify-center h-screen bg-background text-muted-foreground text-sm">Loading graph data...</div>;
  }
  if (!data || data.nodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen bg-background text-foreground">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 rounded-lg bg-primary mx-auto flex items-center justify-center text-lg font-extrabold text-primary-foreground">C</div>
          <h2 className="text-lg font-semibold">No graph data</h2>
          <p className="text-sm text-muted-foreground max-w-xs">
            Run <code className="px-1.5 py-0.5 rounded bg-muted font-mono text-xs">/build-graph</code> then <code className="px-1.5 py-0.5 rounded bg-muted font-mono text-xs">/view-graph</code>
          </p>
        </div>
      </div>
    );
  }

  return (
    <AppLayout
      currentView={currentView}
      onViewChange={handleViewChange}
      filesCount={data.stats.filesCount}
      edgeCount={edgeCount}
      categoryCount={categories.length}
      generatedAt={data.generatedAt}
      search={search}
      onSearchChange={setSearch}
      openTabs={openTabs}
      activeTabId={activeTabId}
      onTabSelect={setActiveTabId}
      onTabClose={closeTab}
      activeTab={activeTab}
      nodeMap={nodeMap}
      reverseDeps={reverseDeps}
      onNavigate={selectFile}
    >
      {currentView === "tree" ? (
        <TreeExplorer nodes={nodes} selectedId={activeTabId} onSelect={selectFile} search={search} />
      ) : (
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
      )}
      {currentView === "graph" && (
        <FloatingLegend categories={categories} hiddenCats={hiddenCats} onToggle={toggleCat} />
      )}
    </AppLayout>
  );
}

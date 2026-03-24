import { Icon } from "@iconify/react";
import { useTheme } from "@/providers/theme-provider";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { View } from "@/lib/types";

interface HeaderProps {
  currentView: View;
  onViewChange: (view: View) => void;
  filesCount: number;
  edgeCount: number;
  categoryCount: number;
  generatedAt: string;
  search: string;
  onSearchChange: (value: string) => void;
}

export function Header({
  currentView,
  onViewChange,
  filesCount,
  edgeCount,
  categoryCount,
  generatedAt,
  search,
  onSearchChange,
}: HeaderProps) {
  const { isDark, toggleTheme } = useTheme();

  return (
    <header className="px-4 py-2.5 border-b border-border bg-card flex items-center gap-3 shrink-0">
      {/* Brand */}
      <h1 className="flex items-center gap-2">
        <span className="size-7 rounded-md bg-primary text-primary-foreground text-sm font-extrabold flex items-center justify-center shrink-0">
          C
        </span>
        <span className="text-primary text-base font-bold tracking-tight">Composure</span>
      </h1>

      <Separator orientation="vertical" className="h-5" />

      <span className="text-muted-foreground text-sm">Code Review Graph</span>

      <Badge variant="outline" className="text-green-500 border-green-500/30 bg-green-500/10">
        {generatedAt}
      </Badge>

      {/* View toggle */}
      <ViewToggle currentView={currentView} onViewChange={onViewChange} />

      {/* Stats + Controls */}
      <div className="ml-auto flex items-center gap-4 text-sm text-muted-foreground">
        <span><strong className="text-foreground font-semibold">{filesCount}</strong> files</span>
        <Separator orientation="vertical" className="h-4" />
        <span><strong className="text-foreground font-semibold">{edgeCount}</strong> connections</span>
        <Separator orientation="vertical" className="h-4" />
        <span><strong className="text-foreground font-semibold">{categoryCount}</strong> categories</span>

        <Input
          placeholder="Search files..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-[200px]"
        />

        <Button variant="outline" size="icon" onClick={toggleTheme} title="Toggle theme">
          <Icon icon={isDark ? "ph:moon" : "ph:sun"} width={15} />
        </Button>
      </div>
    </header>
  );
}

function ViewToggle({ currentView, onViewChange }: { currentView: View; onViewChange: (v: View) => void }) {
  return (
    <div className="flex gap-0.5 bg-muted border border-border rounded-lg p-0.5">
      <Button
        variant={currentView === "graph" ? "default" : "ghost"}
        size="icon-sm"
        onClick={() => onViewChange("graph")}
        title="Dependency graph"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="5" cy="6" r="2" />
          <circle cx="12" cy="18" r="2" />
          <circle cx="19" cy="6" r="2" />
          <path d="M5 8v2a4 4 0 004 4h6a4 4 0 004-4V8" />
          <line x1="12" y1="14" x2="12" y2="16" />
        </svg>
      </Button>
      <Button
        variant={currentView === "tree" ? "default" : "ghost"}
        size="icon-sm"
        onClick={() => onViewChange("tree")}
        title="File explorer"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
        </svg>
      </Button>
    </div>
  );
}

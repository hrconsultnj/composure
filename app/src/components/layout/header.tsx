import { Icon } from "@iconify/react";
import { useTheme } from "@/providers/theme-provider";
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
    <header className="px-7 py-4 border-b border-border flex items-center gap-3.5 flex-wrap shrink-0">
      <h1 className="text-lg font-bold flex items-center gap-2.5">
        <span className="w-[26px] h-[26px] rounded-md bg-primary text-primary-foreground text-sm font-extrabold flex items-center justify-center shrink-0">
          C
        </span>
        <span className="text-primary">Composure</span>
        <span className="text-muted-foreground/30 font-light">&mdash;</span>
        <span className="text-muted-foreground text-sm font-normal">Code Review Graph</span>
      </h1>

      <span className="text-[10px] text-green-500 border border-green-500/30 rounded-full px-2.5 py-0.5 bg-green-500/8">
        {generatedAt}
      </span>

      <ViewToggle currentView={currentView} onViewChange={onViewChange} />

      <div className="ml-auto flex gap-4 text-xs text-muted-foreground items-center">
        <span><strong className="text-foreground font-semibold">{filesCount}</strong> files</span>
        <span><strong className="text-foreground font-semibold">{edgeCount}</strong> connections</span>
        <span><strong className="text-foreground font-semibold">{categoryCount}</strong> categories</span>

        <input
          type="text"
          placeholder="Search files..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="px-3.5 py-1 rounded-full border border-border bg-muted text-foreground text-[11px] w-44 outline-none placeholder:text-muted-foreground/40 focus:border-ring"
        />

        <button
          onClick={toggleTheme}
          title="Toggle theme"
          className="w-[30px] h-[30px] rounded-[7px] border border-border bg-muted text-muted-foreground flex items-center justify-center hover:text-primary hover:border-ring transition-colors cursor-pointer"
        >
          <Icon icon={isDark ? "ph:moon" : "ph:sun"} width={15} />
        </button>
      </div>
    </header>
  );
}

function ViewToggle({ currentView, onViewChange }: { currentView: View; onViewChange: (v: View) => void }) {
  return (
    <div className="flex gap-0.5 bg-muted border border-border rounded-lg p-0.5">
      <button
        onClick={() => onViewChange("graph")}
        title="Dependency graph"
        className={`w-7 h-7 rounded-md flex items-center justify-center transition-colors cursor-pointer ${
          currentView === "graph" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="5" cy="6" r="2" />
          <circle cx="12" cy="18" r="2" />
          <circle cx="19" cy="6" r="2" />
          <path d="M5 8v2a4 4 0 004 4h6a4 4 0 004-4V8" />
          <line x1="12" y1="14" x2="12" y2="16" />
        </svg>
      </button>
      <button
        onClick={() => onViewChange("tree")}
        title="File explorer"
        className={`w-7 h-7 rounded-md flex items-center justify-center transition-colors cursor-pointer ${
          currentView === "tree" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
        </svg>
      </button>
    </div>
  );
}

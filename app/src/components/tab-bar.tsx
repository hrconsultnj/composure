import { Icon } from "@iconify/react";
import type { VisNode } from "@/lib/types";
import { CATEGORY_META } from "@/lib/types";

interface TabBarProps {
  tabs: VisNode[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onClose: (id: string) => void;
}

export function TabBar({ tabs, activeId, onSelect, onClose }: TabBarProps) {
  if (tabs.length === 0) return null;

  return (
    <div className="flex items-center border-b border-border bg-background overflow-x-auto shrink-0">
      {tabs.map((tab) => {
        const color = CATEGORY_META[tab.cat]?.color ?? "#94a3b8";
        const isActive = tab.id === activeId;

        return (
          <button
            key={tab.id}
            onClick={() => onSelect(tab.id)}
            className={`group flex items-center gap-1.5 px-3 py-1.5 text-sm border-r border-border shrink-0 transition-colors ${
              isActive
                ? "bg-accent text-foreground border-t-2"
                : "text-muted-foreground hover:text-muted-foreground hover:bg-muted"
            }`}
            style={isActive ? { borderTopColor: color } : undefined}
          >
            <span className="w-[5px] h-[5px] rounded-full shrink-0" style={{ background: color }} />
            <span className="truncate max-w-[140px]">{tab.label}</span>
            <span
              onClick={(e) => {
                e.stopPropagation();
                onClose(tab.id);
              }}
              className="ml-1 w-4 h-4 flex items-center justify-center rounded-sm opacity-0 group-hover:opacity-100 hover:bg-accent transition-opacity"
            >
              <Icon icon="ph:x" width={10} />
            </span>
          </button>
        );
      })}
    </div>
  );
}

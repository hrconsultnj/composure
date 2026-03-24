import { useState } from "react";
import { Icon } from "@iconify/react";
import { Button } from "@/components/ui/button";
import { getCategoryMeta } from "@/lib/types";

interface FloatingLegendProps {
  categories: string[];
  hiddenCats: Set<string>;
  onToggle: (cat: string) => void;
}

export function FloatingLegend({ categories, hiddenCats, onToggle }: FloatingLegendProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="fixed bottom-14 right-4 z-10 bg-popover border border-border rounded-lg text-xs shadow-md backdrop-blur-sm min-w-[140px]">
      <button
        onClick={() => setCollapsed((p) => !p)}
        className="flex items-center justify-between w-full px-3 py-2 cursor-pointer select-none text-muted-foreground text-[10px] font-semibold tracking-widest uppercase gap-2 hover:text-foreground transition-colors"
      >
        <span>Legend</span>
        <Icon
          icon="ph:caret-down"
          width={12}
          className={`transition-transform ${collapsed ? "rotate-180" : ""}`}
        />
      </button>

      {!collapsed && (
        <div className="px-2 pb-2">
          {categories.map((cat) => {
            const meta = getCategoryMeta(cat);
            const isHidden = hiddenCats.has(cat);
            return (
              <button
                key={cat}
                onClick={() => onToggle(cat)}
                className={`flex items-center gap-2 w-full cursor-pointer px-1.5 py-1 rounded-md select-none transition-all text-xs ${
                  isHidden
                    ? "opacity-35 line-through text-muted-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                <span className="size-2.5 rounded-sm shrink-0" style={{ background: meta.color }} />
                <span>{meta.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

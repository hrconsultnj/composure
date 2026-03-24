import { useState } from "react";
import { Icon } from "@iconify/react";
import { getCategoryMeta } from "@/lib/types";

interface FloatingLegendProps {
  categories: string[];
  hiddenCats: Set<string>;
  onToggle: (cat: string) => void;
}

export function FloatingLegend({ categories, hiddenCats, onToggle }: FloatingLegendProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="fixed bottom-[60px] right-3.5 z-10 bg-background/95 border border-border rounded-[10px] text-[10px] backdrop-blur-sm min-w-[130px]">
      <button
        onClick={() => setCollapsed((p) => !p)}
        className="flex items-center justify-between w-full px-3 py-[7px] cursor-pointer select-none text-muted-foreground text-[10px] font-semibold tracking-[0.04em] gap-2 hover:text-foreground"
      >
        <span>Legend</span>
        <Icon
          icon="ph:caret-down"
          width={12}
          className={`transition-transform ${collapsed ? "rotate-180" : ""}`}
        />
      </button>

      {!collapsed && (
        <div className="px-3 pb-2">
          {categories.map((cat) => {
            const meta = getCategoryMeta(cat);
            const isHidden = hiddenCats.has(cat);
            return (
              <button
                key={cat}
                onClick={() => onToggle(cat)}
                className={`flex items-center gap-[7px] w-full my-[3px] cursor-pointer px-1 py-0.5 rounded select-none transition-all text-[10px] ${
                  isHidden
                    ? "opacity-35 line-through text-muted-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-[3px] shrink-0" style={{ background: meta.color }} />
                <span>{meta.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

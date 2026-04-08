'use client'

import { useState } from "react";
import { Icon } from "@iconify/react";
import { getCategoryMeta } from "@/lib/types";

interface LegendPanelProps {
  categories: string[];
  hiddenCats: Set<string>;
  onToggle: (cat: string) => void;
  floating?: boolean;
}

export function LegendPanel({ categories, hiddenCats, onToggle, floating }: LegendPanelProps) {
  const [collapsed, setCollapsed] = useState(false);

  if (floating) {
    return (
      <div className="fixed bottom-[60px] right-3.5 bg-background/95 border border-border rounded-[10px] text-[10px] z-10 backdrop-blur-sm min-w-[130px]">
        {/* Toggle header */}
        <div
          onClick={() => setCollapsed((c) => !c)}
          className="flex items-center justify-between px-3 py-[7px] cursor-pointer select-none text-muted-foreground text-[10px] font-semibold tracking-[0.04em] gap-2 hover:text-foreground"
        >
          <span>Legend</span>
          <Icon
            icon="ph:caret-down-bold"
            width={12}
            height={12}
            className={`transition-transform duration-200 ${collapsed ? "rotate-180" : ""}`}
          />
        </div>

        {/* Body */}
        {!collapsed && (
          <div className="px-3 pb-2">
            {categories.map((cat) => {
              const meta = getCategoryMeta(cat);
              const isHidden = hiddenCats.has(cat);

              return (
                <button
                  key={cat}
                  onClick={() => onToggle(cat)}
                  className={`flex items-center gap-[7px] w-full my-[3px] cursor-pointer px-1 py-0.5 rounded select-none transition-all duration-150 ${
                    isHidden
                      ? "opacity-35 line-through text-muted-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-[3px] shrink-0"
                    style={{ background: meta.color }}
                  />
                  <span>{meta.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // Inline mode (sidebar)
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="py-2 px-3 space-y-0.5">
        {categories.map((cat) => {
          const meta = getCategoryMeta(cat);
          const isHidden = hiddenCats.has(cat);

          return (
            <button
              key={cat}
              onClick={() => onToggle(cat)}
              className={`flex items-center gap-[7px] w-full px-1 py-0.5 rounded select-none cursor-pointer transition-all duration-150 ${
                isHidden
                  ? "opacity-35 line-through text-muted-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <span
                className="w-2.5 h-2.5 rounded-[3px] shrink-0"
                style={{ background: meta.color }}
              />
              <span className="text-[10px]">{meta.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

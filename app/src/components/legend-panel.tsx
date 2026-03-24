import { ScrollArea } from "@/components/ui/scroll-area";
import { CATEGORY_META } from "@/lib/types";

interface LegendPanelProps {
  categories: string[];
  hiddenCats: Set<string>;
  onToggle: (cat: string) => void;
}

export function LegendPanel({ categories, hiddenCats, onToggle }: LegendPanelProps) {
  return (
    <ScrollArea className="flex-1">
      <div className="py-2 px-1 space-y-0.5">
        {categories.map((cat) => {
          const meta = CATEGORY_META[cat] ?? { label: cat, color: "#94a3b8" };
          const isHidden = hiddenCats.has(cat);

          return (
            <button
              key={cat}
              onClick={() => onToggle(cat)}
              className={`flex items-center gap-2 w-full px-2 py-1.5 text-sm rounded-sm cursor-pointer transition-all ${
                isHidden
                  ? "opacity-35 line-through text-muted-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              }`}
            >
              <span
                className="w-2.5 h-2.5 rounded-sm shrink-0"
                style={{ background: meta.color }}
              />
              <span>{meta.label}</span>
            </button>
          );
        })}
      </div>
    </ScrollArea>
  );
}

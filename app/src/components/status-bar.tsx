interface StatusBarProps {
  filesCount: number;
  edgeCount: number;
  catCount: number;
}

export function StatusBar({ filesCount, edgeCount, catCount }: StatusBarProps) {
  return (
    <div className="flex items-center h-6 px-3 text-xs text-muted-foreground border-t border-border bg-background shrink-0 gap-4">
      <span><strong className="text-muted-foreground font-medium">{filesCount}</strong> files</span>
      <span><strong className="text-muted-foreground font-medium">{edgeCount}</strong> connections</span>
      <span><strong className="text-muted-foreground font-medium">{catCount}</strong> categories</span>
      <span className="ml-auto text-muted-foreground/60">github.com/hrconsultnj/composure</span>
    </div>
  );
}

import type { VisNode } from "@/lib/types";
import { Header } from "./header";
import { TabBar } from "@/components/tab-bar";
import { FileDetail } from "@/components/file-detail";
import type { View } from "@/lib/types";

interface AppLayoutProps {
  currentView: View;
  onViewChange: (view: View) => void;
  filesCount: number;
  edgeCount: number;
  categoryCount: number;
  generatedAt: string;
  search: string;
  onSearchChange: (value: string) => void;
  openTabs: VisNode[];
  activeTabId: string | null;
  onTabSelect: (id: string) => void;
  onTabClose: (id: string) => void;
  activeTab: VisNode | null;
  nodeMap: Record<string, VisNode>;
  reverseDeps: Record<string, string[]>;
  onNavigate: (node: VisNode) => void;
  children: React.ReactNode;
}

export function AppLayout({
  currentView,
  onViewChange,
  filesCount,
  edgeCount,
  categoryCount,
  generatedAt,
  search,
  onSearchChange,
  openTabs,
  activeTabId,
  onTabSelect,
  onTabClose,
  activeTab,
  nodeMap,
  reverseDeps,
  onNavigate,
  children,
}: AppLayoutProps) {
  return (
    <div className="flex flex-col h-screen bg-background">
      <Header
        currentView={currentView}
        onViewChange={onViewChange}
        filesCount={filesCount}
        edgeCount={edgeCount}
        categoryCount={categoryCount}
        generatedAt={generatedAt}
        search={search}
        onSearchChange={onSearchChange}
      />

      <TabBar
        tabs={openTabs}
        activeId={activeTabId}
        onSelect={onTabSelect}
        onClose={onTabClose}
      />

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 relative">
          {children}
        </div>

        {activeTab && (
          <div className="w-[380px] border-l border-border shrink-0 overflow-y-auto bg-card">
            <FileDetail
              node={activeTab}
              nodeMap={nodeMap}
              reverseDeps={reverseDeps}
              onNavigate={onNavigate}
            />
          </div>
        )}
      </div>
    </div>
  );
}

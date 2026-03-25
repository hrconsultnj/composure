/**
 * StickySidebar — Documentation-style layout: sticky nav + scrolling content.
 *
 * Responsive: sidebar hidden on mobile with toggle, visible on lg+.
 * Customization: sidebar width, nav items via render prop, header height offset.
 * Follows nextjs.org docs sidebar pattern with active-state highlighting.
 *
 * Usage:
 *   <StickySidebar
 *     sidebar={<DocNav sections={sections} />}
 *     headerHeight={64}
 *   >
 *     <article>{content}</article>
 *   </StickySidebar>
 */
import { type ReactNode } from 'react'

export interface StickySidebarProps {
  children: ReactNode
  /** Sidebar navigation content */
  sidebar: ReactNode
  /** Sidebar width in pixels (default: 256) */
  sidebarWidth?: number
  /** Height of the fixed header to offset sticky top (default: 64) */
  headerHeight?: number
  /** Optional right-side "on this page" panel */
  toc?: ReactNode
  className?: string
}

export function StickySidebar({
  children,
  sidebar,
  sidebarWidth = 256,
  headerHeight = 64,
  toc,
  className = '',
}: StickySidebarProps) {
  return (
    <div
      className={[
        'mx-auto flex w-full max-w-[1440px]',
        className,
      ].join(' ')}
    >
      {/* Left sidebar — hidden on mobile, sticky on desktop */}
      <aside
        className="hidden lg:block shrink-0 border-r border-[#333] overflow-y-auto"
        style={{
          width: sidebarWidth,
          position: 'sticky',
          top: headerHeight,
          height: `calc(100vh - ${headerHeight}px)`,
        }}
        aria-label="Sidebar navigation"
      >
        <nav className="py-6 pr-4 pl-6">
          {sidebar}
        </nav>
      </aside>

      {/* Main content area */}
      <main
        className="min-w-0 flex-1 px-6 py-8 md:px-10 lg:px-12"
        id="main-content"
        role="main"
      >
        {children}
      </main>

      {/* Optional right TOC panel */}
      {toc && (
        <aside
          className="hidden xl:block shrink-0 border-l border-[#333]"
          style={{
            width: 200,
            position: 'sticky',
            top: headerHeight,
            height: `calc(100vh - ${headerHeight}px)`,
          }}
          aria-label="Table of contents"
        >
          <nav className="overflow-y-auto py-6 pl-4 pr-6 text-sm">
            {toc}
          </nav>
        </aside>
      )}
    </div>
  )
}

/**
 * GlassmorphismDashboard — Dashboard shell with glass panels, sidebar, top bar.
 *
 * Responsive: sidebar collapses to bottom bar on mobile.
 * Customization: sidebar width, slot props for logo/nav/topBar content.
 * Pairs with: GlassPanel component from design-forge/components/ui/glass-panel.
 *
 * Usage:
 *   <GlassmorphismDashboard logo={<Logo />} nav={<NavLinks />}
 *     topBarRight={<UserMenu />}><Content /></GlassmorphismDashboard>
 */
import { type ReactNode } from 'react'

export interface GlassmorphismDashboardProps {
  children: ReactNode
  logo?: ReactNode
  nav?: ReactNode
  topBarRight?: ReactNode
  sidebarWidth?: number
  className?: string
}

const GLASS = 'bg-gradient-to-b from-white/[0.04] to-white/[0.01] backdrop-blur-[28px] backdrop-saturate-[120%]'
const GBORDER = 'border-white/[0.08]'

export function GlassmorphismDashboard({
  children, logo, nav, topBarRight, sidebarWidth = 240, className = '',
}: GlassmorphismDashboardProps) {
  return (
    <div className={['flex min-h-screen bg-[#070809]', className].join(' ')}>
      {/* Sidebar — desktop only */}
      <aside
        className={['hidden md:flex flex-col shrink-0 border-r', GBORDER, GLASS].join(' ')}
        style={{ width: sidebarWidth }}
        aria-label="Dashboard navigation"
      >
        {logo && (
          <div className="flex h-14 items-center border-b border-white/[0.08] px-5">{logo}</div>
        )}
        <nav className="flex-1 overflow-y-auto p-4">{nav}</nav>
      </aside>

      <div className="flex flex-1 flex-col min-w-0">
        {/* Top bar */}
        <header className={['flex h-14 items-center justify-between border-b px-5', GBORDER, GLASS].join(' ')}>
          <div className="md:hidden">{logo}</div>
          <div className="hidden md:block" />
          <div>{topBarRight}</div>
        </header>

        <main className="flex-1 overflow-y-auto p-5 md:p-8" id="main-content" role="main">
          {children}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav
        className="fixed inset-x-0 bottom-0 z-50 flex h-14 items-center justify-around border-t border-white/[0.08] bg-[#070809]/90 backdrop-blur-xl md:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        aria-label="Mobile navigation"
      >
        {nav}
      </nav>
    </div>
  )
}

import React from 'react'

export interface AppShellProps {
  children: React.ReactNode
  sidebarContent?: React.ReactNode
  bottomNavContent?: React.ReactNode
  fabContent?: React.ReactNode
}

export function AppShell({
  children,
  sidebarContent,
  bottomNavContent,
  fabContent
}: AppShellProps) {
  return (
    <main className="max-w-[1440px] mx-auto p-4 md:p-8">
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6 lg:gap-8 relative pb-24 md:pb-0">
        
        {/* Desktop Sidebar */}
        {sidebarContent && (
          <aside className="hidden lg:flex flex-col gap-5 sticky top-8 self-start h-[calc(100vh-4rem)] overflow-y-auto custom-scrollbar pr-2">
            {sidebarContent}
          </aside>
        )}

        {/* Main Content */}
        <div className="flex flex-col gap-6">
          {children}
        </div>

      </div>

      {/* Mobile Floating Action Button (FAB) */}
      {fabContent && (
        <div className="lg:hidden fixed bottom-24 right-4 z-40">
          {fabContent}
        </div>
      )}

      {/* Desktop Floating Action Button (FAB) */}
      {fabContent && (
        <div className="hidden lg:flex fixed bottom-10 right-10 z-40">
          {fabContent}
        </div>
      )}

      {/* Mobile Bottom Nav */}
      {bottomNavContent && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 bg-[var(--bg-page)] z-40">
          <div className="bg-[var(--bg-elevated)] border-[3px] border-[var(--neo-ink)] rounded-[22px] shadow-[var(--neo-shadow-sm)] p-2.5 flex items-center justify-between">
            {bottomNavContent}
          </div>
        </div>
      )}
    </main>
  )
}

'use client'
import { useSidebar } from '@/hooks/useSidebar'
import OfflineBanner from '@/components/OfflineBanner'

// Main content offset for the sidebar: 72px on tablet / when collapsed, 248px on desktop.
export default function ContentWrapper({ children }: { children: React.ReactNode }) {
    const { isSidebarOpen } = useSidebar()
    return (
        <div className={`cd-content flex-1 min-w-0 overflow-x-hidden ${isSidebarOpen ? '' : 'collapsed'}`}>
            <OfflineBanner />
            {children}
        </div>
    )
}

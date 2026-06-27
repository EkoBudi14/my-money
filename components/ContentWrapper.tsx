'use client'
import { useSidebar } from '@/hooks/useSidebar'

export default function ContentWrapper({ children }: { children: React.ReactNode }) {
    const { isSidebarOpen } = useSidebar()
    return (
        <div
            className={`flex-1 min-w-0 overflow-x-hidden ${isSidebarOpen ? 'md:ml-[292px] ml-0' : 'ml-0'}`}
            style={{
                transition: 'margin-left 0.4s cubic-bezier(0.32, 0.72, 0, 1)',
            }}
        >
            {children}
        </div>
    )
}

'use client'
import { useLayoutEffect, useRef } from 'react'
import { useSidebar } from '@/hooks/useSidebar'
import OfflineBanner from '@/components/OfflineBanner'

const CARD_SEL = '.card:not([data-cd-i]),.hero:not([data-cd-i]),.card-flush:not([data-cd-i])'

// Main content offset for the sidebar: 72px on tablet / when collapsed, 248px on desktop.
// Also tags newly mounted cards with a stagger index (--cd-i) so they rise in one by one.
export default function ContentWrapper({ children }: { children: React.ReactNode }) {
    const { isSidebarOpen } = useSidebar()
    const ref = useRef<HTMLDivElement>(null)

    useLayoutEffect(() => {
        const root = ref.current
        if (!root) return
        const tag = () => {
            // Index resets per batch: cards rendered in the same commit stagger together.
            let i = 0
            root.querySelectorAll<HTMLElement>(CARD_SEL).forEach(el => {
                el.dataset.cdI = ''
                el.style.setProperty('--cd-i', String(Math.min(i++, 8)))
            })
        }
        tag()
        const mo = new MutationObserver(tag)
        mo.observe(root, { childList: true, subtree: true })
        return () => mo.disconnect()
    }, [])

    return (
        <div ref={ref} className={`cd-content cd-page flex-1 min-w-0 overflow-x-hidden ${isSidebarOpen ? '' : 'collapsed'}`}>
            <OfflineBanner />
            {children}
        </div>
    )
}

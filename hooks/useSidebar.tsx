'use client'
import { createContext, useContext, useEffect, useState } from 'react'

interface SidebarContextType {
    /** true = full 248px sidebar on desktop, false = compact 72px (icons only). */
    isSidebarOpen: boolean
    setIsSidebarOpen: (v: boolean) => void
}

const SidebarCtx = createContext<SidebarContextType>({
    isSidebarOpen: true,
    setIsSidebarOpen: () => {},
})

const KEY = 'sidebar_open'

export function SidebarProvider({ children }: { children: React.ReactNode }) {
    const [isSidebarOpen, setOpen] = useState(true)

    // Remember the viewer's choice (per-browser convenience only).
    useEffect(() => {
        try { if (localStorage.getItem(KEY) === '0') setOpen(false) } catch {}
    }, [])

    const setIsSidebarOpen = (v: boolean) => {
        setOpen(v)
        try { localStorage.setItem(KEY, v ? '1' : '0') } catch {}
    }

    return (
        <SidebarCtx.Provider value={{ isSidebarOpen, setIsSidebarOpen }}>
            {children}
        </SidebarCtx.Provider>
    )
}

export function useSidebar() {
    return useContext(SidebarCtx)
}

'use client'
import { createContext, useContext, useState } from 'react'

interface SidebarContextType {
    isSidebarOpen: boolean
    setIsSidebarOpen: (v: boolean) => void
}

const SidebarCtx = createContext<SidebarContextType>({
    isSidebarOpen: true,
    setIsSidebarOpen: () => {},
})

export function SidebarProvider({ children }: { children: React.ReactNode }) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true)
    return (
        <SidebarCtx.Provider value={{ isSidebarOpen, setIsSidebarOpen }}>
            {children}
        </SidebarCtx.Provider>
    )
}

export function useSidebar() {
    return useContext(SidebarCtx)
}

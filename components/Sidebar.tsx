'use client'
import {
    LayoutDashboard,
    Wallet,
    PieChart,
    Goal,
    PiggyBank,
    X,
    StickyNote,
    Box,
    PackageCheck,
    MoreHorizontal,
    ChevronRight,
    ScanLine,
    Mic,
    Moon,
    Sun
} from 'lucide-react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useState } from 'react'
import { useTheme } from '@/hooks/useTheme'

const allMenuItems = [
    { name: 'Dashboard', icon: LayoutDashboard, href: '/' },
    { name: 'Analitik', icon: PieChart, href: '/analytics' },
    { name: 'Dompet', icon: Wallet, href: '/wallets' },
    { name: 'Tabungan', icon: PiggyBank, href: '/main-savings' },
    { name: 'Budget', icon: Box, href: '/budgets' },
    { name: 'Goals', icon: Goal, href: '/goals' },
    { name: 'Catatan', icon: StickyNote, href: '/notes' },
    { name: 'Scan Struk', icon: ScanLine, href: '/scan-receipt' },
    { name: 'Voice Input', icon: Mic, href: '/voice-transaction' },
]

// Mobile: tampilkan 4 item utama di bottom nav, sisanya di "Lainnya"
const mobileMainItems = allMenuItems.slice(0, 4)
const mobileMoreItems = allMenuItems.slice(4)

export default function Sidebar() {
    const pathname = usePathname()
    const [showMore, setShowMore] = useState(false)
    const { theme, toggleTheme } = useTheme()

    const isMoreActive = mobileMoreItems.some(item => pathname === item.href)

    return (
        <>
            {/* Desktop Sidebar */}
            <aside className="hidden md:flex fixed left-0 top-0 h-[100dvh] w-[280px] bg-[var(--bg-card)] border-r border-[var(--border-default)] z-50 flex-col overflow-hidden">
                <div className="h-[90px] flex items-center px-6 border-b border-[var(--border-default)]">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[var(--primary)] rounded-xl flex items-center justify-center">
                            <PackageCheck className="w-5 h-5 text-white" />
                        </div>
                        <h1 className="font-bold text-xl text-[var(--text-primary)]">CatatDuit</h1>
                    </div>
                </div>

                <div className="flex-1 px-5 py-6 space-y-8 overflow-y-auto">
                    <div className="flex flex-col gap-1">
                        {allMenuItems.map((item) => {
                            const isActive = pathname === item.href
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 group ${isActive ? 'bg-[#F9FAFB] dark:bg-[var(--bg-page)] dark:bg-[var(--bg-elevated)]' : 'hover:bg-[#F9FAFB] dark:hover:bg-[var(--bg-hover)] dark:hover:bg-[var(--bg-elevated)]'}`}
                                >
                                    <item.icon className={`w-5 h-5 transition-colors ${isActive ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]'}`} />
                                    <span className={`font-medium text-sm transition-colors ${isActive ? 'text-[var(--text-primary)] font-semibold' : 'text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]'}`}>
                                        {item.name}
                                    </span>
                                </Link>
                            )
                        })}
                    </div>
                </div>

                {/* Dark Mode Toggle — Desktop Sidebar Bottom */}
                <div className="px-5 py-4 border-t border-[var(--border-default)]">
                    <button
                        onClick={toggleTheme}
                        className="flex items-center gap-3 w-full px-4 py-3 rounded-xl hover:bg-[#F9FAFB] dark:hover:bg-[var(--bg-hover)] dark:hover:bg-[var(--bg-elevated)] transition-all duration-200 group"
                    >
                        {theme === 'dark' ? (
                            <Sun className="w-5 h-5 text-amber-400" />
                        ) : (
                            <Moon className="w-5 h-5 text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]" />
                        )}
                        <span className="font-medium text-sm text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">
                            {theme === 'dark' ? 'Mode Terang' : 'Mode Gelap'}
                        </span>
                    </button>
                </div>
            </aside>

            {/* Mobile Bottom Navigation */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 h-[70px] bg-[var(--bg-card)] border-t border-[var(--border-default)] z-50 flex items-center justify-around px-1">
                {mobileMainItems.map((item) => {
                    const isActive = pathname === item.href
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className="flex flex-col items-center justify-center gap-0.5 w-full h-full"
                        >
                            <item.icon className={`w-5 h-5 ${isActive ? 'text-[var(--primary)]' : 'text-[var(--text-secondary)]'}`} />
                            <span className={`text-[9px] font-medium ${isActive ? 'text-[var(--primary)]' : 'text-[var(--text-secondary)]'}`}>
                                {item.name}
                            </span>
                        </Link>
                    )
                })}

                {/* "Lainnya" Button */}
                <button
                    onClick={() => setShowMore(true)}
                    className="flex flex-col items-center justify-center gap-0.5 w-full h-full"
                >
                    <div className={`w-5 h-5 flex items-center justify-center ${isMoreActive ? 'text-[var(--primary)]' : 'text-[var(--text-secondary)]'}`}>
                        <MoreHorizontal className="w-5 h-5" />
                    </div>
                    <span className={`text-[9px] font-medium ${isMoreActive ? 'text-[var(--primary)]' : 'text-[var(--text-secondary)]'}`}>
                        Lainnya
                    </span>
                </button>
            </nav>

            {/* Mobile "Lainnya" Bottom Sheet */}
            {showMore && (
                <div className="md:hidden fixed inset-0 z-[100] flex items-end">
                    {/* Backdrop */}
                    <div
                        onClick={() => setShowMore(false)}
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                    />

                    {/* Sheet */}
                    <div className="relative w-full bg-[var(--bg-card)] rounded-t-3xl shadow-2xl z-10 pb-safe animate-in slide-in-from-bottom duration-300">
                        {/* Handle Bar */}
                        <div className="flex justify-center pt-3 pb-1">
                            <div className="w-10 h-1 bg-[var(--border-strong)] rounded-full" />
                        </div>

                        {/* Header */}
                        <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border-default)]">
                            <span className="font-semibold text-[var(--text-primary)] text-base">Menu Lainnya</span>
                            <button
                                onClick={() => setShowMore(false)}
                                className="w-8 h-8 flex items-center justify-center rounded-full bg-[#F9FAFB] dark:bg-[var(--bg-page)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Menu Items */}
                        <div className="px-4 py-3 pb-8 flex flex-col gap-1">
                            {mobileMoreItems.map((item) => {
                                const isActive = pathname === item.href
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        onClick={() => setShowMore(false)}
                                        className={`flex items-center gap-4 px-4 py-4 rounded-2xl transition-all duration-200 ${isActive ? 'bg-[var(--bg-elevated)]' : 'active:bg-[var(--bg-elevated)]'}`}
                                    >
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isActive ? 'bg-[var(--primary)]' : 'bg-[#F9FAFB] dark:bg-[var(--bg-page)]'}`}>
                                            <item.icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-[var(--text-secondary)]'}`} />
                                        </div>
                                        <span className={`font-medium text-sm flex-1 ${isActive ? 'text-[var(--text-primary)] font-semibold' : 'text-[var(--text-secondary)]'}`}>
                                            {item.name}
                                        </span>
                                        <ChevronRight className={`w-4 h-4 ${isActive ? 'text-[var(--primary)]' : 'text-[var(--text-muted)]'}`} />
                                    </Link>
                                )
                            })}

                            {/* Dark Mode Toggle in Mobile More Menu */}
                            <button
                                onClick={toggleTheme}
                                className="flex items-center gap-4 px-4 py-4 rounded-2xl transition-all duration-200 active:bg-[var(--bg-elevated)]"
                            >
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#F9FAFB] dark:bg-[var(--bg-page)]">
                                    {theme === 'dark' ? (
                                        <Sun className="w-5 h-5 text-amber-400" />
                                    ) : (
                                        <Moon className="w-5 h-5 text-[var(--text-secondary)]" />
                                    )}
                                </div>
                                <span className="font-medium text-sm flex-1 text-[var(--text-secondary)] text-left">
                                    {theme === 'dark' ? 'Mode Terang' : 'Mode Gelap'}
                                </span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}

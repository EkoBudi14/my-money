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
    Sun,
    Plus
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

// Mobile: 2 kiri + FAB center + 1 kanan + Lainnya
const mobileLeftItems = allMenuItems.slice(0, 2) // Dashboard, Analitik
const mobileRightItems = [allMenuItems[2]] // Dompet
const quickActionItems = [
    { name: 'Scan Struk', icon: ScanLine, href: '/scan-receipt' },
    { name: 'Voice Input', icon: Mic, href: '/voice-transaction' },
]
// Lainnya: Tabungan, Budget, Goals, Catatan (tanpa Scan Struk & Voice Input)
const mobileMoreItems = allMenuItems.slice(3, 7) // Tabungan, Budget, Goals, Catatan

export default function Sidebar() {
    const pathname = usePathname()
    const [showMore, setShowMore] = useState(false)
    const [showQuickActions, setShowQuickActions] = useState(false)
    const { theme, toggleTheme } = useTheme()

    const isMoreActive = mobileMoreItems.some(item => pathname === item.href)
    const isQuickActionActive = quickActionItems.some(item => pathname === item.href)

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

            {/* Mobile Quick Action Speed Dial Backdrop */}
            {showQuickActions && (
                <div
                    className="md:hidden fixed inset-0 z-[55]"
                    onClick={() => setShowQuickActions(false)}
                    style={{
                        background: theme === 'dark'
                            ? 'rgba(0, 0, 0, 0.5)'
                            : 'rgba(0, 0, 0, 0.2)',
                        backdropFilter: 'blur(4px)',
                        WebkitBackdropFilter: 'blur(4px)',
                    }}
                />
            )}

            {/* Mobile Quick Action Speed Dial Items */}
            {showQuickActions && (
                <div className="md:hidden fixed bottom-[90px] left-0 right-0 z-[60] flex flex-col items-center gap-3 px-4"
                    style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
                >
                    {quickActionItems.map((item, index) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setShowQuickActions(false)}
                            className="flex items-center gap-3 px-5 py-3.5 rounded-2xl transition-all duration-300"
                            style={{
                                background: theme === 'dark'
                                    ? 'rgba(17, 17, 24, 0.85)'
                                    : 'rgba(255, 255, 255, 0.88)',
                                backdropFilter: 'blur(20px) saturate(180%)',
                                WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                                border: theme === 'dark'
                                    ? '1px solid rgba(255, 255, 255, 0.10)'
                                    : '1px solid rgba(255, 255, 255, 0.5)',
                                boxShadow: theme === 'dark'
                                    ? '0 8px 32px rgba(0, 0, 0, 0.4)'
                                    : '0 8px 32px rgba(0, 0, 0, 0.10)',
                                animation: `slideUpFade 0.25s ease-out ${index * 0.08}s both`,
                            }}
                        >
                            <div
                                className="w-10 h-10 rounded-xl flex items-center justify-center"
                                style={{
                                    background: pathname === item.href
                                        ? 'var(--primary)'
                                        : theme === 'dark'
                                            ? 'rgba(77, 138, 255, 0.15)'
                                            : 'rgba(22, 93, 255, 0.08)',
                                }}
                            >
                                <item.icon
                                    className={`w-5 h-5 ${pathname === item.href ? 'text-white' : 'text-[var(--primary)]'}`}
                                />
                            </div>
                            <span className={`font-semibold text-sm ${
                                pathname === item.href ? 'text-[var(--primary)]' : 'text-[var(--text-primary)]'
                            }`}>
                                {item.name}
                            </span>
                        </Link>
                    ))}
                </div>
            )}

            {/* Mobile Bottom Navigation — Glassmorphism iOS Style */}
            <nav
                className="md:hidden fixed bottom-0 left-0 right-0 z-[58]"
                style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
            >
                <div
                    className="mx-3 mb-3 rounded-2xl flex items-center justify-around px-1 h-[64px] relative"
                    style={{
                        background: theme === 'dark'
                            ? 'rgba(17, 17, 24, 0.75)'
                            : 'rgba(255, 255, 255, 0.72)',
                        backdropFilter: 'blur(24px) saturate(180%)',
                        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
                        border: theme === 'dark'
                            ? '1px solid rgba(255, 255, 255, 0.08)'
                            : '1px solid rgba(255, 255, 255, 0.35)',
                        boxShadow: theme === 'dark'
                            ? '0 4px 30px rgba(0, 0, 0, 0.4), 0 1px 3px rgba(0, 0, 0, 0.3)'
                            : '0 4px 30px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.04)',
                    }}
                >
                    {/* Left Items: Dashboard, Analitik */}
                    {mobileLeftItems.map((item) => {
                        const isActive = pathname === item.href
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className="flex flex-col items-center justify-center gap-0.5 relative px-3 py-1.5 rounded-xl transition-all duration-300"
                            >
                                {isActive && (
                                    <div
                                        className="absolute inset-0 rounded-xl"
                                        style={{
                                            background: theme === 'dark'
                                                ? 'rgba(77, 138, 255, 0.12)'
                                                : 'rgba(22, 93, 255, 0.10)',
                                        }}
                                    />
                                )}
                                <item.icon
                                    className={`w-[22px] h-[22px] relative z-10 transition-all duration-300 ${isActive ? 'text-[var(--primary)] scale-110' : 'text-[var(--text-muted)]'}`}
                                    strokeWidth={isActive ? 2.3 : 1.8}
                                />
                                <span className={`text-[9px] font-semibold relative z-10 transition-all duration-300 ${isActive ? 'text-[var(--primary)]' : 'text-[var(--text-muted)]'}`}>
                                    {item.name}
                                </span>
                            </Link>
                        )
                    })}

                    {/* Center FAB — Quick Actions (+) */}
                    <div className="relative flex items-center justify-center" style={{ width: 56 }}>
                        <button
                            onClick={() => setShowQuickActions(!showQuickActions)}
                            className="absolute -top-7 w-[52px] h-[52px] rounded-full flex items-center justify-center transition-all duration-300 active:scale-90"
                            style={{
                                background: isQuickActionActive
                                    ? 'var(--primary)'
                                    : 'linear-gradient(135deg, #165DFF 0%, #4D8AFF 100%)',
                                boxShadow: showQuickActions
                                    ? '0 4px 20px rgba(22, 93, 255, 0.5)'
                                    : '0 4px 15px rgba(22, 93, 255, 0.35)',
                                transform: showQuickActions ? 'rotate(45deg)' : 'rotate(0deg)',
                            }}
                        >
                            <Plus className="w-6 h-6 text-white" strokeWidth={2.5} />
                        </button>
                    </div>

                    {/* Right Items: Dompet */}
                    {mobileRightItems.map((item) => {
                        const isActive = pathname === item.href
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className="flex flex-col items-center justify-center gap-0.5 relative px-3 py-1.5 rounded-xl transition-all duration-300"
                            >
                                {isActive && (
                                    <div
                                        className="absolute inset-0 rounded-xl"
                                        style={{
                                            background: theme === 'dark'
                                                ? 'rgba(77, 138, 255, 0.12)'
                                                : 'rgba(22, 93, 255, 0.10)',
                                        }}
                                    />
                                )}
                                <item.icon
                                    className={`w-[22px] h-[22px] relative z-10 transition-all duration-300 ${isActive ? 'text-[var(--primary)] scale-110' : 'text-[var(--text-muted)]'}`}
                                    strokeWidth={isActive ? 2.3 : 1.8}
                                />
                                <span className={`text-[9px] font-semibold relative z-10 transition-all duration-300 ${isActive ? 'text-[var(--primary)]' : 'text-[var(--text-muted)]'}`}>
                                    {item.name}
                                </span>
                            </Link>
                        )
                    })}

                    {/* "Lainnya" Button */}
                    <button
                        onClick={() => setShowMore(true)}
                        className="flex flex-col items-center justify-center gap-0.5 relative px-3 py-1.5 rounded-xl transition-all duration-300"
                    >
                        {isMoreActive && (
                            <div
                                className="absolute inset-0 rounded-xl"
                                style={{
                                    background: theme === 'dark'
                                        ? 'rgba(77, 138, 255, 0.12)'
                                        : 'rgba(22, 93, 255, 0.10)',
                                }}
                            />
                        )}
                        <MoreHorizontal
                            className={`w-[22px] h-[22px] relative z-10 transition-all duration-300 ${isMoreActive ? 'text-[var(--primary)] scale-110' : 'text-[var(--text-muted)]'}`}
                            strokeWidth={isMoreActive ? 2.3 : 1.8}
                        />
                        <span className={`text-[9px] font-semibold relative z-10 transition-all duration-300 ${isMoreActive ? 'text-[var(--primary)]' : 'text-[var(--text-muted)]'}`}>
                            Lainnya
                        </span>
                    </button>
                </div>
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

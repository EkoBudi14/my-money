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
import { useSidebar } from '@/hooks/useSidebar'

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
    const [isNavVisible, setIsNavVisible] = useState(true)
    const { isSidebarOpen, setIsSidebarOpen } = useSidebar()
    const { theme, toggleTheme } = useTheme()

    const isMoreActive = mobileMoreItems.some(item => pathname === item.href)
    const isQuickActionActive = quickActionItems.some(item => pathname === item.href)

    return (
        <>
            {/* ── DESKTOP SIDEBAR ── */}

            {/* Floating Sidebar Panel */}
    <aside
                className="hidden md:flex fixed left-0 top-0 h-[100dvh] w-[292px] z-50 flex-col"
                style={{
                    padding: '12px 0 12px 12px',
                    transform: isSidebarOpen ? 'translateX(0)' : 'translateX(-108%)',
                    transition: 'transform 0.4s cubic-bezier(0.32, 0.72, 0, 1)',
                }}
            >
                <div
                    className="flex-1 flex flex-col rounded-[24px] overflow-hidden"
                    style={{
                        background: theme === 'dark' ? '#252118' : '#fffdf8',
                        border: theme === 'dark'
                            ? '3px solid rgba(242, 242, 238, 0.25)'
                            : '3px solid #141414',
                        boxShadow: theme === 'dark'
                            ? '5px 5px 0 rgba(242, 242, 238, 0.18)'
                            : '6px 6px 0 #141414',
                    }}
                >
                    {/* Header */}
                    <div className="h-[72px] flex items-center justify-between px-5 border-b"
                        style={{ borderColor: theme === 'dark' ? 'rgba(242,242,238,0.12)' : '#e8e2d6' }}
                    >
                        <div className="flex items-center gap-3">
                            <div
                                className="w-9 h-9 rounded-xl flex items-center justify-center"
                                style={{
                                    background: theme === 'dark' ? '#ffd84d' : '#141414',
                                    border: theme === 'dark' ? 'none' : 'none',
                                }}
                            >
                                <PackageCheck className="w-4 h-4" style={{ color: theme === 'dark' ? '#141414' : '#ffffff' }} />
                            </div>
                            <h1 className="font-black text-lg tracking-tight" style={{ color: 'var(--text-primary)', letterSpacing: '-0.04em' }}>CatatDuit</h1>
                        </div>
                        {/* Close button */}
                        <button
                            onClick={() => setIsSidebarOpen(false)}
                            className="flex items-center justify-center p-1.5 rounded-xl bg-[#ffd84d] border-2 border-[#141414] shadow-[2px_2px_0_#141414] hover:-translate-y-[1px] hover:shadow-[3px_3px_0_#141414] active:translate-y-[2px] active:translate-x-[2px] active:shadow-none transition-all"
                            title="Sembunyikan sidebar"
                        >
                            <X className="w-4 h-4 text-[#141414]" strokeWidth={3} />
                        </button>
                    </div>

                    {/* Menu Items */}
                    <div className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                        {allMenuItems.map((item) => {
                            const isActive = pathname === item.href
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className="flex items-center gap-3 px-4 py-3 rounded-[16px] transition-all duration-150 group"
                                    style={{
                                        background: isActive
                                            ? (theme === 'dark' ? 'rgba(255,216,77,0.25)' : 'var(--neo-yellow)')
                                            : 'transparent',
                                        border: isActive ? '2px solid #141414' : '2px solid transparent',
                                        fontWeight: isActive ? 800 : 500,
                                    }}
                                    onMouseEnter={e => {
                                        if (!isActive) {
                                            (e.currentTarget as HTMLElement).style.background = theme === 'dark'
                                                ? 'rgba(242,242,238,0.05)'
                                                : 'rgba(20,20,20,0.04)'
                                        }
                                    }}
                                    onMouseLeave={e => {
                                        if (!isActive) {
                                            (e.currentTarget as HTMLElement).style.background = 'transparent'
                                        }
                                    }}
                                >
                                    <item.icon
                                        className="w-5 h-5 transition-colors"
                                        style={{ color: isActive ? 'var(--neo-ink, #141414)' : 'var(--text-secondary)' }}
                                        strokeWidth={isActive ? 2.5 : 1.8}
                                    />
                                    <span
                                        className="text-sm transition-colors"
                                        style={{
                                            fontWeight: isActive ? 800 : 500,
                                            color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                                            letterSpacing: isActive ? '-0.02em' : 'normal',
                                        }}
                                    >
                                        {item.name}
                                    </span>
                                    {isActive && (
                                        <div
                                            className="ml-auto w-2 h-2 rounded-full"
                                            style={{ background: 'var(--text-primary)' }}
                                        />
                                    )}
                                </Link>
                            )
                        })}
                    </div>

                    {/* Dark Mode Toggle — Bottom */}
                    <div className="px-3 pb-4 pt-2 border-t"
                        style={{ borderColor: theme === 'dark' ? 'rgba(242,242,238,0.12)' : '#e8e2d6' }}
                    >
                        <button
                            onClick={toggleTheme}
                            className="flex items-center gap-3 w-full px-4 py-3 rounded-[16px] transition-all duration-150 group"
                            style={{ background: 'transparent', border: '2px solid transparent' }}
                            onMouseEnter={e => {
                                (e.currentTarget as HTMLElement).style.background = theme === 'dark'
                                    ? 'rgba(242,242,238,0.05)' : 'rgba(20,20,20,0.04)'
                            }}
                            onMouseLeave={e => {
                                (e.currentTarget as HTMLElement).style.background = 'transparent'
                            }}
                        >
                            {theme === 'dark' ? (
                                <Sun className="w-5 h-5 text-amber-400" />
                            ) : (
                                <Moon className="w-5 h-5 text-[var(--text-secondary)]" />
                            )}
                            <span className="font-medium text-sm text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">
                                {theme === 'dark' ? 'Mode Terang' : 'Mode Gelap'}
                            </span>
                        </button>
                    </div>
                </div>
            </aside>

            {/* Desktop Toggle Button — floating pill, muncul saat sidebar tertutup */}
            <button
                className="hidden md:flex fixed z-50 items-center gap-2 transition-all duration-400"
                onClick={() => setIsSidebarOpen(true)}
                style={{
                    top: '50%',
                    transform: 'translateY(-50%)',
                    left: isSidebarOpen ? '-80px' : '16px',
                    opacity: isSidebarOpen ? 0 : 1,
                    pointerEvents: isSidebarOpen ? 'none' : 'auto',
                    background: theme === 'dark' ? '#252118' : '#ffd84d',
                    border: theme === 'dark' ? '3px solid rgba(242,242,238,0.25)' : '3px solid #141414',
                    boxShadow: theme === 'dark' ? '3px 3px 0 rgba(242,242,238,0.15)' : '4px 4px 0 #141414',
                    borderRadius: '16px',
                    padding: '10px 14px',
                    transition: 'left 0.4s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.35s ease',
                    transitionDelay: isSidebarOpen ? '0s' : '0.15s',
                }}
                title="Tampilkan sidebar"
            >
                <ChevronRight
                    className="w-4 h-4"
                    style={{ color: theme === 'dark' ? 'var(--primary)' : '#141414' }}
                    strokeWidth={2.5}
                />
                <span style={{
                    fontSize: '12px',
                    fontWeight: 800,
                    color: theme === 'dark' ? 'var(--primary)' : '#141414',
                    letterSpacing: '-0.01em',
                }}>Menu</span>
            </button>

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
                            className="flex items-center gap-3 px-5 py-3.5 rounded-2xl transition-all duration-200"
                            style={{
                                background: theme === 'dark' ? '#252118' : '#fffdf8',
                                border: theme === 'dark' ? '3px solid rgba(242,242,238,0.22)' : '3px solid #141414',
                                boxShadow: theme === 'dark' ? '3px 3px 0 rgba(242,242,238,0.12)' : '4px 4px 0 #141414',
                                animation: `slideUpFade 0.25s ease-out ${index * 0.08}s both`,
                            }}
                        >
                            <div
                                className="w-10 h-10 rounded-xl flex items-center justify-center"
                                style={{
                                    background: pathname === item.href ? '#141414' : (theme === 'dark' ? '#2e2a20' : '#f5f0e8'),
                                    border: pathname === item.href ? 'none' : '2px solid ' + (theme === 'dark' ? 'rgba(242,242,238,0.15)' : '#e8e2d6'),
                                }}
                            >
                                <item.icon
                                    className={`w-5 h-5 ${pathname === item.href ? 'text-white' : 'text-[var(--text-secondary)]'}`}
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

            {/* Mobile Bottom Navigation — Floating Glassmorphism */}
            {/* Show Nav Button — appears when nav is hidden */}
            <button
                className="md:hidden fixed z-[58] transition-all duration-500"
                onClick={() => setIsNavVisible(true)}
                style={{
                    bottom: isNavVisible ? '-60px' : '16px',
                    right: '16px',
                    opacity: isNavVisible ? 0 : 1,
                    pointerEvents: isNavVisible ? 'none' : 'auto',
                    background: theme === 'dark' ? '#252118' : '#ffd84d',
                    border: theme === 'dark' ? '3px solid rgba(242,242,238,0.25)' : '3px solid #141414',
                    boxShadow: theme === 'dark' ? '3px 3px 0 rgba(242,242,238,0.15)' : '4px 4px 0 #141414',
                    borderRadius: '20px',
                    padding: '10px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                }}
            >
                <ChevronRight
                    className="w-4 h-4 -rotate-90"
                    style={{ color: theme === 'dark' ? 'var(--primary)' : '#141414' }}
                    strokeWidth={2.5}
                />
                <span style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    color: theme === 'dark' ? 'var(--primary)' : '#141414',
                    letterSpacing: '-0.01em',
                }}>Menu</span>
            </button>

            <nav
                className="md:hidden fixed bottom-0 left-0 right-0 z-[58]"
                style={{
                    paddingBottom: 'env(safe-area-inset-bottom, 0px)',
                    transform: isNavVisible ? 'translateY(0)' : 'translateY(110%)',
                    transition: 'transform 0.4s cubic-bezier(0.32, 0.72, 0, 1)',
                }}
            >
                {/* Handle bar — tap to hide */}
                <div
                    className="flex justify-center pb-1 pt-1 cursor-pointer"
                    onClick={() => setIsNavVisible(false)}
                    title="Sembunyikan menu"
                >
                    <div
                        className="w-8 h-1 rounded-full transition-colors duration-200"
                        style={{
                            background: theme === 'dark'
                                ? 'rgba(255,255,255,0.2)'
                                : 'rgba(0,0,0,0.15)',
                        }}
                    />
                </div>

                <div
                    className="mx-4 mb-4 rounded-[22px] flex items-center justify-around px-1 h-[64px] relative"
                    style={{
                        background: theme === 'dark' ? '#252118' : '#fffdf8',
                        border: theme === 'dark' ? '3px solid rgba(242,242,238,0.22)' : '3px solid #141414',
                        boxShadow: theme === 'dark'
                            ? '3px 3px 0 rgba(242,242,238,0.12)'
                            : '4px 4px 0 #141414',
                    }}
                >
                    {/* Left Items: Dashboard, Analitik */}
                    {mobileLeftItems.map((item) => {
                        const isActive = pathname === item.href
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className="flex flex-col items-center justify-center gap-0.5 relative px-3 py-1.5 rounded-[14px] transition-all duration-200"
                            >
                                {isActive && (
                                    <div
                                        className="absolute inset-0 rounded-[14px]"
                                        style={{
                                            background: 'var(--neo-yellow)',
                                            border: '2px solid var(--neo-ink)',
                                        }}
                                    />
                                )}
                                <item.icon
                                    className={`w-[22px] h-[22px] relative z-10 transition-all duration-200 ${isActive ? 'scale-105' : ''}`}
                                    style={{ color: isActive ? (theme === 'dark' ? '#ffd84d' : '#141414') : 'var(--text-muted)' }}
                                    strokeWidth={isActive ? 2.5 : 1.8}
                                />
                                <span
                                    className="text-[9px] relative z-10 transition-all duration-200"
                                    style={{
                                        fontWeight: isActive ? 800 : 600,
                                        color: isActive ? (theme === 'dark' ? '#ffd84d' : '#141414') : 'var(--text-muted)',
                                    }}
                                >
                                    {item.name}
                                </span>
                            </Link>
                        )
                    })}

                    {/* Center FAB — Quick Actions (+) */}
                    <div className="relative flex items-center justify-center" style={{ width: 56 }}>
                        <button
                            onClick={() => setShowQuickActions(!showQuickActions)}
                            className="absolute -top-7 w-[62px] h-[62px] rounded-full flex items-center justify-center transition-all duration-200 active:scale-90"
                            style={{
                                background: 'var(--neo-peach)',
                                border: '3px solid var(--neo-ink)',
                                boxShadow: showQuickActions ? '2px 2px 0 var(--neo-ink)' : '4px 4px 0 var(--neo-ink)',
                                transform: showQuickActions ? 'rotate(45deg) translate(1px, 1px)' : 'rotate(0deg)',
                            }}
                        >
                            <Plus className="w-8 h-8" style={{ color: 'var(--neo-ink)' }} strokeWidth={3} />
                        </button>
                    </div>

                    {/* Right Items: Dompet */}
                    {mobileRightItems.map((item) => {
                        const isActive = pathname === item.href
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className="flex flex-col items-center justify-center gap-0.5 relative px-3 py-1.5 rounded-[14px] transition-all duration-200"
                            >
                                {isActive && (
                                    <div
                                        className="absolute inset-0 rounded-[14px]"
                                        style={{
                                            background: 'var(--neo-yellow)',
                                            border: '2px solid var(--neo-ink)',
                                        }}
                                    />
                                )}
                                <item.icon
                                    className={`w-[22px] h-[22px] relative z-10 transition-all duration-200 ${isActive ? 'scale-105' : ''}`}
                                    style={{ color: isActive ? (theme === 'dark' ? '#ffd84d' : '#141414') : 'var(--text-muted)' }}
                                    strokeWidth={isActive ? 2.5 : 1.8}
                                />
                                <span
                                    className="text-[9px] relative z-10 transition-all duration-200"
                                    style={{
                                        fontWeight: isActive ? 800 : 600,
                                        color: isActive ? (theme === 'dark' ? '#ffd84d' : '#141414') : 'var(--text-muted)',
                                    }}
                                >
                                    {item.name}
                                </span>
                            </Link>
                        )
                    })}

                    {/* "Lainnya" Button */}
                    <button
                        onClick={() => setShowMore(true)}
                        className="flex flex-col items-center justify-center gap-0.5 relative px-3 py-1.5 rounded-[14px] transition-all duration-200"
                    >
                        {isMoreActive && (
                            <div
                                className="absolute inset-0 rounded-[14px]"
                                style={{
                                    background: 'var(--neo-yellow)',
                                    border: '2px solid var(--neo-ink)',
                                }}
                            />
                        )}
                        <MoreHorizontal
                            className="w-[22px] h-[22px] relative z-10 transition-all duration-200"
                            style={{ color: isMoreActive ? (theme === 'dark' ? '#ffd84d' : '#141414') : 'var(--text-muted)' }}
                            strokeWidth={isMoreActive ? 2.5 : 1.8}
                        />
                        <span
                            className="text-[9px] relative z-10 transition-all duration-200"
                            style={{
                                fontWeight: isMoreActive ? 800 : 600,
                                color: isMoreActive ? (theme === 'dark' ? '#ffd84d' : '#141414') : 'var(--text-muted)',
                            }}
                        >
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
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300"
                    />

                    {/* Sheet */}
                    <div className="relative w-full rounded-t-3xl z-10 pb-safe animate-in slide-in-from-bottom duration-300"
                        style={{
                            background: theme === 'dark' ? '#252118' : '#fffdf8',
                            borderTop: theme === 'dark' ? '4px solid rgba(242,242,238,0.25)' : '4px solid #141414',
                            borderLeft: theme === 'dark' ? '4px solid rgba(242,242,238,0.25)' : '4px solid #141414',
                            borderRight: theme === 'dark' ? '4px solid rgba(242,242,238,0.25)' : '4px solid #141414',
                            boxShadow: theme === 'dark' ? '0 -4px 0 rgba(242,242,238,0.1)' : '0 -6px 0 rgba(20,20,20,0.1)',
                        }}
                    >
                        {/* Handle Bar */}
                        <div className="flex justify-center pt-4 pb-2">
                            <div className="w-12 h-1.5 rounded-full" style={{ background: theme === 'dark' ? 'rgba(242,242,238,0.25)' : '#141414' }} />
                        </div>

                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b-4"
                            style={{ borderColor: theme === 'dark' ? 'rgba(242,242,238,0.15)' : '#141414' }}
                        >
                            <span className="font-black text-[var(--text-primary)] text-xl tracking-tight">Menu Lainnya</span>
                            <button
                                onClick={() => setShowMore(false)}
                                className="flex items-center justify-center p-2 rounded-xl bg-[#ffd84d] border-2 border-[#141414] shadow-[2px_2px_0_#141414] hover:-translate-y-[1px] hover:shadow-[3px_3px_0_#141414] active:translate-y-[2px] active:translate-x-[2px] active:shadow-none transition-all"
                            >
                                <X className="w-5 h-5 text-[#141414]" strokeWidth={3} />
                            </button>
                        </div>

                        {/* Menu Items */}
                        <div className="px-5 py-5 pb-8 flex flex-col gap-3">
                            {mobileMoreItems.map((item) => {
                                const isActive = pathname === item.href
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        onClick={() => setShowMore(false)}
                                        className="flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-150 active:translate-y-1 active:shadow-none group"
                                        style={{
                                            background: isActive 
                                                ? (theme === 'dark' ? '#ffd84d' : 'var(--neo-yellow, #ffd84d)') 
                                                : (theme === 'dark' ? '#2e2a20' : '#ffffff'),
                                            border: theme === 'dark' ? '3px solid rgba(242,242,238,0.2)' : '3px solid #141414',
                                            boxShadow: theme === 'dark' 
                                                ? (isActive ? 'none' : '3px 3px 0 rgba(242,242,238,0.15)') 
                                                : (isActive ? 'none' : '4px 4px 0 #141414'),
                                            transform: isActive ? 'translate(4px, 4px)' : 'none',
                                        }}
                                    >
                                        <div
                                            className="w-11 h-11 rounded-[14px] flex items-center justify-center transition-transform group-hover:scale-105"
                                            style={{
                                                background: isActive ? '#141414' : (theme === 'dark' ? 'rgba(242,242,238,0.05)' : '#f5f0e8'),
                                                border: isActive ? 'none' : '2px solid ' + (theme === 'dark' ? 'rgba(242,242,238,0.15)' : '#141414'),
                                            }}
                                        >
                                            <item.icon 
                                                className={`w-5 h-5 ${isActive ? 'text-white' : (theme === 'dark' ? 'text-[var(--text-primary)]' : 'text-[#141414]')}`} 
                                                strokeWidth={isActive ? 2.5 : 2} 
                                            />
                                        </div>
                                        <span 
                                            className="font-black text-[15px] flex-1 tracking-tight"
                                            style={{
                                                color: isActive ? (theme === 'dark' ? '#141414' : '#141414') : 'var(--text-primary)'
                                            }}
                                        >
                                            {item.name}
                                        </span>
                                        <ChevronRight 
                                            className="w-5 h-5 opacity-70" 
                                            style={{ color: isActive ? (theme === 'dark' ? '#141414' : '#141414') : 'var(--text-primary)' }} 
                                            strokeWidth={2.5} 
                                        />
                                    </Link>
                                )
                            })}

                            {/* Dark Mode Toggle in Mobile More Menu */}
                            <button
                                onClick={toggleTheme}
                                className="flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-150 active:translate-y-1 active:shadow-none mt-1 group"
                                style={{
                                    background: theme === 'dark' ? '#2e2a20' : '#ffffff',
                                    border: theme === 'dark' ? '3px solid rgba(242,242,238,0.2)' : '3px solid #141414',
                                    boxShadow: theme === 'dark' ? '3px 3px 0 rgba(242,242,238,0.15)' : '4px 4px 0 #141414',
                                }}
                            >
                                <div
                                    className="w-11 h-11 rounded-[14px] flex items-center justify-center transition-transform group-hover:scale-105"
                                    style={{
                                        background: theme === 'dark' ? 'rgba(242,242,238,0.05)' : '#f5f0e8',
                                        border: '2px solid ' + (theme === 'dark' ? 'rgba(242,242,238,0.15)' : '#141414'),
                                    }}
                                >
                                    {theme === 'dark' ? (
                                        <Sun className="w-5 h-5 text-amber-400" strokeWidth={2.5} />
                                    ) : (
                                        <Moon className="w-5 h-5 text-[#141414]" strokeWidth={2.5} />
                                    )}
                                </div>
                                <span className="font-black text-[15px] flex-1 text-[var(--text-primary)] tracking-tight text-left">
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

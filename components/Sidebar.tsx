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
    ChevronRight
} from 'lucide-react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useState } from 'react'

const allMenuItems = [
    { name: 'Dashboard', icon: LayoutDashboard, href: '/' },
    { name: 'Analitik', icon: PieChart, href: '/analytics' },
    { name: 'Dompet', icon: Wallet, href: '/wallets' },
    { name: 'Tabungan', icon: PiggyBank, href: '/main-savings' },
    { name: 'Budget', icon: Box, href: '/budgets' },
    { name: 'Goals', icon: Goal, href: '/goals' },
    { name: 'Catatan', icon: StickyNote, href: '/notes' },
]

// Mobile: tampilkan 4 item utama di bottom nav, sisanya di "Lainnya"
const mobileMainItems = allMenuItems.slice(0, 4)
const mobileMoreItems = allMenuItems.slice(4)

export default function Sidebar() {
    const pathname = usePathname()
    const [showMore, setShowMore] = useState(false)

    const isMoreActive = mobileMoreItems.some(item => pathname === item.href)

    return (
        <>
            {/* Desktop Sidebar */}
            <aside className="hidden md:flex fixed left-0 top-0 h-[100dvh] w-[280px] bg-white border-r border-[#F3F4F3] z-50 flex-col overflow-hidden">
                <div className="h-[90px] flex items-center px-6 border-b border-[#F3F4F3]">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#165DFF] rounded-xl flex items-center justify-center">
                            <PackageCheck className="w-5 h-5 text-white" />
                        </div>
                        <h1 className="font-bold text-xl text-[#080C1A]">CatatDuit</h1>
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
                                    className={`flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 group ${isActive ? 'bg-[#EFF2F7]' : 'bg-white hover:bg-[#EFF2F7]'}`}
                                >
                                    <item.icon className={`w-5 h-5 transition-colors ${isActive ? 'text-[#080C1A]' : 'text-[#6A7686] group-hover:text-[#080C1A]'}`} />
                                    <span className={`font-medium text-sm transition-colors ${isActive ? 'text-[#080C1A] font-semibold' : 'text-[#6A7686] group-hover:text-[#080C1A]'}`}>
                                        {item.name}
                                    </span>
                                </Link>
                            )
                        })}
                    </div>
                </div>
            </aside>

            {/* Mobile Bottom Navigation */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 h-[70px] bg-white border-t border-[#F3F4F3] z-50 flex items-center justify-around px-1">
                {mobileMainItems.map((item) => {
                    const isActive = pathname === item.href
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className="flex flex-col items-center justify-center gap-0.5 w-full h-full"
                        >
                            <item.icon className={`w-5 h-5 ${isActive ? 'text-[#165DFF]' : 'text-[#6A7686]'}`} />
                            <span className={`text-[9px] font-medium ${isActive ? 'text-[#165DFF]' : 'text-[#6A7686]'}`}>
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
                    <div className={`w-5 h-5 flex items-center justify-center ${isMoreActive ? 'text-[#165DFF]' : 'text-[#6A7686]'}`}>
                        <MoreHorizontal className="w-5 h-5" />
                    </div>
                    <span className={`text-[9px] font-medium ${isMoreActive ? 'text-[#165DFF]' : 'text-[#6A7686]'}`}>
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
                    <div className="relative w-full bg-white rounded-t-3xl shadow-2xl z-10 pb-safe animate-in slide-in-from-bottom duration-300">
                        {/* Handle Bar */}
                        <div className="flex justify-center pt-3 pb-1">
                            <div className="w-10 h-1 bg-slate-200 rounded-full" />
                        </div>

                        {/* Header */}
                        <div className="flex items-center justify-between px-5 py-3 border-b border-[#F3F4F3]">
                            <span className="font-semibold text-[#080C1A] text-base">Menu Lainnya</span>
                            <button
                                onClick={() => setShowMore(false)}
                                className="w-8 h-8 flex items-center justify-center rounded-full bg-[#EFF2F7] text-[#6A7686] hover:bg-slate-200 transition-colors"
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
                                        className={`flex items-center gap-4 px-4 py-4 rounded-2xl transition-all duration-200 ${isActive ? 'bg-[#EFF2F7]' : 'active:bg-[#EFF2F7]'}`}
                                    >
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isActive ? 'bg-[#165DFF]' : 'bg-[#EFF2F7]'}`}>
                                            <item.icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-[#6A7686]'}`} />
                                        </div>
                                        <span className={`font-medium text-sm flex-1 ${isActive ? 'text-[#080C1A] font-semibold' : 'text-[#6A7686]'}`}>
                                            {item.name}
                                        </span>
                                        <ChevronRight className={`w-4 h-4 ${isActive ? 'text-[#165DFF]' : 'text-[#C8CDD6]'}`} />
                                    </Link>
                                )
                            })}
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}

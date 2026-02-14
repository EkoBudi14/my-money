'use client'
import {
    LayoutDashboard,
    Wallet,
    PieChart,
    Settings,
    LogOut,
    CreditCard,
    User,
    Goal,
    PiggyBank,
    Menu,
    X,
    StickyNote,
    Box,
    Truck,
    PackageCheck,
    Headset
} from 'lucide-react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useState, useEffect } from 'react'

export default function Sidebar() {
    const pathname = usePathname()
    const [isOpen, setIsOpen] = useState(false)

    // Close sidebar when route changes on mobile
    useEffect(() => {
        setIsOpen(false)
    }, [pathname])

    const menuItems = [
        { 
            section: 'Overview',
            items: [
                { name: 'Dashboard', icon: LayoutDashboard, href: '/' },
                { name: 'Analitik', icon: PieChart, href: '/analytics' },
            ]
        },
        {
            section: 'Manajemen',
            items: [
                { name: 'Dompet', icon: Wallet, href: '/wallets' },
                { name: 'Budget', icon: Box, href: '/budgets' }, // Changed icon to Box to match aesthetic
                { name: 'Goals', icon: Goal, href: '/goals' },
            ]
        },
        {
            section: 'Lainnya',
            items: [
                { name: 'Tabungan Inti', icon: PiggyBank, href: '/main-savings' },
                { name: 'Catatan', icon: StickyNote, href: '/notes' },
            ]
        }
    ]

    return (
        <>
            {/* Mobile Toggle Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="md:hidden fixed z-[60] bottom-10 left-6 p-3 bg-white text-slate-800 rounded-2xl shadow-lg border border-slate-200 hover:border-[#165DFF] hover:shadow-xl transition-all active:scale-95"
            >
                {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>

            {/* Overlay for mobile */}
            {isOpen && (
                <div
                    onClick={() => setIsOpen(false)}
                    className="md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm animate-in fade-in"
                />
            )}

            {/* Sidebar Content */}
            <aside className={`
                fixed left-0 top-0 h-screen w-[280px] bg-white border-r border-[#F3F4F3] z-50 flex flex-col
                transition-transform duration-300 ease-in-out
                ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0
            `}>
                {/* Header */}
                <div className="h-[90px] flex items-center px-6 border-b border-[#F3F4F3]">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#165DFF] rounded-xl flex items-center justify-center">
                            <PackageCheck className="w-5 h-5 text-white" />
                        </div>
                        <h1 className="font-bold text-xl text-[#080C1A]">CatatDuit</h1>
                    </div>
                </div>

                {/* Navigation */}
                <div className="flex-1 px-5 py-6 space-y-8 overflow-y-auto">
                    {menuItems.map((section, idx) => (
                        <div key={idx} className="flex flex-col gap-3">
                            <h3 className="font-medium text-sm text-[#6A7686] px-1">{section.section}</h3>
                            <div className="flex flex-col gap-1">
                                {section.items.map((item) => {
                                    const isActive = pathname === item.href
                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            className={`
                                                flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 group
                                                ${isActive 
                                                    ? 'bg-[#EFF2F7]' 
                                                    : 'bg-white hover:bg-[#EFF2F7]'
                                                }
                                            `}
                                        >
                                            <item.icon className={`
                                                w-5 h-5 transition-colors
                                                ${isActive 
                                                    ? 'text-[#080C1A]' 
                                                    : 'text-[#6A7686] group-hover:text-[#080C1A]'
                                                }
                                            `} />
                                            <span className={`
                                                font-medium text-sm transition-colors
                                                ${isActive 
                                                    ? 'text-[#080C1A] font-semibold' 
                                                    : 'text-[#6A7686] group-hover:text-[#080C1A]'
                                                }
                                            `}>
                                                {item.name}
                                            </span>
                                        </Link>
                                    )
                                })}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer Help */}
                {/* <div className="p-5 border-t border-[#F3F4F3]">
                    <div className="flex items-center justify-between p-4 bg-[#F8FAFC] rounded-2xl border border-[#F3F4F3]">
                        <div className="min-w-0">
                            <p className="font-semibold text-[#080C1A] text-sm">Butuh Bantuan?</p>
                            <p className="text-xs text-[#6A7686] hover:text-[#165DFF] cursor-pointer">Hubungi Support</p>
                        </div>
                        <div className="w-10 h-10 bg-[#165DFF]/10 rounded-xl flex items-center justify-center shrink-0">
                            <Headset className="w-5 h-5 text-[#165DFF]" />
                        </div>
                    </div>
                </div> */}
            </aside>
        </>
    )
}

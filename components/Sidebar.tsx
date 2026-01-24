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
    X
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
        { name: 'Dashboard', icon: LayoutDashboard, href: '/' },
        { name: 'Dompet', icon: Wallet, href: '/wallets' },
        { name: 'Manajemen Budget', icon: CreditCard, href: '/budgets' },
        { name: 'Tabungan Saya', icon: Goal, href: '/goals' },
        { name: 'Tabungan Inti', icon: PiggyBank, href: '/main-savings' },
        { name: 'Analitik', icon: PieChart, href: '/analytics' },
        //{ name: 'Pengaturan', icon: Settings, href: '/settings' },
    ]

    return (
        <>
            {/* Mobile Toggle Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="md:hidden fixed z-[60] bottom-6 left-6 p-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-full shadow-premium-lg hover:shadow-purple-500/50 transition-all active:scale-95 hover:scale-110"
            >
                {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>

            {/* Overlay for mobile */}
            {isOpen && (
                <div
                    onClick={() => setIsOpen(false)}
                    className="md:hidden fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm animate-in fade-in"
                />
            )}

            <aside className={`
                fixed left-0 top-0 h-[calc(100vh-2rem)] w-64 m-4 bg-white text-slate-800 z-50 rounded-[2.5rem]
                transition-transform duration-300 ease-in-out flex flex-col shadow-premium-lg border border-slate-100 hidden md:flex
            `}>
                {/* Logo Area */}
                <div className="p-8 pb-4 flex flex-col items-center justify-center">
                    <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center shadow-lg shadow-purple-200 mb-3">
                        <Wallet className="w-6 h-6 text-white" />
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-4 py-2 space-y-2 overflow-y-auto custom-scrollbar">
                    {menuItems.map((item) => {
                        const isActive = pathname === item.href
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`w-full flex items-center gap-4 px-6 py-3.5 rounded-2xl transition-all duration-200 group relative ${isActive
                                    ? 'bg-purple-50 text-purple-600 font-bold'
                                    : 'text-slate-400 hover:text-purple-600 font-medium'
                                    }`}
                            >
                                <item.icon className={`w-5 h-5 ${isActive ? 'text-purple-600' : 'text-slate-400 group-hover:text-purple-600'} transition-colors`} />
                                <span className="text-sm">{item.name}</span>
                            </Link>
                        )
                    })}
                </nav>


            </aside>

            {/* Mobile Sidebar (Drawer) */}
            <aside className={`
                fixed left-0 top-0 h-screen w-64 bg-white text-slate-800 z-50
                transition-transform duration-300 ease-in-out flex flex-col shadow-2xl md:hidden
                ${isOpen ? 'translate-x-0' : '-translate-x-full'}
            `}>
                <div className="p-8 pb-4 flex flex-col items-center justify-center">
                    <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center shadow-lg shadow-purple-200 mb-3">
                        <Wallet className="w-6 h-6 text-white" />
                    </div>
                </div>

                <nav className="flex-1 px-4 py-2 space-y-2 overflow-y-auto">
                    {menuItems.map((item) => {
                        const isActive = pathname === item.href
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setIsOpen(false)}
                                className={`w-full flex items-center gap-4 px-6 py-3.5 rounded-2xl transition-all duration-200 group relative ${isActive
                                    ? 'bg-purple-50 text-purple-600 font-bold'
                                    : 'text-slate-400 hover:text-purple-600 font-medium'
                                    }`}
                            >
                                <item.icon className={`w-5 h-5 ${isActive ? 'text-purple-600' : 'text-slate-400 group-hover:text-purple-600'} transition-colors`} />
                                <span className="text-sm">{item.name}</span>
                            </Link>
                        )
                    })}
                </nav>


            </aside>
        </>
    )
}

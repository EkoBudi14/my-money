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
                className="md:hidden fixed z-[60] bottom-6 left-6 p-4 bg-blue-600 text-white rounded-full shadow-xl hover:bg-blue-700 transition-all active:scale-95"
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
                fixed left-0 top-0 h-screen w-64 bg-slate-900 text-white border-r border-slate-800 z-50
                transition-transform duration-300 ease-in-out flex flex-col
                ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
            `}>
                {/* Logo Area */}
                <div className="p-8 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                            <Wallet className="w-6 h-6 text-white" />
                        </div>
                        <span className="text-xl font-extrabold tracking-tight">Financify.</span>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-700/50 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-700">
                    <p className="px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Menu Utama</p>

                    {menuItems.map((item) => {
                        const isActive = pathname === item.href
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-200 group ${isActive
                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                                    }`}
                            >
                                <item.icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'}`} />
                                <span className="font-medium text-sm">{item.name}</span>
                            </Link>
                        )
                    })}
                </nav>

                {/* User Profile Snippet */}
                {/* User Profile Snippet - Hidden for now
                <div className="p-4 m-4 bg-slate-800/50 rounded-2xl border border-slate-700/50 flex items-center gap-3 hover:bg-slate-800 transition-colors cursor-pointer">
                    <div className="w-10 h-10 bg-gradient-to-tr from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white font-bold shadow-inner">
                        <User className="w-5 h-5" />
                    </div>
                    <div className="flex-1 overflow-hidden">
                        <p className="text-sm font-bold text-slate-200 truncate">Halo, Pengguna</p>
                        <p className="text-xs text-slate-500 truncate">Free Plan</p>
                    </div>
                    <LogOut className="w-4 h-4 text-slate-500 hover:text-slate-300" />
                </div>
                */}
            </aside>
        </>
    )
}

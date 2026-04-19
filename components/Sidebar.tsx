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
    Headset,
    Download
} from 'lucide-react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { usePwaInstall } from '@/hooks/usePwaInstall'

export default function Sidebar() {
    const pathname = usePathname()
    const [showIosInstruction, setShowIosInstruction] = useState(false)
    const { isPwaInstallable, isIOS, installPwa } = usePwaInstall()

    const menuItems = [
        { name: 'Dashboard', icon: LayoutDashboard, href: '/' },
        { name: 'Analitik', icon: PieChart, href: '/analytics' },
        { name: 'Dompet', icon: Wallet, href: '/wallets' },
        { name: 'Tabungan', icon: PiggyBank, href: '/main-savings' },
        { name: 'Budget', icon: Box, href: '/budgets' },
        { name: 'Goals', icon: Goal, href: '/goals' },
    ]

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
                        {menuItems.map((item) => {
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
                {menuItems.map((item) => {
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
            </nav>

            {/* iOS Installation Instruction Modal */}
            {showIosInstruction && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div 
                        onClick={() => setShowIosInstruction(false)}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in" 
                    />
                    <div className="bg-white rounded-3xl p-6 shadow-2xl z-10 w-full max-w-sm border border-slate-100 animate-in zoom-in-95 slide-in-from-bottom-5">
                        <div className="flex justify-between items-start mb-6">
                            <div className="w-12 h-12 bg-[#165DFF]/10 rounded-2xl flex items-center justify-center">
                                <PackageCheck className="w-6 h-6 text-[#165DFF]" />
                            </div>
                            <button 
                                onClick={() => setShowIosInstruction(false)} 
                                className="p-2 -mr-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        
                        <h3 className="text-xl font-bold text-slate-800 mb-2">Install di iOS</h3>
                        <p className="text-slate-500 text-sm mb-6 leading-relaxed">
                            Apple Safari tidak mendukung tombol install otomatis. Ikuti 2 langkah mudah ini:
                        </p>
                        
                        <div className="space-y-4 mb-8">
                            <div className="flex gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
                                <div className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center shrink-0 border border-slate-200">
                                    <span className="font-bold text-[#165DFF]">1</span>
                                </div>
                                <div className="text-sm">
                                    <p className="font-medium text-slate-700 mb-1">Tap icon Share</p>
                                    <p className="text-slate-500">Cari icon panah ke atas di bagian bawah layar Safari Anda.</p>
                                </div>
                            </div>
                            
                            <div className="flex gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
                                <div className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center shrink-0 border border-slate-200">
                                    <span className="font-bold text-[#165DFF]">2</span>
                                </div>
                                <div className="text-sm">
                                    <p className="font-medium text-slate-700 mb-1">Pilih "Add to Home Screen"</p>
                                    <p className="text-slate-500">Scroll ke bawah dan tap "Tambah ke Layar Utama".</p>
                                </div>
                            </div>
                        </div>
                        
                        <button 
                            onClick={() => setShowIosInstruction(false)}
                            className="w-full py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-colors"
                        >
                            Saya Mengerti
                        </button>
                    </div>
                </div>
            )}
        </>
    )
}

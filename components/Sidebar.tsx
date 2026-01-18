
'use client'
import {
    LayoutDashboard,
    Wallet,
    PieChart,
    Settings,
    LogOut,
    CreditCard,
    User
} from 'lucide-react'

export default function Sidebar() {
    const menuItems = [
        { name: 'Dashboard', icon: LayoutDashboard, active: true },
        { name: 'Transaksi', icon: CreditCard, active: false },
        { name: 'Dompet', icon: Wallet, active: false },
        { name: 'Analitik', icon: PieChart, active: false },
        { name: 'Pengaturan', icon: Settings, active: false },
    ]

    return (
        <aside className="hidden md:flex flex-col w-64 h-screen bg-slate-900 text-white fixed left-0 top-0 border-r border-slate-800 z-50">
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
            <nav className="flex-1 px-4 py-6 space-y-2">
                <p className="px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Menu Utama</p>

                {menuItems.map((item) => (
                    <button
                        key={item.name}
                        className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-200 group ${item.active
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                            : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                            }`}
                    >
                        <item.icon className={`w-5 h-5 ${item.active ? 'text-white' : 'text-slate-400 group-hover:text-white'}`} />
                        <span className="font-medium text-sm">{item.name}</span>
                    </button>
                ))}
            </nav>

            {/* User Profile Snippet */}
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
        </aside>
    )
}

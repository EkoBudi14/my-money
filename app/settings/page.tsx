'use client'
import { useState } from 'react'
import { User, Settings, Bell, Shield, LogOut, ChevronRight, Moon, Globe, Database, HelpCircle, FileText } from 'lucide-react'
import { useToast } from '@/hooks/useToast'

export default function SettingsPage() {
    const { showToast } = useToast()
    const [darkMode, setDarkMode] = useState(false)
    const [notifications, setNotifications] = useState(true)

    return (
        <main className="flex-1 bg-[#F9FAFB] min-h-screen overflow-x-hidden transition-all duration-300">
            <header className="flex items-center justify-between w-full h-[90px] shrink-0 border-b border-[#F3F4F3] bg-white px-5 md:px-8">
                <div>
                     <h2 className="font-bold text-2xl text-[#080C1A]">Pengaturan</h2>
                </div>
                 <div className="hidden md:flex items-center gap-3 pl-3 border-l border-[#F3F4F3] ml-auto">
                    <div className="text-right">
                        <p className="font-semibold text-[#080C1A] text-sm">Eko Budi</p>
                        {/* <p className="text-[#6A7686] text-xs">Premium User</p> */}
                    </div>
                    <div className="w-11 h-11 bg-slate-200 rounded-full flex items-center justify-center text-slate-500 font-bold border-2 border-white shadow-sm">
                        EB
                    </div>
                </div>
            </header>

            <div className="p-5 md:p-8 max-w-4xl mx-auto space-y-8">
                {/* Profile Section */}
                <section className="bg-white rounded-2xl border border-[#F3F4F3] p-6 shadow-sm">
                    <h3 className="text-lg font-bold text-[#080C1A] mb-6 flex items-center gap-2">
                        <User className="w-5 h-5 text-[#165DFF]" />
                        Profil Pengguna
                    </h3>
                    <div className="flex items-center gap-6">
                        <div className="w-20 h-20 bg-slate-200 rounded-full flex items-center justify-center text-slate-500 font-bold text-2xl border-4 border-[#F3F4F3]">
                            EB
                        </div>
                        <div>
                            <h4 className="text-xl font-bold text-[#080C1A]">Eko Budi</h4>
                            <p className="text-[#6A7686]">eko.budi@example.com</p>
                            <span className="inline-block mt-2 px-3 py-1 bg-yellow-50 text-yellow-700 text-xs font-bold rounded-full border border-yellow-100">
                                Premium Member
                            </span>
                        </div>
                        <button className="ml-auto px-4 py-2 border border-[#F3F4F3] rounded-xl text-sm font-bold text-[#080C1A] hover:bg-slate-50 transition-colors">
                            Edit Profil
                        </button>
                    </div>
                </section>

                {/* Preferences */}
                <section className="bg-white rounded-2xl border border-[#F3F4F3] overflow-hidden shadow-sm">
                    <div className="p-6 border-b border-[#F3F4F3]">
                         <h3 className="text-lg font-bold text-[#080C1A] flex items-center gap-2">
                            <Settings className="w-5 h-5 text-[#165DFF]" />
                            Preferensi Aplikasi
                        </h3>
                    </div>
                    <div className="divide-y divide-[#F3F4F3]">
                        <div className="p-4 md:p-6 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer group">
                             <div className="flex items-center gap-4">
                                <div className="p-2 bg-slate-100 rounded-lg text-slate-600 group-hover:text-[#165DFF] group-hover:bg-blue-50 transition-colors">
                                    <Moon className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="font-bold text-[#080C1A]">Mode Gelap</p>
                                    <p className="text-sm text-[#6A7686]">Ganti tampilan ke mode gelap</p>
                                </div>
                             </div>
                             <div className="relative inline-block w-12 mr-2 align-middle select-none transition duration-200 ease-in">
                                <input 
                                    type="checkbox" 
                                    name="toggle" 
                                    id="toggle" 
                                    checked={darkMode} 
                                    onChange={() => setDarkMode(!darkMode)}
                                    className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer transition-transform duration-300 ease-in-out" 
                                    style={{ transform: darkMode ? 'translateX(100%)' : 'translateX(0)', borderColor: darkMode ? '#165DFF' : '#E2E8F0' }}
                                />
                                <label 
                                    htmlFor="toggle" 
                                    className={`toggle-label block overflow-hidden h-6 rounded-full cursor-pointer transition-colors duration-300 ${darkMode ? 'bg-[#165DFF]' : 'bg-slate-200'}`}
                                ></label>
                            </div>
                        </div>

                        <div className="p-4 md:p-6 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer group">
                             <div className="flex items-center gap-4">
                                <div className="p-2 bg-slate-100 rounded-lg text-slate-600 group-hover:text-[#165DFF] group-hover:bg-blue-50 transition-colors">
                                    <Globe className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="font-bold text-[#080C1A]">Bahasa</p>
                                    <p className="text-sm text-[#6A7686]">Indonesia</p>
                                </div>
                             </div>
                             <ChevronRight className="w-5 h-5 text-slate-400" />
                        </div>

                        <div className="p-4 md:p-6 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer group">
                             <div className="flex items-center gap-4">
                                <div className="p-2 bg-slate-100 rounded-lg text-slate-600 group-hover:text-[#165DFF] group-hover:bg-blue-50 transition-colors">
                                    <Bell className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="font-bold text-[#080C1A]">Notifikasi</p>
                                    <p className="text-sm text-[#6A7686]">Atur preferensi notifikasi</p>
                                </div>
                             </div>
                             <div className="relative inline-block w-12 mr-2 align-middle select-none transition duration-200 ease-in">
                                <input 
                                    type="checkbox" 
                                    checked={notifications} 
                                    onChange={() => setNotifications(!notifications)}
                                    className="absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer transition-transform duration-300 ease-in-out" 
                                    style={{ transform: notifications ? 'translateX(100%)' : 'translateX(0)', borderColor: notifications ? '#165DFF' : '#E2E8F0' }}
                                />
                                <div className={`block overflow-hidden h-6 rounded-full cursor-pointer transition-colors duration-300 ${notifications ? 'bg-[#165DFF]' : 'bg-slate-200'}`}></div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Data & Security */}
                <section className="bg-white rounded-2xl border border-[#F3F4F3] overflow-hidden shadow-sm">
                     <div className="p-6 border-b border-[#F3F4F3]">
                         <h3 className="text-lg font-bold text-[#080C1A] flex items-center gap-2">
                            <Shield className="w-5 h-5 text-[#165DFF]" />
                            Keamanan & Data
                        </h3>
                    </div>
                    <div className="divide-y divide-[#F3F4F3]">
                        <button className="w-full text-left p-4 md:p-6 flex items-center justify-between hover:bg-slate-50 transition-colors group">
                             <div className="flex items-center gap-4">
                                <div className="p-2 bg-slate-100 rounded-lg text-slate-600 group-hover:text-[#165DFF] group-hover:bg-blue-50 transition-colors">
                                    <Database className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="font-bold text-[#080C1A]">Backup & Export Data</p>
                                    <p className="text-sm text-[#6A7686]">Unduh data keuangan Anda dalam format CSV/PDF</p>
                                </div>
                             </div>
                             <ChevronRight className="w-5 h-5 text-slate-400" />
                        </button>
                    </div>
                </section>

                 {/* Help & About */}
                <section className="bg-white rounded-2xl border border-[#F3F4F3] overflow-hidden shadow-sm">
                     <div className="p-6 border-b border-[#F3F4F3]">
                         <h3 className="text-lg font-bold text-[#080C1A] flex items-center gap-2">
                            <HelpCircle className="w-5 h-5 text-[#165DFF]" />
                            Bantuan & Lainnya
                        </h3>
                    </div>
                    <div className="divide-y divide-[#F3F4F3]">
                        <button className="w-full text-left p-4 md:p-6 flex items-center justify-between hover:bg-slate-50 transition-colors group">
                             <div className="flex items-center gap-4">
                                <div className="p-2 bg-slate-100 rounded-lg text-slate-600 group-hover:text-[#165DFF] group-hover:bg-blue-50 transition-colors">
                                    <FileText className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="font-bold text-[#080C1A]">Syarat & Ketentuan</p>
                                    <p className="text-sm text-[#6A7686]">Baca syarat penggunaan aplikasi</p>
                                </div>
                             </div>
                             <ChevronRight className="w-5 h-5 text-slate-400" />
                        </button>
                         <button className="w-full text-left p-4 md:p-6 flex items-center justify-between hover:bg-rose-50 transition-colors group">
                             <div className="flex items-center gap-4">
                                <div className="p-2 bg-rose-100 rounded-lg text-rose-600 transition-colors">
                                    <LogOut className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="font-bold text-rose-600">Keluar</p>
                                    <p className="text-sm text-rose-400">Logout dari akun Anda</p>
                                </div>
                             </div>
                        </button>
                    </div>
                </section>

                <div className="text-center text-slate-400 text-sm py-4">
                    <p>SwiftLog Money Manager v1.2.0</p>
                    <p>&copy; 2024 SwiftLog Inc. All rights reserved.</p>
                </div>

            </div>
        </main>
    )
}

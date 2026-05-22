'use client'
import { useState } from 'react'
import { User, Settings, Bell, Shield, LogOut, ChevronRight, Moon, Sun, Globe, Database, HelpCircle, FileText } from 'lucide-react'
import { useToast } from '@/hooks/useToast'
import { useTheme } from '@/hooks/useTheme'

export default function SettingsPage() {
    const { showToast } = useToast()
    const { theme, toggleTheme } = useTheme()
    const [notifications, setNotifications] = useState(true)

    return (
        <main className="flex-1 bg-[#F9FAFB] dark:bg-[#F9FAFB] dark:bg-[var(--bg-page)] min-h-screen overflow-x-hidden transition-all duration-300">
            <header className="sticky top-0 z-30 flex items-center justify-between w-full h-[70px] md:h-[90px] shrink-0 border-b border-[var(--border-default)] bg-[var(--bg-card)] px-5 md:px-8">
                <div>
                     <h2 className="font-bold text-2xl text-[var(--text-primary)]">Pengaturan</h2>
                </div>
                 <div className="hidden md:flex items-center gap-3 pl-3 border-l border-[var(--border-default)] ml-auto">
                    <div className="text-right">
                        <p className="font-semibold text-[var(--text-primary)] text-sm">Eko Budi</p>
                    </div>
                    <div className="w-11 h-11 bg-[var(--bg-elevated)] rounded-full flex items-center justify-center text-[var(--text-secondary)] font-bold border-2 border-[var(--bg-card)] shadow-sm">
                        EB
                    </div>
                </div>
            </header>

            <div className="p-5 md:p-8 max-w-4xl mx-auto space-y-8">
                {/* Profile Section */}
                <section className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-default)] p-6 shadow-sm">
                    <h3 className="text-lg font-bold text-[var(--text-primary)] mb-6 flex items-center gap-2">
                        <User className="w-5 h-5 text-[var(--primary)]" />
                        Profil Pengguna
                    </h3>
                    <div className="flex items-center gap-6">
                        <div className="w-20 h-20 bg-[var(--bg-elevated)] rounded-full flex items-center justify-center text-[var(--text-secondary)] font-bold text-2xl border-4 border-[var(--border-default)]">
                            EB
                        </div>
                        <div>
                            <h4 className="text-xl font-bold text-[var(--text-primary)]">Eko Budi</h4>
                            <p className="text-[var(--text-secondary)]">eko.budi@example.com</p>
                            <span className="inline-block mt-2 px-3 py-1 bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 text-xs font-bold rounded-full border border-yellow-100 dark:border-yellow-800/50">
                                Premium Member
                            </span>
                        </div>
                        <button className="ml-auto px-4 py-2 border border-[var(--border-default)] rounded-xl text-sm font-bold text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors">
                            Edit Profil
                        </button>
                    </div>
                </section>

                {/* Preferences */}
                <section className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-default)] overflow-hidden shadow-sm">
                    <div className="p-6 border-b border-[var(--border-default)]">
                         <h3 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
                            <Settings className="w-5 h-5 text-[var(--primary)]" />
                            Preferensi Aplikasi
                        </h3>
                    </div>
                    <div className="divide-y divide-[var(--border-default)]">
                        <div
                            onClick={toggleTheme}
                            className="p-4 md:p-6 flex items-center justify-between hover:bg-[var(--bg-hover)] transition-colors cursor-pointer group"
                        >
                             <div className="flex items-center gap-4">
                                <div className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'bg-amber-900/30 text-amber-400' : 'bg-slate-100 dark:bg-[var(--bg-hover)] text-slate-600 group-hover:text-[var(--primary)] group-hover:bg-blue-50 dark:bg-blue-950/30'}`}>
                                    {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                                </div>
                                <div>
                                    <p className="font-bold text-[var(--text-primary)]">{theme === 'dark' ? 'Mode Gelap' : 'Mode Terang'}</p>
                                    <p className="text-sm text-[var(--text-secondary)]">{theme === 'dark' ? 'Tampilan gelap aktif' : 'Ganti ke tampilan gelap'}</p>
                                </div>
                             </div>
                             <div className="relative inline-block w-12 mr-2 align-middle select-none">
                                <div className={`block overflow-hidden h-6 rounded-full cursor-pointer transition-colors duration-300 ${theme === 'dark' ? 'bg-[var(--primary)]' : 'bg-slate-200 dark:bg-slate-700'}`}>
                                    <div
                                        className="absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer transition-transform duration-300 ease-in-out top-0"
                                        style={{ transform: theme === 'dark' ? 'translateX(100%)' : 'translateX(0)', borderColor: theme === 'dark' ? 'var(--primary)' : '#E2E8F0' }}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="p-4 md:p-6 flex items-center justify-between hover:bg-[var(--bg-hover)] transition-colors cursor-pointer group">
                             <div className="flex items-center gap-4">
                                <div className="p-2 bg-[var(--bg-elevated)] rounded-lg text-[var(--text-secondary)] group-hover:text-[var(--primary)] group-hover:bg-blue-50 dark:group-hover:bg-blue-950/30 transition-colors">
                                    <Globe className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="font-bold text-[var(--text-primary)]">Bahasa</p>
                                    <p className="text-sm text-[var(--text-secondary)]">Indonesia</p>
                                </div>
                             </div>
                             <ChevronRight className="w-5 h-5 text-[var(--text-muted)]" />
                        </div>

                        <div className="p-4 md:p-6 flex items-center justify-between hover:bg-[var(--bg-hover)] transition-colors cursor-pointer group">
                             <div className="flex items-center gap-4">
                                <div className="p-2 bg-[var(--bg-elevated)] rounded-lg text-[var(--text-secondary)] group-hover:text-[var(--primary)] group-hover:bg-blue-50 dark:group-hover:bg-blue-950/30 transition-colors">
                                    <Bell className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="font-bold text-[var(--text-primary)]">Notifikasi</p>
                                    <p className="text-sm text-[var(--text-secondary)]">Atur preferensi notifikasi</p>
                                </div>
                             </div>
                             <div className="relative inline-block w-12 mr-2 align-middle select-none">
                                <div
                                    onClick={() => setNotifications(!notifications)}
                                    className={`block overflow-hidden h-6 rounded-full cursor-pointer transition-colors duration-300 ${notifications ? 'bg-[var(--primary)]' : 'bg-slate-200 dark:bg-slate-700'}`}
                                >
                                    <div
                                        className="absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer transition-transform duration-300 ease-in-out top-0"
                                        style={{ transform: notifications ? 'translateX(100%)' : 'translateX(0)', borderColor: notifications ? 'var(--primary)' : '#E2E8F0' }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Data & Security */}
                <section className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-default)] overflow-hidden shadow-sm">
                     <div className="p-6 border-b border-[var(--border-default)]">
                         <h3 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
                            <Shield className="w-5 h-5 text-[var(--primary)]" />
                            Keamanan & Data
                        </h3>
                    </div>
                    <div className="divide-y divide-[var(--border-default)]">
                        <button className="w-full text-left p-4 md:p-6 flex items-center justify-between hover:bg-[var(--bg-hover)] transition-colors group">
                             <div className="flex items-center gap-4">
                                <div className="p-2 bg-[var(--bg-elevated)] rounded-lg text-[var(--text-secondary)] group-hover:text-[var(--primary)] group-hover:bg-blue-50 dark:group-hover:bg-blue-950/30 transition-colors">
                                    <Database className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="font-bold text-[var(--text-primary)]">Backup & Export Data</p>
                                    <p className="text-sm text-[var(--text-secondary)]">Unduh data keuangan Anda dalam format CSV/PDF</p>
                                </div>
                             </div>
                             <ChevronRight className="w-5 h-5 text-[var(--text-muted)]" />
                        </button>
                    </div>
                </section>

                 {/* Help & About */}
                <section className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-default)] overflow-hidden shadow-sm">
                     <div className="p-6 border-b border-[var(--border-default)]">
                         <h3 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
                            <HelpCircle className="w-5 h-5 text-[var(--primary)]" />
                            Bantuan & Lainnya
                        </h3>
                    </div>
                    <div className="divide-y divide-[var(--border-default)]">
                        <button className="w-full text-left p-4 md:p-6 flex items-center justify-between hover:bg-[var(--bg-hover)] transition-colors group">
                             <div className="flex items-center gap-4">
                                <div className="p-2 bg-[var(--bg-elevated)] rounded-lg text-[var(--text-secondary)] group-hover:text-[var(--primary)] group-hover:bg-blue-50 dark:group-hover:bg-blue-950/30 transition-colors">
                                    <FileText className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="font-bold text-[var(--text-primary)]">Syarat & Ketentuan</p>
                                    <p className="text-sm text-[var(--text-secondary)]">Baca syarat penggunaan aplikasi</p>
                                </div>
                             </div>
                             <ChevronRight className="w-5 h-5 text-[var(--text-muted)]" />
                        </button>
                         <button className="w-full text-left p-4 md:p-6 flex items-center justify-between hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors group">
                             <div className="flex items-center gap-4">
                                <div className="p-2 bg-rose-100 dark:bg-rose-950/40 rounded-lg text-rose-600 dark:text-rose-400 transition-colors">
                                    <LogOut className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="font-bold text-rose-600 dark:text-rose-400">Keluar</p>
                                    <p className="text-sm text-rose-400 dark:text-rose-500">Logout dari akun Anda</p>
                                </div>
                             </div>
                        </button>
                    </div>
                </section>

                <div className="text-center text-[var(--text-muted)] text-sm py-4">
                    <p>SwiftLog Money Manager v1.2.0</p>
                    <p>&copy; 2024 SwiftLog Inc. All rights reserved.</p>
                </div>

            </div>
        </main>
    )
}

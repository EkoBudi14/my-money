'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Wallet } from '@/types'
import {
    Plus,
    Landmark,
    Trash2,
    Pencil,
    X,
    Wallet as WalletIcon,
    CreditCard,
    Banknote,
    Save
} from 'lucide-react'
import MoneyInput from '@/components/MoneyInput'
import { useToast } from '@/hooks/useToast'
import { useConfirm } from '@/hooks/useConfirm'
import { useSuccessModal } from '@/hooks/useSuccessModal'

import { useRouter } from 'next/navigation'
import WalletModal from '@/components/WalletModal'

export default function MainSavingsPage() {
    const router = useRouter()
    const [savingsWallets, setSavingsWallets] = useState<Wallet[]>([])
    const [activeWallets, setActiveWallets] = useState<Wallet[]>([])
    const [loading, setLoading] = useState(true)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingId, setEditingId] = useState<number | null>(null)

    const { showToast } = useToast()
    const { showConfirm } = useConfirm()
    const { showSuccess } = useSuccessModal()

    useEffect(() => {
        fetchSavings()
        fetchActiveWallets()
    }, [])

    const fetchActiveWallets = async () => {
        const { data } = await supabase
            .from('wallets')
            .select('*')
            .eq('category', 'active')
            .order('created_at', { ascending: false })
        if (data) setActiveWallets(data)
    }

    const fetchSavings = async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from('wallets')
            .select('*')
            .eq('category', 'savings')
            .order('created_at', { ascending: false })

        if (data) setSavingsWallets(data)
        if (error) showToast('error', 'Gagal memuat tabungan')
        setLoading(false)
    }

    const handleDelete = async (id: number) => {
        const confirm = await showConfirm({
            title: 'Hapus Aset?',
            message: 'Yakin ingin menghapus aset tabungan ini?'
        })
        if (!confirm) return

        await supabase.from('wallets').delete().eq('id', id)
        fetchSavings()
        showSuccess({
            type: 'delete',
            message: 'Aset tabungan berhasil dihapus.'
        })
    }

    const handleMobileEdit = (w: Wallet) => {
        router.push(`/wallet?category=savings&edit=${w.id}`)
    }

    const handleDesktopEdit = (w: Wallet) => {
        setEditingId(w.id)
        setIsModalOpen(true)
    }

    const totalSavings = savingsWallets.reduce((acc, curr) => acc + curr.balance, 0)

    const getIcon = (type: string) => {
        switch (type) {
            case 'bank': return <CreditCard className="w-6 h-6" />
            case 'ewallet': return <WalletIcon className="w-6 h-6" />
            case 'cash': return <Banknote className="w-6 h-6" />
            default: return <WalletIcon className="w-6 h-6" />
        }
    }

    return (
        <main className="flex-1 bg-[#F9FAFB] dark:bg-[#F9FAFB] dark:bg-[var(--bg-page)] min-h-screen overflow-x-hidden transition-all duration-300">
            <header className="sticky top-0 z-30 flex items-center justify-between w-full h-[70px] md:h-[90px] shrink-0 border-b border-[var(--border-default)] bg-white dark:bg-[var(--bg-card)] px-5 md:px-8">
                <div>
                    <h2 className="font-bold text-2xl text-[var(--text-primary)]">Tabungan Inti</h2>
                </div>
                <div className="hidden md:flex items-center gap-3 pl-3 border-l border-[var(--border-default)] ml-auto">
                    <div className="text-right">
                        <p className="font-semibold text-[var(--text-primary)] text-sm">Eko Budi</p>
                    </div>
                    <div className="w-11 h-11 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center text-slate-500 dark:text-slate-400 font-bold border-2 border-white shadow-sm">
                        EB
                    </div>
                </div>
            </header>

            {/* ===== MOBILE VIEW ===== */}
            <div className="md:hidden pb-[80px]">
                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : (
                    <>
                        {/* Summary Card */}
                        <div className="mx-4 mt-4 rounded-2xl p-5 relative overflow-hidden shadow-lg bg-gradient-to-br from-emerald-500 to-emerald-700 shadow-emerald-500/25">
                            <div className="absolute -top-6 -right-6 w-28 h-28 bg-white/5 rounded-full" />
                            <div className="absolute -bottom-8 -left-4 w-36 h-36 bg-white/5 rounded-full" />
                            <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest mb-1 relative z-10">
                                Total Aset & Simpanan
                            </p>
                            <p className="text-white font-extrabold text-2xl relative z-10">
                                Rp {totalSavings.toLocaleString('id-ID')}
                            </p>
                            <p className="text-white/60 text-xs mt-1 relative z-10">{savingsWallets.length} aset tercatat</p>
                        </div>

                        {/* Info Bar */}
                        <div className="flex items-center justify-between px-4 mt-5 mb-2">
                            <p className="text-sm font-bold text-[var(--text-primary)]">{savingsWallets.length} aset tabungan</p>
                            <p className="text-[11px] text-[var(--text-secondary)]">Tap untuk edit / hapus</p>
                        </div>

                        {/* List */}
                        {savingsWallets.length === 0 ? (
                            <div className="mx-4 text-center py-10 text-slate-400 dark:text-slate-500 border-2 border-dashed border-[var(--border-default)] rounded-2xl bg-white dark:bg-[var(--bg-card)]">
                                <p className="text-sm">Belum ada aset tabungan.</p>
                            </div>
                        ) : (
                            <div className="mx-4 bg-white dark:bg-[var(--bg-card)] rounded-2xl border border-[var(--border-default)] shadow-sm overflow-hidden">
                                {savingsWallets.map((wallet, idx) => {
                                    const isLast = idx === savingsWallets.length - 1
                                    return (
                                        <div key={wallet.id} className={`px-4 pt-3.5 pb-3 ${!isLast ? 'border-b border-[var(--border-default)]' : ''}`}>
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className="bg-emerald-50 dark:bg-emerald-950/30 p-2.5 rounded-xl text-emerald-600 shrink-0">
                                                    {getIcon(wallet.type)}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-bold text-sm text-[var(--text-primary)] truncate">{wallet.name}</p>
                                                    <p className="text-[11px] text-[var(--text-secondary)] uppercase tracking-wider">{wallet.type}</p>
                                                </div>
                                                <p className="font-bold text-sm text-emerald-600 shrink-0">Rp {wallet.balance.toLocaleString('id-ID')}</p>
                                            </div>

                                            <div className="grid grid-cols-2 gap-2">
                                                <button
                                                    onClick={() => handleMobileEdit(wallet)}
                                                    className="py-2 flex items-center justify-center gap-1.5 bg-slate-50 dark:bg-[var(--bg-elevated)] text-slate-600 dark:text-slate-500 font-bold rounded-xl text-xs hover:bg-slate-100 dark:hover:bg-[var(--bg-hover)] active:scale-95 transition-all"
                                                >
                                                    <Pencil className="w-3.5 h-3.5" />
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(wallet.id)}
                                                    className="py-2 flex items-center justify-center gap-1.5 bg-rose-50 dark:bg-rose-950/30 text-rose-600 font-bold rounded-xl text-xs hover:bg-rose-100 dark:bg-rose-950/40 active:scale-95 transition-all"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                    Hapus
                                                </button>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}

                        {/* Tambah Aset Button */}
                        <button
                            onClick={() => router.push('/wallet?category=savings')}
                            className="mx-4 mt-3 w-[calc(100%-2rem)] border-2 border-dashed border-[#E2E8F0] rounded-2xl p-4 flex items-center justify-center gap-3 text-slate-400 dark:text-slate-500 hover:text-emerald-600 hover:border-emerald-400 hover:bg-emerald-50 dark:bg-emerald-950/30/30 transition-all active:scale-[0.98]"
                        >
                            <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-[var(--bg-hover)] flex items-center justify-center">
                                <Plus className="w-4 h-4" />
                            </div>
                            <span className="font-bold text-sm">Tambah Aset Baru</span>
                        </button>
                    </>
                )}
            </div>

            {/* ===== DESKTOP VIEW ===== */}
            <div className="hidden md:block p-8 space-y-6">
                <div className="bg-white dark:bg-[var(--bg-card)] px-6 py-6 rounded-2xl border border-[var(--border-default)] flex items-center gap-5 shadow-sm">
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl text-emerald-600">
                        <Landmark className="w-8 h-8" />
                    </div>
                    <div>
                        <p className="text-sm text-[var(--text-secondary)] font-bold uppercase tracking-wide">Total Aset & Simpanan</p>
                        <p className="text-3xl font-bold text-[var(--text-primary)] mt-1">Rp {totalSavings.toLocaleString('id-ID')}</p>
                    </div>
                </div>

                {loading ? (
                    <div className="text-center py-20 text-slate-400 dark:text-slate-500 animate-pulse">Memuat aset...</div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {savingsWallets.map((wallet) => (
                            <div key={wallet.id} className="bg-white dark:bg-[var(--bg-card)] p-6 pb-8 rounded-3xl border border-[var(--border-default)] hover:shadow-lg transition-all duration-300 group flex flex-col justify-between card-hover relative overflow-hidden min-h-[240px]">
                                <div>
                                    <div className="flex justify-between items-start mb-4 relative z-10">
                                        <div className="bg-emerald-50 dark:bg-emerald-950/30 p-3 rounded-xl text-emerald-600">
                                            {getIcon(wallet.type)}
                                        </div>
                                        <div className="flex gap-1">
                                            <button onClick={() => handleDesktopEdit(wallet)} className="p-3 bg-white dark:bg-[var(--bg-card)]/80 backdrop-blur-sm border border-slate-100 dark:border-[var(--border-default)] rounded-xl text-emerald-600 hover:bg-emerald-50 dark:bg-emerald-950/30 transition-all shadow-sm hover:shadow-md active:scale-95">
                                                <Pencil className="w-5 h-5" />
                                            </button>
                                            <button onClick={() => handleDelete(wallet.id)} className="p-3 bg-white dark:bg-[var(--bg-card)]/80 backdrop-blur-sm border border-slate-100 dark:border-[var(--border-default)] rounded-xl text-rose-500 hover:bg-rose-50 dark:bg-rose-950/30 transition-all shadow-sm hover:shadow-md active:scale-95">
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>
                                    <h3 className="font-bold text-lg text-[var(--text-primary)] mb-1 relative z-10">{wallet.name}</h3>
                                    <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wider mb-4 relative z-10">{wallet.type}</p>
                                </div>
                                <div className="relative z-10">
                                    <p className="text-2xl font-bold text-emerald-600">Rp {wallet.balance.toLocaleString('id-ID')}</p>
                                </div>
                                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-50 to-transparent rounded-bl-full opacity-50 -z-0"></div>
                            </div>
                        ))}

                        <button
                            onClick={() => { setEditingId(null); setIsModalOpen(true); }}
                            className="border-2 border-dashed border-[#E2E8F0] rounded-2xl p-6 flex flex-col items-center justify-center gap-4 text-slate-400 dark:text-slate-500 hover:text-[var(--primary)] hover:border-[var(--primary)] hover:bg-blue-50 dark:bg-blue-950/30/30 transition-all min-h-[220px] group"
                        >
                            <div className="bg-slate-50 dark:bg-[var(--bg-elevated)] p-4 rounded-full group-hover:bg-blue-100 transition-colors">
                                <Plus className="w-8 h-8 group-hover:text-[var(--primary)] transition-colors" />
                            </div>
                            <span className="font-bold">Tambah Aset Baru</span>
                        </button>
                    </div>
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <WalletModal
                    editId={editingId}
                    defaultCategory="savings"
                    onClose={() => setIsModalOpen(false)}
                    onSaved={() => { setIsModalOpen(false); fetchSavings(); fetchActiveWallets(); }}
                    mode="modal"
                />
            )}
        </main>
    )
}

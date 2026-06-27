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
        <main className="flex-1 bg-[var(--bg-page)] min-h-screen overflow-x-hidden transition-all duration-300">
            {/* ── Header ── */}
            <header className="sticky top-0 z-30 flex items-center justify-between w-full h-[70px] md:h-[90px] shrink-0 bg-[var(--bg-card)] px-5 md:px-8"
                style={{ borderBottom: 'var(--neo-border)' }}>
                <h2 className="font-black text-2xl tracking-tight text-[var(--text-primary)]">Tabungan Inti</h2>
                <div className="hidden md:flex items-center gap-3 pl-3 ml-auto" style={{ borderLeft: '2px solid var(--border-default)' }}>
                    <p className="font-bold text-[var(--text-primary)] text-sm">Eko Budi</p>
                    <div className="w-10 h-10 rounded-[14px] flex items-center justify-center font-black text-sm"
                        style={{ background: 'var(--neo-yellow-vivid)', border: 'var(--neo-border)', boxShadow: 'var(--neo-shadow-xs)' }}>
                        EB
                    </div>
                </div>
            </header>

            {/* ===== MOBILE VIEW ===== */}
            <div className="md:hidden pb-[80px]">
                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <div className="w-6 h-6 border-2 border-[var(--neo-ink)] border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : (
                    <>
                        {/* Summary Card — Neobrutalism mint */}
                        <div className="mx-4 mt-4 brutal-card-md brutal-card-mint p-5">
                            <p className="neo-label mb-1">Total Aset &amp; Simpanan</p>
                            <p className="neo-amount mt-1">Rp {totalSavings.toLocaleString('id-ID')}</p>
                            <p className="text-xs font-bold text-[var(--text-secondary)] mt-2">{savingsWallets.length} aset tercatat</p>
                        </div>

                        {/* Info Bar */}
                        <div className="flex items-center justify-between px-4 mt-5 mb-2">
                            <p className="text-sm font-black text-[var(--text-primary)]">{savingsWallets.length} aset tabungan</p>
                            <p className="text-[11px] font-semibold text-[var(--text-muted)]">Tap untuk edit / hapus</p>
                        </div>

                        {/* List */}
                        {savingsWallets.length === 0 ? (
                            <div className="mx-4 brutal-card-sm p-10 text-center">
                                <Landmark className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-2" />
                                <p className="text-sm font-semibold text-[var(--text-muted)]">Belum ada aset tabungan.</p>
                            </div>
                        ) : (
                            <div className="mx-4 space-y-2">
                                {savingsWallets.map((wallet) => (
                                    <div key={wallet.id} className="brutal-card-sm p-4">
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="w-11 h-11 rounded-[14px] flex items-center justify-center text-[var(--success)] shrink-0"
                                                style={{ background: 'var(--neo-mint)', border: '2px solid var(--neo-ink)' }}>
                                                {getIcon(wallet.type)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-black text-sm text-[var(--text-primary)] truncate">{wallet.name}</p>
                                                <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mt-0.5">{wallet.type}</p>
                                            </div>
                                            <p className="font-black text-sm neo-amount-pos shrink-0">Rp {wallet.balance.toLocaleString('id-ID')}</p>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <button
                                                onClick={() => handleMobileEdit(wallet)}
                                                className="py-2 flex items-center justify-center gap-1.5 font-bold rounded-[12px] text-xs active:scale-95 transition-all"
                                                style={{ background: 'var(--bg-elevated)', border: '2px solid var(--neo-ink)', boxShadow: 'var(--neo-shadow-xs)', color: 'var(--text-primary)' }}
                                            >
                                                <Pencil className="w-3.5 h-3.5" />
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => handleDelete(wallet.id)}
                                                className="py-2 flex items-center justify-center gap-1.5 font-bold rounded-[12px] text-xs active:scale-95 transition-all"
                                                style={{ background: 'var(--neo-peach)', border: '2px solid var(--neo-ink)', boxShadow: 'var(--neo-shadow-xs)', color: 'var(--error)' }}
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                                Hapus
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Tambah Aset Button */}
                        <button
                            onClick={() => router.push('/wallet?category=savings')}
                            className="mx-4 mt-3 w-[calc(100%-2rem)] rounded-[20px] p-4 flex items-center justify-center gap-3 font-bold text-sm transition-all active:scale-[0.98]"
                            style={{ border: '2.5px dashed var(--neo-ink)', color: 'var(--text-muted)', background: 'transparent' }}
                        >
                            <div className="w-8 h-8 rounded-full flex items-center justify-center"
                                style={{ background: 'var(--neo-mint)', border: '2px solid var(--neo-ink)' }}>
                                <Plus className="w-4 h-4 text-[var(--neo-ink)]" />
                            </div>
                            Tambah Aset Baru
                        </button>
                    </>
                )}
            </div>

            {/* ===== DESKTOP VIEW ===== */}
            <div className="hidden md:block p-8 space-y-6">
                {/* Total Banner */}
                <div className="brutal-card-md brutal-card-mint px-6 py-6 flex items-center gap-5">
                    <div className="w-14 h-14 rounded-[16px] flex items-center justify-center text-[var(--success)]"
                        style={{ background: 'var(--bg-elevated)', border: 'var(--neo-border)', boxShadow: 'var(--neo-shadow-xs)' }}>
                        <Landmark className="w-7 h-7" />
                    </div>
                    <div>
                        <p className="neo-label">Total Aset &amp; Simpanan</p>
                        <p className="neo-amount mt-1">Rp {totalSavings.toLocaleString('id-ID')}</p>
                    </div>
                </div>

                {loading ? (
                    <div className="text-center py-20 text-[var(--text-muted)] animate-pulse font-semibold">Memuat aset...</div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {savingsWallets.map((wallet) => (
                            <div key={wallet.id} className="brutal-card card-hover flex flex-col justify-between min-h-[240px] p-6 pb-8" style={{ background: 'var(--neo-mint)' }}>
                                <div>
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="w-12 h-12 rounded-[14px] flex items-center justify-center text-[var(--success)]"
                                            style={{ background: 'var(--bg-elevated)', border: '2px solid var(--neo-ink)', boxShadow: 'var(--neo-shadow-xs)' }}>
                                            {getIcon(wallet.type)}
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => handleDesktopEdit(wallet)}
                                                className="p-2.5 rounded-[12px] font-bold transition-all active:scale-95 active:translate-x-[2px] active:translate-y-[2px]"
                                                style={{ background: 'var(--bg-elevated)', border: '2px solid var(--neo-ink)', boxShadow: 'var(--neo-shadow-xs)', color: 'var(--text-primary)' }}>
                                                <Pencil className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => handleDelete(wallet.id)}
                                                className="p-2.5 rounded-[12px] font-bold transition-all active:scale-95 active:translate-x-[2px] active:translate-y-[2px]"
                                                style={{ background: 'var(--neo-peach)', border: '2px solid var(--neo-ink)', boxShadow: 'var(--neo-shadow-xs)', color: 'var(--error)' }}>
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                    <h3 className="font-black text-lg text-[var(--text-primary)] mb-0.5 tracking-tight">{wallet.name}</h3>
                                    <span className="neo-pill text-[10px]">{wallet.type}</span>
                                </div>
                                <div className="mt-6 pt-4" style={{ borderTop: '2px dashed rgba(20,20,20,0.18)' }}>
                                    <p className="neo-label">Saldo</p>
                                    <p className="text-2xl font-black mt-1 neo-amount-pos">Rp {wallet.balance.toLocaleString('id-ID')}</p>
                                </div>
                            </div>
                        ))}

                        <button
                            onClick={() => { setEditingId(null); setIsModalOpen(true); }}
                            className="rounded-[24px] p-6 flex flex-col items-center justify-center gap-4 font-bold text-sm transition-all min-h-[220px] group active:scale-[0.98]"
                            style={{ border: '2.5px dashed var(--neo-ink)', color: 'var(--text-muted)', background: 'transparent' }}
                        >
                            <div className="w-12 h-12 rounded-full flex items-center justify-center transition-all group-hover:scale-110"
                                style={{ background: 'var(--neo-mint)', border: '2px solid var(--neo-ink)', boxShadow: 'var(--neo-shadow-xs)' }}>
                                <Plus className="w-6 h-6 text-[var(--neo-ink)]" />
                            </div>
                            <span className="font-black">Tambah Aset Baru</span>
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

'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Wallet } from '@/types'
import { Plus, Wallet as WalletIcon, CreditCard, Banknote, Trash2, Pencil, X } from 'lucide-react'
import MoneyInput from '@/components/MoneyInput'
import { useToast } from '@/hooks/useToast'
import { useConfirm } from '@/hooks/useConfirm'
import { useSuccessModal } from '@/hooks/useSuccessModal'
import { useRouter } from 'next/navigation'
import WalletModal from '@/components/WalletModal'

export default function WalletsPage() {
    const router = useRouter()
    const [activeWallets, setActiveWallets] = useState<Wallet[]>([])
    const [savingsWallets, setSavingsWallets] = useState<Wallet[]>([])
    const [loading, setLoading] = useState(true)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingId, setEditingId] = useState<number | null>(null)

    const { showToast } = useToast()
    const { showConfirm } = useConfirm()
    const { showSuccess } = useSuccessModal()

    useEffect(() => {
        fetchWallets()
    }, [])

    const fetchWallets = async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from('wallets')
            .select('*')
            .order('created_at', { ascending: true })

        if (error) {
            console.error('Error fetching wallets:', error)
            showToast('error', 'Gagal memuat data dompet')
        } else {
            const allWallets = data || []
            setActiveWallets(allWallets.filter(w => w.category === 'active'))
            setSavingsWallets(allWallets.filter(w => w.category === 'savings'))
        }
        setLoading(false)
    }

    const handleDelete = async (id: number) => {
        // 1. Fetch wallet details first to check for source_wallet_id and balance
        const { data: walletToDelete } = await supabase.from('wallets').select('*').eq('id', id).single()

        if (!walletToDelete) {
            return showToast('error', 'Dompet not found')
        }

        let refundMessage = ''

        // 2. Check logic for refund
        if (walletToDelete.source_wallet_id && walletToDelete.balance > 0) {
            const { data: sourceWallet } = await supabase.from('wallets').select('*').eq('id', walletToDelete.source_wallet_id).single()

            if (sourceWallet) {
                refundMessage = `Sisa saldo Rp ${walletToDelete.balance.toLocaleString('id-ID')} akan dikembalikan ke ${sourceWallet.name}.`
            }
        }

        const confirm = await showConfirm({
            title: 'Hapus Dompet?',
            message: `Hapus dompet "${walletToDelete.name}"? SEMUA RIWAYAT TRANSAKSI terkait akan TERHAPUS. ${refundMessage}`
        })
        if (!confirm) return

        // 3. Process Refund if confirmed and applicable
        if (walletToDelete.source_wallet_id && walletToDelete.balance > 0) {
            const { data: sourceWallet } = await supabase.from('wallets').select('*').eq('id', walletToDelete.source_wallet_id).single()

            if (sourceWallet) {
                const newBalance = sourceWallet.balance + walletToDelete.balance
                await supabase.from('wallets').update({ balance: newBalance }).eq('id', sourceWallet.id)
                showToast('success', `Saldo Rp ${walletToDelete.balance.toLocaleString('id-ID')} dikembalikan ke ${sourceWallet.name}`)
            }
        }

        // 4. Delete associated transactions first
        const { error: txError } = await supabase.from('transactions').delete().eq('wallet_id', id)

        if (txError) {
            console.error(txError)
            return showToast('error', 'Gagal menghapus riwayat transaksi terkait')
        }

        // 5. Delete the wallet
        const { error } = await supabase.from('wallets').delete().eq('id', id)

        if (error) {
            showToast('error', 'Gagal menghapus dompet')
        } else {
            fetchWallets()
            showSuccess({
                type: 'delete',
                message: 'Dompet berhasil dihapus beserta seluruh riwayat transaksinya.'
            })
        }
    }

    const handleMobileEdit = (w: Wallet) => {
        router.push(`/wallet?category=active&edit=${w.id}`)
    }

    const handleDesktopEdit = (w: Wallet) => {
        setEditingId(w.id)
        setIsModalOpen(true)
    }

    const getIcon = (type: string) => {
        switch (type) {
            case 'bank': return <CreditCard className="w-6 h-6" />
            case 'ewallet': return <WalletIcon className="w-6 h-6" />
            case 'cash': return <Banknote className="w-6 h-6" />
            default: return <WalletIcon className="w-6 h-6" />
        }
    }

    // Neobrutalism color per wallet type
    const getCardColor = (type: string) => {
        switch (type) {
            case 'bank': return 'var(--neo-sky)'
            case 'ewallet': return 'var(--neo-lav)'
            case 'cash': return 'var(--neo-mint)'
            default: return 'var(--neo-yellow)'
        }
    }

    const getIconColor = (type: string) => {
        switch (type) {
            case 'bank': return '#2563eb'
            case 'ewallet': return '#7c3aed'
            case 'cash': return '#059669'
            default: return 'var(--text-primary)'
        }
    }

    return (
        <main className="flex-1 bg-[var(--bg-page)] min-h-screen overflow-x-hidden transition-all duration-300">
            {/* ── Header ── */}
            <div className="flex items-center justify-between w-full h-[90px] shrink-0 bg-[var(--bg-card)] px-5 md:px-8"
                style={{ borderBottom: 'var(--neo-border)' }}>
                <h2 className="font-black text-2xl tracking-tight text-[var(--text-primary)]">Dompet Saya</h2>
                <div className="flex items-center gap-3">
                    <div className="hidden md:flex items-center gap-3 pl-3" style={{ borderLeft: '2px solid var(--border-default)' }}>
                        <p className="font-bold text-[var(--text-primary)] text-sm">Eko Budi</p>
                        <div className="w-10 h-10 rounded-[14px] flex items-center justify-center font-black text-sm"
                            style={{ background: 'var(--neo-yellow-vivid)', border: 'var(--neo-border)', boxShadow: 'var(--neo-shadow-xs)' }}>
                            EB
                        </div>
                    </div>
                </div>
            </div>

            <div className="relative min-h-[calc(100vh-90px)]">

                {/* ===== MOBILE VIEW ===== */}
                <div className="md:hidden pb-[80px]">
                    {loading ? (
                        <div className="flex items-center justify-center py-16">
                            <div className="w-6 h-6 border-2 border-[var(--neo-ink)] border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : (() => {
                        const totalBalance = activeWallets.reduce((acc, w) => acc + w.balance, 0)
                        const cashCount = activeWallets.filter(w => w.type === 'cash').length
                        const ewalletCount = activeWallets.filter(w => w.type === 'ewallet').length
                        const bankCount = activeWallets.filter(w => w.type === 'bank').length

                        return (
                            <>
                                {/* Summary Card — Neobrutalism sky */}
                                <div className="mx-4 mt-4 brutal-card-md brutal-card-sky p-5">
                                    <p className="neo-label mb-1">Total Semua Dompet</p>
                                    <p className="neo-amount mt-1">Rp {totalBalance.toLocaleString('id-ID')}</p>
                                    <div className="flex items-center gap-2 flex-wrap mt-3">
                                        {cashCount > 0 && (
                                            <span className="neo-pill text-[10px]">
                                                <span className="w-2 h-2 rounded-full bg-[var(--success)] inline-block" />
                                                {cashCount} Cash
                                            </span>
                                        )}
                                        {ewalletCount > 0 && (
                                            <span className="neo-pill text-[10px]">
                                                <span className="w-2 h-2 rounded-full bg-purple-500 inline-block" />
                                                {ewalletCount} E-Wallet
                                            </span>
                                        )}
                                        {bankCount > 0 && (
                                            <span className="neo-pill text-[10px]">
                                                <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
                                                {bankCount} Bank
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Info Bar */}
                                <div className="flex items-center justify-between px-4 mt-5 mb-2">
                                    <p className="text-sm font-black text-[var(--text-primary)]">{activeWallets.length} dompet aktif</p>
                                    <p className="text-[11px] font-semibold text-[var(--text-muted)]">Tap untuk edit / hapus</p>
                                </div>

                                {/* Wallet List */}
                                <div className="mx-4 space-y-2">
                                    {activeWallets.map((wallet) => {
                                        const pct = totalBalance > 0 ? Math.round((wallet.balance / totalBalance) * 100) : 0
                                        return (
                                            <div
                                                key={wallet.id}
                                                className="brutal-card-sm p-4"
                                                style={{ background: getCardColor(wallet.type) }}
                                            >
                                                <div className="flex items-center gap-3 mb-3">
                                                    {/* Icon */}
                                                    <div className="w-11 h-11 rounded-[14px] flex items-center justify-center shrink-0"
                                                        style={{ background: 'var(--bg-elevated)', border: '2px solid var(--neo-ink)', color: getIconColor(wallet.type) }}>
                                                        {getIcon(wallet.type)}
                                                    </div>

                                                    {/* Info */}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center justify-between mb-0.5">
                                                            <p className="font-black text-[var(--text-primary)] text-sm truncate">{wallet.name}</p>
                                                            <p className="font-black text-sm text-[var(--text-primary)] shrink-0 ml-2">Rp {wallet.balance.toLocaleString('id-ID')}</p>
                                                        </div>
                                                        <div className="flex items-center justify-between mb-1.5">
                                                            <span className="neo-pill text-[9px] py-0.5 px-2">{wallet.type}</span>
                                                            <p className="text-[11px] font-semibold text-[var(--text-muted)]">{pct}% dari total</p>
                                                        </div>
                                                        {/* Progress bar */}
                                                        <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(20,20,20,0.12)' }}>
                                                            <div
                                                                className="h-full rounded-full transition-all duration-500"
                                                                style={{ width: `${pct}%`, background: 'var(--neo-ink)' }}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Actions */}
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
                                        )
                                    })}
                                </div>

                                {/* Tambah Dompet Button */}
                                <button
                                    onClick={() => router.push('/wallet?category=active')}
                                    className="mx-4 mt-3 w-[calc(100%-2rem)] rounded-[20px] p-4 flex items-center justify-center gap-3 font-bold text-sm transition-all active:scale-[0.98]"
                                    style={{ border: '2.5px dashed var(--neo-ink)', color: 'var(--text-muted)', background: 'transparent' }}
                                >
                                    <div className="w-8 h-8 rounded-full flex items-center justify-center"
                                        style={{ background: 'var(--neo-sky)', border: '2px solid var(--neo-ink)' }}>
                                        <Plus className="w-4 h-4 text-[var(--neo-ink)]" />
                                    </div>
                                    <span className="font-black">Tambah Dompet Baru</span>
                                </button>
                            </>
                        )
                    })()}
                </div>

                {/* ===== DESKTOP VIEW ===== */}
                <div className="hidden md:block p-8 space-y-6">
                    {/* Total Banner */}
                    <div className="brutal-card-md brutal-card-sky px-6 py-6 flex items-center gap-5">
                        <div className="w-14 h-14 rounded-[16px] flex items-center justify-center text-blue-600"
                            style={{ background: 'var(--bg-elevated)', border: 'var(--neo-border)', boxShadow: 'var(--neo-shadow-xs)' }}>
                            <WalletIcon className="w-7 h-7" />
                        </div>
                        <div>
                            <p className="neo-label">Total Semua Dompet</p>
                            <p className="neo-amount mt-1">Rp {activeWallets.reduce((acc, w) => acc + w.balance, 0).toLocaleString('id-ID')}</p>
                        </div>
                    </div>

                    {loading ? (
                        <div className="text-center py-12 text-[var(--text-muted)] font-semibold animate-pulse">Memuat dompet...</div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {activeWallets.map((wallet: Wallet) => (
                                <div key={wallet.id}
                                    className="brutal-card card-hover flex flex-col justify-between min-h-[220px] p-6 pb-8 relative overflow-hidden"
                                    style={{ background: getCardColor(wallet.type) }}>
                                    <div className="absolute top-0 right-0 p-4 flex gap-2 z-20">
                                        <button onClick={() => handleDesktopEdit(wallet)}
                                            className="p-2.5 rounded-[12px] transition-all active:scale-95 active:translate-x-[2px] active:translate-y-[2px]"
                                            style={{ background: 'var(--bg-elevated)', border: '2px solid var(--neo-ink)', boxShadow: 'var(--neo-shadow-xs)', color: 'var(--text-primary)' }}>
                                            <Pencil className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => handleDelete(wallet.id)}
                                            className="p-2.5 rounded-[12px] transition-all active:scale-95 active:translate-x-[2px] active:translate-y-[2px]"
                                            style={{ background: 'var(--neo-peach)', border: '2px solid var(--neo-ink)', boxShadow: 'var(--neo-shadow-xs)', color: 'var(--error)' }}>
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>

                                    <div className="z-10 mt-2">
                                        <div className="w-14 h-14 rounded-[16px] flex items-center justify-center mb-5"
                                            style={{ background: 'var(--bg-elevated)', border: 'var(--neo-border)', boxShadow: 'var(--neo-shadow-xs)', color: getIconColor(wallet.type) }}>
                                            {getIcon(wallet.type)}
                                        </div>
                                        <h3 className="font-black text-xl text-[var(--text-primary)] mb-1 tracking-tight">{wallet.name}</h3>
                                        <span className="neo-pill text-[10px]">{wallet.type}</span>
                                    </div>

                                    <div className="z-10 mt-6 pt-4" style={{ borderTop: '2px dashed rgba(20,20,20,0.18)' }}>
                                        <p className="neo-label">Saldo Saat Ini</p>
                                        <p className="text-2xl font-black text-[var(--text-primary)] mt-1">Rp {wallet.balance.toLocaleString('id-ID')}</p>
                                    </div>
                                </div>
                            ))}

                            {/* Add New Wallet Card */}
                            <button
                                onClick={() => { setEditingId(null); setIsModalOpen(true); }}
                                className="rounded-[24px] p-6 flex flex-col items-center justify-center gap-4 font-bold text-sm transition-all min-h-[220px] group active:scale-[0.98]"
                                style={{ border: '2.5px dashed var(--neo-ink)', color: 'var(--text-muted)', background: 'transparent' }}
                            >
                                <div className="w-12 h-12 rounded-full flex items-center justify-center transition-all group-hover:scale-110"
                                    style={{ background: 'var(--neo-sky)', border: '2px solid var(--neo-ink)', boxShadow: 'var(--neo-shadow-xs)' }}>
                                    <Plus className="w-6 h-6 text-[var(--neo-ink)]" />
                                </div>
                                <span className="font-black">Tambah Dompet Baru</span>
                            </button>
                        </div>
                    )}
                </div>

            </div>

            {/* Modal */}
            {isModalOpen && (
                <WalletModal
                    editId={editingId}
                    defaultCategory="active"
                    onClose={() => setIsModalOpen(false)}
                    onSaved={() => { setIsModalOpen(false); fetchWallets(); }}
                    mode="modal"
                />
            )}
        </main>
    )
}

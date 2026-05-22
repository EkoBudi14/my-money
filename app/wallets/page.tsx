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

    const getColor = (type: string) => {
        switch (type) {
            case 'bank': return 'bg-blue-600'
            case 'ewallet': return 'bg-purple-600'
            case 'cash': return 'bg-emerald-600'
            default: return 'bg-slate-600'
        }
    }

    return (
        <main className="flex-1 bg-[#F9FAFB] dark:bg-[#F9FAFB] dark:bg-[var(--bg-page)] min-h-screen overflow-x-hidden transition-all duration-300">
            {/* Top Header */}
            <div className="flex items-center justify-between w-full h-[90px] shrink-0 border-b border-[var(--border-default)] bg-white dark:bg-[var(--bg-card)] px-5 md:px-8">
                <div className="flex items-center gap-4">
                    <h2 className="font-bold text-2xl text-[var(--text-primary)]">Dompet Saya</h2>
                </div>

                <div className="flex items-center gap-3">
                    <div className="hidden md:flex items-center gap-3 pl-3">
                        <div className="text-right">
                            <p className="font-semibold text-[var(--text-primary)] text-sm">Eko Budi</p>
                        </div>
                        <div className="w-11 h-11 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center text-slate-500 dark:text-slate-400 font-bold border-2 border-white shadow-sm">
                            EB
                        </div>
                    </div>
                </div>
            </div>

            <div className="relative min-h-[calc(100vh-90px)]">

                {/* ===== MOBILE VIEW ===== */}
                <div className="md:hidden pb-[80px]">
                    {loading ? (
                        <div className="flex items-center justify-center py-16 text-slate-400 dark:text-slate-500">
                            <div className="w-6 h-6 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : (() => {
                        const totalBalance = activeWallets.reduce((acc, w) => acc + w.balance, 0)
                        const cashCount = activeWallets.filter(w => w.type === 'cash').length
                        const ewalletCount = activeWallets.filter(w => w.type === 'ewallet').length
                        const bankCount = activeWallets.filter(w => w.type === 'bank').length

                        return (
                            <>
                                {/* Summary Card */}
                                <div className="mx-4 mt-4 rounded-2xl bg-gradient-to-br from-[#165DFF] to-[#0E4BD9] p-5 relative overflow-hidden shadow-lg shadow-blue-500/25">
                                    <div className="absolute -top-6 -right-6 w-28 h-28 bg-white/5 rounded-full" />
                                    <div className="absolute -bottom-8 -left-4 w-36 h-36 bg-white/5 rounded-full" />
                                    <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest mb-1 relative z-10">Total Semua Dompet</p>
                                    <p className="text-white font-extrabold text-3xl mb-4 relative z-10">Rp {totalBalance.toLocaleString('id-ID')}</p>
                                    <div className="flex items-center gap-2 flex-wrap relative z-10">
                                        {cashCount > 0 && (
                                            <span className="flex items-center gap-1 text-[11px] font-semibold bg-white dark:bg-[var(--bg-card)]/15 text-[#165DFF] dark:text-white px-2.5 py-1 rounded-full">
                                                <span className="w-1.5 h-1.5 bg-emerald-300 rounded-full" />
                                                {cashCount} Cash
                                            </span>
                                        )}
                                        {ewalletCount > 0 && (
                                            <span className="flex items-center gap-1 text-[11px] font-semibold bg-white dark:bg-[var(--bg-card)]/15 text-[#165DFF] dark:text-white px-2.5 py-1 rounded-full">
                                                <span className="w-1.5 h-1.5 bg-purple-300 rounded-full" />
                                                {ewalletCount} E-Wallet
                                            </span>
                                        )}
                                        {bankCount > 0 && (
                                            <span className="flex items-center gap-1 text-[11px] font-semibold bg-white dark:bg-[var(--bg-card)]/15 text-[#165DFF] dark:text-white px-2.5 py-1 rounded-full">
                                                <span className="w-1.5 h-1.5 bg-blue-300 rounded-full" />
                                                {bankCount} Bank
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Info Bar */}
                                <div className="flex items-center justify-between px-4 mt-5 mb-2">
                                    <p className="text-sm font-bold text-[var(--text-primary)]">{activeWallets.length} dompet aktif</p>
                                    <p className="text-[11px] text-[var(--text-secondary)]">Tap untuk edit / hapus</p>
                                </div>

                                {/* Wallet List */}
                                <div className="mx-4 bg-white dark:bg-[var(--bg-card)] rounded-2xl border border-[var(--border-default)] shadow-sm overflow-hidden">
                                    {activeWallets.map((wallet, idx) => {
                                        const pct = totalBalance > 0 ? Math.round((wallet.balance / totalBalance) * 100) : 0
                                        const isLast = idx === activeWallets.length - 1
                                        return (
                                            <div
                                                key={wallet.id}
                                                className={`px-4 py-3.5 flex items-center gap-3 active:bg-[#F9FAFB] dark:active:bg-[#F9FAFB] dark:bg-[var(--bg-page)] transition-colors ${!isLast ? 'border-b border-[var(--border-default)]' : ''}`}
                                            >
                                                {/* Icon */}
                                                <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-white shrink-0 ${getColor(wallet.type)}`}>
                                                    {getIcon(wallet.type)}
                                                </div>

                                                {/* Info */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between mb-0.5">
                                                        <p className="font-bold text-[var(--text-primary)] text-sm truncate">{wallet.name}</p>
                                                        <p className="font-bold text-sm text-[var(--text-primary)] shrink-0 ml-2">Rp {wallet.balance.toLocaleString('id-ID')}</p>
                                                    </div>
                                                    <div className="flex items-center justify-between mb-1.5">
                                                        <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md ${wallet.type === 'bank' ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-600' :
                                                            wallet.type === 'ewallet' ? 'bg-purple-50 dark:bg-purple-950/30 text-purple-600' :
                                                                'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600'
                                                            }`}>{wallet.type}</span>
                                                        <p className="text-[11px] text-[var(--text-secondary)]">{pct}% dari total</p>
                                                    </div>
                                                    {/* Progress bar */}
                                                    <div className="w-full h-1.5 bg-[var(--bg-elevated)] rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full rounded-full bg-[var(--primary)] transition-all duration-500"
                                                            style={{ width: `${pct}%` }}
                                                        />
                                                    </div>
                                                </div>

                                                {/* Actions */}
                                                <div className="flex flex-col gap-1.5 shrink-0">
                                                    <button onClick={() => handleMobileEdit(wallet)} className="p-2 bg-slate-50 dark:bg-[var(--bg-elevated)] border border-slate-100 dark:border-[var(--border-default)] rounded-lg text-blue-500 active:scale-90 transition-all">
                                                        <Pencil className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button onClick={() => handleDelete(wallet.id)} className="p-2 bg-slate-50 dark:bg-[var(--bg-elevated)] border border-slate-100 dark:border-[var(--border-default)] rounded-lg text-rose-400 active:scale-90 transition-all">
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>

                                {/* Tambah Dompet Button */}
                                <button
                                    onClick={() => router.push('/wallet?category=active')}
                                    className="mx-4 mt-3 w-[calc(100%-2rem)] border-2 border-dashed border-[#E2E8F0] rounded-2xl p-4 flex items-center justify-center gap-3 text-slate-400 dark:text-slate-500 hover:text-[var(--primary)] hover:border-[var(--primary)] hover:bg-blue-50 dark:bg-blue-950/30/30 transition-all active:scale-[0.98]"
                                >
                                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-[var(--bg-hover)] flex items-center justify-center">
                                        <Plus className="w-4 h-4" />
                                    </div>
                                    <span className="font-bold text-sm">Tambah Dompet Baru</span>
                                </button>
                            </>
                        )
                    })()}
                </div>

                {/* ===== DESKTOP VIEW ===== */}
                <div className="hidden md:block p-8">
                    {loading ? (
                        <div className="text-center py-12 text-slate-400 dark:text-slate-500">Loading...</div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {activeWallets.map((wallet: Wallet) => (
                                <div key={wallet.id} className="bg-white dark:bg-[var(--bg-card)] p-6 pb-8 rounded-3xl border border-[var(--border-default)] hover:shadow-lg transition-all duration-300 group flex flex-col justify-between min-h-[220px] relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-4 flex gap-2 z-20">
                                        <button onClick={() => handleDesktopEdit(wallet)} className="p-3 bg-white dark:bg-[var(--bg-card)]/80 backdrop-blur-sm border border-slate-100 dark:border-[var(--border-default)] rounded-xl text-blue-600 hover:bg-blue-50 dark:bg-blue-950/30 transition-all shadow-sm hover:shadow-md active:scale-95 group-hover:opacity-100">
                                            <Pencil className="w-5 h-5" />
                                        </button>
                                        <button onClick={() => handleDelete(wallet.id)} className="p-3 bg-white dark:bg-[var(--bg-card)]/80 backdrop-blur-sm border border-slate-100 dark:border-[var(--border-default)] rounded-xl text-rose-500 hover:bg-rose-50 dark:bg-rose-950/30 transition-all shadow-sm hover:shadow-md active:scale-95 group-hover:opacity-100">
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </div>

                                    <div className="z-10 mt-2">
                                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white mb-6 ${getColor(wallet.type)} shadow-lg shadow-blue-500/20`}>
                                            {getIcon(wallet.type)}
                                        </div>
                                        <h3 className="font-bold text-xl text-[var(--text-primary)] mb-1">{wallet.name}</h3>
                                        <span className="inline-block px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-slate-50 dark:bg-[var(--bg-elevated)] text-[var(--text-secondary)] border border-slate-100 dark:border-[var(--border-default)]">{wallet.type}</span>
                                    </div>

                                    <div className="z-10 mt-6">
                                        <p className="text-sm font-medium text-[var(--text-secondary)] mb-1">Saldo Saat Ini</p>
                                        <p className="text-3xl font-extrabold text-[var(--text-primary)] tracking-tight">Rp {wallet.balance.toLocaleString('id-ID')}</p>
                                    </div>

                                    {/* Decorative circle */}
                                    <div className={`absolute -bottom-10 -right-10 w-40 h-40 rounded-full blur-3xl opacity-10 ${getColor(wallet.type)}`}></div>
                                </div>
                            ))}

                            {/* Add New Wallet Card */}
                            <button
                                onClick={() => { setEditingId(null); setIsModalOpen(true); }}
                                className="border-2 border-dashed border-[#E2E8F0] rounded-3xl p-6 flex flex-col items-center justify-center gap-4 text-slate-400 dark:text-slate-500 hover:text-[var(--primary)] hover:border-[var(--primary)] hover:bg-blue-50 dark:bg-blue-950/30/30 transition-all min-h-[220px] group"
                            >
                                <div className="bg-[var(--bg-elevated)] group-hover:bg-[var(--primary)] p-4 rounded-full transition-colors">
                                    <Plus className="w-8 h-8 text-slate-500 dark:text-slate-400 group-hover:text-white transition-colors" />
                                </div>
                                <span className="font-bold text-sm">Tambah Dompet Baru</span>
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

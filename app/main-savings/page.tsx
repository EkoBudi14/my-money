'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Wallet } from '@/types' // Reuse Wallet type
import {
    Plus,
    Landmark,
    Trash2,
    Pencil,
    X,
    Wallet as WalletIcon,
    CreditCard,
    Banknote
} from 'lucide-react'
import MoneyInput from '@/components/MoneyInput'
import { useToast } from '@/hooks/useToast'
import { useConfirm } from '@/hooks/useConfirm'

export default function MainSavingsPage() {
    const [savingsWallets, setSavingsWallets] = useState<Wallet[]>([])
    const [activeWallets, setActiveWallets] = useState<Wallet[]>([])
    const [loading, setLoading] = useState(true)
    const [isModalOpen, setIsModalOpen] = useState(false)

    const { showToast } = useToast()
    const { showConfirm } = useConfirm()

    // Form State
    const [name, setName] = useState('')
    const [balance, setBalance] = useState('')
    const [type, setType] = useState<'bank' | 'ewallet' | 'cash'>('bank')
    const [sourceWalletId, setSourceWalletId] = useState('')
    const [linkToSource, setLinkToSource] = useState(true) // Default to true
    const [previewDiff, setPreviewDiff] = useState<{ type: 'deduct' | 'refund' | 'none', amount: number, walletName: string } | null>(null)
    const [editingId, setEditingId] = useState<number | null>(null)

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
        // Fetch wallets only with category 'savings'
        const { data, error } = await supabase
            .from('wallets')
            .select('*')
            .eq('category', 'savings')
            .order('created_at', { ascending: false })

        if (data) setSavingsWallets(data)
        if (error) showToast('error', 'Gagal memuat tabungan')
        setLoading(false)
    }

    const resetForm = () => {
        setName('')
        setBalance('')
        setType('bank')
        setSourceWalletId('')
        setLinkToSource(true)
        setPreviewDiff(null)
        setEditingId(null)
        setIsModalOpen(false)
    }

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!name) return showToast('error', "Mohon lengkapi nama tabungan!")

        const currentBalance = parseFloat(balance || '0')
        const payload: any = {
            name,
            balance: currentBalance,
            type,
            category: 'savings' // Force category to savings
        }

        // Save source wallet id if selected and linked
        if (sourceWalletId && linkToSource) {
            payload.source_wallet_id = parseInt(sourceWalletId)
        } else if (!linkToSource) {
            // If user unchecks the link, clear the source
            payload.source_wallet_id = null
        }

        let error

        if (editingId) {
            // Fetch latest data for safety
            const { data: oldWallet } = await supabase.from('wallets').select('*').eq('id', editingId).single()

            if (oldWallet) {
                const diff = currentBalance - oldWallet.balance

                if (linkToSource) {
                    if (diff > 0) {
                        // Adding funds - use manual selection (user can choose where to take from)
                        let effectiveSourceId = sourceWalletId
                        if (!effectiveSourceId && oldWallet.source_wallet_id) {
                            // Fallback to stored source if no manual selection
                            effectiveSourceId = oldWallet.source_wallet_id.toString()
                        }

                        if (effectiveSourceId) {
                            const sourceWallet = activeWallets.find(w => w.id === parseInt(effectiveSourceId)) ||
                                savingsWallets.find(w => w.id === parseInt(effectiveSourceId))

                            if (sourceWallet) {
                                if (sourceWallet.id === editingId) return showToast('error', "Tidak bisa mengambil dana dari dompet yang sedang diedit!")

                                if (sourceWallet.balance < diff) {
                                    return showToast('error', `Saldo sumber dana tidak mencukupi! (Sisa: ${sourceWallet.balance.toLocaleString('id-ID')}, Dibutuhkan: ${diff.toLocaleString('id-ID')})`)
                                }
                                // Deduct from source
                                await supabase.from('wallets').update({
                                    balance: sourceWallet.balance - diff
                                }).eq('id', sourceWallet.id)
                            } else {
                                return showToast('error', "Sumber dana tidak ditemukan. Mungkin sudah dihapus.")
                            }
                        }
                    } else if (diff < 0) {
                        // Reducing funds - MUST use stored source_wallet_id (ignore manual selection)
                        if (oldWallet.source_wallet_id) {
                            const sourceWallet = activeWallets.find(w => w.id === oldWallet.source_wallet_id) ||
                                savingsWallets.find(w => w.id === oldWallet.source_wallet_id)

                            if (sourceWallet) {
                                if (sourceWallet.id === editingId) return showToast('error', "Tidak bisa mengembalikan dana ke dompet yang sedang diedit!")

                                const refundAmount = Math.abs(diff)
                                // Add back to ORIGINAL source only
                                await supabase.from('wallets').update({
                                    balance: sourceWallet.balance + refundAmount
                                }).eq('id', sourceWallet.id)
                            } else {
                                // Source wallet deleted - warn user
                                const confirm = await showConfirm({
                                    title: 'Sumber Dana Hilang',
                                    message: `Sumber dana asli (ID: ${oldWallet.source_wallet_id}) sudah tidak ada. Dana Rp ${Math.abs(diff).toLocaleString('id-ID')} tidak akan dikembalikan. Lanjutkan?`
                                })
                                if (!confirm) {
                                    return
                                }
                            }
                        }
                        // If no source_wallet_id, no refund happens (manual entry case)
                    }
                }
            }

            const { error: err } = await supabase.from('wallets').update(payload).eq('id', editingId)
            error = err
        } else {
            // Deduct from source if selected and linked
            if (sourceWalletId && linkToSource) {
                // Search in both active and savings wallets
                const sourceWallet = activeWallets.find(w => w.id === parseInt(sourceWalletId)) ||
                    savingsWallets.find(w => w.id === parseInt(sourceWalletId))

                if (sourceWallet) {
                    if (sourceWallet.balance < currentBalance) {
                        return showToast('error', `Saldo sumber dana tidak mencukupi! (Sisa: ${sourceWallet.balance.toLocaleString('id-ID')}, Dibutuhkan: ${currentBalance.toLocaleString('id-ID')})`)
                    }
                    await supabase.from('wallets').update({
                        balance: sourceWallet.balance - currentBalance
                    }).eq('id', sourceWallet.id)
                }
            }

            const { error: err } = await supabase.from('wallets').insert([payload])
            error = err
        }

        if (!error) {
            fetchSavings()
            fetchActiveWallets() // Refresh source wallet balances
            resetForm()
            showToast('success', 'Aset berhasil disimpan')
        } else {
            console.error(error)
            showToast('error', "Gagal menyimpan tabungan")
        }
    }

    const handleDelete = async (id: number) => {
        const confirm = await showConfirm({
            title: 'Hapus Aset?',
            message: 'Yakin ingin menghapus aset tabungan ini?'
        })
        if (!confirm) return

        await supabase.from('wallets').delete().eq('id', id)
        fetchSavings()
        showToast('success', 'Aset berhasil dihapus')
    }

    const handleEdit = (w: Wallet) => {
        fetchActiveWallets() // Refresh data
        setEditingId(w.id)
        setName(w.name)
        setBalance(w.balance.toString())
        setType(w.type)
        // Auto-populate source wallet if it exists
        if (w.source_wallet_id) {
            setSourceWalletId(w.source_wallet_id.toString())
            setLinkToSource(true)
        } else {
            setSourceWalletId('')
            setLinkToSource(true)
        }
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
        <main className="min-h-screen bg-transparent font-sans text-slate-900 pb-24 md:pb-6 ml-0 md:ml-72 p-6 transition-all duration-300">
            <header className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800">Tabungan Inti</h1>
                    <p className="text-slate-500">Aset & Simpanan jangka panjang</p>
                </div>
                <div className="glass shadow-premium-lg px-6 py-4 rounded-2xl backdrop-blur-xl border border-emerald-100 flex items-center gap-4 bg-white">
                    <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600">
                        <Landmark className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wide">Total Aset</p>
                        <p className="text-2xl font-bold text-slate-800">Rp {totalSavings.toLocaleString('id-ID')}</p>
                    </div>
                </div>
            </header>

            {loading ? (
                <div className="text-center py-20 text-slate-400">Loading...</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {savingsWallets.map((wallet) => (
                        <div key={wallet.id} className="glass shadow-premium-lg p-6 rounded-3xl border border-white/20 flex flex-col justify-between group card-hover backdrop-blur-xl">
                            <div>
                                <div className="flex justify-between items-start mb-4">
                                    <div className="bg-emerald-100 p-3 rounded-2xl text-emerald-600">
                                        {getIcon(wallet.type)}
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => handleEdit(wallet)} className="p-2 bg-slate-50 rounded-lg text-blue-500 hover:bg-blue-50 transition-colors">
                                            <Pencil className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => handleDelete(wallet.id)} className="p-2 bg-rose-50 rounded-lg text-rose-500 hover:bg-rose-100 transition-colors">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                                <h3 className="font-bold text-lg text-slate-800 mb-1">{wallet.name}</h3>
                                <p className="text-xs text-slate-400 uppercase tracking-wider mb-3">{wallet.type}</p>
                                <p className="text-2xl font-bold text-emerald-600">Rp {wallet.balance.toLocaleString('id-ID')}</p>
                            </div>
                        </div>
                    ))}

                    {/* Add New Card */}
                    <button
                        onClick={() => { resetForm(); fetchActiveWallets(); setIsModalOpen(true); }}
                        className="glass border-2 border-dashed border-white/30 rounded-3xl p-6 flex flex-col items-center justify-center gap-4 text-slate-600 hover:text-emerald-600 hover:border-emerald-400 hover:bg-emerald-50/30 transition-all min-h-[200px] backdrop-blur-xl shadow-premium"
                    >
                        <div className="bg-white p-4 rounded-full shadow-sm">
                            <Plus className="w-8 h-8" />
                        </div>
                        <span className="font-bold">Tambah Aset Baru</span>
                    </button>
                </div>
            )}

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
                    <div className="glass backdrop-blur-2xl w-full max-w-md rounded-3xl p-6 shadow-premium-lg border border-white/20 relative animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-slate-800">{editingId ? 'Edit Aset' : 'Aset Baru'}</h3>
                            <button onClick={resetForm}><X className="w-6 h-6 text-slate-400" /></button>
                        </div>
                        <form onSubmit={handleSave} className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Nama Aset / Tabungan</label>
                                <input type="text" className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none" value={name} onChange={e => setName(e.target.value)} placeholder="Contoh: Emas, Deposito, Tabungan Nikah" autoFocus />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Tipe</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {['bank', 'ewallet', 'cash'].map((t) => (
                                        <button
                                            key={t}
                                            type="button"
                                            onClick={() => setType(t as any)}
                                            className={`py-2 px-3 rounded-xl text-sm font-bold border transition-all ${type === t ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                        >
                                            {t.toUpperCase()}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Saldo Saat Ini (Rp)</label>
                                <MoneyInput
                                    value={balance}
                                    onChange={setBalance}
                                    placeholder="0"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Sumber Dana (Opsional)</label>
                                {(() => {
                                    // Check if we're in refund scenario (reducing balance)
                                    const isRefundScenario: boolean = editingId ? (() => {
                                        const oldWallet = savingsWallets.find(w => w.id === editingId)
                                        if (!oldWallet) return false
                                        const currentVal = parseFloat(balance || '0')
                                        return currentVal < oldWallet.balance && !!oldWallet.source_wallet_id
                                    })() : false

                                    const isDisabled = isRefundScenario

                                    return (
                                        <>
                                            <select
                                                className={`w-full p-3 border rounded-xl outline-none text-slate-700 transition-colors ${isDisabled
                                                    ? 'bg-slate-100 border-slate-300 cursor-not-allowed opacity-70'
                                                    : 'bg-slate-50 border-slate-200 focus:ring-2 focus:ring-emerald-500'
                                                    }`}
                                                value={sourceWalletId}
                                                onChange={(e) => setSourceWalletId(e.target.value)}
                                                disabled={isDisabled}
                                            >
                                                <option value="">Manual (Tidak terhubung)</option>
                                                <optgroup label="Saldo Aktif">
                                                    {activeWallets.map(w => (
                                                        <option key={w.id} value={w.id}>
                                                            {w.name} (Saldo: Rp {w.balance.toLocaleString('id-ID')})
                                                        </option>
                                                    ))}
                                                </optgroup>
                                                <optgroup label="Tabungan Inti">
                                                    {savingsWallets
                                                        .filter(w => w.id !== editingId) // Exclude current wallet if editing
                                                        .map(w => (
                                                            <option key={w.id} value={w.id}>
                                                                {w.name} (Saldo: Rp {w.balance.toLocaleString('id-ID')})
                                                            </option>
                                                        ))}
                                                </optgroup>
                                            </select>
                                            {isRefundScenario && (
                                                <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
                                                    <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                                    </svg>
                                                    <div className="text-xs">
                                                        <p className="font-bold text-amber-800">Sumber Terkunci</p>
                                                        <p className="text-amber-700 mt-0.5">Dana harus dikembalikan ke sumber asli. Sumber dana tidak dapat diubah saat mengurangi saldo.</p>
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    )
                                })()}
                            </div>

                            {/* Checkbox and Preview */}
                            {sourceWalletId && (
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                    <label className="flex items-center gap-3 cursor-pointer mb-2">
                                        <input
                                            type="checkbox"
                                            checked={linkToSource}
                                            onChange={e => setLinkToSource(e.target.checked)}
                                            className="w-5 h-5 rounded-lg text-emerald-600 focus:ring-emerald-500 border-gray-300"
                                        />
                                        <span className="text-sm font-semibold text-slate-700">Sesuaikan saldo dompet sumber?</span>
                                    </label>

                                    {linkToSource && (
                                        <div className="text-xs text-slate-500 pl-8">
                                            {/* We can calculate preview here instead of state for simplicity if needed, but state is cleaner */}
                                            {(() => {
                                                // Determine which wallet will be affected
                                                let targetWallet = activeWallets.find(w => w.id === parseInt(sourceWalletId)) || savingsWallets.find(w => w.id === parseInt(sourceWalletId))

                                                const currentVal = parseFloat(balance || '0')
                                                let diff = currentVal
                                                let oldBal = 0
                                                let oldWallet: Wallet | undefined = undefined

                                                if (editingId) {
                                                    oldWallet = savingsWallets.find(w => w.id === editingId)
                                                    if (oldWallet) {
                                                        oldBal = oldWallet.balance
                                                        diff = currentVal - oldWallet.balance

                                                        // For refunds, use stored source_wallet_id instead of dropdown
                                                        if (diff < 0 && oldWallet.source_wallet_id) {
                                                            targetWallet = activeWallets.find(w => w.id === oldWallet!.source_wallet_id) ||
                                                                savingsWallets.find(w => w.id === oldWallet!.source_wallet_id)
                                                        }
                                                    }
                                                }

                                                if (!targetWallet) return null

                                                if (diff > 0) {
                                                    return (
                                                        <span className="text-rose-500 font-bold">
                                                            Akan MEMOTONG Rp {diff.toLocaleString('id-ID')} dari {targetWallet.name}.
                                                        </span>
                                                    )
                                                } else if (diff < 0) {
                                                    return (
                                                        <span className="text-emerald-600 font-bold">
                                                            ✓ Akan MENGEMBALIKAN Rp {Math.abs(diff).toLocaleString('id-ID')} ke {targetWallet.name} (sumber asli).
                                                        </span>
                                                    )
                                                } else {
                                                    return <span>Tidak ada perubahan saldo sumber.</span>
                                                }
                                            })()}
                                        </div>
                                    )}
                                </div>
                            )}
                            <button type="submit" className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 !text-white font-bold py-3 rounded-xl hover:shadow-purple-500/50 transition-colors shadow-premium-lg">Simpan</button>
                        </form>
                    </div>
                </div>
            )}
        </main>
    )
}

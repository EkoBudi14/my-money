'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Wallet } from '@/types'
import { Plus, Wallet as WalletIcon, CreditCard, Banknote, Trash2, Pencil, X } from 'lucide-react'
import MoneyInput from '@/components/MoneyInput'

export default function WalletsPage() {
    const [activeWallets, setActiveWallets] = useState<Wallet[]>([])
    const [savingsWallets, setSavingsWallets] = useState<Wallet[]>([])
    const [loading, setLoading] = useState(true)
    const [isModalOpen, setIsModalOpen] = useState(false)

    // Form State
    const [editingId, setEditingId] = useState<number | null>(null)
    const [name, setName] = useState('')
    const [type, setType] = useState<'bank' | 'ewallet' | 'cash'>('bank')
    const [category, setCategory] = useState<'active' | 'savings'>('active')
    const [balance, setBalance] = useState('')
    const [sourceWalletId, setSourceWalletId] = useState('')
    const [linkToSource, setLinkToSource] = useState(true)

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
        } else {
            const allWallets = data || []
            setActiveWallets(allWallets.filter(w => w.category === 'active'))
            setSavingsWallets(allWallets.filter(w => w.category === 'savings'))
        }
        setLoading(false)
    }

    const resetForm = () => {
        setName('')
        setType('bank')
        setCategory('active')
        setBalance('')
        setSourceWalletId('')
        setLinkToSource(true)
        setEditingId(null)
        setIsModalOpen(false)
    }

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!name || balance === '') return alert('Mohon lengkapi data')

        const currentBalance = parseFloat(balance)
        const payload: any = {
            name,
            type,
            category,
            balance: currentBalance
        }

        // Save source wallet id if selected and linked
        if (sourceWalletId && linkToSource) {
            payload.source_wallet_id = parseInt(sourceWalletId)
        } else if (!linkToSource) {
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
                            effectiveSourceId = oldWallet.source_wallet_id.toString()
                        }

                        if (effectiveSourceId) {
                            const sourceWallet = activeWallets.find(w => w.id === parseInt(effectiveSourceId)) ||
                                savingsWallets.find(w => w.id === parseInt(effectiveSourceId))

                            if (sourceWallet) {
                                if (sourceWallet.id === editingId) return alert("Tidak bisa mengambil dana dari dompet yang sedang diedit!")

                                if (sourceWallet.balance < diff) {
                                    return alert(`Saldo sumber dana tidak mencukupi! (Sisa: ${sourceWallet.balance.toLocaleString('id-ID')}, Dibutuhkan: ${diff.toLocaleString('id-ID')})`)
                                }
                                await supabase.from('wallets').update({
                                    balance: sourceWallet.balance - diff
                                }).eq('id', sourceWallet.id)
                            } else {
                                return alert("Sumber dana tidak ditemukan. Mungkin sudah dihapus.")
                            }
                        }
                    } else if (diff < 0) {
                        // Reducing funds - MUST use stored source_wallet_id (ignore manual selection)
                        if (oldWallet.source_wallet_id) {
                            const sourceWallet = activeWallets.find(w => w.id === oldWallet.source_wallet_id) ||
                                savingsWallets.find(w => w.id === oldWallet.source_wallet_id)

                            if (sourceWallet) {
                                if (sourceWallet.id === editingId) return alert("Tidak bisa mengembalikan dana ke dompet yang sedang diedit!")

                                const refundAmount = Math.abs(diff)
                                await supabase.from('wallets').update({
                                    balance: sourceWallet.balance + refundAmount
                                }).eq('id', sourceWallet.id)
                            } else {
                                if (!confirm(`Sumber dana asli (ID: ${oldWallet.source_wallet_id}) sudah tidak ada. Dana Rp ${Math.abs(diff).toLocaleString('id-ID')} tidak akan dikembalikan. Lanjutkan?`)) {
                                    return
                                }
                            }
                        }
                    }
                }
            }

            const res = await supabase.from('wallets').update(payload).eq('id', editingId)
            error = res.error
        } else {
            // Deduct from source if selected and linked
            if (sourceWalletId && linkToSource) {
                const sourceWallet = activeWallets.find(w => w.id === parseInt(sourceWalletId)) ||
                    savingsWallets.find(w => w.id === parseInt(sourceWalletId))

                if (sourceWallet) {
                    if (sourceWallet.balance < currentBalance) {
                        return alert(`Saldo sumber dana tidak mencukupi! (Sisa: ${sourceWallet.balance.toLocaleString('id-ID')}, Dibutuhkan: ${currentBalance.toLocaleString('id-ID')})`)
                    }
                    await supabase.from('wallets').update({
                        balance: sourceWallet.balance - currentBalance
                    }).eq('id', sourceWallet.id)
                }
            }

            const res = await supabase.from('wallets').insert([payload])
            error = res.error
        }

        if (error) {
            console.error(error)
            alert('Gagal menyimpan dompet')
        } else {
            fetchWallets()
            resetForm()
        }
    }

    const handleDelete = async (id: number) => {
        if (!confirm('Hapus dompet ini? SEMUA RIWAYAT TRANSAKSI terkait dompet ini akan ikut TERHAPUS PERMANEN.')) return

        // 1. Delete associated transactions first
        const { error: txError } = await supabase.from('transactions').delete().eq('wallet_id', id)

        if (txError) {
            console.error(txError)
            return alert('Gagal menghapus riwayat transaksi terkait')
        }

        // 2. Delete the wallet
        const { error } = await supabase.from('wallets').delete().eq('id', id)

        if (error) {
            alert('Gagal menghapus dompet')
        } else {
            fetchWallets()
        }
    }

    const handleEdit = (w: Wallet) => {
        fetchWallets() // Refresh all wallets for dropdown
        setEditingId(w.id)
        setName(w.name)
        setType(w.type)
        setCategory(w.category || 'active')
        setBalance(w.balance.toString())
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
        <main className="min-h-screen bg-transparent font-sans text-slate-900 pb-24 md:pb-6 ml-0 md:ml-72 p-6 transition-all duration-300">
            <header className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800">Dompet Saya</h1>
                    <p className="text-slate-500">Kelola sumber dana anda</p>
                </div>
            </header>

            {/* Floating Action Button */}
            <button
                onClick={() => setIsModalOpen(true)}
                className="fixed bottom-10 right-6 md:bottom-10 md:right-10 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 !text-white p-4 rounded-full shadow-premium-lg hover:shadow-purple-500/50 transition-all active:scale-90 hover:scale-110 z-40"
            >
                <Plus className="w-8 h-8 !text-white" />
            </button>

            {loading ? (
                <div className="text-center py-12 text-slate-400">Loading...</div>
            ) : [...activeWallets, ...savingsWallets].length === 0 ? (
                <div className="text-center py-12 text-slate-400 border-2 border-dashed border-slate-200 rounded-3xl">
                    <p>Belum ada dompet. Tambahkan sekarang!</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[...activeWallets, ...savingsWallets].map((wallet: Wallet) => (
                        <div key={wallet.id} className="glass shadow-premium-lg p-6 rounded-3xl border border-white/20 flex flex-col justify-between group card-hover backdrop-blur-xl">
                            <div>
                                <div className="flex justify-between items-start mb-4">
                                    <div className={`p-3 rounded-2xl text-white ${getColor(wallet.type)}`}>
                                        {getIcon(wallet.type)}
                                    </div>
                                    <div className="flex gap-1">
                                        <button onClick={() => handleEdit(wallet)} className="p-2 bg-slate-50 rounded-lg text-blue-500 hover:bg-blue-100 transition-colors">
                                            <Pencil className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => handleDelete(wallet.id)} className="p-2 bg-rose-50 rounded-lg text-rose-500 hover:bg-rose-100 transition-colors">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                                <h3 className="font-bold text-lg text-slate-800">{wallet.name}</h3>
                                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">{wallet.type}</p>
                            </div>
                            <div>
                                <p className="text-sm text-slate-500 mb-1">Saldo Saat Ini</p>
                                <p className="text-2xl font-extrabold text-slate-800">Rp {wallet.balance.toLocaleString('id-ID')}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={resetForm}></div>
                    <div className="glass backdrop-blur-2xl w-full max-w-md rounded-3xl shadow-premium-lg border border-white/20 z-50 p-6 relative animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-slate-800">{editingId ? 'Edit Dompet' : 'Tambah Dompet'}</h3>
                            <button onClick={resetForm} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleSave} className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Nama Dompet</label>
                                <input
                                    type="text"
                                    placeholder="Contoh: BCA Utama"
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Tipe</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {['bank', 'ewallet', 'cash'].map((t) => (
                                        <button
                                            key={t}
                                            type="button"
                                            onClick={() => setType(t as any)}
                                            className={`py-2 px-3 rounded-xl text-sm font-bold border transition-all ${type === t ? 'bg-blue-50 border-blue-500 text-blue-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                        >
                                            {t.toUpperCase()}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Kategori Dompet</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setCategory('active')}
                                        className={`py-2 px-3 rounded-xl text-sm font-bold border transition-all ${category === 'active' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                    >
                                        SALDO AKTIF
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setCategory('savings')}
                                        className={`py-2 px-3 rounded-xl text-sm font-bold border transition-all ${category === 'savings' ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                    >
                                        TABUNGAN
                                    </button>
                                </div>
                                <p className="text-xs text-slate-400 mt-2">
                                    {category === 'active' ? 'Dihitung sebagai saldo aktif di dashboard.' : 'Tidak dihitung di saldo aktif utama.'}
                                </p>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Saldo Awal (Rp)</label>
                                <MoneyInput
                                    value={balance}
                                    onChange={setBalance}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Sumber Dana (Opsional)</label>
                                {(() => {
                                    const allWallets = [...activeWallets, ...savingsWallets]
                                    const isRefundScenario: boolean = editingId ? (() => {
                                        const oldWallet = allWallets.find(w => w.id === editingId)
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
                                                    : 'bg-slate-50 border-slate-200 focus:ring-2 focus:ring-blue-500'
                                                    }`}
                                                value={sourceWalletId}
                                                onChange={(e) => setSourceWalletId(e.target.value)}
                                                disabled={isDisabled}
                                            >
                                                <option value="">Manual (Tidak terhubung)</option>
                                                <optgroup label="Saldo Aktif">
                                                    {activeWallets
                                                        .filter(w => w.id !== editingId)
                                                        .map(w => (
                                                            <option key={w.id} value={w.id}>
                                                                {w.name} (Saldo: Rp {w.balance.toLocaleString('id-ID')})
                                                            </option>
                                                        ))}
                                                </optgroup>
                                                <optgroup label="Tabungan Inti">
                                                    {savingsWallets
                                                        .filter(w => w.id !== editingId)
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
                                            className="w-5 h-5 rounded-lg text-blue-600 focus:ring-blue-500 border-gray-300"
                                        />
                                        <span className="text-sm font-semibold text-slate-700">Sesuaikan saldo dompet sumber?</span>
                                    </label>

                                    {linkToSource && (
                                        <div className="text-xs text-slate-500 pl-8">
                                            {(() => {
                                                const allWallets = [...activeWallets, ...savingsWallets]
                                                let targetWallet = allWallets.find(w => w.id === parseInt(sourceWalletId))

                                                const currentVal = parseFloat(balance || '0')
                                                let diff = currentVal
                                                let oldWallet: Wallet | undefined = undefined

                                                if (editingId) {
                                                    oldWallet = allWallets.find(w => w.id === editingId)
                                                    if (oldWallet) {
                                                        diff = currentVal - oldWallet.balance

                                                        if (diff < 0 && oldWallet.source_wallet_id) {
                                                            targetWallet = allWallets.find(w => w.id === oldWallet!.source_wallet_id)
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
                            <button type="submit" className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 !text-white font-bold py-3 rounded-xl shadow-premium-lg hover:shadow-purple-500/50 transition-all active:scale-95">
                                Simpan
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </main>
    )
}

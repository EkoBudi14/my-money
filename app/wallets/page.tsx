'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Wallet } from '@/types'
import { Plus, Wallet as WalletIcon, CreditCard, Banknote, Trash2, Pencil, X } from 'lucide-react'
import MoneyInput from '@/components/MoneyInput'
import { useToast } from '@/hooks/useToast'
import { useConfirm } from '@/hooks/useConfirm'

export default function WalletsPage() {
    const [activeWallets, setActiveWallets] = useState<Wallet[]>([])
    const [savingsWallets, setSavingsWallets] = useState<Wallet[]>([])
    const [loading, setLoading] = useState(true)
    const [isModalOpen, setIsModalOpen] = useState(false)

    const { showToast } = useToast()
    const { showConfirm } = useConfirm()

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
            showToast('error', 'Gagal memuat data dompet')
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
        if (!name || balance === '') return showToast('error', 'Mohon lengkapi data')

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
                                if (sourceWallet.id === editingId) return showToast('error', "Tidak bisa mengambil dana dari dompet yang sedang diedit!")

                                if (sourceWallet.balance < diff) {
                                    return showToast('error', `Saldo sumber dana tidak mencukupi! (Sisa: ${sourceWallet.balance.toLocaleString('id-ID')}, Dibutuhkan: ${diff.toLocaleString('id-ID')})`)
                                }
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
                                await supabase.from('wallets').update({
                                    balance: sourceWallet.balance + refundAmount
                                }).eq('id', sourceWallet.id)
                            } else {
                                const confirm = await showConfirm({
                                    title: 'Sumber Dana Hilang',
                                    message: `Sumber dana asli (ID: ${oldWallet.source_wallet_id}) sudah tidak ada. Dana Rp ${Math.abs(diff).toLocaleString('id-ID')} tidak akan dikembalikan. Lanjutkan?`
                                })
                                if (!confirm) {
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
                        return showToast('error', `Saldo sumber dana tidak mencukupi! (Sisa: ${sourceWallet.balance.toLocaleString('id-ID')}, Dibutuhkan: ${currentBalance.toLocaleString('id-ID')})`)
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
            showToast('error', 'Gagal menyimpan dompet')
        } else {
            fetchWallets()
            resetForm()
            showToast('success', 'Berhasil menyimpan dompet')
        }
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
            showToast('success', 'Berhasil menghapus dompet')
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
        <main className="flex-1 bg-[#F9FAFB] min-h-screen overflow-x-hidden transition-all duration-300">
            {/* Top Header */}
            <div className="flex items-center justify-between w-full h-[90px] shrink-0 border-b border-[#F3F4F3] bg-white px-5 md:px-8">
                <div className="flex items-center gap-4">
                    <h2 className="font-bold text-2xl text-[#080C1A]">Dompet Saya</h2>
                </div>

                <div className="flex items-center gap-3">
                    <div className="hidden md:flex items-center gap-3 pl-3">
                        <div className="text-right">
                            <p className="font-semibold text-[#080C1A] text-sm">Eko Budi</p>
                            {/* <p className="text-[#6A7686] text-xs">Premium User</p> */}
                        </div>
                        <div className="w-11 h-11 bg-slate-200 rounded-full flex items-center justify-center text-slate-500 font-bold border-2 border-white shadow-sm">
                            EB
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-5 md:p-8 relative min-h-[calc(100vh-90px)]">
                {/* Floating Action Button */}
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="fixed bottom-10 right-6 md:bottom-10 md:right-10 bg-[#165DFF] hover:bg-[#1455E5] text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all active:scale-95 z-40 flex items-center justify-center"
                >
                    <Plus className="w-6 h-6" />
                </button>

                {loading ? (
                    <div className="text-center py-12 text-slate-400">Loading...</div>
                    ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {activeWallets.map((wallet: Wallet) => (
                            <div key={wallet.id} className="bg-white p-6 pb-8 rounded-3xl border border-[#F3F4F3] hover:shadow-lg transition-all duration-300 group flex flex-col justify-between min-h-[220px] relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 flex gap-2 z-20">
                                     <button onClick={() => handleEdit(wallet)} className="p-3 bg-white/80 backdrop-blur-sm border border-slate-100 rounded-xl text-blue-600 hover:bg-blue-50 transition-all shadow-sm hover:shadow-md active:scale-95 group-hover:opacity-100">
                                        <Pencil className="w-5 h-5" />
                                    </button>
                                    <button onClick={() => handleDelete(wallet.id)} className="p-3 bg-white/80 backdrop-blur-sm border border-slate-100 rounded-xl text-rose-500 hover:bg-rose-50 transition-all shadow-sm hover:shadow-md active:scale-95 group-hover:opacity-100">
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>
                                
                                <div className="z-10 mt-2">
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white mb-6 ${getColor(wallet.type)} shadow-lg shadow-blue-500/20`}>
                                        {getIcon(wallet.type)}
                                    </div>
                                    <h3 className="font-bold text-xl text-[#080C1A] mb-1">{wallet.name}</h3>
                                    <span className="inline-block px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-slate-50 text-[#6A7686] border border-slate-100">{wallet.type}</span>
                                </div>
                                
                                <div className="z-10 mt-6">
                                    <p className="text-sm font-medium text-[#6A7686] mb-1">Saldo Saat Ini</p>
                                    <p className="text-3xl font-extrabold text-[#080C1A] tracking-tight">Rp {wallet.balance.toLocaleString('id-ID')}</p>
                                </div>
                                
                                {/* Decorative circle */}
                                <div className={`absolute -bottom-10 -right-10 w-40 h-40 rounded-full blur-3xl opacity-10 ${getColor(wallet.type)}`}></div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={resetForm}></div>
                    <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl z-50 p-6 relative animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-[#080C1A]">{editingId ? 'Edit Dompet' : 'Tambah Dompet'}</h3>
                            <button onClick={resetForm} className="p-2 bg-slate-50 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleSave} className="space-y-5">
                            <div>
                                <label className="block text-sm font-semibold text-[#080C1A] mb-2">Nama Dompet</label>
                                <input
                                    type="text"
                                    placeholder="Contoh: BCA Utama"
                                    className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm font-medium"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-[#080C1A] mb-2">Tipe</label>
                                <div className="grid grid-cols-3 gap-3">
                                    {['bank', 'ewallet', 'cash'].map((t) => (
                                        <button
                                            key={t}
                                            type="button"
                                            onClick={() => setType(t as any)}
                                            className={`py-3 px-3 rounded-xl text-sm font-bold border transition-all ${type === t ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-sm' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                        >
                                            {t.toUpperCase()}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-[#080C1A] mb-2">Kategori Dompet</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setCategory('active')}
                                        className={`py-3 px-3 rounded-xl text-sm font-bold border transition-all ${category === 'active' ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-sm' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                    >
                                        SALDO AKTIF
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setCategory('savings')}
                                        className={`py-3 px-3 rounded-xl text-sm font-bold border transition-all ${category === 'savings' ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                    >
                                        TABUNGAN
                                    </button>
                                </div>
                                <p className="text-xs text-slate-400 mt-2">
                                    {category === 'active' ? 'Dihitung sebagai saldo aktif di dashboard.' : 'Tidak dihitung di saldo aktif utama.'}
                                </p>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-[#080C1A] mb-2">Saldo Awal (Rp)</label>
                                <MoneyInput
                                    value={balance}
                                    onChange={setBalance}
                                />
                            </div>
                            
                            {/* Source Wallet Logic (Simplified for styling update) */}
                            <div>
                                <label className="block text-sm font-semibold text-[#080C1A] mb-2">Sumber Dana (Opsional)</label>
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
                                                className={`w-full p-3.5 border rounded-xl outline-none text-slate-700 transition-colors text-sm font-medium appearence-none ${isDisabled
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
                                                    <div className="text-xs">
                                                        <p className="font-bold text-amber-800">Sumber Terkunci</p>
                                                        <p className="text-amber-700 mt-0.5">Dana harus dikembalikan ke sumber asli.</p>
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

                            <button type="submit" className="w-full bg-[#165DFF] hover:bg-[#1455E5] text-white font-bold py-3.5 rounded-xl shadow-lg hover:shadow-xl transition-all active:scale-95 text-sm">
                                Simpan
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </main>
    )
}

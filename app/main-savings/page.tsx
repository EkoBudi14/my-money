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
    Banknote,
    Save
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
        <main className="flex-1 bg-[#F9FAFB] min-h-screen overflow-x-hidden transition-all duration-300">
             <header className="flex items-center justify-between w-full h-[90px] shrink-0 border-b border-[#F3F4F3] bg-white px-5 md:px-8">
                <div>
                     <h2 className="font-bold text-2xl text-[#080C1A]">Tabungan Inti</h2>
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

            <div className="p-5 md:p-8 space-y-6">
                {/* Summary Card */}
                <div className="bg-white px-6 py-6 rounded-2xl border border-[#F3F4F3] flex items-center gap-5 shadow-sm">
                    <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
                        <Landmark className="w-8 h-8" />
                    </div>
                    <div>
                        <p className="text-sm text-[#6A7686] font-bold uppercase tracking-wide">Total Aset & Simpanan</p>
                        <p className="text-3xl font-bold text-[#080C1A] mt-1">Rp {totalSavings.toLocaleString('id-ID')}</p>
                    </div>
                </div>

                {loading ? (
                    <div className="text-center py-20 text-slate-400 animate-pulse">Memuat aset...</div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {savingsWallets.map((wallet) => (
                            <div key={wallet.id} className="bg-white p-6 pb-8 rounded-3xl border border-[#F3F4F3] hover:shadow-lg transition-all duration-300 group flex flex-col justify-between card-hover relative overflow-hidden min-h-[240px]">
                                <div>
                                    <div className="flex justify-between items-start mb-4 relative z-10">
                                        <div className="bg-emerald-50 p-3 rounded-xl text-emerald-600">
                                            {getIcon(wallet.type)}
                                        </div>
                                        <div className="flex gap-1">
                                            <button onClick={() => handleEdit(wallet)} className="p-3 bg-white/80 backdrop-blur-sm border border-slate-100 rounded-xl text-blue-600 hover:bg-blue-50 transition-all shadow-sm hover:shadow-md active:scale-95">
                                                <Pencil className="w-5 h-5" />
                                            </button>
                                            <button onClick={() => handleDelete(wallet.id)} className="p-3 bg-white/80 backdrop-blur-sm border border-slate-100 rounded-xl text-rose-500 hover:bg-rose-50 transition-all shadow-sm hover:shadow-md active:scale-95">
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>
                                    <h3 className="font-bold text-lg text-[#080C1A] mb-1 relative z-10">{wallet.name}</h3>
                                    <p className="text-xs text-[#6A7686] uppercase tracking-wider mb-4 relative z-10">{wallet.type}</p>
                                </div>
                                <div className="relative z-10">
                                     <p className="text-2xl font-bold text-emerald-600">Rp {wallet.balance.toLocaleString('id-ID')}</p>
                                </div>

                                {/* Decorative Background */}
                                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-50 to-transparent rounded-bl-full opacity-50 -z-0"></div>
                            </div>
                        ))}

                         {/* Add New Card */}
                        <button
                            onClick={() => { resetForm(); fetchActiveWallets(); setIsModalOpen(true); }}
                            className="border-2 border-dashed border-[#E2E8F0] rounded-2xl p-6 flex flex-col items-center justify-center gap-4 text-slate-400 hover:text-[#165DFF] hover:border-[#165DFF] hover:bg-blue-50/30 transition-all min-h-[220px] group"
                        >
                            <div className="bg-slate-50 p-4 rounded-full group-hover:bg-blue-100 transition-colors">
                                <Plus className="w-8 h-8 group-hover:text-[#165DFF] transition-colors" />
                            </div>
                            <span className="font-bold">Tambah Aset Baru</span>
                        </button>
                    </div>
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                 <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={resetForm}></div>
                    <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl z-50 p-0 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
                        {/* Modal Header */}
                        <div className="px-6 py-4 border-b border-[#F3F4F3] flex justify-between items-center bg-white sticky top-0 z-10">
                            <h3 className="text-lg font-bold text-[#080C1A]">
                                {editingId ? 'Edit Aset' : 'Aset Baru'}
                            </h3>
                            <button onClick={resetForm} className="p-2 hover:bg-slate-50 rounded-full text-slate-400 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <form onSubmit={handleSave} className="flex-1 flex flex-col overflow-hidden bg-white">
                            <div className="p-6 space-y-5 flex-1 overflow-y-auto custom-scrollbar">
                                <div>
                                    <label className="block text-xs font-bold text-[#6A7686] uppercase tracking-wider mb-2">Nama Aset / Tabungan</label>
                                    <input 
                                        type="text" 
                                        className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#165DFF]/20 focus:border-[#165DFF] outline-none font-bold text-[#080C1A] placeholder:text-slate-300 transition-all" 
                                        value={name} 
                                        onChange={e => setName(e.target.value)} 
                                        placeholder="Contoh: Emas, Deposito" 
                                        autoFocus 
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-[#6A7686] uppercase tracking-wider mb-2">Tipe Aset</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {['bank', 'ewallet', 'cash'].map((t) => (
                                            <button
                                                key={t}
                                                type="button"
                                                onClick={() => setType(t as any)}
                                                className={`py-2.5 px-3 rounded-xl text-sm font-bold border transition-all ${type === t ? 'bg-blue-50 border-[#165DFF] text-[#165DFF]' : 'border-slate-200 text-[#6A7686] hover:bg-slate-50'}`}
                                            >
                                                {t.toUpperCase()}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-[#6A7686] uppercase tracking-wider mb-2">Nilai Saat Ini (Rp)</label>
                                    <MoneyInput
                                        value={balance}
                                        onChange={setBalance}
                                        placeholder="0"
                                    />
                                </div>

                                <div className="pt-4 border-t border-[#F3F4F3]">
                                    <label className="block text-sm font-bold text-[#080C1A] mb-2">Sumber Dana (Opsional)</label>
                                    <p className="text-xs text-[#6A7686] mb-3">Hubungkan dengan dompet lain untuk mencatat perpindahan dana otomatis.</p>
                                    
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
                                                <div className="relative">
                                                    <select
                                                        className={`w-full p-3 border rounded-xl outline-none text-[#080C1A] font-medium transition-colors appearance-none ${isDisabled
                                                            ? 'bg-slate-100 border-slate-300 cursor-not-allowed opacity-70'
                                                            : 'bg-slate-50 border-slate-200 focus:ring-2 focus:ring-[#165DFF]/20 focus:border-[#165DFF]'
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
                                                        <optgroup label="Tabungan Inti Lainnya">
                                                            {savingsWallets
                                                                .filter(w => w.id !== editingId) // Exclude current wallet if editing
                                                                .map(w => (
                                                                    <option key={w.id} value={w.id}>
                                                                        {w.name} (Saldo: Rp {w.balance.toLocaleString('id-ID')})
                                                                    </option>
                                                                ))}
                                                        </optgroup>
                                                    </select>
                                                   <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                                                    </div>
                                                </div>

                                                {isRefundScenario && (
                                                    <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
                                                        <div className="p-1 bg-amber-100 rounded-full text-amber-600 mt-0.5">
                                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                                        </div>
                                                        <div className="text-xs">
                                                            <p className="font-bold text-amber-800">Sumber Terkunci</p>
                                                            <p className="text-amber-700 mt-0.5 leading-relaxed">Dana harus dikembalikan ke sumber asli. Sumber dana tidak dapat diubah saat mengurangi saldo.</p>
                                                        </div>
                                                    </div>
                                                )}
                                            </>
                                        )
                                    })()}
                                </div>

                                {/* Checkbox and Preview */}
                                {sourceWalletId && (
                                    <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                                        <label className="flex items-center gap-3 cursor-pointer mb-2">
                                            <input
                                                type="checkbox"
                                                checked={linkToSource}
                                                onChange={e => setLinkToSource(e.target.checked)}
                                                className="w-5 h-5 rounded-lg text-[#165DFF] focus:ring-[#165DFF] border-gray-300"
                                            />
                                            <span className="text-sm font-bold text-[#080C1A]">Sesuaikan saldo dompet sumber?</span>
                                        </label>

                                        {linkToSource && (
                                            <div className="text-xs text-slate-500 pl-8 leading-relaxed">
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
                                                            <span className="text-rose-500 font-bold block bg-rose-50 p-2 rounded-lg border border-rose-100 mt-2">
                                                                - Akan MEMOTONG Rp {diff.toLocaleString('id-ID')} dari {targetWallet.name}.
                                                            </span>
                                                        )
                                                    } else if (diff < 0) {
                                                        return (
                                                            <span className="text-emerald-600 font-bold block bg-emerald-50 p-2 rounded-lg border border-emerald-100 mt-2">
                                                                + Akan MENGEMBALIKAN Rp {Math.abs(diff).toLocaleString('id-ID')} ke {targetWallet.name}.
                                                            </span>
                                                        )
                                                    } else {
                                                        return <span className="text-slate-400 italic">Tidak ada perubahan saldo sumber.</span>
                                                    }
                                                })()}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Modal Footer */}
                            <div className="p-4 border-t border-[#F3F4F3] bg-white flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={resetForm}
                                    className="px-5 py-2.5 rounded-xl font-bold text-slate-500 hover:bg-slate-50 transition-colors text-sm"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2.5 rounded-xl font-bold bg-[#165DFF] hover:bg-[#1455E5] text-white shadow-lg hover:shadow-xl transition-all active:scale-95 flex items-center gap-2 text-sm"
                                >
                                    <Save className="w-4 h-4" />
                                    Simpan
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </main>
    )
}

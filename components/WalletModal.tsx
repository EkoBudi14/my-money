'use client'
import React, { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Wallet } from '@/types'
import { X, Save } from 'lucide-react'
import MoneyInput from '@/components/MoneyInput'
import { useToast } from '@/hooks/useToast'
import { useConfirm } from '@/hooks/useConfirm'

interface WalletModalProps {
    editId?: number | null
    defaultCategory?: 'active' | 'savings'
    onClose: () => void
    onSaved: () => void
    mode?: 'page' | 'modal'
}

export default function WalletModal({ editId, defaultCategory = 'active', onClose, onSaved, mode = 'modal' }: WalletModalProps) {
    const [activeWallets, setActiveWallets] = useState<Wallet[]>([])
    const [savingsWallets, setSavingsWallets] = useState<Wallet[]>([])
    const [loadingData, setLoadingData] = useState(true)
    const [saving, setSaving] = useState(false)

    const { showToast } = useToast()
    const { showConfirm } = useConfirm()

    // Form State
    const [name, setName] = useState('')
    const [type, setType] = useState<'bank' | 'ewallet' | 'cash'>('bank')
    const [category, setCategory] = useState<'active' | 'savings'>(defaultCategory)
    const [balance, setBalance] = useState('')
    const [sourceWalletId, setSourceWalletId] = useState('')
    const [linkToSource, setLinkToSource] = useState(true)

    useEffect(() => {
        const loadData = async () => {
            setLoadingData(true)
            const { data } = await supabase.from('wallets').select('*').order('created_at', { ascending: true })
            if (data) {
                setActiveWallets(data.filter(w => w.category === 'active'))
                setSavingsWallets(data.filter(w => w.category === 'savings'))

                if (editId) {
                    const oldWallet = data.find(w => w.id === editId)
                    if (oldWallet) {
                        setName(oldWallet.name)
                        setType(oldWallet.type)
                        setCategory(oldWallet.category || 'active')
                        setBalance(oldWallet.balance.toString())
                        if (oldWallet.source_wallet_id) {
                            setSourceWalletId(oldWallet.source_wallet_id.toString())
                            setLinkToSource(true)
                        } else {
                            setSourceWalletId('')
                            setLinkToSource(true)
                        }
                    }
                } else {
                    setCategory(defaultCategory)
                }
            }
            setLoadingData(false)
        }
        loadData()
    }, [editId, defaultCategory])

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!name || balance === '') return showToast('error', 'Mohon lengkapi data')

        setSaving(true)
        const currentBalance = parseFloat(balance)
        const payload: any = {
            name,
            type,
            category,
            balance: currentBalance
        }

        if (sourceWalletId && linkToSource) {
            payload.source_wallet_id = parseInt(sourceWalletId)
        } else if (!linkToSource) {
            payload.source_wallet_id = null
        }

        let error

        if (editId) {
            const { data: oldWallet } = await supabase.from('wallets').select('*').eq('id', editId).single()

            if (oldWallet) {
                const diff = currentBalance - oldWallet.balance

                if (linkToSource) {
                    if (diff > 0) {
                        let effectiveSourceId = sourceWalletId
                        if (!effectiveSourceId && oldWallet.source_wallet_id) {
                            effectiveSourceId = oldWallet.source_wallet_id.toString()
                        }

                        if (effectiveSourceId) {
                            const sourceWallet = activeWallets.find(w => w.id === parseInt(effectiveSourceId)) ||
                                savingsWallets.find(w => w.id === parseInt(effectiveSourceId))

                            if (sourceWallet) {
                                if (sourceWallet.id === editId) {
                                    setSaving(false)
                                    return showToast('error', "Tidak bisa mengambil dana dari dompet yang sedang diedit!")
                                }

                                const { data: freshSourceData } = await supabase.from('wallets').select('balance').eq('id', sourceWallet.id).single()
                                if (!freshSourceData) {
                                    setSaving(false)
                                    return showToast('error', 'Sumber dana tidak ditemukan!')
                                }
                                const freshSourceBalance = freshSourceData.balance

                                if (freshSourceBalance < diff) {
                                    setSaving(false)
                                    return showToast('error', `Saldo sumber dana tidak mencukupi! (Sisa: ${freshSourceBalance.toLocaleString('id-ID')}, Dibutuhkan: ${diff.toLocaleString('id-ID')})`)
                                }
                                await supabase.from('wallets').update({ balance: freshSourceBalance - diff }).eq('id', sourceWallet.id)

                                const topupPayload = {
                                    title: `Isi saldo dari ${sourceWallet.name}`,
                                    amount: diff,
                                    type: 'topup',
                                    category: 'Lainnya',
                                    wallet_id: editId,
                                    source_wallet_id: sourceWallet.id,
                                    date: new Date().toISOString(),
                                    created_at: new Date().toISOString(),
                                    is_piutang: false,
                                    is_talangan: false
                                }
                                await supabase.from('transactions').insert([topupPayload])
                            } else {
                                setSaving(false)
                                return showToast('error', "Sumber dana tidak ditemukan. Mungkin sudah dihapus.")
                            }
                        }
                    } else if (diff < 0) {
                        if (oldWallet.source_wallet_id) {
                            const sourceWallet = activeWallets.find(w => w.id === oldWallet.source_wallet_id) ||
                                savingsWallets.find(w => w.id === oldWallet.source_wallet_id)

                            if (sourceWallet) {
                                if (sourceWallet.id === editId) {
                                    setSaving(false)
                                    return showToast('error', "Tidak bisa mengembalikan dana ke dompet yang sedang diedit!")
                                }

                                const refundAmount = Math.abs(diff)
                                const { data: freshSourceData } = await supabase.from('wallets').select('balance').eq('id', sourceWallet.id).single()
                                if (!freshSourceData) {
                                    setSaving(false)
                                    return showToast('error', 'Sumber dana tidak ditemukan!')
                                }
                                const freshSourceBalance = freshSourceData.balance

                                await supabase.from('wallets').update({ balance: freshSourceBalance + refundAmount }).eq('id', sourceWallet.id)

                                const { data: oldTxList } = await supabase
                                    .from('transactions')
                                    .select('id, amount')
                                    .eq('wallet_id', editId)
                                    .eq('source_wallet_id', sourceWallet.id)
                                    .eq('type', 'topup')
                                    .order('created_at', { ascending: false })

                                if (oldTxList && oldTxList.length > 0) {
                                    const exactMatch = oldTxList.find(tx => tx.amount === refundAmount)
                                    const txToDelete = exactMatch || oldTxList[0]
                                    await supabase.from('transactions').delete().eq('id', txToDelete.id)
                                }
                            } else {
                                const confirm = await showConfirm({
                                    title: 'Sumber Dana Hilang',
                                    message: `Sumber dana asli (ID: ${oldWallet.source_wallet_id}) sudah tidak ada. Dana Rp ${Math.abs(diff).toLocaleString('id-ID')} tidak akan dikembalikan. Lanjutkan?`
                                })
                                if (!confirm) {
                                    setSaving(false)
                                    return
                                }
                            }
                        }
                    }
                }
            }

            const res = await supabase.from('wallets').update(payload).eq('id', editId)
            error = res.error
        } else {
            let sourceWalletToDeduct: any = null
            if (sourceWalletId && linkToSource) {
                const sourceWallet = activeWallets.find(w => w.id === parseInt(sourceWalletId)) ||
                    savingsWallets.find(w => w.id === parseInt(sourceWalletId))

                if (sourceWallet) {
                    const { data: freshSourceData } = await supabase.from('wallets').select('balance').eq('id', sourceWallet.id).single()
                    if (!freshSourceData) {
                        setSaving(false)
                        return showToast('error', 'Sumber dana tidak ditemukan!')
                    }
                    const freshSourceBalance = freshSourceData.balance

                    if (freshSourceBalance < currentBalance) {
                        setSaving(false)
                        return showToast('error', `Saldo sumber dana tidak mencukupi! (Sisa: ${freshSourceBalance.toLocaleString('id-ID')}, Dibutuhkan: ${currentBalance.toLocaleString('id-ID')})`)
                    }
                    await supabase.from('wallets').update({ balance: freshSourceBalance - currentBalance }).eq('id', sourceWallet.id)
                    sourceWalletToDeduct = sourceWallet
                }
            }

            const res = await supabase.from('wallets').insert([payload]).select()
            error = res.error

            if (!error && res.data && res.data.length > 0 && sourceWalletToDeduct) {
                const newWalletId = res.data[0].id
                const topupPayload = {
                    title: `Isi saldo awal dari ${sourceWalletToDeduct.name}`,
                    amount: currentBalance,
                    type: 'topup',
                    category: 'Lainnya',
                    wallet_id: newWalletId,
                    source_wallet_id: sourceWalletToDeduct.id,
                    date: new Date().toISOString(),
                    created_at: new Date().toISOString(),
                    is_piutang: false,
                    is_talangan: false
                }
                await supabase.from('transactions').insert([topupPayload])
            }
        }

        setSaving(false)

        if (error) {
            console.error(error)
            showToast('error', 'Gagal menyimpan dompet')
        } else {
            showToast('success', editId ? 'Dompet berhasil diperbarui!' : 'Dompet baru berhasil ditambahkan!')
            onSaved()
        }
    }

    if (loadingData) {
        return (
            <div className={`flex items-center justify-center p-10 ${mode === 'page' ? 'min-h-screen bg-[#F9FAFB] dark:bg-[var(--bg-page)]' : ''}`}>
                <div className="w-8 h-8 border-3 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
            </div>
        )
    }

    const isPage = mode === 'page'
    const title = editId ? (category === 'savings' ? 'Edit Aset' : 'Edit Dompet') : (category === 'savings' ? 'Aset Baru' : 'Tambah Dompet')

    const FormContent = (
        <form onSubmit={handleSave} className="space-y-5 flex flex-col flex-1 min-h-0">
            <div className={`space-y-5 overflow-y-auto custom-scrollbar ${isPage ? 'flex-1 p-6 pb-32' : 'flex-1 p-1'}`}>
                <div>
                    <label className="neo-label mb-2 block">Nama {category === 'savings' ? 'Aset' : 'Dompet'}</label>
                    <input
                        type="text"
                        placeholder="Contoh: BCA Utama"
                        className="w-full px-[18px] py-[14px] bg-white border-[3px] border-[var(--neo-ink)] shadow-[4px_4px_0_var(--neo-ink)] rounded-[18px] text-[14px] focus:outline-none font-[800] text-[var(--text-primary)]"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        autoFocus
                    />
                </div>
                <div>
                    <label className="neo-label mb-2 block">Tipe</label>
                    <div className="grid grid-cols-3 gap-3">
                        {['bank', 'ewallet', 'cash'].map((t) => (
                            <button
                                key={t}
                                type="button"
                                onClick={() => setType(t as any)}
                                className={`py-3 px-3 rounded-[18px] text-sm font-black border-[3px] transition-all active:scale-95 ${type === t ? 'bg-[var(--neo-yellow)] border-[var(--neo-ink)] text-[var(--neo-ink)] shadow-[4px_4px_0_var(--neo-ink)]' : 'border-transparent text-[var(--text-muted)] hover:border-[var(--neo-ink)]/30'}`}
                            >
                                {t.toUpperCase()}
                            </button>
                        ))}
                    </div>
                </div>
                <div>
                    <label className="neo-label mb-2 block">Kategori</label>
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            type="button"
                            onClick={() => setCategory('active')}
                            className={`py-3 px-3 rounded-[18px] text-sm font-black border-[3px] transition-all active:scale-95 ${category === 'active' ? 'bg-[var(--neo-sky)] border-[var(--neo-ink)] text-[var(--neo-ink)] shadow-[4px_4px_0_var(--neo-ink)]' : 'border-transparent text-[var(--text-muted)] hover:border-[var(--neo-ink)]/30'}`}
                        >
                            SALDO AKTIF
                        </button>
                        <button
                            type="button"
                            onClick={() => setCategory('savings')}
                            className={`py-3 px-3 rounded-[18px] text-sm font-black border-[3px] transition-all active:scale-95 ${category === 'savings' ? 'bg-[var(--neo-mint)] border-[var(--neo-ink)] text-[var(--neo-ink)] shadow-[4px_4px_0_var(--neo-ink)]' : 'border-transparent text-[var(--text-muted)] hover:border-[var(--neo-ink)]/30'}`}
                        >
                            TABUNGAN INTI
                        </button>
                    </div>
                    <p className="text-xs text-[var(--text-muted)] font-semibold mt-2">
                        {category === 'active' ? 'Dihitung sebagai saldo aktif di dashboard.' : 'Tidak dihitung di saldo aktif utama.'}
                    </p>
                </div>
                <div>
                    <label className="neo-label mb-2 block">Nilai Saat Ini (Rp)</label>
                    <MoneyInput
                        value={balance}
                        onChange={setBalance}
                    />
                </div>

                <div>
                    <label className="neo-label mb-1 block">Sumber Dana (Opsional)</label>
                    <p className="text-xs text-[var(--text-secondary)] font-semibold mb-3">Hubungkan dengan dompet lain untuk mencatat perpindahan dana otomatis.</p>
                    {(() => {
                        const allWallets = [...activeWallets, ...savingsWallets]
                        const isRefundScenario: boolean = editId ? (() => {
                            const oldWallet = allWallets.find(w => w.id === editId)
                            if (!oldWallet) return false
                            const currentVal = parseFloat(balance || '0')
                            return currentVal < oldWallet.balance && !!oldWallet.source_wallet_id
                        })() : false

                        const isDisabled = isRefundScenario

                        return (
                            <>
                                <select
                                    className={`w-full px-[18px] py-[14px] border-[3px] border-[var(--neo-ink)] shadow-[4px_4px_0_var(--neo-ink)] rounded-[18px] text-[14px] font-[800] outline-none appearance-none ${isDisabled
                                        ? 'bg-[var(--bg-hover)] cursor-not-allowed opacity-70 text-[var(--text-muted)]'
                                        : 'bg-white text-[var(--text-primary)]'
                                        }`}
                                    value={sourceWalletId}
                                    onChange={(e) => setSourceWalletId(e.target.value)}
                                    disabled={isDisabled}
                                >
                                    <option value="">Manual (Tidak terhubung)</option>
                                    <optgroup label="Saldo Aktif">
                                        {activeWallets
                                            .filter(w => w.id !== editId)
                                            .map(w => (
                                                <option key={w.id} value={w.id}>
                                                    {w.name} (Saldo: Rp {w.balance.toLocaleString('id-ID')})
                                                </option>
                                            ))}
                                    </optgroup>
                                    <optgroup label="Tabungan Inti">
                                        {savingsWallets
                                            .filter(w => w.id !== editId)
                                            .map(w => (
                                                <option key={w.id} value={w.id}>
                                                    {w.name} (Saldo: Rp {w.balance.toLocaleString('id-ID')})
                                                </option>
                                            ))}
                                    </optgroup>
                                </select>
                                {isRefundScenario && (
                                    <div className="mt-2 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/30 rounded-lg flex items-start gap-2">
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

                {sourceWalletId && (
                    <div className="bg-[var(--bg-card)] p-4 rounded-[18px] border-[3px] border-[var(--neo-ink)] shadow-[4px_4px_0_var(--neo-ink)]">
                        <label className="flex items-center gap-3 cursor-pointer mb-2">
                            <input
                                type="checkbox"
                                checked={linkToSource}
                                onChange={e => setLinkToSource(e.target.checked)}
                                className="w-5 h-5 rounded-lg text-[var(--primary)] focus:ring-[var(--primary)] dark:focus:ring-blue-400 border-gray-300"
                            />
                            <span className="text-sm font-semibold text-[var(--text-primary)]">Sesuaikan saldo dompet sumber?</span>
                        </label>

                        {linkToSource && (
                            <div className="text-xs text-slate-500 dark:text-slate-400 pl-8">
                                {(() => {
                                    const allWallets = [...activeWallets, ...savingsWallets]
                                    let targetWallet = allWallets.find(w => w.id === parseInt(sourceWalletId))

                                    const currentVal = parseFloat(balance || '0')
                                    let diff = currentVal
                                    let oldWallet: Wallet | undefined = undefined

                                    if (editId) {
                                        oldWallet = allWallets.find(w => w.id === editId)
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
                                            <span className="text-rose-500 font-bold block bg-rose-50 dark:bg-rose-950/30 p-2 rounded-lg border border-rose-100 dark:border-rose-800/30 mt-2">
                                                Akan MEMOTONG Rp {diff.toLocaleString('id-ID')} dari {targetWallet.name}.
                                            </span>
                                        )
                                    } else if (diff < 0) {
                                        return (
                                            <span className="text-emerald-600 font-bold block bg-emerald-50 dark:bg-emerald-950/30 p-2 rounded-lg border border-emerald-100 dark:border-emerald-800/30 mt-2">
                                                Akan MENGEMBALIKAN Rp {Math.abs(diff).toLocaleString('id-ID')} ke {targetWallet.name} (sumber asli).
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
            </div>

            {isPage ? (
                <div className="fixed bottom-0 left-0 right-0 p-5 bg-[var(--bg-card)] border-t-[3px] border-[var(--neo-ink)] shadow-[0_-10px_40px_rgba(0,0,0,0.05)] md:relative md:shadow-none z-20">
                    <button disabled={saving} type="submit" className="w-full brutal-btn !py-4 !text-base !bg-[var(--neo-yellow-vivid)]">
                        {saving ? <div className="w-5 h-5 border-[3px] border-[var(--neo-ink)] border-t-transparent rounded-full animate-spin" /> : <Save className="w-5 h-5" />}
                        Simpan {category === 'savings' ? 'Aset' : 'Dompet'}
                    </button>
                </div>
            ) : (
                <div className="shrink-0 pt-4 pb-1">
                    <button disabled={saving} type="submit" className="w-full brutal-btn !py-3.5 !text-sm !bg-[var(--neo-yellow-vivid)]">
                        {saving ? <div className="w-4 h-4 border-2 border-[var(--neo-ink)] border-t-transparent rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                        Simpan {category === 'savings' ? 'Aset' : 'Dompet'}
                    </button>
                </div>
            )}
        </form>
    )

    if (isPage) {
        return (
            <div className="fixed inset-0 z-[59] bg-[#F9FAFB] dark:bg-[var(--bg-page)] md:relative md:min-h-screen flex flex-col animate-in slide-in-from-bottom-full md:slide-in-from-bottom-0 duration-300">
                <div className="flex items-center justify-between p-5 bg-white dark:bg-[var(--bg-card)] border-b border-[var(--border-default)] shrink-0 sticky top-0 z-20">
                    <div className="flex items-center gap-3">
                        <button onClick={onClose} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-[var(--bg-hover)] transition-colors active:scale-95">
                            <X className="w-6 h-6 text-slate-700 dark:text-slate-300" />
                        </button>
                        <h2 className="text-lg font-bold text-[var(--text-primary)]">{title}</h2>
                    </div>
                </div>
                <div className="flex-1 md:max-w-2xl md:mx-auto md:w-full md:mt-8 md:bg-white md:dark:bg-[var(--bg-card)] md:border md:border-[var(--border-default)] md:rounded-3xl md:shadow-sm md:overflow-hidden relative flex flex-col min-h-0">
                    {FormContent}
                </div>
            </div>
        )
    }

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
            <div className="bg-[var(--bg-card)] w-full max-w-md rounded-[24px] border-[3px] border-[var(--neo-ink)] shadow-[8px_8px_0_var(--neo-ink)] z-50 p-6 relative animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center mb-6 shrink-0">
                    <h3 className="text-xl font-black tracking-tight text-[var(--text-primary)]">{title}</h3>
                    <button onClick={onClose} className="p-2 bg-[var(--bg-elevated)] hover:bg-[var(--bg-hover)] border-[2px] border-transparent hover:border-[var(--neo-ink)] shadow-none hover:shadow-[2px_2px_0_var(--neo-ink)] rounded-[12px] text-[var(--text-primary)] transition-all">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                {FormContent}
            </div>
        </div>
    )
}

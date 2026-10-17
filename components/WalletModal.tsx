'use client'
import React, { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Wallet } from '@/types'
import { X, Trash2 } from 'lucide-react'
import NeoSelect from '@/components/NeoSelect'
import FieldError from '@/components/FieldError'
import { useToast } from '@/hooks/useToast'
import { useConfirm } from '@/hooks/useConfirm'

interface WalletModalProps {
    editId?: number | null
    defaultCategory?: 'active' | 'savings'
    onClose: () => void
    onSaved: () => void
    onDelete?: () => void
    mode?: 'page' | 'modal'
}

export default function WalletModal({ editId, defaultCategory = 'active', onClose, onSaved, onDelete, mode = 'modal' }: WalletModalProps) {
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
    const [errors, setErrors] = useState<Record<string, string>>({})
    const clearErr = (k: string) => setErrors(prev => { const n = { ...prev }; delete n[k]; return n })

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

    const noun = category === 'savings' ? 'Aset' : 'Dompet'

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        const ve: Record<string, string> = {}
        if (!name.trim()) ve.name = `Isi nama ${noun.toLowerCase()}.`
        if (balance === '' || isNaN(parseFloat(balance))) ve.balance = 'Isi nilai saldo.'
        setErrors(ve)
        if (Object.keys(ve).length > 0) return

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
                                    return setErrors({ source: 'Sumber dana tidak boleh dompet ini sendiri.' })
                                }

                                const { data: freshSourceData } = await supabase.from('wallets').select('balance').eq('id', sourceWallet.id).single()
                                if (!freshSourceData) {
                                    setSaving(false)
                                    return showToast('error', 'Sumber dana tidak ditemukan.')
                                }
                                const freshSourceBalance = freshSourceData.balance

                                if (freshSourceBalance < diff) {
                                    setSaving(false)
                                    return setErrors({ source: `Saldo ${sourceWallet.name} kurang Rp ${(diff - freshSourceBalance).toLocaleString('id-ID')}. Pilih dompet lain atau ubah jumlah.` })
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
                                return showToast('error', 'Sumber dana tidak ditemukan. Mungkin sudah dihapus.')
                            }
                        }
                    } else if (diff < 0) {
                        if (oldWallet.source_wallet_id) {
                            const sourceWallet = activeWallets.find(w => w.id === oldWallet.source_wallet_id) ||
                                savingsWallets.find(w => w.id === oldWallet.source_wallet_id)

                            if (sourceWallet) {
                                if (sourceWallet.id === editId) {
                                    setSaving(false)
                                    return setErrors({ source: 'Sumber dana tidak boleh dompet ini sendiri.' })
                                }

                                const refundAmount = Math.abs(diff)
                                const { data: freshSourceData } = await supabase.from('wallets').select('balance').eq('id', sourceWallet.id).single()
                                if (!freshSourceData) {
                                    setSaving(false)
                                    return showToast('error', 'Sumber dana tidak ditemukan.')
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
                                    title: 'Sumber dana sudah dihapus',
                                    message: `Selisih Rp ${Math.abs(diff).toLocaleString('id-ID')} tidak bisa dikembalikan ke mana pun. Lanjut simpan?`,
                                    confirmText: 'Simpan',
                                    cancelText: 'Batal',
                                    tone: 'warn',
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
                        return showToast('error', 'Sumber dana tidak ditemukan.')
                    }
                    const freshSourceBalance = freshSourceData.balance

                    if (freshSourceBalance < currentBalance) {
                        setSaving(false)
                        return setErrors({ source: `Saldo ${sourceWallet.name} kurang Rp ${(currentBalance - freshSourceBalance).toLocaleString('id-ID')}. Pilih dompet lain atau ubah jumlah.` })
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
            showToast('error', `${noun} gagal disimpan. Coba lagi.`)
        } else {
            showToast('success', editId ? 'Perubahan tersimpan' : `${noun} ditambahkan`)
            onSaved()
        }
    }

    const isPage = mode === 'page'
    const title = editId ? `Ubah ${noun.toLowerCase()}` : (category === 'savings' ? 'Aset baru' : 'Tambah dompet')
    const rp = (n: number) => `Rp ${n.toLocaleString('id-ID')}`

    const allWallets = [...activeWallets, ...savingsWallets]
    const isRefundScenario: boolean = editId ? (() => {
        const oldWallet = allWallets.find(w => w.id === editId)
        if (!oldWallet) return false
        const currentVal = parseFloat(balance || '0')
        return currentVal < oldWallet.balance && !!oldWallet.source_wallet_id
    })() : false

    const form = (
        <form onSubmit={handleSave} className="stack-12">
            <label className="field">Nama {noun.toLowerCase()}
                <input
                    className={`input ${errors.name ? 'bad' : ''}`}
                    type="text"
                    placeholder="Contoh: BCA Utama"
                    value={name}
                    onChange={(e) => { setName(e.target.value); clearErr('name') }}
                    autoFocus
                />
                <FieldError>{errors.name}</FieldError>
            </label>

            <div className="field">Tipe
                <div className="seg">
                    {([['bank', 'Bank'], ['ewallet', 'E-wallet'], ['cash', 'Tunai']] as const).map(([v, label]) => (
                        <button key={v} type="button" className={type === v ? 'on' : ''} onClick={() => setType(v)}>{label}</button>
                    ))}
                </div>
            </div>

            <div className="field">Kategori
                <div className="seg">
                    <button type="button" className={category === 'active' ? 'on' : ''} onClick={() => setCategory('active')}>Saldo aktif</button>
                    <button type="button" className={category === 'savings' ? 'on' : ''} onClick={() => setCategory('savings')}>Tabungan inti</button>
                </div>
                <span className="lbl">{category === 'active' ? 'Dihitung sebagai saldo aktif di beranda.' : 'Tidak dihitung di saldo aktif.'}</span>
            </div>

            <label className="field">Nilai saat ini (Rp)
                <input
                    className={`input ${errors.balance ? 'bad' : ''}`}
                    inputMode="numeric"
                    placeholder="0"
                    value={balance !== '' && !isNaN(parseFloat(balance)) ? parseInt(balance.replace(/\D/g, '') || '0').toLocaleString('id-ID') : ''}
                    onChange={(e) => { setBalance(e.target.value.replace(/\D/g, '')); clearErr('balance') }}
                />
                <FieldError>{errors.balance}</FieldError>
            </label>

            <div className="field">Sumber dana (opsional)
                <span className="lbl" style={{ marginTop: -2, marginBottom: 2 }}>Hubungkan dengan dompet lain untuk mencatat perpindahan dana otomatis.</span>
                <NeoSelect
                    value={sourceWalletId}
                    onChange={(val) => { setSourceWalletId(val); clearErr('source') }}
                    placeholder="Manual (tidak terhubung)"
                    options={[
                        { label: 'Manual (tidak terhubung)', value: '' },
                        ...activeWallets.filter(w => w.id !== editId).map(w => ({ label: `[Aktif] ${w.name} (${rp(w.balance)})`, value: w.id.toString(), disabled: isRefundScenario })),
                        ...savingsWallets.filter(w => w.id !== editId).map(w => ({ label: `[Tabungan] ${w.name} (${rp(w.balance)})`, value: w.id.toString(), disabled: isRefundScenario })),
                    ]}
                />
                <FieldError>{errors.source}</FieldError>
                {isRefundScenario && (
                    <div className="banner warn" style={{ marginTop: 6 }}>Sumber terkunci — dana harus dikembalikan ke sumber asli.</div>
                )}
            </div>

            {sourceWalletId && (
                <div className="tile stack" style={{ gap: 8 }}>
                    <button type="button" className="hstack" style={{ border: 0, background: 'none', padding: 0, fontSize: 14, fontWeight: 600, color: 'var(--text)', textAlign: 'left' }} onClick={() => setLinkToSource(v => !v)} aria-pressed={linkToSource}>
                        <span className={`switch ${linkToSource ? 'on' : ''}`} />
                        Sesuaikan saldo dompet sumber?
                    </button>
                    {linkToSource && (() => {
                        let targetWallet = allWallets.find(w => w.id === parseInt(sourceWalletId))
                        const currentVal = parseFloat(balance || '0')
                        let diff = currentVal
                        if (editId) {
                            const oldWallet = allWallets.find(w => w.id === editId)
                            if (oldWallet) {
                                diff = currentVal - oldWallet.balance
                                if (diff < 0 && oldWallet.source_wallet_id) targetWallet = allWallets.find(w => w.id === oldWallet.source_wallet_id)
                            }
                        }
                        if (!targetWallet) return null
                        if (diff > 0) return <span className="lbl" style={{ color: 'var(--danger-text)', fontWeight: 600 }}>Memotong {rp(diff)} dari {targetWallet.name}.</span>
                        if (diff < 0) return <span className="lbl" style={{ color: 'var(--income)', fontWeight: 600 }}>Mengembalikan {rp(Math.abs(diff))} ke {targetWallet.name} (sumber asli).</span>
                        return <span className="lbl">Tidak ada perubahan saldo sumber.</span>
                    })()}
                </div>
            )}

            <div className="stack" style={{ marginTop: 4 }}>
                <button disabled={saving} type="submit" className="btn btn-block">{saving ? 'Menyimpan…' : `Simpan ${noun.toLowerCase()}`}</button>
                {editId && onDelete && (
                    <button type="button" disabled={saving} onClick={onDelete} className="link" style={{ color: 'var(--danger)', alignSelf: 'center', padding: '8px 0' }}>
                        <Trash2 className="i i-s" style={{ display: 'inline', verticalAlign: '-3px', marginRight: 4 }} />Hapus {noun.toLowerCase()}
                    </button>
                )}
            </div>
        </form>
    )

    if (loadingData) {
        return (
            <div className="cd">
                <div className="scrim" onClick={onClose} />
                <div className="sheet" style={{ alignItems: 'center', padding: '40px 20px' }}>
                    <div className="w-8 h-8 border-[3px] border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
                </div>
            </div>
        )
    }

    if (isPage) {
        return (
            <div className="cd scroll" style={{ minHeight: '100vh', background: 'var(--surface)', maxWidth: 560, margin: '0 auto', paddingBottom: 60 }}>
                <div className="top">
                    <div className="top-l">
                        <button onClick={onClose} className="icon-btn ghost" aria-label="Tutup"><X className="i" /></button>
                        <h1 className="h2">{title}</h1>
                    </div>
                </div>
                {form}
            </div>
        )
    }

    return (
        <div className="cd">
            <div className="scrim" onClick={onClose} />
            <div className="sheet">
                <div className="grabber" />
                <div className="between">
                    <h2 className="h2">{title}</h2>
                    <button className="icon-btn ghost" aria-label="Tutup" onClick={onClose}><X className="i" /></button>
                </div>
                {form}
            </div>
        </div>
    )
}

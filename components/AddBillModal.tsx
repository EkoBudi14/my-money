'use client'

import { useState, useEffect } from 'react'
import { X, TrendingDown, TrendingUp } from 'lucide-react'
import { addRecurringBill, updateRecurringBill } from '@/lib/recurring-bills'
import { RecurringBill, CATEGORIES } from '@/types'
import MoneyInput from './MoneyInput'
import NeoSelect from './NeoSelect'
import { supabase } from '@/lib/supabase'

interface AddBillModalProps {
    isOpen?: boolean
    onClose: () => void
    onSuccess: () => void
    initialData?: RecurringBill | null
    mode?: 'page' | 'modal'
    editId?: number | null
}

export default function AddBillModal({ isOpen = true, onClose, onSuccess, initialData, mode = 'modal', editId }: AddBillModalProps) {
    const [loading, setLoading] = useState(false)
    const [billType, setBillType] = useState<'pengeluaran' | 'pemasukan'>('pengeluaran')
    const [formData, setFormData] = useState({
        name: '',
        amount: '',
        due_date: '',
        category: 'Tagihan'
    })

    // Reset or Populate form when modal opens
    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                const type = initialData.type ?? 'pengeluaran'
                setBillType(type)
                setFormData({
                    name: initialData.name,
                    amount: initialData.amount.toString(),
                    due_date: initialData.due_date.toString(),
                    category: initialData.category
                })
            } else if (editId) {
                // Fetch data if editId is provided
                const fetchBill = async () => {
                    const { data } = await supabase.from('recurring_bills').select('*').eq('id', editId).single()
                    if (data) {
                        const type = data.type ?? 'pengeluaran'
                        setBillType(type)
                        setFormData({
                            name: data.name,
                            amount: data.amount.toString(),
                            due_date: data.due_date.toString(),
                            category: data.category
                        })
                    }
                }
                fetchBill()
            } else {
                setBillType('pengeluaran')
                setFormData({
                    name: '',
                    amount: '',
                    due_date: '',
                    category: 'Tagihan'
                })
            }
        }
    }, [isOpen, initialData, editId])

    // Update default category when type toggles (only for new entries)
    const handleTypeChange = (type: 'pengeluaran' | 'pemasukan') => {
        setBillType(type)
        if (!initialData) {
            setFormData(prev => ({
                ...prev,
                category: type === 'pemasukan' ? 'Gaji' : 'Tagihan'
            }))
        }
    }

    const isPage = mode === 'page'
    if (!isOpen && !isPage) return null

    const categoryOptions = billType === 'pemasukan' ? CATEGORIES.pemasukan : CATEGORIES.pengeluaran

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const payload = {
                name: formData.name,
                amount: Number(formData.amount),
                due_date: Number(formData.due_date),
                category: formData.category,
                type: billType
            }

            if (initialData) {
                await updateRecurringBill(initialData.id, payload)
            } else if (editId) {
                await updateRecurringBill(editId, payload)
            } else {
                await addRecurringBill(payload)
            }

            onSuccess()
            onClose()
        } catch (error) {
            console.error(error)
            alert('Gagal menyimpan')
        } finally {
            setLoading(false)
        }
    }

    const isPemasukan = billType === 'pemasukan'

    return (
        <div className={isPage
            ? "min-h-screen bg-[var(--bg-page)] pt-4 pb-20 px-4 md:py-12 md:px-8"
            : "fixed inset-0 bg-black/40 backdrop-blur-sm z-[70] flex items-end sm:items-center justify-center p-4 pb-6"}>
            <div className={`mx-auto bg-[var(--bg-card)] border-[3px] border-[var(--neo-ink)] shadow-[8px_8px_0_var(--neo-ink)] rounded-[16px] w-full max-w-md animate-in ${
                isPage ? 'fade-in slide-in-from-bottom-8 duration-500' : 'fade-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200 max-h-[85dvh] overflow-y-auto custom-scrollbar'
            }`}>
                <div className="p-6 border-b-[3px] border-[var(--neo-ink)] bg-[var(--neo-yellow-vivid)] flex justify-between items-center sticky top-0 z-10 rounded-t-[14px]">
                    <h3 className="text-xl font-black text-[var(--neo-ink)]">
                        {(initialData || editId)
                            ? (isPemasukan ? 'Edit Pemasukan Rutin' : 'Edit Tagihan Rutin')
                            : (isPemasukan ? 'Tambah Pemasukan Rutin' : 'Tambah Tagihan Rutin')
                        }
                    </h3>
                    <button
                        onClick={onClose}
                        className="flex items-center justify-center p-2 rounded-xl bg-[#ffd84d] border-2 border-[#141414] shadow-[2px_2px_0_#141414] hover:-translate-y-[1px] hover:shadow-[3px_3px_0_#141414] active:translate-y-[2px] active:translate-x-[2px] active:shadow-none transition-all"
                    >
                        <X className="w-5 h-5 text-[#141414]" strokeWidth={3} />
                    </button>
                </div>
                <div className="p-6 pt-6">

                    {/* Type Toggle — only show for new entries */}
                    {(!initialData && !editId) && (
                        <div className="flex gap-3 mb-6">
                            <button
                                type="button"
                                onClick={() => handleTypeChange('pengeluaran')}
                                className={`flex-1 flex items-center justify-center gap-2 py-3 px-3 rounded-[10px] text-sm font-black transition-all border-[3px] border-[var(--neo-ink)] ${billType === 'pengeluaran'
                                    ? 'bg-rose-300 text-[var(--neo-ink)] shadow-[4px_4px_0_var(--neo-ink)] translate-y-[-2px]'
                                    : 'bg-white text-[var(--neo-ink)] opacity-70 hover:opacity-100 hover:shadow-[2px_2px_0_var(--neo-ink)] hover:translate-y-[-1px]'
                                    }`}
                            >
                                <TrendingDown size={18} className="stroke-[3px]" />
                                Tagihan Rutin
                            </button>
                            <button
                                type="button"
                                onClick={() => handleTypeChange('pemasukan')}
                                className={`flex-1 flex items-center justify-center gap-2 py-3 px-3 rounded-[10px] text-sm font-black transition-all border-[3px] border-[var(--neo-ink)] ${billType === 'pemasukan'
                                    ? 'bg-emerald-300 text-[var(--neo-ink)] shadow-[4px_4px_0_var(--neo-ink)] translate-y-[-2px]'
                                    : 'bg-white text-[var(--neo-ink)] opacity-70 hover:opacity-100 hover:shadow-[2px_2px_0_var(--neo-ink)] hover:translate-y-[-1px]'
                                    }`}
                            >
                                <TrendingUp size={18} className="stroke-[3px]" />
                                Pemasukan Rutin
                            </button>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-2">
                            <label className="block text-sm font-black text-[var(--text-primary)]">
                                {isPemasukan ? 'Nama Pemasukan' : 'Nama Tagihan'}
                            </label>
                            <input
                                required
                                type="text"
                                placeholder={isPemasukan ? 'Contoh: Gaji Bulanan, Tunjangan' : 'Contoh: Netflix, WiFi, Listrik'}
                                className="w-full px-4 py-3 bg-[var(--bg-elevated)] border-[3px] border-[var(--neo-ink)] shadow-[4px_4px_0_var(--neo-ink)] rounded-[10px] text-[var(--text-primary)] font-bold focus:outline-none focus:translate-y-[-2px] focus:shadow-[6px_6px_0_var(--neo-ink)] transition-all placeholder:text-[var(--text-primary)] placeholder:opacity-50"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-black text-[var(--text-primary)]">
                                {isPemasukan ? 'Jumlah Pemasukan (Rp)' : 'Jumlah Tagihan (Rp)'}
                            </label>
                            <MoneyInput
                                value={formData.amount}
                                onChange={(val) => setFormData({ ...formData, amount: val })}
                                placeholder="0"
                            />
                        </div>

                        {/* Category */}
                        <div className="space-y-2">
                            <label className="block text-sm font-black text-[var(--text-primary)]">Kategori</label>
                            <NeoSelect
                                className="w-full px-4 py-3 bg-[var(--bg-elevated)] border-[3px] border-[var(--neo-ink)] shadow-[4px_4px_0_var(--neo-ink)] rounded-[10px] text-[var(--text-primary)] font-bold transition-all hover:translate-y-[-2px] hover:shadow-[6px_6px_0_var(--neo-ink)]"
                                value={formData.category}
                                onChange={val => setFormData({ ...formData, category: val })}
                                options={categoryOptions.map(cat => ({ label: cat.name, value: cat.name }))}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-black text-[var(--text-primary)]">
                                {isPemasukan ? 'Mulai Tanggal Terima' : 'Mulai Tanggal Pembayaran'}
                            </label>
                            <div className="relative">
                                <input
                                    required
                                    type="date"
                                    className="w-full px-4 py-3 bg-[var(--bg-elevated)] border-[3px] border-[var(--neo-ink)] shadow-[4px_4px_0_var(--neo-ink)] rounded-[10px] text-[var(--text-primary)] font-bold focus:outline-none focus:translate-y-[-2px] focus:shadow-[6px_6px_0_var(--neo-ink)] transition-all cursor-pointer [color-scheme:light]"
                                    onClick={(e) => e.currentTarget.showPicker()}
                                    onChange={(e) => {
                                        const date = new Date(e.target.value)
                                        if (!isNaN(date.getDate())) {
                                            setFormData({
                                                ...formData,
                                                due_date: date.getDate().toString()
                                            })
                                        }
                                    }}
                                />
                                {formData.due_date && (
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] text-[var(--neo-ink)] font-black uppercase tracking-wider bg-[var(--neo-yellow-vivid)] px-2 py-1 rounded-[6px] border-2 border-[var(--neo-ink)]">
                                        Setiap tgl {formData.due_date}
                                    </div>
                                )}
                            </div>
                            <p className="text-[10px] font-bold opacity-70 px-1 uppercase tracking-wide mt-1">
                                {isPemasukan
                                    ? 'Pilih tanggal pertama kali pemasukan diterima. Akan berulang setiap bulan di tanggal yang sama.'
                                    : 'Pilih tanggal pembayaran pertama. Tagihan akan otomatis berulang setiap bulannya pada tanggal yang sama.'
                                }
                            </p>
                        </div>

                        <div className="pt-4">
                            <button
                                type="submit"
                                disabled={loading}
                                className={`w-full py-4 brutal-btn flex items-center justify-center gap-2 disabled:opacity-50 text-lg font-black text-[var(--neo-ink)] ${
                                    isPemasukan
                                        ? 'bg-emerald-300'
                                        : 'bg-[var(--neo-yellow-vivid)]'
                                    }`}
                            >
                                {loading ? (
                                    <div className="w-6 h-6 border-[4px] border-[var(--neo-ink)] border-t-transparent rounded-full animate-spin"></div>
                                ) : ((initialData || editId) ? 'Simpan Perubahan' : 'Simpan')}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}

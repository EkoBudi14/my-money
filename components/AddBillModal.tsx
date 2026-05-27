'use client'

import { useState, useEffect } from 'react'
import { X, TrendingDown, TrendingUp } from 'lucide-react'
import { addRecurringBill, updateRecurringBill } from '@/lib/recurring-bills'
import { RecurringBill, CATEGORIES } from '@/types'
import MoneyInput from './MoneyInput'

interface AddBillModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
    initialData?: RecurringBill | null
}

export default function AddBillModal({ isOpen, onClose, onSuccess, initialData }: AddBillModalProps) {
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
    }, [isOpen, initialData])

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

    if (!isOpen) return null

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
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-[var(--bg-card)] rounded-[2rem] w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                <div className="p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-bold text-slate-800 dark:text-[var(--text-primary)]">
                            {initialData
                                ? (isPemasukan ? 'Edit Pemasukan Rutin' : 'Edit Tagihan Rutin')
                                : (isPemasukan ? 'Tambah Pemasukan Rutin' : 'Tambah Tagihan Rutin')
                            }
                        </h3>
                        <button
                            onClick={onClose}
                            className="p-2 bg-slate-100 dark:bg-[var(--bg-hover)] hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-slate-500 dark:text-slate-400 transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Type Toggle — only show for new entries */}
                    {!initialData && (
                        <div className="flex gap-2 mb-6 p-1 bg-slate-100 dark:bg-[var(--bg-elevated)] rounded-2xl">
                            <button
                                type="button"
                                onClick={() => handleTypeChange('pengeluaran')}
                                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-sm font-bold transition-all ${billType === 'pengeluaran'
                                    ? 'bg-white dark:bg-[var(--bg-card)] text-rose-600 shadow-sm'
                                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
                                    }`}
                            >
                                <TrendingDown size={16} />
                                Tagihan Rutin
                            </button>
                            <button
                                type="button"
                                onClick={() => handleTypeChange('pemasukan')}
                                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-sm font-bold transition-all ${billType === 'pemasukan'
                                    ? 'bg-white dark:bg-[var(--bg-card)] text-emerald-600 shadow-sm'
                                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
                                    }`}
                            >
                                <TrendingUp size={16} />
                                Pemasukan Rutin
                            </button>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-2">
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                                {isPemasukan ? 'Nama Pemasukan' : 'Nama Tagihan'}
                            </label>
                            <input
                                required
                                type="text"
                                placeholder={isPemasukan ? 'Contoh: Gaji Bulanan, Tunjangan' : 'Contoh: Netflix, WiFi, Listrik'}
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-[var(--bg-elevated)] border border-slate-200 dark:border-[var(--border-default)] rounded-2xl focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent outline-none transition-all font-medium text-slate-800 dark:text-[var(--text-primary)] placeholder:text-slate-400 dark:text-slate-500"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
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
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">Kategori</label>
                            <select
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-[var(--bg-elevated)] border border-slate-200 dark:border-[var(--border-default)] rounded-2xl focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent outline-none transition-all font-medium text-slate-800 dark:text-[var(--text-primary)]"
                                value={formData.category}
                                onChange={e => setFormData({ ...formData, category: e.target.value })}
                            >
                                {categoryOptions.map(cat => (
                                    <option key={cat.name} value={cat.name}>{cat.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                                {isPemasukan ? 'Mulai Tanggal Terima' : 'Mulai Tanggal Pembayaran'}
                            </label>
                            <div className="relative">
                                <input
                                    required
                                    type="date"
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-[var(--bg-elevated)] border border-slate-200 dark:border-[var(--border-default)] rounded-2xl focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent outline-none transition-all font-medium text-slate-800 dark:text-[var(--text-primary)] placeholder:text-slate-400 dark:text-slate-500 [color-scheme:light] cursor-pointer"
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
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-slate-500 dark:text-slate-400 font-medium bg-slate-50 dark:bg-[var(--bg-elevated)] pl-2">
                                        Setiap tgl <span className={`font-bold ${isPemasukan ? 'text-emerald-600' : 'text-blue-600'}`}>{formData.due_date}</span>
                                    </div>
                                )}
                            </div>
                            <p className="text-xs text-slate-400 dark:text-slate-500 px-1">
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
                                className={`w-full text-white font-bold py-4 px-6 rounded-2xl active:scale-[0.98] transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed ${isPemasukan
                                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-emerald-500/30'
                                    : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-purple-500/30'
                                    }`}
                            >
                                {loading ? (
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                ) : (initialData ? 'Simpan Perubahan' : 'Simpan')}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}

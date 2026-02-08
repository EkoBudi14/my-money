'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { addRecurringBill, updateRecurringBill } from '@/lib/recurring-bills'
import { RecurringBill } from '@/types'
import MoneyInput from './MoneyInput'

interface AddBillModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
    initialData?: RecurringBill | null
}

export default function AddBillModal({ isOpen, onClose, onSuccess, initialData }: AddBillModalProps) {
    const [loading, setLoading] = useState(false)
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
                setFormData({
                    name: initialData.name,
                    amount: initialData.amount.toString(),
                    due_date: initialData.due_date.toString(),
                    category: initialData.category
                })
            } else {
                setFormData({
                    name: '',
                    amount: '',
                    due_date: '',
                    category: 'Tagihan'
                })
            }
        }
    }, [isOpen, initialData])

    if (!isOpen) return null

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const payload = {
                name: formData.name,
                amount: Number(formData.amount),
                due_date: Number(formData.due_date),
                category: formData.category
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
            alert('Gagal menyimpan tagihan')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                <div className="p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-bold text-slate-800">
                            {initialData ? 'Edit Tagihan Rutin' : 'Tambah Tagihan Rutin'}
                        </h3>
                        <button 
                            onClick={onClose} 
                            className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500 transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>
                    
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-2">
                            <label className="block text-sm font-semibold text-slate-700">Nama Tagihan</label>
                            <input
                                required
                                type="text"
                                placeholder="Contoh: Netflix, WiFi, Listrik"
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all font-medium text-slate-800 placeholder:text-slate-400"
                                value={formData.name}
                                onChange={e => setFormData({...formData, name: e.target.value})}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-semibold text-slate-700">Jumlah (Rp)</label>
                            <MoneyInput
                                value={formData.amount}
                                onChange={(val) => setFormData({...formData, amount: val})}
                                placeholder="0"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-semibold text-slate-700">
                                Mulai Tanggal Pembayaran
                            </label>
                            <div className="relative">
                                {/* Use type="date" to show native calendar as requested */}
                                <input
                                    required
                                    type="date"
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all font-medium text-slate-800 placeholder:text-slate-400 [color-scheme:light] cursor-pointer"
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
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-slate-500 font-medium bg-slate-50 pl-2">
                                        Setiap tgl <span className="text-blue-600 font-bold">{formData.due_date}</span>
                                    </div>
                                )}
                            </div>
                            <p className="text-xs text-slate-400 px-1">
                                Pilih tanggal pembayaran pertama. Tagihan akan otomatis berulang setiap bulannya pada tanggal yang sama.
                            </p>
                        </div>

                        <div className="pt-4">
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 !text-white font-bold py-4 px-6 rounded-2xl active:scale-[0.98] transition-all shadow-lg shadow-purple-500/30 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
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

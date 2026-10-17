'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { addRecurringBill, updateRecurringBill } from '@/lib/recurring-bills'
import { RecurringBill, CATEGORIES } from '@/types'
import FieldError from './FieldError'
import NeoSelect from './NeoSelect'
import DatePickerNeo from './DatePickerNeo'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/useToast'

interface AddBillModalProps {
    isOpen?: boolean
    onClose: () => void
    onSuccess: () => void
    initialData?: RecurringBill | null
    mode?: 'page' | 'modal'
    editId?: number | null
}

export default function AddBillModal({ isOpen = true, onClose, onSuccess, initialData, mode = 'modal', editId }: AddBillModalProps) {
    const { showToast } = useToast()
    const [loading, setLoading] = useState(false)
    const [billType, setBillType] = useState<'pengeluaran' | 'pemasukan'>('pengeluaran')
    const [formData, setFormData] = useState({
        name: '',
        amount: '',
        due_date: '',
        category: 'Tagihan'
    })
    const [fullDate, setFullDate] = useState('')
    // Inline field validation (DESIGN-TAMBAHAN.md §5)
    const [errors, setErrors] = useState<Record<string, string>>({})
    const clearErr = (k: string) => setErrors(prev => { const n = { ...prev }; delete n[k]; return n })

    // Reset or Populate form when modal opens
    useEffect(() => {
        if (isOpen) {
            setErrors({})
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
                setFullDate('')
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
    const isPemasukan = billType === 'pemasukan'

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        const errs: Record<string, string> = {}
        if (!formData.name.trim()) errs.name = isPemasukan ? 'Isi nama pemasukan.' : 'Isi nama tagihan.'
        if (!(Number(formData.amount) > 0)) errs.amount = 'Isi jumlah lebih dari Rp 0.'
        if (!formData.due_date) errs.date = 'Pilih tanggal.'
        setErrors(errs)
        if (Object.keys(errs).length) return
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
            showToast('error', 'Tagihan rutin gagal disimpan. Coba lagi.')
        } finally {
            setLoading(false)
        }
    }

    const isEdit = !!(initialData || editId)
    const title = isEdit
        ? (isPemasukan ? 'Ubah pemasukan rutin' : 'Ubah tagihan rutin')
        : (isPemasukan ? 'Tambah pemasukan rutin' : 'Tambah tagihan rutin')

    const form = (
        <form onSubmit={handleSubmit} className="stack-12">
            {/* Type tabs — only for new entries */}
            {!isEdit && (
                <div className="seg">
                    <button type="button" className={!isPemasukan ? 'on' : ''} onClick={() => handleTypeChange('pengeluaran')}>Tagihan rutin</button>
                    <button type="button" className={isPemasukan ? 'on' : ''} onClick={() => handleTypeChange('pemasukan')}>Pemasukan rutin</button>
                </div>
            )}

            <label className="field">{isPemasukan ? 'Nama pemasukan' : 'Nama tagihan'}
                <input
                    className={`input ${errors.name ? 'bad' : ''}`}
                    type="text"
                    placeholder={isPemasukan ? 'Gaji, uang kos dari adik' : 'Netflix, internet, listrik'}
                    value={formData.name}
                    onChange={e => { setFormData({ ...formData, name: e.target.value }); clearErr('name') }}
                />
                <FieldError>{errors.name}</FieldError>
            </label>

            <div className="field">{isPemasukan ? 'Jumlah pemasukan' : 'Jumlah tagihan'}
                <div className={`amount-box ${errors.amount ? 'bad' : ''}`} style={{ borderBottomWidth: 1.5 }}>
                    <span className="cur">Rp</span>
                    <input
                        type="text"
                        inputMode="numeric"
                        placeholder="0"
                        className="val"
                        style={{ fontSize: 28 }}
                        value={formData.amount ? parseInt(formData.amount.replace(/D/g, '') || '0').toLocaleString('id-ID') : ''}
                        onChange={e => { setFormData({ ...formData, amount: e.target.value.replace(/D/g, '') }); clearErr('amount') }}
                    />
                </div>
                <FieldError>{errors.amount}</FieldError>
            </div>

            <div className="field">Kategori
                <NeoSelect
                    value={formData.category}
                    onChange={val => setFormData({ ...formData, category: val })}
                    options={categoryOptions.map(cat => ({ label: cat.name, value: cat.name }))}
                />
            </div>

            <div className="field">{isPemasukan ? 'Tanggal terima pertama' : 'Tanggal bayar pertama'}
                <DatePickerNeo
                    className={`input ${errors.date ? 'bad' : ''}`}
                    value={fullDate}
                    onChange={(e) => {
                        setFullDate(e.target.value)
                        const date = new Date(e.target.value)
                        if (!isNaN(date.getDate())) {
                            setFormData({ ...formData, due_date: date.getDate().toString() })
                            clearErr('date')
                        }
                    }}
                />
                <span className="lbl" style={{ fontWeight: 500 }}>
                    {formData.due_date ? `Berulang tiap bulan di tanggal ${formData.due_date}.` : 'Berulang tiap bulan di tanggal yang sama.'}
                </span>
                <FieldError>{errors.date}</FieldError>
            </div>

            <button type="submit" disabled={loading} className="btn btn-block">
                {loading ? 'Menyimpan…' : isEdit ? 'Simpan perubahan' : 'Simpan'}
            </button>
        </form>
    )

    if (isPage) {
        return (
            <div className="cd scroll" style={{ minHeight: '100vh', background: 'var(--surface)', maxWidth: 560, margin: '0 auto' }}>
                <div className="top">
                    <h1 className="h2">{title}</h1>
                    <button type="button" className="icon-btn ghost" aria-label="Tutup" onClick={onClose}><X className="i" /></button>
                </div>
                {form}
            </div>
        )
    }

    return (
        <div className="cd">
            <div className="scrim" onClick={() => !loading && onClose()} />
            <div className="sheet" role="dialog" aria-labelledby="bill-title">
                <div className="grabber" />
                <div className="between">
                    <h2 className="h2" id="bill-title">{title}</h2>
                    <button type="button" className="icon-btn ghost" aria-label="Tutup" onClick={onClose}><X className="i" /></button>
                </div>
                {form}
            </div>
        </div>
    )
}

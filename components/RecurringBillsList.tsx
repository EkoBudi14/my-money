'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, Calendar, AlertTriangle, CheckCircle2, X } from 'lucide-react'
import { RecurringBill, Wallet } from '@/types'
import { getRecurringBills, deleteRecurringBill } from '@/lib/recurring-bills'
import { useConfirm } from '@/hooks/useConfirm'
import { useToast } from '@/hooks/useToast'
import { supabase } from '@/lib/supabase'
import AddBillModal from './AddBillModal'
import MoneyInput from './MoneyInput'

interface RecurringBillsListProps {
    onUpdate?: () => void
    refreshTrigger?: number
}

export default function RecurringBillsList({ onUpdate, refreshTrigger = 0 }: RecurringBillsListProps) {
    const [bills, setBills] = useState<RecurringBill[]>([])
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [loading, setLoading] = useState(true)
    const { showConfirm } = useConfirm()
    const { showToast } = useToast()

    const [selectedBill, setSelectedBill] = useState<RecurringBill | null>(null)
    const [deletingId, setDeletingId] = useState<number | null>(null)
    
    // Payment Modal State
    const [payingBillId, setPayingBillId] = useState<number | null>(null)
    const [showPaymentModal, setShowPaymentModal] = useState(false)
    const [selectedPaymentBill, setSelectedPaymentBill] = useState<RecurringBill | null>(null)
    const [selectedWalletId, setSelectedWalletId] = useState<number | null>(null)
    const [paymentAmount, setPaymentAmount] = useState<string>('')
    const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0])
    const [wallets, setWallets] = useState<Wallet[]>([])
    const [billPayments, setBillPayments] = useState<Record<number, boolean>>({})

    const fetchBills = async () => {
        try {
            const data = await getRecurringBills()
            setBills(data)
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    const handleSuccess = () => {
        fetchBills()
        if (onUpdate) onUpdate()
    }

    useEffect(() => {
        fetchBills()
        fetchWallets()
        checkBillPayments()
    }, [refreshTrigger])

    const handleDelete = async (id: number) => {
        const confirmed = await showConfirm({
            title: 'Hapus Tagihan',
            message: 'Yakin ingin menghapus tagihan ini?'
        })
        if (!confirmed) return
        
        setDeletingId(id)
        try {
            await deleteRecurringBill(id)
            fetchBills()
            if (onUpdate) onUpdate()
        } catch (error) {
            alert('Gagal menghapus')
        } finally {
            setDeletingId(null)
        }
    }

    const handleEdit = (bill: RecurringBill) => {
        setSelectedBill(bill)
        setIsModalOpen(true)
    }

    const handleCloseModal = () => {
        setIsModalOpen(false)
        setSelectedBill(null)
    }

    const fetchWallets = async () => {
        const { data } = await supabase.from('wallets').select('*')
        setWallets(data || [])
    }

    const checkBillPayments = async () => {
        const currentMonth = new Date().toISOString().slice(0, 7) // YYYY-MM
        const { data } = await supabase
            .from('bill_payments')
            .select('bill_id')
            .eq('month', currentMonth)
        
        const paymentsMap: Record<number, boolean> = {}
        data?.forEach(p => paymentsMap[p.bill_id] = true)
        setBillPayments(paymentsMap)
    }

    const handlePayBill = (bill: RecurringBill) => {
        setSelectedPaymentBill(bill)
        setPaymentAmount(bill.amount.toString())
        setPaymentDate(new Date().toISOString().split('T')[0])
        setSelectedWalletId(null)
        setShowPaymentModal(true)
    }

    const handleConfirmPayment = async () => {
        if (!selectedPaymentBill || !selectedWalletId || !paymentAmount || !paymentDate) return
        
        const amountNum = parseFloat(paymentAmount)
        if (isNaN(amountNum) || amountNum <= 0) {
            showToast('error', 'Jumlah pembayaran tidak valid')
            return
        }
        
        const wallet = wallets.find(w => w.id === selectedWalletId)
        if (!wallet) {
            showToast('error', 'Dompet tidak ditemukan')
            return
        }
        
        if (wallet.balance < amountNum) {
            showToast('error', `Saldo tidak mencukupi! Saldo ${wallet.name}: Rp ${wallet.balance.toLocaleString('id-ID')}`)
            return
        }
        
        setPayingBillId(selectedPaymentBill.id)
        try {
            const paymentMonth = new Date(paymentDate).toISOString().slice(0, 7)
            
            // Create transaction
            const { data: txData, error: txError } = await supabase.from('transactions').insert({
                title: selectedPaymentBill.name,
                amount: amountNum,
                type: 'pengeluaran',
                category: 'Tagihan',
                wallet_id: selectedWalletId,
                date: new Date(paymentDate).toISOString(),
                created_at: new Date().toISOString()
            }).select().single()
            
            if (txError) throw txError
            if (!txData) throw new Error('Transaction created but no data returned')
            
            // Update wallet balance
            await supabase.from('wallets').update({
                balance: wallet.balance - amountNum
            }).eq('id', selectedWalletId)
            
            // Mark as paid
            await supabase.from('bill_payments').insert({
                bill_id: selectedPaymentBill.id,
                month: paymentMonth,
                paid_at: new Date().toISOString(),
                transaction_id: txData.id
            })
            
            showToast('success', 'Tagihan berhasil dibayar!')
            
            // Call onUpdate immediately to refresh parent's transaction list
            if (onUpdate) onUpdate()
            
            await fetchBills()
            await fetchWallets()
            await checkBillPayments()
            
            setShowPaymentModal(false)
        } catch (error) {
            console.error(error)
            showToast('error', 'Gagal membayar tagihan')
        } finally {
            setPayingBillId(null)
        }
    }

    const getStatus = (dueDate: number) => {
        const today = new Date().getDate()
        const daysLeft = dueDate - today
        
        // Logic handling month transition
        // If due date < today, it means it's due next month (or overdue if we track payment status, 
        // but for simple recurring, let's assume it resets)
        // Wait, simple recurring usually just shows "Next due: [Date]"
        
        let status = 'upcoming'
        let color = 'bg-gray-100 text-gray-600'
        let text = `Tgl ${dueDate}`

        if (daysLeft >= 0 && daysLeft <= 3) {
            status = 'soon'
            color = 'bg-yellow-100 text-yellow-700'
            text = daysLeft === 0 ? 'Hari ini!' : `${daysLeft} hari lagi`
        } else if (daysLeft < 0) {
            // Checks if it was due recently this month
            // For now, let's just say "Lewat" (Passed) or assume next month
            // A simple logic: if today > due_date, show for next month? 
            // The user want alerts. 
            // Let's keep it simple: "Tgl X" is the due date. 
            // If today is 20 and due is 18, it's passed for this month.
            // If today is 20 and due is 22, it's coming.
            
            // Let's refine the "Alert" logic requested by user.
            status = 'past'
            color = 'bg-green-100 text-green-700' 
            text = 'Selesai bulan ini' // Assumed paid or passed
        }

        return { status, color, text }
    }

    // Sort: those due soonest (but not passed) first
    // Filter out paid bills for the current month
    const sortedBills = [...bills]
        .filter(bill => !billPayments[bill.id])
        .sort((a, b) => {
        const today = new Date().getDate()
        
        const getEffectiveDate = (day: number) => {
            if (day < today) return day + 31 // Push to next month for sorting purposes
            return day
        }

        return getEffectiveDate(a.due_date) - getEffectiveDate(b.due_date)
    })
    
    // Check for urgent bills
    const urgentBillsCount = bills.filter(b => {
        if (billPayments[b.id]) return false
        const today = new Date().getDate()
        const diff = b.due_date - today
        return diff >= 0 && diff <= 3
    }).length

    return (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        Tagihan Rutin
                        {urgentBillsCount > 0 && (
                            <span className="flex h-3 w-3 relative">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                            </span>
                        )}
                    </h2>
                    <p className="text-sm text-gray-500">Kelola langganan & tagihan bulanan</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors"
                >
                    <Plus size={20} />
                </button>
            </div>

            {urgentBillsCount > 0 && (
                <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-xl p-3 flex items-start gap-3">
                    <AlertTriangle className="text-yellow-600 shrink-0 mt-0.5" size={18} />
                    <div>
                        <p className="text-sm font-medium text-yellow-800">
                            Ada {urgentBillsCount} tagihan yang harus dibayar segera!
                        </p>
                    </div>
                </div>
            )}

            <div className="space-y-3">
                {loading ? (
                    <div className="text-center py-8 text-gray-500">Memuat...</div>
                ) : bills.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 text-sm">
                        Belum ada tagihan rutin
                    </div>
                ) : (
                    sortedBills.map((bill) => {
                        const { color, text, status } = getStatus(bill.due_date)
                        return (
                            <div key={bill.id} className="group flex flex-col sm:flex-row sm:items-center justify-between p-4 hover:bg-slate-50 rounded-2xl transition-all border border-transparent hover:border-slate-100 gap-3 sm:gap-0">
                                <div className="flex items-center gap-4 w-full sm:w-auto">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${
                                        status === 'soon' ? 'bg-rose-100 text-rose-600' : 'bg-blue-50 text-blue-600'
                                    }`}>
                                        <Calendar size={20} />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <h4 className="font-bold text-slate-800 text-base truncate">{bill.name}</h4>
                                        <p className="text-sm text-slate-500 font-medium">
                                            Rp {bill.amount.toLocaleString('id-ID')}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto pl-[3.25rem] sm:pl-0">
                                    {/* Show status badge or paid badge */}
                                    {!billPayments[bill.id] && (
                                        <span className={`px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap ${color}`}>
                                            {text}
                                        </span>
                                    )}
                                    {billPayments[bill.id] && (
                                        <span className="px-3 py-1 rounded-lg text-xs font-bold bg-emerald-100 text-emerald-700 flex items-center gap-1.5 whitespace-nowrap">
                                            <CheckCircle2 size={14} className="stroke-[3]" />
                                            Lunas
                                        </span>
                                    )}
                                    
                                    <div className="flex items-center gap-1">
                                        {/* Sudah Bayar Button - only show if not paid this month */}
                                        {!billPayments[bill.id] && (
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    handlePayBill(bill)
                                                }}
                                                disabled={payingBillId === bill.id}
                                                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm ${
                                                    payingBillId === bill.id 
                                                        ? 'bg-blue-100 cursor-wait' 
                                                        : 'bg-[#165DFF] text-white hover:bg-blue-700 hover:shadow-blue-200 active:scale-95'
                                                }`}
                                            >
                                                {payingBillId === bill.id ? (
                                                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                ) : (
                                                    'Bayar'
                                                )}
                                            </button>
                                        )}
                                        
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                handleEdit(bill)
                                            }}
                                            className="p-2 text-slate-400 hover:text-[#165DFF] hover:bg-blue-50 rounded-xl transition-all active:scale-95"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-pencil"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                                        </button>
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                handleDelete(bill.id)
                                            }}
                                            disabled={deletingId === bill.id}
                                            className={`p-2 rounded-xl transition-all active:scale-95 ${deletingId === bill.id ? 'bg-rose-50 cursor-wait' : 'text-slate-400 hover:text-rose-500 hover:bg-rose-50'}`}
                                        >
                                            {deletingId === bill.id ? (
                                                <div className="w-4 h-4 border-2 border-rose-500 border-t-transparent rounded-full animate-spin"></div>
                                            ) : (
                                                <Trash2 size={18} />
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )
                    })
                )}
            </div>

            <AddBillModal 
                isOpen={isModalOpen} 
                onClose={handleCloseModal} 
                onSuccess={handleSuccess}
                initialData={selectedBill}
            />

            {/* Payment Modal */}
            {showPaymentModal && selectedPaymentBill && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowPaymentModal(false)}></div>
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl z-50 p-6 relative animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold text-slate-800">
                                Bayar Tagihan
                            </h3>
                            <button 
                                onClick={() => setShowPaymentModal(false)}
                                className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500 transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        
                        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 mb-5">
                            <p className="text-sm text-slate-600">Tagihan</p>
                            <p className="text-lg font-bold text-slate-800">{selectedPaymentBill.name}</p>
                        </div>
                        
                        <div className="space-y-4">
                            {/* Editable Amount */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                    Jumlah Pembayaran (Rp)
                                </label>
                                <MoneyInput
                                    value={paymentAmount}
                                    onChange={setPaymentAmount}
                                    placeholder={selectedPaymentBill.amount.toString()}
                                />
                                <p className="text-xs text-slate-400 mt-1">
                                    Default: Rp {selectedPaymentBill.amount.toLocaleString('id-ID')}
                                </p>
                            </div>

                            {/* Date Picker */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                    Tanggal Pembayaran
                                </label>
                                <input
                                    type="date"
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                    value={paymentDate}
                                    onChange={(e) => setPaymentDate(e.target.value)}
                                />
                            </div>
                            
                            {/* Wallet Selection */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                    Bayar dari Dompet
                                </label>
                                <select
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                    value={selectedWalletId || ''}
                                    onChange={(e) => setSelectedWalletId(Number(e.target.value))}
                                >
                                    <option value="">Pilih Dompet</option>
                                    {wallets.map(w => (
                                        <option key={w.id} value={w.id}>
                                            {w.name} - Rp {w.balance.toLocaleString('id-ID')}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        
                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setShowPaymentModal(false)}
                                className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors"
                            >
                                Batal
                            </button>
                            <button
                                onClick={handleConfirmPayment}
                                disabled={!selectedWalletId || !paymentAmount || payingBillId !== null}
                                className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {payingBillId ? (
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto"></div>
                                ) : (
                                    'Bayar'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

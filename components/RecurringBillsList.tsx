'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, Calendar, AlertTriangle, CheckCircle2, X, TrendingDown, TrendingUp } from 'lucide-react'
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
    const [activeTab, setActiveTab] = useState<'pengeluaran' | 'pemasukan'>('pengeluaran')

    const [selectedBill, setSelectedBill] = useState<RecurringBill | null>(null)
    const [deletingId, setDeletingId] = useState<number | null>(null)
    
    // Payment/Receive Modal State
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
            title: 'Hapus',
            message: 'Yakin ingin menghapus item rutin ini?'
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

    const isPemasukan = (bill: RecurringBill) => bill.type === 'pemasukan'

    const handleConfirmPayment = async () => {
        if (!selectedPaymentBill || !selectedWalletId || !paymentAmount || !paymentDate) return
        
        const amountNum = parseFloat(paymentAmount)
        if (isNaN(amountNum) || amountNum <= 0) {
            showToast('error', 'Jumlah tidak valid')
            return
        }
        
        const walletInfo = wallets.find(w => w.id === selectedWalletId)
        if (!walletInfo) {
            showToast('error', 'Dompet tidak ditemukan')
            return
        }

        const isIncome = isPemasukan(selectedPaymentBill)
        
        // Fetch saldo terbaru dari DB (anti race condition)
        const { data: freshWalletData, error: walletFetchError } = await supabase
            .from('wallets')
            .select('balance')
            .eq('id', selectedWalletId)
            .single()
        
        if (walletFetchError || !freshWalletData) {
            showToast('error', 'Gagal memverifikasi saldo dompet')
            return
        }

        const freshBalance = freshWalletData.balance

        // Cek saldo hanya untuk pengeluaran
        if (!isIncome && freshBalance < amountNum) {
            showToast('error', `Saldo tidak mencukupi! Saldo ${walletInfo.name}: Rp ${freshBalance.toLocaleString('id-ID')}`)
            return
        }
        
        setPayingBillId(selectedPaymentBill.id)
        try {
            const safePaymentDate = new Date(`${paymentDate}T12:00:00`).toISOString()
            const paymentMonth = safePaymentDate.slice(0, 7)
            
            // Create transaction
            const { data: txData, error: txError } = await supabase.from('transactions').insert({
                title: selectedPaymentBill.name,
                amount: amountNum,
                type: isIncome ? 'pemasukan' : 'pengeluaran',
                category: selectedPaymentBill.category,
                wallet_id: selectedWalletId,
                date: safePaymentDate,
                created_at: new Date().toISOString()
            }).select().single()
            
            if (txError) throw txError
            if (!txData) throw new Error('Transaction created but no data returned')
            
            // Update saldo: pemasukan tambah, pengeluaran kurang
            const newBalance = isIncome
                ? freshBalance + amountNum
                : freshBalance - amountNum

            await supabase.from('wallets').update({ balance: newBalance }).eq('id', selectedWalletId)
            
            // Mark as done this month
            await supabase.from('bill_payments').insert({
                bill_id: selectedPaymentBill.id,
                month: paymentMonth,
                paid_at: new Date().toISOString(),
                transaction_id: txData.id
            })
            
            showToast('success', isIncome ? 'Pemasukan berhasil dicatat! 🎉' : 'Tagihan berhasil dibayar!')
            
            if (onUpdate) onUpdate()
            
            await fetchBills()
            await fetchWallets()
            await checkBillPayments()
            
            setShowPaymentModal(false)
        } catch (error) {
            console.error(error)
            showToast('error', isIncome ? 'Gagal mencatat pemasukan' : 'Gagal membayar tagihan')
        } finally {
            setPayingBillId(null)
        }
    }

    const getStatus = (dueDate: number) => {
        const today = new Date().getDate()
        const daysLeft = dueDate - today
        
        let status = 'upcoming'
        let color = 'bg-gray-100 text-gray-600'
        let text = `Tgl ${dueDate}`

        if (daysLeft >= 0 && daysLeft <= 3) {
            status = 'soon'
            color = 'bg-yellow-100 text-yellow-700'
            text = daysLeft === 0 ? 'Hari ini!' : `${daysLeft} hari lagi`
        } else if (daysLeft < 0) {
            status = 'past'
            color = 'bg-green-100 text-green-700' 
            text = 'Selesai bulan ini'
        }

        return { status, color, text }
    }

    // Split bills by type
    const tagihan = bills.filter(b => (b.type ?? 'pengeluaran') === 'pengeluaran')
    const pemasukan = bills.filter(b => b.type === 'pemasukan')
    const activeBills = activeTab === 'pemasukan' ? pemasukan : tagihan

    const sortedBills = [...activeBills]
        .filter(bill => !billPayments[bill.id])
        .sort((a, b) => {
            const today = new Date().getDate()
            const getEffectiveDate = (day: number) => day < today ? day + 31 : day
            return getEffectiveDate(a.due_date) - getEffectiveDate(b.due_date)
        })
    
    // Urgent: tagihan pengeluaran saja yang hitung urgent alert
    const urgentBillsCount = tagihan.filter(b => {
        if (billPayments[b.id]) return false
        const today = new Date().getDate()
        const diff = b.due_date - today
        return diff >= 0 && diff <= 3
    }).length

    // Pending income this month
    const pendingIncomeCount = pemasukan.filter(b => !billPayments[b.id]).length

    return (
        <div className="bg-white dark:bg-[var(--bg-card)] rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-[var(--border-default)]">
            <div className="flex justify-between items-center mb-5">
                <div>
                    <h2 className="text-xl font-bold flex items-center gap-2 text-slate-800 dark:text-[var(--text-primary)]">
                        Rutin Bulanan
                        {urgentBillsCount > 0 && (
                            <span className="flex h-3 w-3 relative">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                            </span>
                        )}
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-slate-400">Tagihan & pemasukan berulang</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="p-2 bg-blue-50 dark:bg-blue-950/30 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors"
                >
                    <Plus size={20} />
                </button>
            </div>

            {/* Tab Switcher */}
            <div className="flex gap-2 mb-5 p-1 bg-slate-100 dark:bg-[var(--bg-elevated)] rounded-2xl">
                <button
                    onClick={() => setActiveTab('pengeluaran')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-sm font-bold transition-all ${
                        activeTab === 'pengeluaran'
                            ? 'bg-white dark:bg-[var(--bg-card)] text-rose-600 shadow-sm'
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
                    }`}
                >
                    <TrendingDown size={15} />
                    Tagihan
                    {tagihan.length > 0 && (
                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                            activeTab === 'pengeluaran' ? 'bg-rose-100 text-rose-600' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                        }`}>
                            {tagihan.length}
                        </span>
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('pemasukan')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-sm font-bold transition-all ${
                        activeTab === 'pemasukan'
                            ? 'bg-white dark:bg-[var(--bg-card)] text-emerald-600 shadow-sm'
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
                    }`}
                >
                    <TrendingUp size={15} />
                    Pemasukan
                    {pendingIncomeCount > 0 && (
                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                            activeTab === 'pemasukan' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                        }`}>
                            {pendingIncomeCount}
                        </span>
                    )}
                </button>
            </div>

            {/* Urgent Alert — only for Tagihan tab */}
            {activeTab === 'pengeluaran' && urgentBillsCount > 0 && (
                <div className="mb-4 bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800/30 rounded-xl p-3 flex items-start gap-3">
                    <AlertTriangle className="text-yellow-600 shrink-0 mt-0.5" size={18} />
                    <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                        Ada {urgentBillsCount} tagihan yang harus dibayar segera!
                    </p>
                </div>
            )}

            {/* Pending Income Alert */}
            {activeTab === 'pemasukan' && pendingIncomeCount > 0 && (
                <div className="mb-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/30 rounded-xl p-3 flex items-start gap-3">
                    <TrendingUp className="text-emerald-600 shrink-0 mt-0.5" size={18} />
                    <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
                        Ada {pendingIncomeCount} pemasukan yang belum diterima bulan ini!
                    </p>
                </div>
            )}

            <div className="space-y-3">
                {loading ? (
                    <div className="text-center py-8 text-gray-500">Memuat...</div>
                ) : activeBills.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 dark:text-slate-500 text-sm">
                        {activeTab === 'pemasukan'
                            ? 'Belum ada pemasukan rutin. Tap + untuk tambah!'
                            : 'Belum ada tagihan rutin. Tap + untuk tambah!'
                        }
                    </div>
                ) : (
                    <>
                        {/* Unpaid / Unreceived Items */}
                        {sortedBills.map((bill) => {
                            const { color, text, status } = getStatus(bill.due_date)
                            const isIncome = isPemasukan(bill)
                            return (
                                <div key={bill.id} className="group flex flex-col sm:flex-row sm:items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-[var(--bg-elevated)] rounded-2xl transition-all border border-transparent hover:border-slate-100 dark:border-[var(--border-default)] gap-3 sm:gap-4 overflow-hidden">
                                    <div className="flex items-center gap-4 flex-1 min-w-0">
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${
                                            isIncome
                                                ? (status === 'soon' ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600' : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-500')
                                                : (status === 'soon' ? 'bg-rose-100 dark:bg-rose-950/40 text-rose-600' : 'bg-blue-50 dark:bg-blue-950/30 text-blue-600')
                                        }`}>
                                            {isIncome ? <TrendingUp size={20} /> : <Calendar size={20} />}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <h4 className="font-bold text-slate-800 dark:text-[var(--text-primary)] text-base">{bill.name}</h4>
                                            <p className={`text-sm font-semibold whitespace-nowrap ${isIncome ? 'text-emerald-600' : 'text-slate-500 dark:text-slate-400'}`}>
                                                {isIncome ? '+' : ''}Rp {bill.amount.toLocaleString('id-ID')}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 pl-[3.25rem] sm:pl-0">
                                        <span className={`px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap ${color}`}>
                                            {text}
                                        </span>
                                        
                                        <div className="flex items-center gap-1">
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    handlePayBill(bill)
                                                }}
                                                disabled={payingBillId === bill.id}
                                                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm text-white ${
                                                    payingBillId === bill.id 
                                                        ? 'bg-slate-200 cursor-wait' 
                                                        : isIncome
                                                            ? 'bg-emerald-500 hover:bg-emerald-600 active:scale-95'
                                                            : 'bg-[var(--primary)] hover:bg-blue-700 active:scale-95'
                                                }`}
                                            >
                                                {payingBillId === bill.id ? (
                                                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                ) : (
                                                    isIncome ? 'Terima' : 'Bayar'
                                                )}
                                            </button>
                                            
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); handleEdit(bill) }}
                                                className="p-2 text-slate-400 dark:text-slate-500 hover:text-[var(--primary)] hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-xl transition-all active:scale-95"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                                            </button>
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); handleDelete(bill.id) }}
                                                disabled={deletingId === bill.id}
                                                className={`p-2 rounded-xl transition-all active:scale-95 ${deletingId === bill.id ? 'bg-rose-50 dark:bg-rose-950/30 cursor-wait' : 'text-slate-400 dark:text-slate-500 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30'}`}
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
                        })}

                        {/* Completed Items This Month */}
                        {activeBills.filter(b => billPayments[b.id]).length > 0 && (
                            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-[var(--border-default)]">
                                <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 mb-3 uppercase tracking-wide">
                                    {activeTab === 'pemasukan' ? '✅ Sudah diterima bulan ini' : '✅ Sudah dibayar bulan ini'}
                                </p>
                                {activeBills.filter(b => billPayments[b.id]).map(bill => (
                                    <div key={bill.id} className="flex items-center justify-between p-3 rounded-xl opacity-60">
                                        <div className="flex items-center gap-3">
                                            <CheckCircle2 size={16} className={isPemasukan(bill) ? 'text-emerald-500' : 'text-emerald-500'} />
                                            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">{bill.name}</span>
                                        </div>
                                        <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                                            Rp {bill.amount.toLocaleString('id-ID')}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>

            <AddBillModal 
                isOpen={isModalOpen} 
                onClose={handleCloseModal} 
                onSuccess={handleSuccess}
                initialData={selectedBill}
            />

            {/* Payment / Receive Modal */}
            {showPaymentModal && selectedPaymentBill && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowPaymentModal(false)}></div>
                    <div className="bg-white dark:bg-[var(--bg-card)] rounded-2xl w-full max-w-md shadow-2xl z-50 p-6 relative animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold text-slate-800 dark:text-[var(--text-primary)]">
                                {isPemasukan(selectedPaymentBill) ? 'Terima Pemasukan' : 'Bayar Tagihan'}
                            </h3>
                            <button 
                                onClick={() => setShowPaymentModal(false)}
                                className="p-2 bg-slate-100 dark:bg-[var(--bg-hover)] hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-slate-500 dark:text-slate-400 transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        
                        <div className={`border rounded-xl p-3 mb-5 ${
                            isPemasukan(selectedPaymentBill)
                                ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-100 dark:border-emerald-800/30'
                                : 'bg-blue-50 dark:bg-blue-950/30 border-blue-100 dark:border-blue-800/30'
                        }`}>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                {isPemasukan(selectedPaymentBill) ? 'Pemasukan' : 'Tagihan'}
                            </p>
                            <p className="text-lg font-bold text-slate-800 dark:text-[var(--text-primary)]">{selectedPaymentBill.name}</p>
                        </div>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                                    {isPemasukan(selectedPaymentBill) ? 'Jumlah Diterima (Rp)' : 'Jumlah Pembayaran (Rp)'}
                                </label>
                                <MoneyInput
                                    value={paymentAmount}
                                    onChange={setPaymentAmount}
                                    placeholder={selectedPaymentBill.amount.toString()}
                                />
                                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                                    Default: Rp {selectedPaymentBill.amount.toLocaleString('id-ID')}
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                                    Tanggal
                                </label>
                                <input
                                    type="date"
                                    className="w-full p-3 bg-slate-50 dark:bg-[var(--bg-elevated)] border border-slate-200 dark:border-[var(--border-default)] rounded-xl focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent outline-none"
                                    value={paymentDate}
                                    onChange={(e) => setPaymentDate(e.target.value)}
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                                    {isPemasukan(selectedPaymentBill) ? 'Masuk ke Dompet' : 'Bayar dari Dompet'}
                                </label>
                                <select
                                    className="w-full p-3 bg-slate-50 dark:bg-[var(--bg-elevated)] border border-slate-200 dark:border-[var(--border-default)] rounded-xl focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent outline-none"
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
                                className="flex-1 py-3 bg-slate-100 dark:bg-[var(--bg-hover)] text-slate-700 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                            >
                                Batal
                            </button>
                            <button
                                onClick={handleConfirmPayment}
                                disabled={!selectedWalletId || !paymentAmount || payingBillId !== null}
                                className={`flex-1 py-3 text-white font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
                                    isPemasukan(selectedPaymentBill)
                                        ? 'bg-emerald-500 hover:bg-emerald-600'
                                        : 'bg-blue-600 hover:bg-blue-700'
                                }`}
                            >
                                {payingBillId ? (
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto"></div>
                                ) : (
                                    isPemasukan(selectedPaymentBill) ? 'Terima' : 'Bayar'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

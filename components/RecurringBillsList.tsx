'use client'

import { useState, useEffect, useRef } from 'react'
import { Plus, Trash2, Calendar, AlertTriangle, CheckCircle2, X, TrendingDown, TrendingUp, MoreVertical, Edit2 } from 'lucide-react'
import { RecurringBill, Wallet } from '@/types'
import { getRecurringBills, deleteRecurringBill } from '@/lib/recurring-bills'
import { useConfirm } from '@/hooks/useConfirm'
import { useToast } from '@/hooks/useToast'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import MoneyInput from './MoneyInput'
import NeoSelect from './NeoSelect'
import DatePickerNeo from './DatePickerNeo'

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
    
    const router = useRouter()

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
    const [openDropdownId, setOpenDropdownId] = useState<number | null>(null)

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = () => setOpenDropdownId(null)
        window.addEventListener('click', handleClickOutside)
        return () => window.removeEventListener('click', handleClickOutside)
    }, [])

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
        router.push(`/recurring?edit=${bill.id}`)
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
        if (payingBillId !== null) return
        
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
            color = 'bg-rose-100 dark:bg-rose-950/40 text-rose-600' 
            text = 'Terlewat'
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
        <div className="brutal-card p-6 bg-[var(--bg-card)]">
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
                    onClick={() => router.push('/recurring')}
                    className="p-2 brutal-btn bg-[var(--neo-yellow-vivid)] text-[var(--neo-ink)]"
                >
                    <Plus size={20} className="stroke-[3px]" />
                </button>
            </div>

            {/* Tab Switcher */}
            <div className="flex gap-2 mb-5">
                <button
                    onClick={() => setActiveTab('pengeluaran')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-[12px] text-sm font-black transition-all border-[3px] ${
                        activeTab === 'pengeluaran'
                            ? 'bg-[var(--neo-yellow-vivid)] border-[var(--neo-ink)] text-[var(--neo-ink)] shadow-[2px_2px_0_var(--neo-ink)]'
                            : 'bg-[var(--bg-elevated)] border-transparent text-[var(--text-primary)] hover:border-[var(--neo-ink)]'
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
                    className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-[12px] text-sm font-black transition-all border-[3px] ${
                        activeTab === 'pemasukan'
                            ? 'bg-[var(--neo-yellow-vivid)] border-[var(--neo-ink)] text-[var(--neo-ink)] shadow-[2px_2px_0_var(--neo-ink)]'
                            : 'bg-[var(--bg-elevated)] border-transparent text-[var(--text-primary)] hover:border-[var(--neo-ink)]'
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
                                <div key={bill.id} className={`group relative flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-[var(--bg-card)] rounded-[14px] border-[3px] border-[var(--neo-ink)] shadow-[4px_4px_0_var(--neo-ink)] mb-3 hover:translate-y-[-2px] hover:shadow-[6px_6px_0_var(--neo-ink)] transition-all gap-3 sm:gap-4 ${openDropdownId === bill.id ? 'z-50' : 'z-10'}`}>
                                    <div className="flex items-center gap-4 flex-1 min-w-0">
                                        <div className={`w-12 h-12 rounded-[10px] border-[2px] border-[var(--neo-ink)] flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${
                                            isIncome
                                                ? (status === 'soon' ? 'bg-[var(--neo-yellow-vivid)] text-[var(--neo-ink)]' : 'bg-emerald-100 text-[var(--neo-ink)]')
                                                : (status === 'soon' ? 'bg-[var(--neo-yellow-vivid)] text-[var(--neo-ink)]' : 'bg-blue-100 text-[var(--neo-ink)]')
                                        }`}>
                                            {isIncome ? <TrendingUp size={20} className="stroke-[2.5px]" /> : <Calendar size={20} className="stroke-[2.5px]" />}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <h4 className="font-bold text-slate-800 dark:text-[var(--text-primary)] text-base break-words leading-tight mb-1">{bill.name}</h4>
                                            <p className={`text-sm font-semibold whitespace-nowrap ${isIncome ? 'text-emerald-600' : 'text-slate-500 dark:text-slate-400'}`}>
                                                {isIncome ? '+' : ''}Rp {bill.amount.toLocaleString('id-ID')}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 pl-[3.25rem] sm:pl-0">
                                        <span className={`px-3 py-1 rounded-[8px] text-xs font-black whitespace-nowrap border-2 border-[var(--neo-ink)] ${color}`}>
                                            {text}
                                        </span>
                                        
                                        <div className="relative flex items-center gap-2">
                                            {/* Primary Action Button (Optional, can keep outside for quick access) */}
                                            {/* We keep "Bayar" outside if we want, but user requested 1 entry point. */}
                                            {/* So let's put it all inside the dropdown. */}
                                            
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    setOpenDropdownId(openDropdownId === bill.id ? null : bill.id)
                                                }}
                                                className="p-2 brutal-btn bg-white hover:bg-slate-100"
                                            >
                                                <MoreVertical size={18} className="stroke-[2.5px]" />
                                            </button>

                                            {openDropdownId === bill.id && (
                                                <div 
                                                    className="absolute right-0 top-[110%] mt-1 bg-[var(--bg-card)] border-[2.5px] border-[var(--neo-ink)] shadow-[4px_4px_0_var(--neo-ink)] rounded-[12px] p-2 z-20 flex flex-col gap-1 min-w-[140px] animate-in slide-in-from-top-2"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <button 
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            setOpenDropdownId(null)
                                                            handlePayBill(bill)
                                                        }}
                                                        disabled={payingBillId === bill.id}
                                                        className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-black transition-colors hover:bg-slate-100 flex items-center justify-between ${
                                                            isIncome ? 'text-emerald-600' : 'text-slate-800 dark:text-[var(--text-primary)]'
                                                        }`}
                                                    >
                                                        {payingBillId === bill.id ? 'Loading...' : (isIncome ? 'Terima Dana' : 'Bayar Tagihan')}
                                                        {payingBillId === bill.id && <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"></div>}
                                                    </button>
                                                    <div className="w-full h-px bg-slate-200 dark:bg-slate-700/50 my-1"></div>
                                                    <button 
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            setOpenDropdownId(null)
                                                            handleEdit(bill)
                                                        }}
                                                        className="w-full text-left px-3 py-2 rounded-lg text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between"
                                                    >
                                                        Edit
                                                        <Edit2 size={14} className="opacity-70" />
                                                    </button>
                                                    <button 
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            setOpenDropdownId(null)
                                                            handleDelete(bill.id)
                                                        }}
                                                        disabled={deletingId === bill.id}
                                                        className="w-full text-left px-3 py-2 rounded-lg text-sm font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center justify-between"
                                                    >
                                                        {deletingId === bill.id ? 'Loading...' : 'Hapus'}
                                                        {deletingId === bill.id ? (
                                                            <div className="w-3 h-3 border-2 border-rose-600 border-t-transparent rounded-full animate-spin"></div>
                                                        ) : (
                                                            <Trash2 size={14} className="opacity-70" />
                                                        )}
                                                    </button>
                                                </div>
                                            )}
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
                                    <div key={bill.id} className="flex items-center justify-between p-3 rounded-[12px] border-2 border-[var(--neo-ink)] border-dashed opacity-60 mb-2">
                                        <div className="flex items-center gap-3">
                                            <CheckCircle2 size={16} className={isPemasukan(bill) ? 'text-[var(--neo-ink)]' : 'text-[var(--neo-ink)]'} />
                                            <span className="text-sm font-bold text-[var(--text-primary)]">{bill.name}</span>
                                        </div>
                                        <span className="text-sm font-bold text-[var(--text-primary)]">
                                            Rp {bill.amount.toLocaleString('id-ID')}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Payment / Receive Modal */}
            {showPaymentModal && selectedPaymentBill && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowPaymentModal(false)}></div>
                    <div className="brutal-card w-full max-w-md z-50 p-6 relative animate-in zoom-in-95 duration-200 bg-[var(--bg-card)]">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold text-slate-800 dark:text-[var(--text-primary)]">
                                {isPemasukan(selectedPaymentBill) ? 'Terima Pemasukan' : 'Bayar Tagihan'}
                            </h3>
                            <button 
                                onClick={() => setShowPaymentModal(false)}
                                className="flex items-center justify-center p-2 rounded-xl bg-[#ffd84d] border-2 border-[#141414] shadow-[2px_2px_0_#141414] hover:-translate-y-[1px] hover:shadow-[3px_3px_0_#141414] active:translate-y-[2px] active:translate-x-[2px] active:shadow-none transition-all"
                            >
                                <X className="w-5 h-5 text-[#141414]" strokeWidth={3} />
                            </button>
                        </div>
                        
                        <div className={`border-[3px] border-[var(--neo-ink)] shadow-[2px_2px_0_var(--neo-ink)] rounded-[12px] p-3 mb-5 ${
                            isPemasukan(selectedPaymentBill)
                                ? 'bg-emerald-100 text-[var(--neo-ink)]'
                                : 'bg-[var(--neo-yellow-vivid)] text-[var(--neo-ink)]'
                        }`}>
                            <p className="text-sm font-bold opacity-80">
                                {isPemasukan(selectedPaymentBill) ? 'Pemasukan' : 'Tagihan'}
                            </p>
                            <p className="text-lg font-black">{selectedPaymentBill.name}</p>
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
                                <label className="neo-label mb-2 block">
                                    Tanggal
                                </label>
                                <DatePickerNeo
                                    className="w-full p-3 bg-[var(--bg-card)] border-[3px] border-[var(--neo-ink)] shadow-[4px_4px_0_var(--neo-ink)] rounded-[12px] focus:translate-y-[-2px] focus:shadow-[6px_6px_0_var(--neo-ink)] transition-all outline-none font-bold"
                                    value={paymentDate}
                                    onChange={(e) => setPaymentDate(e.target.value)}
                                />
                            </div>
                            
                            <div>
                                <label className="neo-label mb-2 block">
                                    {isPemasukan(selectedPaymentBill) ? 'Masuk ke Dompet' : 'Bayar dari Dompet'}
                                </label>
                                <NeoSelect
                                    className="w-full p-3 bg-[var(--bg-card)] border-[3px] border-[var(--neo-ink)] shadow-[4px_4px_0_var(--neo-ink)] rounded-[12px] font-bold transition-all hover:translate-y-[-2px] hover:shadow-[6px_6px_0_var(--neo-ink)]"
                                    value={selectedWalletId ? selectedWalletId.toString() : ''}
                                    onChange={(val) => setSelectedWalletId(Number(val))}
                                    placeholder="Pilih Dompet"
                                    options={wallets.map(w => ({
                                        label: `${w.name} - Rp ${w.balance.toLocaleString('id-ID')}`,
                                        value: w.id.toString()
                                    }))}
                                />
                            </div>
                        </div>
                        
                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setShowPaymentModal(false)}
                                className="flex-1 py-3 brutal-btn bg-white"
                            >
                                Batal
                            </button>
                            <button
                                onClick={handleConfirmPayment}
                                disabled={!selectedWalletId || !paymentAmount || payingBillId !== null}
                                className={`flex-1 py-3 brutal-btn font-black text-[var(--neo-ink)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
                                    isPemasukan(selectedPaymentBill)
                                        ? 'bg-emerald-300'
                                        : 'bg-[var(--neo-yellow-vivid)]'
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

'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Budget, Transaction, CATEGORIES, Wallet, CustomCategoryDef } from '@/types'
import { Plus, Trash2, Pencil, AlertCircle, X, Wallet as WalletIcon, ChevronLeft, ChevronRight, Settings, Calendar } from 'lucide-react'
import MoneyInput from '@/components/MoneyInput'
import { useToast } from '@/hooks/useToast'
import { useConfirm } from '@/hooks/useConfirm'
import { useSuccessModal } from '@/hooks/useSuccessModal'

export default function BudgetsPage() {
    const [budgets, setBudgets] = useState<Budget[]>([])
    const [customCategories, setCustomCategories] = useState<{pengeluaran: (string | CustomCategoryDef)[], pemasukan: (string | CustomCategoryDef)[]}>({pengeluaran: [], pemasukan: []})
    const [transactions, setTransactions] = useState<Transaction[]>([])
    const [wallets, setWallets] = useState<Wallet[]>([])
    const [loading, setLoading] = useState(true)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [currentDate, setCurrentDate] = useState(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('budget_currentDate')
            if (saved) return new Date(saved)
        }
        return new Date()
    })
    const [filterMode, setFilterMode] = useState<'monthly' | 'custom'>(() => {
        if (typeof window !== 'undefined') {
            return (localStorage.getItem('budget_filterMode') as 'monthly' | 'custom') || 'monthly'
        }
        return 'monthly'
    })
    const [customRange, setCustomRange] = useState(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('budget_customRange')
            if (saved) return JSON.parse(saved)
        }
        return {
            start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
            end: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0]
        }
    })
    const [showSettings, setShowSettings] = useState(false)

    const { showToast } = useToast()
    const { showConfirm } = useConfirm()
    const { showSuccess } = useSuccessModal()

    // Form State
    const [editingId, setEditingId] = useState<number | null>(null)
    const [category, setCategory] = useState('')
    const [amount, setAmount] = useState('')

    // Quick Expense State
    const [isQuickExpModalOpen, setIsQuickExpModalOpen] = useState(false)
    const [quickExpCategory, setQuickExpCategory] = useState('')
    const [quickExpAmount, setQuickExpAmount] = useState('')
    const [quickExpWalletId, setQuickExpWalletId] = useState('')

    // Persist filter settings to localStorage whenever they change
    useEffect(() => {
        localStorage.setItem('budget_filterMode', filterMode)
    }, [filterMode])

    useEffect(() => {
        localStorage.setItem('budget_customRange', JSON.stringify(customRange))
    }, [customRange])

    useEffect(() => {
        localStorage.setItem('budget_currentDate', currentDate.toISOString())
    }, [currentDate])

    useEffect(() => {
        fetchData()
        fetchWallets()
    }, [currentDate, filterMode, customRange])

    const fetchWallets = async () => {
        const { data } = await supabase.from('wallets').select('*')
        if (data) setWallets(data)
    }

    const fetchData = async () => {
        setLoading(true)

        const { data: settings } = await supabase.from('user_settings').select('*').eq('id', 1).single()
        if (settings && settings.custom_categories) {
            try {
                setCustomCategories(settings.custom_categories as {pengeluaran: (string | CustomCategoryDef)[], pemasukan: (string | CustomCategoryDef)[]})
            } catch(e) {}
        }
        if (settings && settings.filter_mode && filterMode === 'monthly') {
            // Default to user setting initially if not already changed
            // setFilterMode(settings.filter_mode as 'monthly' | 'custom')
        }

        let targetDate = currentDate
        let startIso: string
        let endIso: string

        if (filterMode === 'monthly') {
            startIso = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString()
            endIso = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59).toISOString()
        } else {
            const sd = new Date(customRange.start)
            sd.setHours(0, 0, 0, 0)
            startIso = sd.toISOString()

            const ed = new Date(customRange.end)
            ed.setHours(23, 59, 59, 999)
            endIso = ed.toISOString()
            targetDate = new Date(customRange.end)
        }

        // 1. Get Budgets for the target month
        const monthStr = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}-01`

        const { data: bData, error: bError } = await supabase
            .from('budgets')
            .select('*')
            .eq('month', monthStr)

        if (bError) showToast('error', 'Gagal memuat budget')

        // 2. Get Transactions for progress
        const { data: tData } = await supabase
            .from('transactions')
            .select('*')
            .gte('date', startIso)
            .lte('date', endIso)
            .eq('type', 'pengeluaran')

        if (bData) setBudgets(bData)
        if (tData) setTransactions(tData as unknown as Transaction[])

        setLoading(false)
    }

    const resetForm = () => {
        setCategory('')
        setAmount('')
        setEditingId(null)
        setIsModalOpen(false)
    }

    const resetQuickExpForm = () => {
        setQuickExpCategory('')
        setQuickExpAmount('')
        setQuickExpWalletId('')
        setIsQuickExpModalOpen(false)
    }

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!category || !amount) return showToast('error', "Mohon lengkapi data")

        const monthStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-01`

        const payload = {
            category,
            amount: parseFloat(amount),
            month: monthStr
        }

        let error
        if (editingId) {
            const res = await supabase.from('budgets').update(payload).eq('id', editingId)
            error = res.error
        } else {
            const existing = budgets.find(b => b.category === category)
            if (existing) {
                return showToast('error', `Budget untuk kategori ${category} sudah ada bulan ini.`)
            }

            const res = await supabase.from('budgets').insert([payload])
            error = res.error
        }

        if (error) {
            console.error(error)
            showToast('error', "Gagal menyimpan budget")
        } else {
            fetchData()
            resetForm()
            showSuccess({
                type: editingId ? 'edit' : 'create',
                message: editingId ? 'Budget berhasil diperbarui!' : 'Budget baru berhasil ditambahkan!'
            })
        }
    }

    const handleQuickExpenseSave = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!quickExpAmount || !quickExpWalletId) return showToast('error', "Mohon lengkapi data")

        const wallet = wallets.find(w => w.id === parseInt(quickExpWalletId))
        if (!wallet) return showToast('error', "Dompet tidak ditemukan")

        if (wallet.balance < parseFloat(quickExpAmount)) {
            return showToast('error', "Saldo dompet tidak mencukupi")
        }

        // 1. Insert Transaction
        const payload = {
            title: `Pengeluaran ${quickExpCategory}`,
            amount: parseFloat(quickExpAmount),
            type: 'pengeluaran',
            category: quickExpCategory,
            wallet_id: parseInt(quickExpWalletId),
            date: new Date().toISOString(),
            created_at: new Date().toISOString()
        }

        const { error: txError } = await supabase.from('transactions').insert([payload])

        if (txError) {
            console.error(txError)
            return showToast('error', "Gagal menyimpan pengeluaran")
        }

        // 2. Update Wallet Balance
        const newBalance = wallet.balance - parseFloat(quickExpAmount)
        await supabase.from('wallets').update({ balance: newBalance }).eq('id', wallet.id)

        fetchData()
        fetchWallets() // Refresh wallet balances
        resetQuickExpForm()
        showSuccess({
            type: 'create',
            title: 'Pengeluaran Dicatat!',
            message: 'Pengeluaran cepat berhasil dicatat dan saldo dompet diperbarui.'
        })
    }

    const handleDelete = async (id: number) => {
        const confirm = await showConfirm({
            title: 'Hapus Budget?',
            message: 'Yakin ingin menghapus budget ini?'
        })
        if (!confirm) return
        const { error } = await supabase.from('budgets').delete().eq('id', id)
        if (!error) {
            fetchData()
            showSuccess({
                type: 'delete',
                message: 'Budget berhasil dihapus dari daftar.'
            })
        } else {
            showToast('error', 'Gagal menghapus budget')
        }
    }

    const handleEdit = (b: Budget) => {
        setEditingId(b.id)
        setCategory(b.category)
        setAmount(b.amount.toString())
        setIsModalOpen(true)
    }

    const openQuickExp = (cat: string) => {
        setQuickExpCategory(cat)
        setQuickExpAmount('')
        setQuickExpWalletId('')
        setIsQuickExpModalOpen(true)
    }

    // Calculations
    const getSpentAmount = (cat: string) => {
        return transactions.filter(t => t.category === cat).reduce((acc, curr) => acc + curr.amount, 0)
    }

    const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
    const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))

    const getPeriodLabel = () => {
        if (filterMode === 'monthly') {
            return currentDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
        } else {
            const start = new Date(customRange.start)
            const end = new Date(customRange.end)
            return `${start.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} - ${end.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}`
        }
    }

    return (
        <main className="flex-1 bg-[#F9FAFB] min-h-screen overflow-x-hidden transition-all duration-300">
            {/* Top Header */}
            <div className="flex items-center justify-between w-full h-[70px] md:h-[90px] shrink-0 border-b border-[#F3F4F3] bg-white px-5 md:px-8">
                <div>
                     <h2 className="font-bold text-2xl text-[#080C1A]">Manajemen Budget</h2>
                </div>
                 <div className="hidden md:flex items-center gap-3 pl-3 border-l border-[#F3F4F3] ml-auto">
                    <div className="text-right">
                        <p className="font-semibold text-[#080C1A] text-sm">Eko Budi</p>
                    </div>
                    <div className="w-11 h-11 bg-slate-200 rounded-full flex items-center justify-center text-slate-500 font-bold border-2 border-white shadow-sm">
                        EB
                    </div>
                </div>
            </div>

            <div className="relative min-h-[calc(100vh-90px)]">

                {/* Control Bar - Filter UI */}
                <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 mx-4 md:mx-8 mt-6 rounded-2xl border border-[#F3F4F3] shadow-sm">
                    <div className="flex w-full md:w-auto items-center gap-2 bg-slate-50 p-1 rounded-xl">
                        {filterMode === 'monthly' && (
                            <button
                                onClick={prevMonth}
                                className="p-2 hover:bg-white hover:shadow-sm rounded-lg text-slate-400 hover:text-[#165DFF] transition-all"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                        )}
                        <div className="flex-1 flex items-center justify-center gap-2 px-4 py-1.5 min-w-[140px]">
                            <Calendar className="w-4 h-4 text-[#165DFF]" />
                            <span className="font-bold text-[#080C1A] whitespace-nowrap text-center text-sm">
                                {getPeriodLabel()}
                            </span>
                        </div>
                         {filterMode === 'monthly' && (
                            <button
                                onClick={nextMonth}
                                className="p-2 hover:bg-white hover:shadow-sm rounded-lg text-slate-400 hover:text-[#165DFF] transition-all"
                            >
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        )}
                    </div>

                    <div className="flex w-full md:w-auto items-center gap-2">
                        <button
                            onClick={() => setShowSettings(!showSettings)}
                            className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold transition-all ${showSettings ? 'bg-[#165DFF] text-white shadow-lg shadow-blue-500/30' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
                        >
                            <Settings className="w-4 h-4" />
                            <span>Filter</span>
                        </button>
                    </div>
                </div>

                {/* Settings Panel */}
                {showSettings && (
                    <>
                        <div
                            className="fixed inset-0 z-10"
                            onClick={() => setShowSettings(false)}
                        />
                        <div className="relative mx-4 md:mx-8 mt-2 z-20 w-auto md:max-w-sm md:ml-auto lg:absolute lg:right-8 lg:top-[90px] bg-white rounded-2xl shadow-xl border border-[#F3F4F3] p-5 animate-in fade-in zoom-in-95 duration-200">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="font-bold text-[#080C1A]">Pengaturan Filter</h3>
                                <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-slate-600">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="space-y-5">
                                <div className="space-y-3">
                                    <label className="text-xs font-bold text-[#6A7686] uppercase tracking-wider">Mode Tampilan</label>
                                    <div className="grid grid-cols-2 gap-2 bg-slate-50 p-1.5 rounded-xl">
                                        <button
                                            onClick={() => setFilterMode('monthly')}
                                            className={`px-3 py-2.5 rounded-lg text-sm font-bold transition-all ${filterMode === 'monthly' ? 'bg-white shadow-sm text-[#165DFF]' : 'text-slate-400 hover:text-slate-600'}`}
                                        >
                                            Bulanan
                                        </button>
                                        <button
                                            onClick={() => setFilterMode('custom')}
                                            className={`px-3 py-2.5 rounded-lg text-sm font-bold transition-all ${filterMode === 'custom' ? 'bg-white shadow-sm text-[#165DFF]' : 'text-slate-400 hover:text-slate-600'}`}
                                        >
                                            Custom
                                        </button>
                                    </div>
                                </div>

                                {filterMode === 'custom' && (
                                    <div className="space-y-4 pt-2 border-t border-[#F3F4F3]">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-[#6A7686]">Dari Tanggal</label>
                                            <input
                                                type="date"
                                                value={customRange.start}
                                                onChange={(e) => setCustomRange((prev: { start: string; end: string }) => ({ ...prev, start: e.target.value }))}
                                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#165DFF] transition-all font-bold text-[#080C1A]"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-[#6A7686]">Sampai Tanggal</label>
                                            <input
                                                type="date"
                                                value={customRange.end}
                                                onChange={(e) => setCustomRange((prev: { start: string; end: string }) => ({ ...prev, end: e.target.value }))}
                                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#165DFF] transition-all font-bold text-[#080C1A]"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                )}

                {/* ===== MOBILE VIEW ===== */}
                <div className="md:hidden pb-[80px]">
                    {loading ? (
                        <div className="flex items-center justify-center py-16">
                            <div className="w-6 h-6 border-2 border-[#165DFF] border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : (() => {
                        const totalBudget = budgets.reduce((acc, b) => acc + b.amount, 0)
                        const totalSpent = budgets.reduce((acc, b) => acc + getSpentAmount(b.category), 0)
                        const totalRemaining = Math.max(totalBudget - totalSpent, 0)
                        const overallPct = totalBudget > 0 ? Math.min(Math.round((totalSpent / totalBudget) * 100), 100) : 0
                        const isOverall = totalSpent > totalBudget

                        return (
                            <>
                                {/* Summary Card */}
                                <div className={`mx-4 mt-4 rounded-2xl p-5 relative overflow-hidden shadow-lg ${isOverall ? 'bg-gradient-to-br from-rose-500 to-rose-700 shadow-rose-500/25' : 'bg-gradient-to-br from-[#165DFF] to-[#0E4BD9] shadow-blue-500/25'}`}>
                                    <div className="absolute -top-6 -right-6 w-28 h-28 bg-white/5 rounded-full" />
                                    <div className="absolute -bottom-8 -left-4 w-36 h-36 bg-white/5 rounded-full" />
                                    <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest mb-1 relative z-10">
                                        {getPeriodLabel()}
                                    </p>
                                    <div className="flex items-end justify-between mb-3 relative z-10">
                                        <div>
                                            <p className="text-white/70 text-xs mb-0.5">Total Terpakai</p>
                                            <p className="text-white font-extrabold text-2xl">Rp {totalSpent.toLocaleString('id-ID')}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-white/70 text-xs mb-0.5">Total Budget</p>
                                            <p className="text-white font-bold text-base">Rp {totalBudget.toLocaleString('id-ID')}</p>
                                        </div>
                                    </div>
                                    {/* Overall progress */}
                                    <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden mb-2 relative z-10">
                                        <div className="h-full rounded-full bg-white/80 transition-all duration-500" style={{ width: `${overallPct}%` }} />
                                    </div>
                                    <div className="flex items-center justify-between relative z-10">
                                        <p className="text-white/70 text-[11px]">Sisa: <span className="text-white font-bold">Rp {totalRemaining.toLocaleString('id-ID')}</span></p>
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isOverall ? 'bg-white/20 text-white' : 'bg-white/20 text-white'}`}>
                                            {overallPct}% terpakai
                                        </span>
                                    </div>
                                </div>

                                {/* Info Bar */}
                                <div className="flex items-center justify-between px-4 mt-5 mb-2">
                                    <p className="text-sm font-bold text-[#080C1A]">{budgets.length} kategori budget</p>
                                    <p className="text-[11px] text-[#6A7686]">Tap untuk edit / hapus / catat</p>
                                </div>

                                {/* Budget List */}
                                {budgets.length === 0 ? (
                                    <div className="mx-4 text-center py-10 text-slate-400 border-2 border-dashed border-[#F3F4F3] rounded-2xl bg-white">
                                        <p className="text-sm">Belum ada budget bulan ini.</p>
                                    </div>
                                ) : (
                                    <div className="mx-4 bg-white rounded-2xl border border-[#F3F4F3] shadow-sm overflow-hidden">
                                        {budgets.map((budget, idx) => {
                                            const spent = getSpentAmount(budget.category)
                                            const percent = Math.min((spent / budget.amount) * 100, 100)
                                            const isOver = spent > budget.amount
                                            const allCats = [
                                                ...CATEGORIES.pengeluaran,
                                                ...(customCategories.pengeluaran || []).map(c => typeof c === 'string' ? {name: c, color: 'bg-slate-100 text-slate-600'} : {name: c.name, color: c.color})
                                            ]
                                            const catColor = allCats.find(c => c.name === budget.category)?.color || 'bg-slate-100 text-slate-600'
                                            const isLast = idx === budgets.length - 1

                                            return (
                                                <div key={budget.id} className={`px-4 pt-3.5 pb-3 ${!isLast ? 'border-b border-[#F3F4F3]' : ''}`}>
                                                    {/* Top Row: Category badge + amounts */}
                                                    <div className="flex items-start justify-between mb-2">
                                                        <div className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider shrink-0 ${catColor}`}>
                                                            {budget.category}
                                                        </div>
                                                        <div className="text-right ml-2">
                                                            <p className="font-bold text-sm text-[#080C1A]">Rp {spent.toLocaleString('id-ID')}</p>
                                                            <p className="text-[11px] text-[#6A7686]">/ Rp {budget.amount.toLocaleString('id-ID')}</p>
                                                        </div>
                                                    </div>

                                                    {/* Progress bar */}
                                                    <div className="w-full h-1.5 bg-[#F3F4F3] rounded-full overflow-hidden mb-1.5">
                                                        <div
                                                            className={`h-full rounded-full transition-all duration-500 ${isOver ? 'bg-rose-500' : percent > 80 ? 'bg-orange-400' : 'bg-[#165DFF]'}`}
                                                            style={{ width: `${percent}%` }}
                                                        />
                                                    </div>

                                                    {/* Sisa / % */}
                                                    <div className="flex items-center justify-between mb-3">
                                                        {isOver ? (
                                                            <span className="text-[10px] font-bold text-rose-500 flex items-center gap-1">
                                                                <AlertCircle className="w-3 h-3" /> Over Budget!
                                                            </span>
                                                        ) : (
                                                            <span className="text-[10px] text-[#6A7686]">Sisa: Rp {Math.max(budget.amount - spent, 0).toLocaleString('id-ID')}</span>
                                                        )}
                                                        <span className="text-[10px] font-semibold text-[#6A7686]">{Math.round(percent)}%</span>
                                                    </div>

                                                    {/* Action Buttons — 3 columns like Goals */}
                                                    <div className="grid grid-cols-3 gap-2">
                                                        <button
                                                            onClick={() => handleEdit(budget)}
                                                            className="py-2 flex items-center justify-center gap-1.5 bg-slate-50 text-slate-600 font-bold rounded-xl text-xs hover:bg-slate-100 active:scale-95 transition-all"
                                                        >
                                                            <Pencil className="w-3.5 h-3.5" />
                                                            Edit
                                                        </button>
                                                        <button
                                                            onClick={() => openQuickExp(budget.category)}
                                                            className="py-2 flex items-center justify-center gap-1.5 bg-[#165DFF] text-white font-bold rounded-xl text-xs hover:bg-[#1455E5] active:scale-95 transition-all shadow-sm"
                                                        >
                                                            <Plus className="w-3.5 h-3.5" />
                                                            Catat
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(budget.id)}
                                                            className="py-2 flex items-center justify-center gap-1.5 bg-rose-50 text-rose-600 font-bold rounded-xl text-xs hover:bg-rose-100 active:scale-95 transition-all"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                            Hapus
                                                        </button>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}

                                {/* Tambah Budget Button */}
                                <button
                                    onClick={() => { resetForm(); setIsModalOpen(true); }}
                                    className="mx-4 mt-3 w-[calc(100%-2rem)] border-2 border-dashed border-[#E2E8F0] rounded-2xl p-4 flex items-center justify-center gap-3 text-slate-400 hover:text-[#165DFF] hover:border-[#165DFF] hover:bg-blue-50/30 transition-all active:scale-[0.98]"
                                >
                                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                                        <Plus className="w-4 h-4" />
                                    </div>
                                    <span className="font-bold text-sm">Buat Budget Baru</span>
                                </button>
                            </>
                        )
                    })()}
                </div>

                {/* ===== DESKTOP VIEW ===== */}
                <div className="hidden md:block p-8">
                    {loading ? (
                        <div className="text-center py-12 text-slate-400">Loading...</div>
                    ) : (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {budgets.map(budget => {
                                    const spent = getSpentAmount(budget.category)
                                    const percent = Math.min((spent / budget.amount) * 100, 100)
                                    const isOver = spent > budget.amount
                                    const allCats = [
                                        ...CATEGORIES.pengeluaran, 
                                        ...(customCategories.pengeluaran || []).map(c => typeof c === 'string' ? {name: c, color: 'bg-slate-100 text-slate-600'} : {name: c.name, color: c.color})
                                    ]
                                    const catColor = allCats.find(c => c.name === budget.category)?.color || 'bg-slate-100 text-slate-600'

                                    return (
                                        <div key={budget.id} className="bg-white p-6 pb-8 rounded-3xl border border-[#F3F4F3] hover:shadow-lg transition-all duration-300 group flex flex-col justify-between min-h-[320px] card-hover">
                                            <div>
                                                <div className="flex justify-between items-start mb-6">
                                                    <div className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${catColor}`}>
                                                        {budget.category}
                                                    </div>
                                                    <button onClick={() => handleDelete(budget.id)} className="p-3 bg-white/80 backdrop-blur-sm border border-slate-100 rounded-xl text-rose-500 hover:bg-rose-50 transition-all shadow-sm hover:shadow-md active:scale-95" title="Hapus">
                                                        <Trash2 className="w-5 h-5" />
                                                    </button>
                                                </div>

                                                <div className="mb-6">
                                                    <div className="flex justify-between items-end mb-2">
                                                        <p className="text-3xl font-extrabold text-[#080C1A]">Rp {spent.toLocaleString('id-ID')}</p>
                                                    </div>
                                                    <p className="text-sm font-medium text-[#6A7686] mb-3">
                                                        Limit: Rp {budget.amount.toLocaleString('id-ID')}
                                                    </p>
                                                    
                                                    {isOver && (
                                                        <div className="flex items-center gap-1.5 text-xs text-rose-600 font-bold mb-3 bg-rose-50 p-2 rounded-lg">
                                                            <AlertCircle className="w-3.5 h-3.5" /> 
                                                            <span>Over Budget!</span>
                                                        </div>
                                                    )}

                                                    <div className="w-full h-3 bg-[#F3F4F3] rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full transition-all duration-500 ${isOver ? 'bg-rose-500' : percent > 80 ? 'bg-orange-500' : 'bg-[#165DFF]'}`}
                                                            style={{ width: `${percent}%` }}
                                                        />
                                                    </div>
                                                    <p className="text-xs text-[#6A7686] mt-3 font-medium">
                                                        Sisa: <span className="text-[#080C1A]">Rp {Math.max(budget.amount - spent, 0).toLocaleString('id-ID')}</span>
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-3 pt-4 border-t border-[#F3F4F3]">
                                                <button
                                                    onClick={() => handleEdit(budget)}
                                                    className="py-3.5 bg-slate-50 text-slate-700 font-bold rounded-xl hover:bg-slate-100 transition-all shadow-sm hover:shadow-md active:scale-95 flex justify-center items-center gap-2 text-sm"
                                                >
                                                    <Pencil className="w-5 h-5" /> Edit
                                                </button>
                                                <button
                                                    onClick={() => openQuickExp(budget.category)}
                                                    className="py-3.5 bg-[#165DFF] !text-white font-bold rounded-xl hover:bg-[#1455E5] transition-all text-sm flex justify-center items-center gap-2 shadow-md hover:shadow-lg active:scale-95"
                                                >
                                                    <Plus className="w-5 h-5 !text-white" /> Catat
                                                </button>
                                            </div>
                                        </div>
                                    )
                                })}
                                
                                {/* Add New Card */}
                                <button
                                    onClick={() => { resetForm(); setIsModalOpen(true); }}
                                    className="border-2 border-dashed border-[#E2E8F0] rounded-2xl p-6 flex flex-col items-center justify-center gap-4 text-slate-400 hover:text-[#165DFF] hover:border-[#165DFF] hover:bg-blue-50/30 transition-all min-h-[320px] group"
                                >
                                    <div className="bg-[#F3F4F3] group-hover:bg-[#165DFF] p-4 rounded-full transition-colors">
                                        <Plus className="w-8 h-8 text-slate-500 group-hover:text-white transition-colors" />
                                    </div>
                                    <span className="font-bold text-sm">Buat Budget Baru</span>
                                </button>
                            </div>

                            {budgets.length === 0 && (
                                <div className="text-center py-12 text-slate-400 border-2 border-dashed border-[#F3F4F3] rounded-3xl bg-white">
                                    <p>Belum ada budget untuk bulan ini.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

            </div>

            {/* Main Modal (Add/Edit Budget) */}
             {isModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={resetForm}></div>
                    <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl z-50 p-6 relative animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-[#080C1A]">{editingId ? 'Edit Budget' : 'Tambah Budget'}</h3>
                            <button onClick={resetForm} className="p-2 bg-slate-50 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleSave} className="space-y-6">
                             <div>
                                <label className="block text-sm font-semibold text-[#080C1A] mb-3">Pilih Kategori</label>
                                <div className="grid grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                                    {[
                                        ...CATEGORIES.pengeluaran,
                                        ...(customCategories.pengeluaran || []).map(c => typeof c === 'string' ? {name: c, color: 'bg-slate-100 text-slate-600'} : {name: c.name, color: c.color})
                                    ].map(cat => (
                                        <button
                                            key={cat.name}
                                            type="button"
                                            onClick={() => setCategory(cat.name)}
                                            className={`p-3 rounded-xl text-xs font-bold uppercase tracking-wider border transition-all text-left flex items-center gap-2 ${category === cat.name ? `bg-blue-50 border-[#165DFF] text-[#165DFF] ring-1 ring-[#165DFF]` : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                        >
                                           <div className={`w-2 h-2 rounded-full ${cat.color.split(' ')[0].replace('bg-', 'bg-')}`}></div>
                                            {cat.name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-[#080C1A] mb-2">Batasan (Rp)</label>
                                <MoneyInput
                                    value={amount}
                                    onChange={setAmount}
                                />
                            </div>
                            <button type="submit" className="w-full bg-[#165DFF] hover:bg-[#1455E5] !text-white font-bold py-3.5 rounded-xl shadow-lg hover:shadow-xl transition-all active:scale-95 text-sm">
                                Simpan Budget
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Quick Expense Modal */}
            {isQuickExpModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={resetQuickExpForm}></div>
                    <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl z-50 relative animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-xl font-bold text-[#080C1A]">Catat Pengeluaran</h3>
                                <p className="text-sm text-slate-500 mt-1">Kategori: <span className="font-bold text-[#165DFF] bg-blue-50 px-2 py-0.5 rounded-md">{quickExpCategory}</span></p>
                            </div>
                            <button onClick={resetQuickExpForm} className="p-2 bg-slate-50 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleQuickExpenseSave} className="space-y-5">
                            <div>
                                <label className="block text-sm font-semibold text-[#080C1A] mb-2">Jumlah (Rp)</label>
                                <MoneyInput
                                    value={quickExpAmount}
                                    onChange={setQuickExpAmount}
                                    autoFocus
                                    className="focus:ring-[#165DFF]" 
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-[#080C1A] mb-2">Ambil dari Dompet</label>
                                <select
                                    className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#165DFF] focus:border-transparent outline-none text-sm font-medium text-[#080C1A]"
                                    value={quickExpWalletId}
                                    onChange={(e) => setQuickExpWalletId(e.target.value)}
                                    required
                                >
                                    <option value="" disabled>Pilih Dompet</option>
                                    {wallets.map(w => (
                                        <option key={w.id} value={w.id}>{w.name} (Rp {w.balance.toLocaleString('id-ID')})</option>
                                    ))}
                                </select>
                            </div>
                            <button type="submit" className="w-full bg-[#165DFF] hover:bg-[#1455E5] !text-white font-bold py-3.5 rounded-xl transition-all shadow-lg hover:shadow-xl active:scale-95 text-sm">
                                Simpan Pengeluaran
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </main>
    )
}

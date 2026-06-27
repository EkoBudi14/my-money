'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Budget, Transaction, CATEGORIES, Wallet, CustomCategoryDef } from '@/types'
import { Plus, Trash2, Pencil, AlertCircle, X, Wallet as WalletIcon, ChevronLeft, ChevronRight, Settings, Calendar, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import MoneyInput from '@/components/MoneyInput'
import { useToast } from '@/hooks/useToast'
import { useConfirm } from '@/hooks/useConfirm'
import { useSuccessModal } from '@/hooks/useSuccessModal'

export default function BudgetsPage() {
    const [budgets, setBudgets] = useState<Budget[]>([])
    const [customCategories, setCustomCategories] = useState<{ pengeluaran: (string | CustomCategoryDef)[], pemasukan: (string | CustomCategoryDef)[] }>({ pengeluaran: [], pemasukan: [] })
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
    const [budgetStartDate, setBudgetStartDate] = useState(() => {
        return new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
    })
    const [budgetEndDate, setBudgetEndDate] = useState(() => {
        return new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0]
    })

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
        fetchAllData()
    }, [currentDate, filterMode, customRange])

    const fetchAllData = async () => {
        setLoading(true)

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

        const targetStartDateStr = startIso.split('T')[0]
        const targetEndDateStr = endIso.split('T')[0]

        const [settingsRes, walletsRes, budgetsRes, transactionsRes] = await Promise.all([
            supabase.from('user_settings').select('*').eq('id', 1).single(),
            supabase.from('wallets').select('*'),
            supabase.from('budgets').select('*').lte('start_date', targetEndDateStr).gte('end_date', targetStartDateStr),
            supabase.from('transactions').select('*').gte('date', startIso).lte('date', endIso).eq('type', 'pengeluaran')
        ])

        if (settingsRes.data && settingsRes.data.custom_categories) {
            try {
                setCustomCategories(settingsRes.data.custom_categories as { pengeluaran: (string | CustomCategoryDef)[], pemasukan: (string | CustomCategoryDef)[] })
            } catch (e) { }
        }

        if (walletsRes.data) setWallets(walletsRes.data)
        
        if (budgetsRes.error) showToast('error', 'Gagal memuat budget')
        if (budgetsRes.data) setBudgets(budgetsRes.data)
        
        if (transactionsRes.data) setTransactions(transactionsRes.data as unknown as Transaction[])

        setLoading(false)
    }

    const resetForm = () => {
        setCategory('')
        setAmount('')
        setEditingId(null)

        let startD, endD
        if (filterMode === 'monthly') {
            startD = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString().split('T')[0]
            endD = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).toISOString().split('T')[0]
        } else {
            startD = customRange.start
            endD = customRange.end
        }
        setBudgetStartDate(startD)
        setBudgetEndDate(endD)

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
        if (!category || !amount || !budgetStartDate || !budgetEndDate) return showToast('error', "Mohon lengkapi data")

        if (new Date(budgetStartDate) > new Date(budgetEndDate)) {
            return showToast('error', "Tanggal mulai tidak boleh lebih dari tanggal selesai")
        }

        const payload = {
            category,
            amount: parseFloat(amount),
            start_date: budgetStartDate,
            end_date: budgetEndDate
        }

        let error
        if (editingId) {
            const res = await supabase.from('budgets').update(payload).eq('id', editingId)
            error = res.error
        } else {
            // Check duplicate overlap (query langsung dari DB)
            const { data: existingBudgets } = await supabase
                .from('budgets')
                .select('id')
                .eq('category', category)
                .lte('start_date', budgetEndDate)
                .gte('end_date', budgetStartDate)
                .limit(1)
            if (existingBudgets && existingBudgets.length > 0) {
                return showToast('error', `Budget untuk kategori ${category} sudah ada dan bertabrakan di tanggal ini.`)
            }

            const res = await supabase.from('budgets').insert([payload])
            error = res.error
        }

        if (error) {
            console.error(error)
            showToast('error', "Gagal menyimpan budget")
        } else {
            fetchAllData()
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
        // Fix timezone bug: pakai T12:00:00 agar tidak shift 1 hari di WIB (sama dengan pattern di handleSaveTransaction)
        const todayStr = new Date().toISOString().split('T')[0]
        const safeDate = new Date(`${todayStr}T12:00:00`).toISOString()
        const payload = {
            title: `Pengeluaran ${quickExpCategory}`,
            amount: parseFloat(quickExpAmount),
            type: 'pengeluaran',
            category: quickExpCategory,
            wallet_id: parseInt(quickExpWalletId),
            date: safeDate,
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

        fetchAllData()
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

        // 1. Simpan state sebelumnya untuk rollback
        const previousBudgets = [...budgets]

        // 2. Optimistic update: langsung hapus dari state lokal
        setBudgets(prev => prev.filter(b => b.id !== id))

        // 3. Request ke database
        const { error } = await supabase.from('budgets').delete().eq('id', id)

        if (!error) {
            // Fetch di background untuk memastikan sync
            fetchAllData()
            showSuccess({
                type: 'delete',
                message: 'Budget berhasil dihapus dari daftar.'
            })
        } else {
            // 4. Rollback jika gagal
            setBudgets(previousBudgets)
            showToast('error', 'Gagal menghapus budget')
        }
    }

    const handleEdit = (b: Budget) => {
        setEditingId(b.id)
        setCategory(b.category)
        setAmount(b.amount.toString())
        setBudgetStartDate(b.start_date)
        setBudgetEndDate(b.end_date)
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
        <main className="flex-1 bg-[var(--bg-page)] min-h-screen overflow-x-hidden transition-all duration-300">
            {/* Top Header */}
            <div className="flex items-center justify-between w-full h-[70px] md:h-[90px] shrink-0 bg-[var(--bg-card)] px-5 md:px-8"
                style={{ borderBottom: 'var(--neo-border)' }}>
                <div className="flex items-center gap-3">
                    <Link href="/" className="md:hidden p-2 -ml-2 rounded-[12px] transition-colors" style={{ color: 'var(--text-muted)' }}>
                        <ArrowLeft className="w-6 h-6" />
                    </Link>
                    <h2 className="font-black text-2xl tracking-tight text-[var(--text-primary)]">Manajemen Budget</h2>
                </div>
                <div className="hidden md:flex items-center gap-3 pl-3 ml-auto" style={{ borderLeft: '2px solid var(--border-default)' }}>
                    <p className="font-bold text-[var(--text-primary)] text-sm">Eko Budi</p>
                    <div className="w-10 h-10 rounded-[14px] flex items-center justify-center font-black text-sm"
                        style={{ background: 'var(--neo-yellow-vivid)', border: 'var(--neo-border)', boxShadow: 'var(--neo-shadow-xs)' }}>
                        EB
                    </div>
                </div>
            </div>

            <div className="relative min-h-[calc(100vh-90px)]">

                {/* Control Bar - Filter UI */}
                <div className="flex flex-col md:flex-row justify-between items-center gap-4 mx-4 md:mx-8 mt-6 brutal-card-sm p-4">
                    <div className="flex w-full md:w-auto items-center gap-2 rounded-[14px] p-1" style={{ background: 'var(--bg-elevated)', border: '2px solid var(--neo-ink)' }}>
                        {filterMode === 'monthly' && (
                            <button
                                onClick={prevMonth}
                                className="p-2 rounded-[10px] transition-all font-bold active:scale-95"
                                style={{ color: 'var(--text-muted)' }}
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                        )}
                        <div className="flex-1 flex items-center justify-center gap-2 px-4 py-1.5 min-w-[140px]">
                            <Calendar className="w-4 h-4" style={{ color: 'var(--text-primary)' }} />
                            <span className="font-black text-[var(--text-primary)] whitespace-nowrap text-center text-sm">
                                {getPeriodLabel()}
                            </span>
                        </div>
                        {filterMode === 'monthly' && (
                            <button
                                onClick={nextMonth}
                                className="p-2 rounded-[10px] transition-all font-bold active:scale-95"
                                style={{ color: 'var(--text-muted)' }}
                            >
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        )}
                    </div>

                    <div className="flex w-full md:w-auto items-center gap-2">
                        <button
                            onClick={() => setShowSettings(!showSettings)}
                            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-[14px] font-black transition-all active:scale-95"
                            style={showSettings
                                ? { background: 'var(--neo-yellow-vivid)', border: '2px solid var(--neo-ink)', boxShadow: 'var(--neo-shadow-xs)', color: 'var(--neo-ink)' }
                                : { background: 'var(--bg-elevated)', border: '2px solid var(--neo-ink)', color: 'var(--text-muted)' }
                            }
                        >
                            <Settings className="w-4 h-4" />
                            <span>Filter</span>
                        </button>
                    </div>
                </div>

                {/* Settings Panel */}
                {showSettings && (
                    <>
                        <div className="fixed inset-0 z-10" onClick={() => setShowSettings(false)} />
                        <div className="relative mx-4 md:mx-8 mt-2 z-20 w-auto md:max-w-sm md:ml-auto lg:absolute lg:right-8 lg:top-[90px] brutal-card p-5 animate-in fade-in zoom-in-95 duration-200"
                            style={{ background: 'var(--bg-card)' }}>
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="font-black uppercase tracking-tighter text-xl text-[var(--text-primary)]">Pengaturan Filter</h3>
                                <button onClick={() => setShowSettings(false)}
                                    className="p-1.5 rounded-[10px] transition-colors"
                                    style={{ background: 'var(--bg-elevated)', border: '2px solid var(--neo-ink)', color: 'var(--text-muted)' }}>
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="space-y-5">
                                <div className="space-y-3">
                                    <label className="neo-label">Mode Tampilan</label>
                                    <div className="grid grid-cols-2 gap-2 rounded-[14px] p-1.5" style={{ background: 'var(--bg-elevated)', border: '2px solid var(--neo-ink)' }}>
                                        <button
                                            onClick={() => setFilterMode('monthly')}
                                            className="px-3 py-2.5 rounded-[10px] text-sm font-black transition-all"
                                            style={filterMode === 'monthly'
                                                ? { background: 'var(--neo-yellow-vivid)', border: '2px solid var(--neo-ink)', color: 'var(--neo-ink)' }
                                                : { color: 'var(--text-muted)' }
                                            }
                                        >
                                            Bulanan
                                        </button>
                                        <button
                                            onClick={() => setFilterMode('custom')}
                                            className="px-3 py-2.5 rounded-[10px] text-sm font-black transition-all"
                                            style={filterMode === 'custom'
                                                ? { background: 'var(--neo-yellow-vivid)', border: '2px solid var(--neo-ink)', color: 'var(--neo-ink)' }
                                                : { color: 'var(--text-muted)' }
                                            }
                                        >
                                            Custom
                                        </button>
                                    </div>
                                </div>

                                {filterMode === 'custom' && (
                                    <div className="space-y-4 pt-2" style={{ borderTop: '2px dashed rgba(20,20,20,0.18)' }}>
                                        <div className="space-y-2">
                                            <label className="neo-label">Dari Tanggal</label>
                                            <input
                                                type="date"
                                                value={customRange.start}
                                                onChange={(e) => setCustomRange((prev: { start: string; end: string }) => ({ ...prev, start: e.target.value }))}
                                                className="w-full px-4 py-2.5 rounded-[12px] text-sm font-bold text-[var(--text-primary)] outline-none"
                                                style={{ background: 'var(--bg-elevated)', border: '2px solid var(--neo-ink)' }}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="neo-label">Sampai Tanggal</label>
                                            <input
                                                type="date"
                                                value={customRange.end}
                                                onChange={(e) => setCustomRange((prev: { start: string; end: string }) => ({ ...prev, end: e.target.value }))}
                                                className="w-full px-4 py-2.5 rounded-[12px] text-sm font-bold text-[var(--text-primary)] outline-none"
                                                style={{ background: 'var(--bg-elevated)', border: '2px solid var(--neo-ink)' }}
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
                            <div className="w-6 h-6 border-2 border-[var(--neo-ink)] border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : (() => {
                        const totalBudget = budgets.reduce((acc, b) => acc + b.amount, 0)
                        const totalSpent = budgets.reduce((acc, b) => acc + getSpentAmount(b.category), 0)
                        const totalRemaining = Math.max(totalBudget - totalSpent, 0)
                        const overallPct = totalBudget > 0 ? Math.min(Math.round((totalSpent / totalBudget) * 100), 100) : 0
                        const isOverall = totalSpent > totalBudget

                        return (
                            <>
                                {/* Summary Card — Neobrutalism */}
                                <div className={`mx-4 mt-4 brutal-card-md p-5 ${isOverall ? 'brutal-card-peach' : 'brutal-card-yellow'}`}>
                                    <p className="neo-label mb-1">{getPeriodLabel()}</p>
                                    <div className="flex items-end justify-between mt-1 mb-3">
                                        <div>
                                            <p className="neo-label mb-0.5">Total Terpakai</p>
                                            <p className="neo-amount">Rp {totalSpent.toLocaleString('id-ID')}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="neo-label mb-0.5">Total Budget</p>
                                            <p className="font-black text-base text-[var(--text-primary)]">Rp {totalBudget.toLocaleString('id-ID')}</p>
                                        </div>
                                    </div>
                                    {/* Overall progress */}
                                    <div className="w-full h-2 rounded-full overflow-hidden mb-2" style={{ background: 'rgba(20,20,20,0.12)' }}>
                                        <div className="h-full rounded-full transition-all duration-500"
                                            style={{ width: `${overallPct}%`, background: isOverall ? 'var(--error)' : 'var(--neo-ink)' }} />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <p className="neo-label">Sisa: <span className="font-black text-[var(--text-primary)]">Rp {totalRemaining.toLocaleString('id-ID')}</span></p>
                                        <span className="neo-pill text-[10px]">{overallPct}% terpakai</span>
                                    </div>
                                </div>

                                {/* Info Bar */}
                                <div className="flex items-center justify-between px-4 mt-5 mb-2">
                                    <p className="font-black uppercase tracking-tight text-[var(--text-primary)]">{budgets.length} kategori budget</p>
                                    <p className="neo-label mt-1">Tap untuk edit / hapus / catat</p>
                                </div>

                                {/* Budget List */}
                                {budgets.length === 0 ? (
                                    <div className="mx-4 brutal-card-sm p-10 text-center">
                                        <p className="text-sm font-semibold text-[var(--text-muted)]">Belum ada budget bulan ini.</p>
                                    </div>
                                ) : (
                                    <div className="mx-4 space-y-2">
                                        {budgets.map((budget, idx) => {
                                            const spent = getSpentAmount(budget.category)
                                            const percent = Math.min((spent / budget.amount) * 100, 100)
                                            const isOver = spent > budget.amount
                                            const allCats = [
                                                ...CATEGORIES.pengeluaran,
                                                ...(customCategories.pengeluaran || []).map(c => typeof c === 'string' ? { name: c, color: 'bg-slate-100 dark:bg-[var(--bg-hover)] text-slate-600 dark:text-slate-500' } : { name: c.name, color: c.color })
                                            ]
                                            const catColor = allCats.find(c => c.name === budget.category)?.color || 'bg-slate-100 dark:bg-[var(--bg-hover)] text-slate-600 dark:text-slate-500'

                                            return (
                                                <div key={budget.id} className="brutal-card-sm p-4"
                                                    style={{ background: isOver ? 'var(--neo-peach)' : 'var(--bg-card)' }}>
                                                    {/* Top Row: Category badge + amounts */}
                                                    <div className="flex items-start justify-between mb-2">
                                                        <span className="neo-pill text-[10px]">{budget.category}</span>
                                                        <div className="text-right ml-2">
                                                            <p className="font-black text-sm text-[var(--text-primary)]">Rp {spent.toLocaleString('id-ID')}</p>
                                                            <p className="text-[11px] font-semibold text-[var(--text-muted)]">/ Rp {budget.amount.toLocaleString('id-ID')}</p>
                                                        </div>
                                                    </div>

                                                    {/* Progress bar */}
                                                    <div className="w-full h-1.5 rounded-full overflow-hidden mb-1.5" style={{ background: 'rgba(20,20,20,0.12)' }}>
                                                        <div
                                                            className="h-full rounded-full transition-all duration-500"
                                                            style={{ width: `${percent}%`, background: isOver ? 'var(--error)' : percent > 80 ? '#f97316' : 'var(--neo-ink)' }}
                                                        />
                                                    </div>

                                                    {/* Sisa / % */}
                                                    <div className="flex items-center justify-between mb-3">
                                                        {isOver ? (
                                                            <span className="text-[10px] font-black flex items-center gap-1" style={{ color: 'var(--error)' }}>
                                                                <AlertCircle className="w-3 h-3" /> Over Budget!
                                                            </span>
                                                        ) : (
                                                            <span className="text-[10px] font-semibold text-[var(--text-muted)]">Sisa: Rp {Math.max(budget.amount - spent, 0).toLocaleString('id-ID')}</span>
                                                        )}
                                                        <span className="text-[10px] font-black text-[var(--text-primary)]">{Math.round(percent)}%</span>
                                                    </div>

                                                    {/* Action Buttons — 3 columns */}
                                                    <div className="grid grid-cols-3 gap-2">
                                                        <button
                                                            onClick={() => handleEdit(budget)}
                                                            className="py-2 flex items-center justify-center gap-1.5 font-bold rounded-[12px] text-xs active:scale-95 transition-all"
                                                            style={{ background: 'var(--bg-elevated)', border: '2px solid var(--neo-ink)', boxShadow: 'var(--neo-shadow-xs)', color: 'var(--text-primary)' }}
                                                        >
                                                            <Pencil className="w-3.5 h-3.5" />
                                                            Edit
                                                        </button>
                                                        <button
                                                            onClick={() => openQuickExp(budget.category)}
                                                            className="py-2 flex items-center justify-center gap-1.5 font-black rounded-[12px] text-xs active:scale-95 transition-all"
                                                            style={{ background: 'var(--neo-yellow-vivid)', border: '2px solid var(--neo-ink)', boxShadow: 'var(--neo-shadow-xs)', color: 'var(--neo-ink)' }}
                                                        >
                                                            <Plus className="w-3.5 h-3.5" />
                                                            Catat
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(budget.id)}
                                                            className="py-2 flex items-center justify-center gap-1.5 font-bold rounded-[12px] text-xs active:scale-95 transition-all"
                                                            style={{ background: 'var(--neo-peach)', border: '2px solid var(--neo-ink)', boxShadow: 'var(--neo-shadow-xs)', color: 'var(--error)' }}
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
                                    className="mx-4 mt-3 w-[calc(100%-2rem)] rounded-[20px] p-4 flex items-center justify-center gap-3 font-bold text-sm transition-all active:scale-[0.98]"
                                    style={{ border: '2.5px dashed var(--neo-ink)', color: 'var(--text-muted)', background: 'transparent' }}
                                >
                                    <div className="w-8 h-8 rounded-full flex items-center justify-center"
                                        style={{ background: 'var(--neo-yellow)', border: '2px solid var(--neo-ink)' }}>
                                        <Plus className="w-4 h-4 text-[var(--neo-ink)]" />
                                    </div>
                                    <span className="font-black">Buat Budget Baru</span>
                                </button>
                            </>
                        )
                    })()}
                </div>

                {/* ===== DESKTOP VIEW ===== */}
                <div className="hidden md:block p-8">
                    {loading ? (
                        <div className="text-center py-12 text-[var(--text-muted)] font-semibold animate-pulse">Memuat budget...</div>
                    ) : (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {budgets.map((budget, idx) => {
                                    const spent = getSpentAmount(budget.category)
                                    const percent = Math.min((spent / budget.amount) * 100, 100)
                                    const isOver = spent > budget.amount
                                    const allCats = [
                                        ...CATEGORIES.pengeluaran,
                                        ...(customCategories.pengeluaran || []).map(c => typeof c === 'string' ? { name: c, color: 'bg-slate-100 dark:bg-[var(--bg-hover)] text-slate-600 dark:text-slate-500' } : { name: c.name, color: c.color })
                                    ]
                                    const catColor = allCats.find(c => c.name === budget.category)?.color || 'bg-slate-100 dark:bg-[var(--bg-hover)] text-slate-600 dark:text-slate-500'
                                    // Cycle card colors for variety
                                    const BUDGET_COLORS = ['var(--neo-yellow)', 'var(--neo-sky)', 'var(--neo-mint)', 'var(--neo-lav)']

                                    return (
                                        <div key={budget.id}
                                            className="brutal-card card-hover flex flex-col justify-between min-h-[320px] p-6 pb-8"
                                            style={{ background: isOver ? 'var(--neo-peach)' : BUDGET_COLORS[idx % BUDGET_COLORS.length] }}>
                                            <div>
                                                <div className="flex justify-between items-start mb-5">
                                                    <span className="neo-pill text-xs">{budget.category}</span>
                                                    <button onClick={() => handleDelete(budget.id)}
                                                        className="p-2.5 rounded-[12px] transition-all active:scale-95 active:translate-x-[2px] active:translate-y-[2px]"
                                                        style={{ background: 'var(--neo-peach)', border: '2px solid var(--neo-ink)', boxShadow: 'var(--neo-shadow-xs)', color: 'var(--error)' }}>
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>

                                                <div className="mb-5">
                                                    <p className="neo-label">Total Terpakai</p>
                                                    <p className="text-3xl font-black text-[var(--text-primary)] mt-1 tracking-tight">Rp {spent.toLocaleString('id-ID')}</p>
                                                    <p className="text-sm font-semibold text-[var(--text-muted)] mt-1">
                                                        Limit: Rp {budget.amount.toLocaleString('id-ID')}
                                                    </p>

                                                    {isOver && (
                                                        <div className="flex items-center gap-1.5 text-xs font-black mt-2 mb-1 p-2 rounded-[10px]"
                                                            style={{ background: 'rgba(20,20,20,0.08)', color: 'var(--error)' }}>
                                                            <AlertCircle className="w-3.5 h-3.5" />
                                                            <span>Over Budget!</span>
                                                        </div>
                                                    )}

                                                    <div className="w-full h-2.5 rounded-full overflow-hidden mt-3"
                                                        style={{ background: 'rgba(20,20,20,0.12)' }}>
                                                        <div
                                                            className="h-full rounded-full transition-all duration-500"
                                                            style={{ width: `${percent}%`, background: isOver ? 'var(--error)' : percent > 80 ? '#f97316' : 'var(--neo-ink)' }}
                                                        />
                                                    </div>
                                                    <p className="text-xs font-semibold text-[var(--text-muted)] mt-2">
                                                        Sisa: <span className="font-black text-[var(--text-primary)]">Rp {Math.max(budget.amount - spent, 0).toLocaleString('id-ID')}</span>
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-3 pt-4" style={{ borderTop: '2px dashed rgba(20,20,20,0.18)' }}>
                                                <button
                                                    onClick={() => handleEdit(budget)}
                                                    className="py-3 font-bold rounded-[14px] transition-all active:scale-95 flex justify-center items-center gap-2 text-sm"
                                                    style={{ background: 'var(--bg-elevated)', border: '2px solid var(--neo-ink)', boxShadow: 'var(--neo-shadow-xs)', color: 'var(--text-primary)' }}
                                                >
                                                    <Pencil className="w-4 h-4" /> Edit
                                                </button>
                                                <button
                                                    onClick={() => openQuickExp(budget.category)}
                                                    className="py-3 font-black rounded-[14px] transition-all active:scale-95 flex justify-center items-center gap-2 text-sm"
                                                    style={{ background: 'var(--neo-yellow-vivid)', border: '2px solid var(--neo-ink)', boxShadow: 'var(--neo-shadow-sm)', color: 'var(--neo-ink)' }}
                                                >
                                                    <Plus className="w-4 h-4" /> Catat
                                                </button>
                                            </div>
                                        </div>
                                    )
                                })}

                                {/* Add New Card */}
                                <button
                                    onClick={() => { resetForm(); setIsModalOpen(true); }}
                                    className="rounded-[24px] p-6 flex flex-col items-center justify-center gap-4 font-bold text-sm transition-all min-h-[320px] group active:scale-[0.98]"
                                    style={{ border: '2.5px dashed var(--neo-ink)', color: 'var(--text-muted)', background: 'transparent' }}
                                >
                                    <div className="w-12 h-12 rounded-full flex items-center justify-center transition-all group-hover:scale-110"
                                        style={{ background: 'var(--neo-yellow)', border: '2px solid var(--neo-ink)', boxShadow: 'var(--neo-shadow-xs)' }}>
                                        <Plus className="w-6 h-6 text-[var(--neo-ink)]" />
                                    </div>
                                    <span className="font-black">Buat Budget Baru</span>
                                </button>
                            </div>

                            {budgets.length === 0 && (
                                <div className="brutal-card-sm text-center py-12">
                                    <p className="font-semibold text-[var(--text-muted)]">Belum ada budget untuk bulan ini.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

            </div>

            {/* Main Modal (Add/Edit Budget) */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-[var(--neo-ink)]/60 backdrop-blur-sm transition-opacity" onClick={resetForm} />
                    <div className="w-full max-w-md z-50 relative animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto brutal-card p-6"
                        style={{ background: 'var(--bg-card)' }}>
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-black text-[var(--text-primary)] tracking-tight">{editingId ? 'Edit Budget' : 'Tambah Budget'}</h3>
                            <button onClick={resetForm}
                                className="p-2 rounded-[12px] transition-colors"
                                style={{ background: 'var(--bg-elevated)', border: '2px solid var(--neo-ink)', color: 'var(--text-muted)' }}>
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleSave} className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="neo-label block mb-2">Tanggal Mulai</label>
                                    <input
                                        type="date"
                                        className="w-full px-[18px] py-[14px] rounded-[18px] font-extrabold text-[14px] text-[var(--text-primary)] outline-none"
                                        style={{ background: 'var(--bg-elevated)', border: '3px solid var(--neo-ink)', boxShadow: 'var(--neo-shadow-sm)' }}
                                        value={budgetStartDate}
                                        onChange={(e) => setBudgetStartDate(e.target.value)}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="neo-label block mb-2">Tanggal Selesai</label>
                                    <input
                                        type="date"
                                        className="w-full px-[18px] py-[14px] rounded-[18px] font-extrabold text-[14px] text-[var(--text-primary)] outline-none"
                                        style={{ background: 'var(--bg-elevated)', border: '3px solid var(--neo-ink)', boxShadow: 'var(--neo-shadow-sm)' }}
                                        value={budgetEndDate}
                                        onChange={(e) => setBudgetEndDate(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="neo-label block mb-3">Pilih Kategori</label>
                                <div className="grid grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                                    {[
                                        ...CATEGORIES.pengeluaran,
                                        ...(customCategories.pengeluaran || []).map(c => typeof c === 'string' ? { name: c, color: 'bg-slate-100 dark:bg-[var(--bg-hover)] text-slate-600 dark:text-slate-500' } : { name: c.name, color: c.color })
                                    ].map(cat => (
                                        <button
                                            key={cat.name}
                                            type="button"
                                            onClick={() => setCategory(cat.name)}
                                            className="p-3 rounded-[12px] text-xs font-black uppercase tracking-wider transition-all text-left flex items-center gap-2 active:scale-95"
                                            style={category === cat.name
                                                ? { background: 'var(--neo-yellow-vivid)', border: '2px solid var(--neo-ink)', boxShadow: 'var(--neo-shadow-xs)', color: 'var(--neo-ink)' }
                                                : { background: 'var(--bg-elevated)', border: '2px solid rgba(20,20,20,0.15)', color: 'var(--text-muted)' }
                                            }
                                        >
                                            <div className={`w-2 h-2 rounded-full ${cat.color.split(' ')[0].replace('bg-', 'bg-')}`}></div>
                                            {cat.name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="neo-label block mb-2">Batasan (Rp)</label>
                                <MoneyInput
                                    value={amount}
                                    onChange={setAmount}
                                />
                            </div>
                            <button type="submit" className="brutal-btn w-full py-3.5 text-sm">
                                Simpan Budget
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Quick Expense Modal */}
            {isQuickExpModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-[var(--neo-ink)]/60 backdrop-blur-sm transition-opacity" onClick={resetQuickExpForm} />
                    <div className="w-full max-w-sm z-50 relative animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto brutal-card p-6"
                        style={{ background: 'var(--bg-card)' }}>
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-xl font-black text-[var(--text-primary)] tracking-tight">Catat Pengeluaran</h3>
                                <p className="text-sm font-semibold text-[var(--text-muted)] mt-1">Kategori: <span className="neo-pill text-xs font-black">{quickExpCategory}</span></p>
                            </div>
                            <button onClick={resetQuickExpForm}
                                className="p-2 rounded-[12px] transition-colors"
                                style={{ background: 'var(--bg-elevated)', border: '2px solid var(--neo-ink)', color: 'var(--text-muted)' }}>
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleQuickExpenseSave} className="space-y-5">
                            <div>
                                <label className="neo-label block mb-2">Jumlah (Rp)</label>
                                <MoneyInput
                                    value={quickExpAmount}
                                    onChange={setQuickExpAmount}
                                    autoFocus
                                    className="focus:ring-[var(--primary)]"
                                />
                            </div>
                            <div>
                                <label className="neo-label block mb-2">Ambil dari Dompet</label>
                                <select
                                    className="w-full p-3.5 rounded-[14px] font-semibold text-sm text-[var(--text-primary)] outline-none"
                                    style={{ background: 'var(--bg-elevated)', border: '2px solid var(--neo-ink)' }}
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
                            <button type="submit" className="brutal-btn w-full py-3.5 text-sm">
                                Simpan Pengeluaran
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </main>
    )
}

'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Budget, Transaction, CATEGORIES, Wallet } from '@/types'
import { Plus, Trash2, Pencil, AlertCircle, X, Wallet as WalletIcon } from 'lucide-react'
import MoneyInput from '@/components/MoneyInput'

export default function BudgetsPage() {
    const [budgets, setBudgets] = useState<Budget[]>([])
    const [transactions, setTransactions] = useState<Transaction[]>([])
    const [wallets, setWallets] = useState<Wallet[]>([])
    const [loading, setLoading] = useState(true)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [currentDate, setCurrentDate] = useState(new Date())

    // Form State
    const [editingId, setEditingId] = useState<number | null>(null)
    const [category, setCategory] = useState('')
    const [amount, setAmount] = useState('')

    // Quick Expense State
    const [isQuickExpModalOpen, setIsQuickExpModalOpen] = useState(false)
    const [quickExpCategory, setQuickExpCategory] = useState('')
    const [quickExpAmount, setQuickExpAmount] = useState('')
    const [quickExpWalletId, setQuickExpWalletId] = useState('')

    useEffect(() => {
        fetchData()
        fetchWallets()
    }, [currentDate])

    const fetchWallets = async () => {
        const { data } = await supabase.from('wallets').select('*')
        if (data) setWallets(data)
    }

    const fetchData = async () => {
        setLoading(true)
        // 1. Get Budgets for this month
        const monthStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-01`

        const { data: bData } = await supabase
            .from('budgets')
            .select('*')
            .eq('month', monthStr)

        // 2. Get Transactions for this month (to calc progress)
        const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString()
        const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59).toISOString()

        const { data: tData } = await supabase
            .from('transactions')
            .select('*')
            .gte('date', startOfMonth)
            .lte('date', endOfMonth)
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
        if (!category || !amount) return alert("Mohon lengkapi data")

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
                return alert(`Budget untuk kategori ${category} sudah ada bulan ini.`)
            }

            const res = await supabase.from('budgets').insert([payload])
            error = res.error
        }

        if (error) {
            console.error(error)
            alert("Gagal menyimpan budget")
        } else {
            fetchData()
            resetForm()
        }
    }

    const handleQuickExpenseSave = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!quickExpAmount || !quickExpWalletId) return alert("Mohon lengkapi data")

        const wallet = wallets.find(w => w.id === parseInt(quickExpWalletId))
        if (!wallet) return alert("Dompet tidak ditemukan")

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
            return alert("Gagal menyimpan pengeluaran")
        }

        // 2. Update Wallet Balance
        const newBalance = wallet.balance - parseFloat(quickExpAmount)
        await supabase.from('wallets').update({ balance: newBalance }).eq('id', wallet.id)

        fetchData()
        fetchWallets() // Refresh wallet balances
        resetQuickExpForm()
    }

    const handleDelete = async (id: number) => {
        if (!confirm("Hapus budget ini?")) return
        const { error } = await supabase.from('budgets').delete().eq('id', id)
        if (!error) fetchData()
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

    return (
        <main className="min-h-screen bg-transparent font-sans text-slate-900 pb-24 md:pb-6 ml-0 md:ml-64 p-6">
            <header className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800">Manajemen Budget</h1>
                    <p className="text-slate-500">Atur batasan pengeluaran bulanan</p>
                </div>

                <div className="flex items-center gap-4 glass shadow-premium px-4 py-2 rounded-xl backdrop-blur-xl border border-white/20">
                    <button onClick={prevMonth} className="text-slate-500 hover:text-blue-600 font-bold text-xl">{'<'}</button>
                    <span className="font-bold text-slate-700 w-32 text-center">
                        {currentDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
                    </span>
                    <button onClick={nextMonth} className="text-slate-500 hover:text-blue-600 font-bold text-xl">{'>'}</button>
                </div>
            </header>

            {loading ? (
                <div className="text-center py-12 text-slate-400">Loading...</div>
            ) : (
                <div className="space-y-6">
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="w-full md:w-auto bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-6 py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-premium-lg hover:shadow-purple-500/50 hover:scale-105"
                    >
                        <Plus className="w-5 h-5" />
                        <span className="font-bold">Buat Budget Baru</span>
                    </button>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {budgets.map(budget => {
                            const spent = getSpentAmount(budget.category)
                            const percent = Math.min((spent / budget.amount) * 100, 100)
                            const isOver = spent > budget.amount
                            const catColor = CATEGORIES.pengeluaran.find(c => c.name === budget.category)?.color || 'bg-slate-100 text-slate-600'

                            return (
                                <div key={budget.id} className="glass shadow-premium-lg p-6 rounded-3xl border border-white/20 relative group flex flex-col justify-between card-hover backdrop-blur-xl">
                                    <div>
                                        <div className="flex justify-between items-start mb-4">
                                            <div className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${catColor}`}>
                                                {budget.category}
                                            </div>
                                            <button onClick={() => handleDelete(budget.id)} className="p-2 hover:bg-rose-50 rounded-lg text-slate-300 hover:text-rose-600 transition-colors">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>

                                        <div className="mb-4">
                                            <div className="flex justify-between items-end mb-1">
                                                <p className="text-2xl font-bold text-slate-800">Rp {spent.toLocaleString('id-ID')}</p>
                                                <p className="text-sm font-semibold text-slate-400">/ Rp {budget.amount.toLocaleString('id-ID')}</p>
                                            </div>
                                            {isOver && <div className="flex items-center gap-1 text-xs text-rose-500 font-bold mb-1"><AlertCircle className="w-3 h-3" /> Over Budget!</div>}
                                            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-500 ${isOver ? 'bg-rose-500' : percent > 80 ? 'bg-orange-500' : 'bg-blue-600'}`}
                                                    style={{ width: `${percent}%` }}
                                                />
                                            </div>
                                            <p className="text-xs text-slate-400 mt-2">
                                                Sisa: Rp {Math.max(budget.amount - spent, 0).toLocaleString('id-ID')}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="mt-4 grid grid-cols-2 gap-3 pt-4 border-t border-slate-50">
                                        <button
                                            onClick={() => handleEdit(budget)}
                                            className="py-2.5 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors flex justify-center items-center gap-2 text-sm"
                                        >
                                            <Pencil className="w-4 h-4" /> Edit
                                        </button>
                                        <button
                                            onClick={() => openQuickExp(budget.category)}
                                            className="py-2.5 bg-rose-50 text-rose-600 font-bold rounded-xl hover:bg-rose-100 transition-colors text-sm flex justify-center items-center gap-2"
                                        >
                                            <Plus className="w-4 h-4" /> Pengeluaran
                                        </button>
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    {budgets.length === 0 && (
                        <div className="text-center py-12 text-slate-400 border-2 border-dashed border-slate-200 rounded-3xl">
                            <p>Belum ada budget untuk bulan ini.</p>
                        </div>
                    )}
                </div>
            )}

            {/* Main Modal (Add/Edit Budget) */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={resetForm}></div>
                    <div className="glass backdrop-blur-2xl w-full max-w-md rounded-3xl shadow-premium-lg border border-white/20 z-50 p-6 relative animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-slate-800">{editingId ? 'Edit Budget' : 'Tambah Budget'}</h3>
                            <button onClick={resetForm}><X className="w-6 h-6 text-slate-400" /></button>
                        </div>
                        <form onSubmit={handleSave} className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Kategori</label>
                                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                                    {CATEGORIES.pengeluaran.map(cat => (
                                        <button
                                            key={cat.name}
                                            type="button"
                                            onClick={() => setCategory(cat.name)}
                                            className={`p-2 rounded-xl text-sm font-medium border transition-all ${category === cat.name ? `bg-blue-50 border-blue-500 text-blue-700` : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                        >
                                            {cat.name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Batasan (Rp)</label>
                                <MoneyInput
                                    value={amount}
                                    onChange={setAmount}
                                />
                            </div>
                            <button type="submit" className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition-all">
                                Simpan
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Quick Expense Modal */}
            {isQuickExpModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={resetQuickExpForm}></div>
                    <div className="glass backdrop-blur-2xl w-full max-w-sm rounded-3xl p-6 shadow-premium-lg border border-white/20 z-50 relative animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-xl font-bold text-slate-800">Catat Pengeluaran</h3>
                                <p className="text-sm text-slate-500">Kategori: <span className="font-bold text-slate-700">{quickExpCategory}</span></p>
                            </div>
                            <button onClick={resetQuickExpForm}><X className="w-6 h-6 text-slate-400" /></button>
                        </div>
                        <form onSubmit={handleQuickExpenseSave} className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Jumlah (Rp)</label>
                                <MoneyInput
                                    value={quickExpAmount}
                                    onChange={setQuickExpAmount}
                                    autoFocus
                                    className="focus:ring-rose-500" // Override focus color
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Ambil dari Dompet</label>
                                <select
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none"
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
                            <button type="submit" className="w-full bg-rose-600 text-white font-bold py-3 rounded-xl hover:bg-rose-700 transition-colors shadow-lg shadow-rose-500/30">
                                Simpan Pengeluaran
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </main>
    )
}

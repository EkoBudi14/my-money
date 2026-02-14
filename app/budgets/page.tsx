'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Budget, Transaction, CATEGORIES, Wallet } from '@/types'
import { Plus, Trash2, Pencil, AlertCircle, X, Wallet as WalletIcon } from 'lucide-react'
import MoneyInput from '@/components/MoneyInput'
import { useToast } from '@/hooks/useToast'
import { useConfirm } from '@/hooks/useConfirm'

export default function BudgetsPage() {
    const [budgets, setBudgets] = useState<Budget[]>([])
    const [transactions, setTransactions] = useState<Transaction[]>([])
    const [wallets, setWallets] = useState<Wallet[]>([])
    const [loading, setLoading] = useState(true)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [currentDate, setCurrentDate] = useState(new Date())

    const { showToast } = useToast()
    const { showConfirm } = useConfirm()

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

        const { data: bData, error: bError } = await supabase
            .from('budgets')
            .select('*')
            .eq('month', monthStr)

        if (bError) showToast('error', 'Gagal memuat budget')

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
            showToast('success', "Budget disimpan")
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
        showToast('success', "Pengeluaran berhasil dicatat")
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
            showToast('success', 'Budget dihapus')
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

    return (
        <main className="flex-1 bg-[#F9FAFB] min-h-screen overflow-x-hidden transition-all duration-300">
             {/* Top Header */}
             <div className="flex items-center justify-between w-full h-[90px] shrink-0 border-b border-[#F3F4F3] bg-white px-5 md:px-8">
                <div className="flex items-center gap-4">
                    <h2 className="font-bold text-2xl text-[#080C1A]">Manajemen Budget</h2>
                </div>

                <div className="flex items-center gap-3">
                     {/* Month Navigation - Styled to match header */}
                    <div className="flex items-center bg-[#F9FAFB] rounded-xl px-2 py-1 mr-4 border border-[#F3F4F3]">
                         <button onClick={prevMonth} className="p-2 hover:bg-white hover:shadow-sm rounded-lg text-slate-500 hover:text-[#165DFF] transition-all">
                             {'<'}
                         </button>
                         <span className="font-bold text-[#080C1A] text-sm w-32 text-center select-none">
                            {currentDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
                        </span>
                        <button onClick={nextMonth} className="p-2 hover:bg-white hover:shadow-sm rounded-lg text-slate-500 hover:text-[#165DFF] transition-all">
                             {'>'}
                         </button>
                    </div>

                    <div className="hidden md:flex items-center gap-3 pl-3 border-l border-[#F3F4F3]">
                        <div className="text-right">
                            <p className="font-semibold text-[#080C1A] text-sm">Eko Budi</p>
                            {/* <p className="text-[#6A7686] text-xs">Premium User</p> */}
                        </div>
                        <div className="w-11 h-11 bg-slate-200 rounded-full flex items-center justify-center text-slate-500 font-bold border-2 border-white shadow-sm">
                            EB
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-5 md:p-8 relative min-h-[calc(100vh-90px)]">
                {loading ? (
                    <div className="text-center py-12 text-slate-400">Loading...</div>
                ) : (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {budgets.map(budget => {
                                const spent = getSpentAmount(budget.category)
                                const percent = Math.min((spent / budget.amount) * 100, 100)
                                const isOver = spent > budget.amount
                                const catColor = CATEGORIES.pengeluaran.find(c => c.name === budget.category)?.color || 'bg-slate-100 text-slate-600'

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
                                    {CATEGORIES.pengeluaran.map(cat => (
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

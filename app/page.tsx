'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import FinancialChart from '@/components/FinancialChart'
import GoldPriceCard from '@/components/GoldPriceCard'
import CurrencyCard from '@/components/CurrencyCard'
import {
  Plus,
  Trash2,
  TrendingUp,
  TrendingDown,
  Wallet,
  ChevronLeft,
  ChevronRight,
  X,
  CreditCard,
  Calendar,
  Utensils,
  Car,
  ShoppingBag,
  Zap,
  Home,
  Film,
  HeartPulse,
  Package,
  Briefcase,
  Gift,
  Landmark,
  Pencil
} from 'lucide-react'

// --- Types & Constants ---
interface Transaction {
  id: number
  title: string
  amount: number
  type: 'pemasukan' | 'pengeluaran'
  category: string
  created_at: string
}

const CATEGORIES = {
  pengeluaran: [
    { name: 'Makanan', icon: Utensils, color: 'bg-orange-100 text-orange-600' },
    { name: 'Transport', icon: Car, color: 'bg-blue-100 text-blue-600' },
    { name: 'Belanja', icon: ShoppingBag, color: 'bg-purple-100 text-purple-600' },
    { name: 'Tagihan', icon: Zap, color: 'bg-yellow-100 text-yellow-600' },
    { name: 'Rumah', icon: Home, color: 'bg-teal-100 text-teal-600' },
    { name: 'Hiburan', icon: Film, color: 'bg-pink-100 text-pink-600' },
    { name: 'Kesehatan', icon: HeartPulse, color: 'bg-red-100 text-red-600' },
    { name: 'Lainnya', icon: Package, color: 'bg-slate-100 text-slate-600' },
  ],
  pemasukan: [
    { name: 'Gaji', icon: Briefcase, color: 'bg-emerald-100 text-emerald-600' },
    { name: 'Hadiah', icon: Gift, color: 'bg-pink-100 text-pink-600' },
    { name: 'Investasi', icon: TrendingUp, color: 'bg-indigo-100 text-indigo-600' },
    { name: 'Lainnya', icon: Landmark, color: 'bg-slate-100 text-slate-600' },
  ]
}

export default function MoneyManager() {
  const [transactions, setTransactions] = useState<Transaction[]>([])

  // Form State
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [type, setType] = useState<'pemasukan' | 'pengeluaran'>('pemasukan')
  const [category, setCategory] = useState('')

  // Edit State
  const [editingId, setEditingId] = useState<number | null>(null)

  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [isModalOpen, setIsModalOpen] = useState(false)

  // 1. Ambil data saat aplikasi dibuka
  useEffect(() => {
    fetchTransactions()
  }, [])

  const fetchTransactions = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching:', error)
    } else {
      setTransactions((data as any[])?.map((t: any) => ({
        id: t.id,
        title: t.title,
        amount: t.amount,
        type: t.type,
        category: t.category || 'Lainnya',
        created_at: t.created_at
      })) || [])
    }
    setLoading(false)
  }

  // 2. Fungsi Simpan (Tambah/Edit) Transaksi
  const handleSaveTransaction = async (e: React.FormEvent) => {
    e.preventDefault()

    // Auto-fill title if empty but category is selected
    const finalTitle = title || category

    if (!finalTitle || !amount || !category) return alert("Mohon lengkapi data!")

    const payload = {
      title: finalTitle,
      amount: parseFloat(amount),
      type,
      category,
      // If editing, don't update created_at, else set new
      ...(editingId ? {} : { created_at: new Date().toISOString() })
    }

    let error;
    let data;

    if (editingId) {
      // Update Mode
      const res = await supabase
        .from('transactions')
        .update(payload)
        .eq('id', editingId)
        .select()

      error = res.error
      data = res.data
    } else {
      // Insert Mode
      const res = await supabase
        .from('transactions')
        .insert([payload])
        .select()

      error = res.error
      data = res.data
    }

    if (error) {
      console.error(error)
      alert("Gagal menyimpan transaksi")
    } else {
      if (data && data.length > 0) {
        const savedTransaction = data[0] as unknown as Transaction
        // Ensure category fallback
        savedTransaction.category = savedTransaction.category || category

        if (editingId) {
          // Update local state
          setTransactions(transactions.map(t => t.id === editingId ? savedTransaction : t))
        } else {
          // Add to local state
          setTransactions([savedTransaction, ...transactions])
        }

        resetForm()
      }
    }
  }

  const resetForm = () => {
    setTitle('')
    setAmount('')
    setCategory('')
    setType('pemasukan')
    setEditingId(null)
    setIsModalOpen(false)
  }

  const handleEditClick = (t: Transaction) => {
    setEditingId(t.id)
    setTitle(t.title)
    setAmount(t.amount.toString())
    setCategory(t.category)
    setType(t.type)
    setIsModalOpen(true)
  }

  // 3. Fungsi Hapus Transaksi
  const deleteTransaction = async (id: number) => {
    if (!confirm('Apakah anda yakin ingin menghapus transaksi ini?')) return;

    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id)

    if (!error) {
      setTransactions(transactions.filter((t) => t.id !== id))
    }
  }

  // Helper: Get Icon Component based on category name
  const getCategoryIcon = (catName: string, type: 'pemasukan' | 'pengeluaran') => {
    const allCats = [...CATEGORIES.pemasukan, ...CATEGORIES.pengeluaran]
    const found = allCats.find(c => c.name === catName)
    return found ? { Icon: found.icon, color: found.color } : { Icon: Package, color: 'bg-slate-100 text-slate-600' }
  }

  // Helper: Filter & Totals
  const getTransactionsByMonth = (date: Date) => {
    return transactions.filter(t => {
      const tDate = new Date(t.created_at)
      return tDate.getMonth() === date.getMonth() && tDate.getFullYear() === date.getFullYear()
    })
  }

  const calculateTotals = (txs: Transaction[]) => {
    const income = txs
      .filter(t => t.type === 'pemasukan')
      .reduce((acc, curr) => acc + curr.amount, 0)

    const expense = txs
      .filter(t => t.type === 'pengeluaran')
      .reduce((acc, curr) => acc + curr.amount, 0)

    return { income, expense }
  }

  const currentMonthTransactions = getTransactionsByMonth(currentDate)
  const { income: currentIncome, expense: currentExpense } = calculateTotals(currentMonthTransactions)

  const prevDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
  const prevMonthTransactions = getTransactionsByMonth(prevDate)
  const { income: prevIncome, expense: prevExpense } = calculateTotals(prevMonthTransactions)

  const getPercentageChange = (current: number, prev: number) => {
    if (prev === 0) return current > 0 ? 100 : 0
    return ((current - prev) / prev) * 100
  }

  const incomeChange = getPercentageChange(currentIncome, prevIncome)
  const expenseChange = getPercentageChange(currentExpense, prevExpense)

  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))

  return (
    <main className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-24 md:pb-6">
      <div className="max-w-5xl mx-auto space-y-6 md:p-6 p-4">

        {/* Header Section */}
        <header className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-start">
            <button onClick={prevMonth} className="p-2 hover:bg-slate-50 rounded-full transition-colors active:scale-95">
              <ChevronLeft className="w-6 h-6 text-slate-600" />
            </button>
            <div className="text-center">
              <h1 className="text-xl md:text-2xl font-bold text-slate-800 tracking-tight">
                {currentDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
              </h1>
              <div className="flex items-center justify-center gap-1 text-slate-500 text-sm">
                <Calendar className="w-3 h-3" />
                <span>Periode Laporan</span>
              </div>
            </div>
            <button onClick={nextMonth} className="p-2 hover:bg-slate-50 rounded-full transition-colors active:scale-95">
              <ChevronRight className="w-6 h-6 text-slate-600" />
            </button>
          </div>

          <div className="mt-6 md:mt-0 text-center md:text-right w-full md:w-auto bg-slate-50 md:bg-transparent p-4 md:p-0 rounded-2xl">
            <p className="text-sm font-medium text-slate-500 mb-1">Total Saldo Bersih</p>
            <p className={`text-3xl md:text-4xl font-extrabold tracking-tight ${(currentIncome - currentExpense) >= 0 ? 'text-blue-600' : 'text-rose-600'}`}>
              Rp {(currentIncome - currentExpense).toLocaleString('id-ID')}
            </p>
          </div>
        </header>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Income */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 relative overflow-hidden group hover:shadow-md transition-all">
            <div className="flex justify-between items-start z-10 relative">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="bg-emerald-100 p-2 rounded-lg text-emerald-600">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <p className="text-slate-600 font-medium">Pemasukan</p>
                </div>
                <p className="text-2xl font-bold text-emerald-600">+ Rp {currentIncome.toLocaleString('id-ID')}</p>

                {prevIncome > 0 && (
                  <div className={`mt-3 inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium ${incomeChange >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                    <span>{incomeChange >= 0 ? '▲' : '▼'} {Math.abs(incomeChange).toFixed(1)}%</span>
                    <span className="opacity-75">vs bulan lalu</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Expense */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 relative overflow-hidden group hover:shadow-md transition-all">
            <div className="flex justify-between items-start z-10 relative">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="bg-rose-100 p-2 rounded-lg text-rose-600">
                    <TrendingDown className="w-5 h-5" />
                  </div>
                  <p className="text-slate-600 font-medium">Pengeluaran</p>
                </div>
                <p className="text-2xl font-bold text-rose-600">- Rp {currentExpense.toLocaleString('id-ID')}</p>

                {prevExpense > 0 && (
                  <div className={`mt-3 inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium ${expenseChange <= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                    <span>{expenseChange > 0 ? '▲' : '▼'} {Math.abs(expenseChange).toFixed(1)}%</span>
                    <span className="opacity-75">vs bulan lalu</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Gold Price */}
          <GoldPriceCard />

          {/* Currency (USD) */}
          <CurrencyCard />
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-3 space-y-6">

            {/* Chart */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
              <FinancialChart income={currentIncome} expense={currentExpense} />
            </div>

            {/* Transaction List */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-slate-500" />
                  Riwayat Transaksi
                </h3>
                <span className="text-xs font-semibold bg-slate-100 text-slate-500 px-3 py-1 rounded-full">
                  {currentDate.toLocaleString('id-ID', { month: 'long' })}
                </span>
              </div>

              <div className="max-h-[500px] overflow-y-auto">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
                    <p>Memuat data...</p>
                  </div>
                ) : currentMonthTransactions.length === 0 ? (
                  <div className="text-center py-12 text-slate-400">
                    <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
                      <CreditCard className="w-8 h-8 text-slate-300" />
                    </div>
                    <p>Belum ada transaksi di bulan ini</p>
                  </div>
                ) : (
                  <ul className="divide-y divide-slate-50">
                    {currentMonthTransactions.map((t) => {
                      const { Icon, color } = getCategoryIcon(t.category, t.type)
                      return (
                        <li key={t.id} className="flex justify-between items-center p-5 hover:bg-slate-50 transition-colors group">
                          <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${color}`}>
                              <Icon className="w-6 h-6" />
                            </div>
                            <div>
                              <p className="font-semibold text-slate-800 text-base">{t.title}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${t.type === 'pemasukan' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                  {t.category}
                                </span>
                                <span className="text-xs text-slate-400">•</span>
                                <p className="text-xs text-slate-500">{new Date(t.created_at).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                              </div>
                            </div>
                          </div>

                          <div className="text-right flex items-center gap-3">
                            <div className="flex flex-col items-end">
                              <p className={`font-bold text-base ${t.type === 'pemasukan' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {t.type === 'pemasukan' ? '+' : '-'} Rp {t.amount.toLocaleString('id-ID')}
                              </p>
                            </div>

                            {/* Action Buttons (Visible on mobile/all) */}
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleEditClick(t)}
                                className="p-2 bg-slate-50 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded-lg transition-all"
                                title="Edit"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => deleteTransaction(t.id)}
                                className="p-2 bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-all"
                                title="Hapus"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Action Button (Mobile & Desktop) */}
      <button
        onClick={() => {
          resetForm()
          setIsModalOpen(true)
        }}
        className="fixed bottom-6 right-6 md:bottom-10 md:right-10 bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-lg hover:shadow-blue-500/30 transition-all active:scale-90 z-40"
      >
        <Plus className="w-8 h-8" />
      </button>

      {/* Add/Edit Transaction Overlay/Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4 sm:p-6">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
            onClick={resetForm}
          ></div>

          <div className="bg-white w-full max-w-lg rounded-t-3xl md:rounded-3xl shadow-2xl z-50 p-6 relative animate-in slide-in-from-bottom-10 fade-in zoom-in-95 duration-200 h-[85vh] md:h-auto overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-800">
                {editingId ? 'Edit Transaksi' : 'Tambah Transaksi'}
              </h3>
              <button
                onClick={resetForm}
                className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTransaction} className="space-y-6">

              {/* Type Switcher */}
              <div className="flex bg-slate-100 p-1 rounded-2xl">
                <button
                  type="button"
                  onClick={() => { setType('pemasukan'); setCategory(''); }}
                  className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${type === 'pemasukan' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Pemasukan
                </button>
                <button
                  type="button"
                  onClick={() => { setType('pengeluaran'); setCategory(''); }}
                  className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${type === 'pengeluaran' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Pengeluaran
                </button>
              </div>

              {/* Amount Input */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Jumlah (Rp)</label>
                <input
                  type="number"
                  placeholder="0"
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all font-bold text-2xl"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  autoFocus={!editingId}
                />
              </div>

              {/* Category Grid */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Kategori <span className="text-red-500 font-normal text-xs">*Wajib</span></label>
                <div className="grid grid-cols-4 gap-3">
                  {CATEGORIES[type].map((cat) => {
                    const isSelected = category === cat.name
                    return (
                      <button
                        key={cat.name}
                        type="button"
                        onClick={() => setCategory(cat.name)}
                        className={`flex flex-col items-center justify-center p-3 rounded-2xl transition-all border-2 ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-transparent hover:bg-slate-50'}`}
                      >
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${cat.color}`}>
                          <cat.icon className="w-5 h-5" />
                        </div>
                        <span className={`text-[10px] font-medium text-center leading-tight ${isSelected ? 'text-blue-700' : 'text-slate-600'}`}>
                          {cat.name}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Title Input */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Catatan <span className="text-slate-400 font-normal text-xs">(Opsional)</span>
                </label>
                <input
                  type="text"
                  placeholder={category ? `Contoh: ${category} Enak` : "Catatan Transaksi"}
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all font-medium"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 text-white font-bold py-4 px-6 rounded-2xl hover:bg-blue-700 active:scale-[0.98] transition-all shadow-lg shadow-blue-500/30"
              >
                {editingId ? 'Update Transaksi' : 'Simpan Transaksi'}
              </button>
            </form>
          </div>
        </div>
      )}

    </main>
  )
}
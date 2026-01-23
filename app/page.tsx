'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import FinancialChart from '@/components/FinancialChart'
import GoldPriceCard from '@/components/GoldPriceCard'
import CurrencyCard from '@/components/CurrencyCard'
import CalendarCard from '@/components/CalendarCard'
import MoneyInput from '@/components/MoneyInput'
import { Wallet, Transaction, Goal } from '@/types'
import {
  Plus,
  Trash2,
  TrendingUp,
  TrendingDown,
  Wallet as WalletIcon,
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
  Pencil,
  Eye,
  EyeOff,
  Info
} from 'lucide-react'

// --- Constants ---
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
  const [wallets, setWallets] = useState<Wallet[]>([])
  const [goals, setGoals] = useState<Goal[]>([])
  const [showSavings, setShowSavings] = useState(false)

  // Form State
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [type, setType] = useState<'pemasukan' | 'pengeluaran'>('pemasukan')
  const [category, setCategory] = useState('')
  const [selectedWalletId, setSelectedWalletId] = useState<string>('')
  const [customDate, setCustomDate] = useState('')

  // Edit State
  const [editingId, setEditingId] = useState<number | null>(null)

  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [showWelcome, setShowWelcome] = useState(false)

  // 1. Ambil data saat aplikasi dibuka
  useEffect(() => {
    fetchTransactions()
    fetchWallets()
    fetchGoals()
    checkAndCreateDefaultWallets()
  }, [])

  const fetchTransactions = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('transactions')
      .select('*, wallets(name)') // Join to get wallet name if needed
      .order('date', { ascending: false }) // Order by custom date

    if (error) {
      console.error('Error fetching transactions:', error)
    } else {
      setTransactions(data as any[] || [])
      setLoading(false)
    }
  }

  const fetchWallets = async () => {
    const { data } = await supabase.from('wallets').select('*')
    setWallets(data || [])
  }

  const fetchGoals = async () => {
    const { data } = await supabase.from('goals').select('*').order('created_at', { ascending: false })
    setGoals(data || [])
  }

  // Check and create default wallets for first-time users
  const hasCheckedWallets = useRef(false)
  const checkAndCreateDefaultWallets = async () => {
    if (hasCheckedWallets.current) return
    hasCheckedWallets.current = true

    const { data: existingWallets } = await supabase
      .from('wallets')
      .select('*')

    if (!existingWallets || existingWallets.length === 0) {
      const defaultWallets = [
        {
          name: 'Tunai 💵',
          type: 'cash',
          category: 'active',
          balance: 0,
          created_at: new Date().toISOString()
        },
        {
          name: 'Rekening Bank 🏦',
          type: 'bank',
          category: 'active',
          balance: 0,
          created_at: new Date().toISOString()
        }
      ]

      const { error } = await supabase
        .from('wallets')
        .insert(defaultWallets)

      if (!error) {
        await fetchWallets() // Refresh wallets
        setShowWelcome(true) // Show welcome message
      }
    }
  }

  // Quick Savings Setup for Onboarding
  const [welcomeStep, setWelcomeStep] = useState(1)
  const createQuickSavingsWallet = async () => {
    const { error } = await supabase
      .from('wallets')
      .insert({
        name: 'Tabungan 🏦',
        type: 'bank',
        category: 'savings',
        balance: 0,
        created_at: new Date().toISOString()
      })

    if (!error) {
      await fetchWallets()
      setShowWelcome(false) // Close modal
      alert('Dompet "Tabungan" berhasil dibuat! 🎉')
    }
  }

  // 2. Fungsi Simpan (Tambah/Edit) Transaksi
  const handleSaveTransaction = async (e: React.FormEvent) => {
    e.preventDefault()

    const finalTitle = title || category
    const amountNum = parseFloat(amount)

    if (!finalTitle || !amountNum || amountNum <= 0 || isNaN(amountNum) || !category || !selectedWalletId || !customDate) {
      return alert("Mohon lengkapi data dengan benar! Jumlah harus lebih dari 0.")
    }

    const payload = {
      title: finalTitle,
      amount: amountNum,
      type,
      category,
      wallet_id: parseInt(selectedWalletId),
      date: new Date(customDate).toISOString(),
      created_at: new Date().toISOString() // Fallback
    }

    let error;
    let data;

    if (editingId) {
      // Get old transaction first to rollback the balance
      const { data: oldTransaction } = await supabase
        .from('transactions')
        .select('*')
        .eq('id', editingId)
        .single()

      // Update transaction
      const res = await supabase
        .from('transactions')
        .update(payload)
        .eq('id', editingId)
        .select()
      error = res.error
      data = res.data

      // Update wallet balance if transaction updated successfully
      if (!error && oldTransaction) {
        const wallet = wallets.find(w => w.id === parseInt(selectedWalletId))
        if (wallet) {
          // Rollback old transaction
          let newBalance = wallet.balance
          if (oldTransaction.type === 'pemasukan') {
            newBalance -= oldTransaction.amount
          } else {
            newBalance += oldTransaction.amount
          }

          // Apply new transaction
          if (type === 'pemasukan') {
            newBalance += amountNum
          } else {
            newBalance -= amountNum
          }

          await supabase.from('wallets').update({ balance: newBalance }).eq('id', wallet.id)
          fetchWallets()
        }
      }
    } else {
      // Insert Mode
      const res = await supabase
        .from('transactions')
        .insert([payload])
        .select()
      error = res.error
      data = res.data

      // Update Wallet Balance
      if (!error) {
        const wallet = wallets.find(w => w.id === parseInt(selectedWalletId))
        if (wallet) {
          const newBalance = type === 'pemasukan'
            ? wallet.balance + parseFloat(amount)
            : wallet.balance - parseFloat(amount)

          await supabase.from('wallets').update({ balance: newBalance }).eq('id', wallet.id)
          fetchWallets() // Refresh wallets
        }
      }
    }

    if (error) {
      console.error(error)
      alert("Gagal menyimpan transaksi")
    } else {
      fetchTransactions()
      resetForm()
    }
  }

  const resetForm = () => {
    setTitle('')
    setAmount('')
    setCategory('')
    setType('pemasukan')
    setSelectedWalletId('')
    setCustomDate(new Date().toISOString().split('T')[0])
    setEditingId(null)
    setIsModalOpen(false)
  }

  const handleEditClick = (t: Transaction) => {
    setEditingId(t.id)
    setTitle(t.title)
    setAmount(t.amount.toString())
    setCategory(t.category)
    setType(t.type)
    setSelectedWalletId(t.wallet_id?.toString() || '')
    setCustomDate(new Date(t.date || t.created_at).toISOString().split('T')[0])
    setIsModalOpen(true)
  }

  // 3. Fungsi Hapus Transaksi
  const deleteTransaction = async (id: number) => {
    if (!confirm('Hapus transaksi? Saldo dompet akan dikembalikan otomatis.')) return;

    // Get transaction before delete to rollback balance
    const { data: transaction } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', id)
      .single()

    if (!transaction) {
      alert('Transaksi tidak ditemukan')
      return
    }

    // Delete transaction
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id)

    if (!error) {
      // Rollback wallet balance
      const wallet = wallets.find(w => w.id === transaction.wallet_id)
      if (wallet) {
        const newBalance = transaction.type === 'pemasukan'
          ? wallet.balance - transaction.amount
          : wallet.balance + transaction.amount

        await supabase.from('wallets').update({ balance: newBalance }).eq('id', wallet.id)
        fetchWallets()
      }

      fetchTransactions()
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
      const tDate = new Date(t.date || t.created_at) // Use custom date
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
    <main className="min-h-screen bg-transparent font-sans text-slate-900 pb-24 md:pb-6 ml-0 md:ml-64 p-6">
      <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* 1. Header Section (Desktop: Order 1, Mobile: Order 1) */}
        <header className="lg:col-span-12 order-1 lg:order-1 flex flex-col md:flex-row justify-between items-center glass shadow-premium-lg p-6 rounded-3xl border border-white/20 relative backdrop-blur-xl card-hover">
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

          <div className="mt-6 md:mt-0 flex flex-col md:items-end gap-4 w-full md:w-auto bg-slate-50 md:bg-transparent p-4 md:p-0 rounded-2xl">
            {/* Active Balance */}
            <div className="text-center md:text-right">
              <div className="flex items-center justify-center md:justify-end gap-1.5 mb-1">
                <p className="text-sm font-medium text-slate-500">Uang Siap Pakai</p>
                <div className="group relative">
                  <Info className="w-3.5 h-3.5 text-slate-400 cursor-help" />
                  <div className="absolute right-0 bottom-full mb-2 hidden group-hover:block w-64 bg-slate-800 text-white text-xs rounded-lg p-2.5 shadow-lg z-50">
                    <div className="font-semibold mb-1">💰 Saldo Aktif</div>
                    Total uang yang ada di semua dompet aktif Anda <strong>saat ini</strong>. Ini adalah uang yang siap digunakan kapan saja.
                    <div className="absolute top-full right-4 -mt-1 border-4 border-transparent border-t-slate-800"></div>
                  </div>
                </div>
              </div>
              <p className="text-2xl md:text-3xl font-extrabold tracking-tight text-blue-600">
                Rp {wallets.filter(w => w.category === 'active' || !w.category).reduce((acc, curr) => acc + curr.balance, 0).toLocaleString('id-ID')}
              </p>
            </div>

            {/* Savings Balance */}
            <div className="text-center md:text-right border-t md:border-none pt-2 md:pt-0">
              <div className="flex items-center justify-center md:justify-end gap-2 mb-1">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-medium text-slate-500">Total Tabungan</p>
                  <div className="group relative">
                    <Info className="w-3.5 h-3.5 text-slate-400 cursor-help" />
                    <div className="absolute right-0 bottom-full mb-2 hidden group-hover:block w-64 bg-slate-800 text-white text-xs rounded-lg p-2.5 shadow-lg z-50">
                      <div className="font-semibold mb-1">🏦 Tabungan</div>
                      Uang yang disimpan untuk tujuan khusus. <strong>Tidak dihitung</strong> dalam saldo aktif.
                      <div className="absolute top-full right-4 -mt-1 border-4 border-transparent border-t-slate-800"></div>
                    </div>
                  </div>
                </div>
                <button onClick={() => setShowSavings(!showSavings)} className="text-slate-400 hover:text-slate-600">
                  {showSavings
                    ? <Eye className="w-4 h-4" />
                    : <EyeOff className="w-4 h-4" />
                  }
                </button>
              </div>
              <p className="text-xl md:text-2xl font-bold text-emerald-600">
                {showSavings
                  ? `Rp ${wallets.filter(w => w.category === 'savings').reduce((acc, curr) => acc + curr.balance, 0).toLocaleString('id-ID')}`
                  : 'Rp ••••••••'
                }
              </p>
            </div>
          </div>


        </header>

        {/* 2. Income Card (Desktop: Order 2, Mobile: Order 2) */}
        <div className="lg:col-span-3 order-2 lg:order-2 glass shadow-premium-lg p-6 rounded-3xl border border-white/20 relative overflow-hidden group card-hover backdrop-blur-xl">
          <div className="flex justify-between items-start z-10 relative">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="bg-emerald-100 p-2 rounded-lg text-emerald-600">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div className="flex items-center gap-1.5">
                  <p className="text-slate-600 font-medium">Pemasukan Bulan Ini</p>
                  <div className="group/tip relative">
                    <Info className="w-3.5 h-3.5 text-slate-400 cursor-help" />
                    <div className="absolute left-0 bottom-full mb-2 hidden group-hover/tip:block w-56 bg-slate-800 text-white text-xs rounded-lg p-2.5 shadow-lg z-50">
                      <div className="font-semibold mb-1">📈 Pemasukan</div>
                      Total uang yang <strong>masuk</strong> ke dompet Anda bulan ini (gaji, bonus, dll)
                      <div className="absolute top-full left-4 -mt-1 border-4 border-transparent border-t-slate-800"></div>
                    </div>
                  </div>
                </div>
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

        {/* 3. Expense Card (Desktop: Order 3, Mobile: Order 3) */}
        <div className="lg:col-span-3 order-3 lg:order-3 glass shadow-premium-lg p-6 rounded-3xl border border-white/20 relative overflow-hidden group card-hover backdrop-blur-xl">
          <div className="flex justify-between items-start z-10 relative">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="bg-rose-100 p-2 rounded-lg text-rose-600">
                  <TrendingDown className="w-5 h-5" />
                </div>
                <div className="flex items-center gap-1.5">
                  <p className="text-slate-600 font-medium">Pengeluaran Bulan Ini</p>
                  <div className="group/tip relative">
                    <Info className="w-3.5 h-3.5 text-slate-400 cursor-help" />
                    <div className="absolute left-0 bottom-full mb-2 hidden group-hover/tip:block w-56 bg-slate-800 text-white text-xs rounded-lg p-2.5 shadow-lg z-50">
                      <div className="font-semibold mb-1">📉 Pengeluaran</div>
                      Total uang yang <strong>keluar</strong> dari dompet Anda bulan ini (belanja, tagihan, dll)
                      <div className="absolute top-full left-4 -mt-1 border-4 border-transparent border-t-slate-800"></div>
                    </div>
                  </div>
                </div>
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

        {/* 4. Transaction List (Desktop: Order 9 [Bottom], Mobile: Order 4 - MOVED UP!) */}
        <div className="lg:col-span-12 order-4 lg:order-9 glass shadow-premium-lg rounded-3xl border border-white/20 overflow-hidden relative z-10 backdrop-blur-xl card-hover">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-slate-500" />
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
                  const walletName = wallets.find(w => w.id === t.wallet_id)?.name
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
                            {walletName && (
                              <span className="text-[10px] font-medium bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full flex items-center gap-1">
                                <WalletIcon className="w-3 h-3" /> {walletName}
                              </span>
                            )}
                            <span className="text-xs text-slate-400">•</span>
                            <p className="text-xs text-slate-500">{new Date(t.date || t.created_at).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
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

        {/* 5. Chart (Desktop: Order 6, Mobile: Order 5) */}
        <div className="lg:col-span-8 order-5 lg:order-6">
          <FinancialChart income={currentIncome} expense={currentExpense} />
        </div>

        {/* 6. Calendar Widget (Desktop: Order 7, Mobile: Order 6) */}
        <div className="lg:col-span-4 order-6 lg:order-7">
          <CalendarCard />
        </div>

        {/* 7. Wallet Summary Mini (Desktop: Order 8, Mobile: Order 7) */}
        <div className="lg:col-span-4 order-7 lg:order-8 glass shadow-premium-lg p-6 rounded-3xl border border-white/20 backdrop-blur-xl card-hover">
          <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <WalletIcon className="w-5 h-5 text-blue-600" />
            Dompet
          </h3>
          <div className="space-y-3">
            {wallets.slice(0, 3).map(w => (
              <div key={w.id} className="flex justify-between items-center text-sm">
                <span className="text-slate-600">{w.name}</span>
                <span className="font-bold text-slate-800">Rp {w.balance.toLocaleString('id-ID')}</span>
              </div>
            ))}
            {wallets.length === 0 && <p className="text-xs text-slate-400">Belum ada dompet.</p>}
          </div>
        </div>

        {/* 8. Gold Price (Desktop: Order 4, Mobile: Order 8) */}
        <div className="lg:col-span-3 order-8 lg:order-4">
          <GoldPriceCard />
        </div>

        {/* 9. Currency (Desktop: Order 5, Mobile: Order 9) */}
        <div className="lg:col-span-3 order-9 lg:order-5">
          <CurrencyCard />
        </div>

      </div>

      {/* Floating Action Button (Mobile & Desktop) */}
      <button
        onClick={() => {
          resetForm()
          setIsModalOpen(true)
        }}
        className="fixed bottom-6 right-6 md:bottom-10 md:right-10 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white p-4 rounded-full shadow-premium-lg hover:shadow-purple-500/50 transition-all active:scale-90 hover:scale-110 z-40"
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

          <div className="glass backdrop-blur-2xl w-full max-w-lg rounded-t-3xl md:rounded-3xl shadow-premium-lg border border-white/20 z-50 p-6 relative animate-in slide-in-from-bottom-10 fade-in zoom-in-95 duration-200 h-[85vh] md:h-auto overflow-y-auto">
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

              {/* Date & Wallet Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Tanggal</label>
                  <input
                    type="date"
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    value={customDate}
                    onChange={(e) => setCustomDate(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Dompet</label>
                  <select
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    value={selectedWalletId}
                    onChange={(e) => setSelectedWalletId(e.target.value)}
                    required
                  >
                    <option value="" disabled>Pilih Dompet</option>
                    {wallets.map(w => (
                      <option key={w.id} value={w.id}>{w.name} (Rp {w.balance.toLocaleString('id-ID')})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Amount Input */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Jumlah (Rp)</label>
                <MoneyInput
                  value={amount}
                  onChange={setAmount}
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

      {/* Premium Onboarding Wizard */}
      {showWelcome && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
            onClick={() => setShowWelcome(false)}
          ></div>

          <div className="glass backdrop-blur-2xl w-full max-w-lg rounded-3xl shadow-premium-lg border border-white/20 z-50 p-8 relative animate-in slide-in-from-bottom-10 fade-in zoom-in-95 duration-300">
            {/* Steps Indicator */}
            <div className="flex gap-2 mb-6 justify-center">
              <div className={`h-1.5 rounded-full transition-all duration-300 ${welcomeStep === 1 ? 'w-8 bg-blue-600' : 'w-2 bg-slate-200'}`}></div>
              <div className={`h-1.5 rounded-full transition-all duration-300 ${welcomeStep === 2 ? 'w-8 bg-blue-600' : 'w-2 bg-slate-200'}`}></div>
            </div>

            {welcomeStep === 1 ? (
              /* STEP 1: ACTIVE WALLETS INTRO */
              <div className="text-center">
                <div className="text-6xl mb-4 animate-bounce">🎉</div>

                <h2 className="text-2xl font-bold text-slate-800 mb-2">
                  Selamat Datang di My Money!
                </h2>
                <p className="text-slate-600 mb-6 text-sm">
                  Kami sudah siapkan 2 dompet untuk transaksi harian Anda:
                </p>

                {/* Active Wallets Preview */}
                <div className="bg-slate-50 rounded-2xl p-4 mb-6 space-y-3 text-left">
                  <div className="flex items-start gap-3 bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                    <div className="text-2xl mt-1">💵</div>
                    <div className="flex-1">
                      <div className="flex justify-between items-center">
                        <p className="font-bold text-slate-800">Tunai</p>
                        <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">Saldo Aktif</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">Untuk uang cash sehari-hari</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                    <div className="text-2xl mt-1">🏦</div>
                    <div className="flex-1">
                      <div className="flex justify-between items-center">
                        <p className="font-bold text-slate-800">Rekening Bank</p>
                        <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">Saldo Aktif</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">Untuk transfer & belanja online</p>
                    </div>
                  </div>
                </div>

                {/* Education Box */}
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6 text-left flex gap-3">
                  <div className="text-xl">💡</div>
                  <div>
                    <p className="text-xs text-blue-900 font-bold mb-1">Info Penting</p>
                    <p className="text-xs text-blue-800 leading-relaxed">
                      <strong>Saldo Aktif</strong> adalah uang yang siap dibelanjakan. Pisahkan dari <strong>Tabungan</strong> agar tidak terpakai!
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-3">
                  <button
                    onClick={() => setWelcomeStep(2)}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-6 rounded-2xl transition-all active:scale-[0.98] shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2"
                  >
                    Lanjut: Setup Tabungan ➡️
                  </button>
                  <button
                    onClick={() => setShowWelcome(false)}
                    className="w-full bg-white hover:bg-slate-50 text-slate-600 font-medium py-3 rounded-2xl transition-colors text-sm"
                  >
                    Mulai Tracking Saja
                  </button>
                </div>
              </div>
            ) : (
              /* STEP 2: SAVINGS SETUP (OPTIONAL) */
              <div className="text-center animate-in slide-in-from-right-10 duration-300">
                <div className="text-5xl mb-4">🏦</div>

                <h2 className="text-2xl font-bold text-slate-800 mb-2">
                  Setup Tabungan (Opsional)
                </h2>
                <p className="text-slate-600 mb-8 text-sm px-4">
                  Pisahkan uang untuk kebutuhan darurat agar aman & tidak terpakai foya-foya!
                </p>

                {/* Savings Preview Card */}
                <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-6 text-white text-left mb-8 shadow-xl shadow-blue-500/20 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10 text-6xl">🛡️</div>
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <p className="text-blue-100 text-xs font-medium mb-1">Dompet Baru</p>
                      <h3 className="text-xl font-bold">Tabungan 🏦</h3>
                    </div>
                    <span className="bg-white/20 backdrop-blur-sm px-2 py-1 rounded-lg text-[10px] font-medium border border-white/20">
                      Tabungan
                    </span>
                  </div>
                  <p className="text-3xl font-bold mb-1">Rp 0</p>
                  <p className="text-blue-100 text-xs">Saldo awal</p>
                </div>

                {/* Actions */}
                <div className="space-y-3">
                  <button
                    onClick={createQuickSavingsWallet}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 px-6 rounded-2xl transition-all active:scale-[0.98] shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-2"
                  >
                    ✅ Buat Dompet Tabungan
                  </button>
                  <button
                    onClick={() => setShowWelcome(false)}
                    className="w-full bg-white hover:bg-slate-50 text-slate-500 font-medium py-3 rounded-2xl transition-colors text-sm"
                  >
                    Lewati, nanti saja
                  </button>
                </div>

                <button
                  onClick={() => setWelcomeStep(1)}
                  className="mt-4 text-xs text-slate-400 hover:text-slate-600"
                >
                  ⬅️ Kembali
                </button>
              </div>
            )}
          </div>
        </div>
      )}

    </main>
  )
}
'use client'
import Link from 'next/link'
import { useEffect, useState, useRef, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/useToast'
import { useConfirm } from '@/hooks/useConfirm'
import { useSuccessModal } from '@/hooks/useSuccessModal'
import FinancialChart from '@/components/FinancialChart'
import GoldPriceCard from '@/components/GoldPriceCard'
import CurrencyCard from '@/components/CurrencyCard'
import CalendarCard from '@/components/CalendarCard'
import MoneyInput from '@/components/MoneyInput'
import RecurringBillsList from '@/components/RecurringBillsList'
import { Wallet, Transaction, Goal, Budget, Debt } from '@/types'
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
  Info,
  AlertTriangle,
  StickyNote,
  Settings,
  User
} from 'lucide-react'

interface Note {
  id: number
  title: string
  content: string
  created_at: string
  updated_at: string
}

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
  const { showToast } = useToast()
  const { showConfirm } = useConfirm()
  const { showSuccess } = useSuccessModal()

  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [wallets, setWallets] = useState<Wallet[]>([])
  const [goals, setGoals] = useState<Goal[]>([])
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [latestNote, setLatestNote] = useState<Note | null>(null)
  const [noteCount, setNoteCount] = useState(0)
  const [showSavings, setShowSavings] = useState(false)
  // Debt State
  const [debts, setDebts] = useState<Debt[]>([])
  const [isSplitBill, setIsSplitBill] = useState(false)
  const [splitEntries, setSplitEntries] = useState<{name: string, amount: string}[]>([{ name: '', amount: '' }])
  const [showDebtModal, setShowDebtModal] = useState(false)
  const [selectedDebt, setSelectedDebt] = useState<Debt | null>(null)
  const [repayingWalletId, setRepayingWalletId] = useState<number | null>(null)

  // Form State
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [type, setType] = useState<'pemasukan' | 'pengeluaran'>('pemasukan')
  const [category, setCategory] = useState('')
  const [selectedWalletId, setSelectedWalletId] = useState<string>('')
  const [customDate, setCustomDate] = useState('')
  // Piutang State
  const [isPiutang, setIsPiutang] = useState(false)
  const [piutangPerson, setPiutangPerson] = useState('')
  // Talangan State
  const [isTalangan, setIsTalangan] = useState(false)
  const [talanganPerson, setTalanganPerson] = useState('')

  // Edit State
  const [editingId, setEditingId] = useState<number | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showBalance, setShowBalance] = useState(false)
  const [showActiveBalance, setShowActiveBalance] = useState(false)
  const [showIncome, setShowIncome] = useState(false)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [showWelcome, setShowWelcome] = useState(false)
  const [welcomeStep, setWelcomeStep] = useState(1)
  const [billsUpdateTrigger, setBillsUpdateTrigger] = useState(0)
  const [creatingWallet, setCreatingWallet] = useState(false)

  // Tooltip States
  const [showTotalTooltip, setShowTotalTooltip] = useState(false)
  const [showActiveTooltip, setShowActiveTooltip] = useState(false)
  const [showIncomeTooltip, setShowIncomeTooltip] = useState(false)
  const [showExpenseTooltip, setShowExpenseTooltip] = useState(false)

  const handleBillsUpdate = () => {
    setBillsUpdateTrigger(prev => prev + 1)
    fetchTransactions() // Refresh transactions list
    fetchWallets()      // Refresh wallet balances
  }

  // Settings State
  const [showSettings, setShowSettings] = useState(false)


  // Initialize with defaults (Hydration Safe)
  const [filterMode, setFilterMode] = useState<'monthly' | 'custom'>('monthly')
  const [customRange, setCustomRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0]
  })
  const [isInitialized, setIsInitialized] = useState(false)

  // Settings Sync - Simplified (No Auth Required)
  useEffect(() => {
    // Load settings from Supabase on mount
    const loadSettings = async () => {
      const { data: settings } = await supabase
        .from('user_settings')
        .select('*')
        .eq('id', 1) // Use single row with id=1 for single-user app
        .single()

      if (settings) {
        if (settings.filter_mode) setFilterMode(settings.filter_mode as 'monthly' | 'custom')
        if (settings.custom_start_date && settings.custom_end_date) {
          setCustomRange({
            start: settings.custom_start_date,
            end: settings.custom_end_date
          })
        }
      } else {
        // Create initial settings row if doesn't exist
        await supabase
          .from('user_settings')
          .insert({
            id: 1,
            filter_mode: 'monthly',
            custom_start_date: customRange.start,
            custom_end_date: customRange.end,
            updated_at: new Date().toISOString()
          })
      }
      setIsInitialized(true)
    }

    loadSettings()
  }, [])

  // Save to Supabase when settings change (debounced to prevent excessive writes)
  useEffect(() => {
    if (!isInitialized) return

    const timeoutId = setTimeout(() => {
      const saveSettings = async () => {
        await supabase
          .from('user_settings')
          .update({
            filter_mode: filterMode,
            custom_start_date: customRange.start,
            custom_end_date: customRange.end,
            updated_at: new Date().toISOString()
          })
          .eq('id', 1)
      }

      saveSettings()
    }, 500) // Debounce 500ms to batch rapid changes

    return () => clearTimeout(timeoutId)
  }, [filterMode, customRange, isInitialized])




  // Helper: Get Period Date Range String
  const getPeriodLabel = () => {
    if (filterMode === 'monthly') {
      return currentDate.toLocaleString('id-ID', { month: 'long', year: 'numeric' })
    } else {
      const s = new Date(customRange.start)
      const e = new Date(customRange.end)
      return `${s.getDate()} ${s.toLocaleString('id-ID', { month: 'short' })} - ${e.getDate()} ${e.toLocaleString('id-ID', { month: 'short' })} ${e.getFullYear()}`
    }
  }

  // 1. Ambil data saat aplikasi dibuka
  useEffect(() => {
    fetchTransactions()
    fetchWallets()
    fetchGoals()
    fetchBudgets()
    fetchDebts()
    fetchLatestNote()
    checkAndCreateDefaultWallets()
  }, [])

  const fetchLatestNote = async () => {
    // 1. Get Latest Note
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single()

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows found, not a real error
      console.error('Error fetching latest note:', error)
      return
    }

    if (data) {
      setLatestNote(data)

      // 2. Get Total Count
      const { count, error: countError } = await supabase
        .from('notes')
        .select('*', { count: 'exact', head: true })

      if (!countError && count !== null) setNoteCount(count)
    }
  }

  const fetchTransactions = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('transactions')
      .select('*, wallets(name)') // Join to get wallet name if needed
      .order('created_at', { ascending: false }) // Order by actual creation time

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

  const fetchBudgets = async () => {
    const monthStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-01`
    const { data } = await supabase
      .from('budgets')
      .select('*')
      .eq('month', monthStr)
    setBudgets(data || [])
  }

  const fetchDebts = async () => {
    const { data } = await supabase
      .from('debts')
      .select('*')
      .order('created_at', { ascending: false })
    
    setDebts(data || [])
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

  const createQuickSavingsWallet = async () => {
    setCreatingWallet(true)
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
      showToast('success', 'Dompet "Tabungan" berhasil dibuat! 🎉')
    }
    setCreatingWallet(false)
  }

  // Helper: Fetch saldo wallet terbaru langsung dari DB (anti race condition)
  const fetchFreshWalletBalance = async (walletId: number): Promise<number | null> => {
    const { data, error } = await supabase
      .from('wallets')
      .select('balance')
      .eq('id', walletId)
      .single()
    if (error || !data) return null
    return data.balance
  }

  // 2. Fungsi Simpan (Tambah/Edit) Transaksi
  const handleSaveTransaction = async (e: React.FormEvent) => {
    e.preventDefault()

    const finalTitle = title || category
    const amountNum = parseFloat(amount)
    const newWalletId = parseInt(selectedWalletId)

    if (!finalTitle || !amountNum || amountNum <= 0 || isNaN(amountNum) || !category || !selectedWalletId || !customDate) {
      showToast('warning', 'Mohon lengkapi data dengan benar! Jumlah harus lebih dari 0.')
      return
    }

    setSaving(true)

    // Fetch saldo wallet baru langsung dari DB (anti race condition)
    const freshNewWalletBalance = await fetchFreshWalletBalance(newWalletId)
    if (freshNewWalletBalance === null) {
      showToast('error', 'Dompet tidak ditemukan!')
      setSaving(false)
      return
    }

    // Fix Bug #9: Timezone-safe date — pakai T12:00:00 agar tidak shift 1 hari di WIB
    const safeDate = new Date(`${customDate}T12:00:00`).toISOString()

    const payload = {
      title: finalTitle,
      amount: amountNum,
      type,
      category,
      wallet_id: newWalletId,
      date: safeDate,
      created_at: new Date().toISOString(),
      is_piutang: type === 'pemasukan' ? isPiutang : false,
      piutang_person: type === 'pemasukan' && isPiutang ? piutangPerson.trim() : null,
      is_talangan: type === 'pengeluaran' ? isTalangan : false,
      talangan_person: type === 'pengeluaran' && isTalangan ? talanganPerson.trim() : null
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

      if (!oldTransaction) {
        showToast('error', 'Transaksi tidak ditemukan')
        setSaving(false)
        return
      }

      const oldWalletId = oldTransaction.wallet_id
      const isSameWallet = oldWalletId === newWalletId

      // Fix Bug #2: Selalu fetch saldo fresh dari DB sebelum update
      // Fix Bug #1: Handle kasus wallet lama ≠ wallet baru
      if (isSameWallet) {
        // Rollback & apply di wallet yang sama
        // Saldo setelah rollback transaksi lama
        let balanceAfterRollback = freshNewWalletBalance
        if (oldTransaction.type === 'pemasukan') {
          balanceAfterRollback -= oldTransaction.amount
        } else {
          balanceAfterRollback += oldTransaction.amount
        }

        // Cek saldo cukup setelah rollback
        if (type === 'pengeluaran' && balanceAfterRollback < amountNum) {
          showToast('error', `Saldo tidak mencukupi setelah perubahan! Saldo tersedia: Rp ${balanceAfterRollback.toLocaleString('id-ID')}`)
          setSaving(false)
          return
        }

        // Update transaksi
        const res = await supabase.from('transactions').update(payload).eq('id', editingId).select()
        error = res.error
        data = res.data

        if (!error) {
          let finalBalance = balanceAfterRollback
          if (type === 'pemasukan') finalBalance += amountNum
          else finalBalance -= amountNum
          await supabase.from('wallets').update({ balance: finalBalance }).eq('id', newWalletId)
          fetchWallets()
        }
      } else {
        // Fix Bug #1: Wallet BERBEDA — harus rollback wallet lama & apply ke wallet baru
        // Fetch saldo wallet lama dari DB
        const freshOldWalletBalance = await fetchFreshWalletBalance(oldWalletId)
        if (freshOldWalletBalance === null) {
          showToast('error', 'Wallet lama tidak ditemukan!')
          setSaving(false)
          return
        }

        // Cek saldo wallet baru cukup untuk pengeluaran
        if (type === 'pengeluaran' && freshNewWalletBalance < amountNum) {
          const walletName = wallets.find(w => w.id === newWalletId)?.name || 'Dompet baru'
          showToast('error', `Saldo tidak mencukupi! Saldo ${walletName}: Rp ${freshNewWalletBalance.toLocaleString('id-ID')}`)
          setSaving(false)
          return
        }

        // Update transaksi
        const res = await supabase.from('transactions').update(payload).eq('id', editingId).select()
        error = res.error
        data = res.data

        if (!error) {
          // 1. Rollback saldo wallet LAMA (undo dampak transaksi lama)
          let oldWalletNewBalance = freshOldWalletBalance
          if (oldTransaction.type === 'pemasukan') {
            oldWalletNewBalance -= oldTransaction.amount
          } else {
            oldWalletNewBalance += oldTransaction.amount
          }
          await supabase.from('wallets').update({ balance: oldWalletNewBalance }).eq('id', oldWalletId)

          // 2. Apply transaksi baru ke wallet BARU
          let newWalletNewBalance = freshNewWalletBalance
          if (type === 'pemasukan') {
            newWalletNewBalance += amountNum
          } else {
            newWalletNewBalance -= amountNum
          }
          await supabase.from('wallets').update({ balance: newWalletNewBalance }).eq('id', newWalletId)

          fetchWallets()
        }
      }
    } else {
      // Insert Mode: cek saldo fresh dari DB
      if (type === 'pengeluaran' && freshNewWalletBalance < amountNum) {
        const walletName = wallets.find(w => w.id === newWalletId)?.name || 'Dompet'
        showToast('error', `Saldo tidak mencukupi! Saldo ${walletName}: Rp ${freshNewWalletBalance.toLocaleString('id-ID')}`)
        setSaving(false)
        return
      }

      const res = await supabase.from('transactions').insert([payload]).select()
      error = res.error
      data = res.data

      // Fix Bug #2: Update saldo berdasarkan nilai fresh dari DB
      if (!error) {
        const newBalance = type === 'pemasukan'
          ? freshNewWalletBalance + amountNum
          : freshNewWalletBalance - amountNum
        await supabase.from('wallets').update({ balance: newBalance }).eq('id', newWalletId)
        fetchWallets()
      }
    }

    if (error) {
      console.error(error)
      showToast('error', 'Gagal menyimpan transaksi')
    } else {
      // Split Bill / Debt Creation
      if (data && data.length > 0 && isSplitBill && type === 'pengeluaran') {
        const validDebts = splitEntries.filter(e => e.name.trim() !== '' && parseFloat(e.amount) > 0)
        
        if (validDebts.length > 0) {
          const debtPayloads = validDebts.map(d => ({
            person_name: d.name,
            amount: parseFloat(d.amount),
            status: 'pending',
            original_transaction_id: data[0].id,
            created_at: new Date().toISOString()
          }))

          await supabase.from('debts').insert(debtPayloads)
          fetchDebts()
        }
      }

      showSuccess({
        type: editingId ? 'edit' : 'create',
        message: editingId ? 'Transaksi berhasil diperbarui!' : 'Transaksi baru berhasil dicatat!'
      })
      fetchTransactions()
      fetchBudgets()
      resetForm()
    }

    setSaving(false)
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
    // Reset Debt Form
    setIsSplitBill(false)
    setSplitEntries([{ name: '', amount: '' }])
    // Reset Piutang Form
    setIsPiutang(false)
    setPiutangPerson('')
    // Reset Talangan Form
    setIsTalangan(false)
    setTalanganPerson('')
  }

  const handleEditClick = (t: Transaction) => {
    setEditingId(t.id)
    setTitle(t.title)
    setAmount(t.amount.toString())
    setCategory(t.category)
    setType(t.type)
    setSelectedWalletId(t.wallet_id?.toString() || '')
    setCustomDate(new Date(t.date || t.created_at).toISOString().split('T')[0])
    // Load Piutang State
    setIsPiutang(t.is_piutang || false)
    setPiutangPerson(t.piutang_person || '')
    // Load Talangan State
    setIsTalangan(t.is_talangan || false)
    setTalanganPerson(t.talangan_person || '')
    setIsModalOpen(true)
  }

  // 3. Fungsi Hapus Transaksi
  const deleteTransaction = async (id: number) => {
    const confirmed = await showConfirm({
      title: 'Hapus Transaksi?',
      message: 'Saldo dompet akan dikembalikan otomatis. Tindakan ini tidak dapat dibatalkan.',
      confirmText: 'Ya, Hapus',
      cancelText: 'Batal'
    })

    if (!confirmed) return

    // Get transaction before delete to rollback balance
    const { data: transaction } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', id)
      .single()

    if (!transaction) {
      showToast('error', 'Transaksi tidak ditemukan')
      return
    }

    // Check if this transaction is a Debt Payment (Income)
    const { data: linkedDebtPayment } = await supabase
      .from('debts')
      .select('*')
      .eq('payment_transaction_id', id)
      .single()

    if (linkedDebtPayment) {
      // Revert debt status to pending
      await supabase.from('debts').update({
        status: 'pending',
        payment_wallet_id: null,
        payment_transaction_id: null,
        paid_at: null
      }).eq('id', linkedDebtPayment.id)
    }

    // Check if this transaction Created Debts (Expense)
    const { data: createdDebts } = await supabase
      .from('debts')
      .select('*')
      .eq('original_transaction_id', id)

    if (createdDebts && createdDebts.length > 0) {
      // Find payments linked to these debts (completed repayments)
      const paymentTransactionIds = createdDebts
        .map(d => d.payment_transaction_id)
        .filter(pid => pid !== null) as number[]

      const hasPayments = paymentTransactionIds.length > 0
      
      const confirmMessage = hasPayments
        ? `Transaksi ini memiliki ${createdDebts.length} data piutang dan ${paymentTransactionIds.length} pelunasan yang sudah tercatat. Menghapus ini akan membatalkan pelunasan, mengembalikan saldo dompet, dan menghapus piutang. Lanjutkan?`
        : `Transaksi ini memiliki ${createdDebts.length} data piutang terkait. Menghapus transaksi ini akan menghapus data piutang tersebut juga. Lanjutkan?`

      const confirmDelete = await showConfirm({
        title: 'Hapus Transaksi & Piutang?',
        message: confirmMessage,
        confirmText: 'Ya, Hapus Semua',
        cancelText: 'Batal'
      })

      if (!confirmDelete) return

      setDeletingId(id)

      // 1. Handle Cascade Delete for Repayment Transactions (Rollback Balance First)
      if (hasPayments) {
         // Fetch payment transactions details for balance rollback
         const { data: paymentTrx } = await supabase
            .from('transactions')
            .select('*')
            .in('id', paymentTransactionIds)
         
         if (paymentTrx && paymentTrx.length > 0) {
            for (const p of paymentTrx) {
               // Fix Bug #3: Fetch saldo fresh dari DB (bukan dari state lokal)
               const freshBalance = await fetchFreshWalletBalance(p.wallet_id)
               if (freshBalance !== null) {
                  // Rollback: Repayment adalah Pemasukan, maka dikurangi
                  await supabase.from('wallets').update({ balance: freshBalance - p.amount }).eq('id', p.wallet_id)
               }
            }
         }
      }

      // 2. Delete the linked debts (Crucial: Delete this FIRST to remove FK references)
      const { error: debtDelError } = await supabase.from('debts').delete().eq('original_transaction_id', id)
      
      if (debtDelError) {
         console.error('Error deleting debts:', debtDelError)
         showToast('error', 'Gagal menghapus sebagian data piutang')
         setDeletingId(null)
         return // Stop if critical failure
      }

      // 3. Now it is safe to delete Payment Transactions
       if (hasPayments) {
          const { error: delError } = await supabase.from('transactions').delete().in('id', paymentTransactionIds)
          if (delError) console.error('Error deleting payment trx:', delError)
       }
    } else {
        // If not a debt creation transaction, handle simple debt payment check or simple transaction
        // Check if this transaction is a Debt Payment (Income) - moved logic slightly but keeping existing flow structure
    }

    // Set deletingId for simple transactions too if not set above (logic is slightly complex due to nested if, let's simplify: set it once after confirm)
    if (!createdDebts || createdDebts.length === 0) {
        setDeletingId(id)
    }

    // Delete transaction
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id)

    if (!error) {
      // Fix Bug #3: Rollback saldo pakai fetch fresh dari DB, bukan state lokal
      if (transaction.wallet_id) {
        const freshBalance = await fetchFreshWalletBalance(transaction.wallet_id)
        if (freshBalance !== null) {
          const restoredBalance = transaction.type === 'pemasukan'
            ? freshBalance - transaction.amount
            : freshBalance + transaction.amount
          await supabase.from('wallets').update({ balance: restoredBalance }).eq('id', transaction.wallet_id)
        }
      }
      fetchWallets()

      showSuccess({
        type: 'delete',
        message: 'Transaksi berhasil dihapus dan saldo dompet dikembalikan.'
      })
      fetchTransactions()
      fetchDebts()
    } else {
      console.error('Error deleting transaction:', error)
      showToast('error', 'Gagal menghapus transaksi (mungkin terikat data lain)')
    }
    
    // Check if this was a bill payment and delete the record if so
    // This ensures the bill status resets to "Unpaid"
    console.log('Checking for linked bill payments for transaction:', id)
    const { data: deletedBills, error: billPayError } = await supabase
        .from('bill_payments')
        .delete()
        .eq('transaction_id', id)
        .select()
    
    if (billPayError) {
        console.error('Error deleting bill payment:', billPayError)
    }

    // FALLBACK: If standard delete failed (legacy data), try to find by name and month
    let finalDeletedBills = deletedBills
    if (!billPayError && (!deletedBills || deletedBills.length === 0)) {
        console.log('No direct link found. Trying fallback by name and month...', transaction)
        
        if (transaction && transaction.title && transaction.date) {
             const txMonth = new Date(transaction.date).toISOString().slice(0, 7)
             const txTitle = transaction.title.trim()

             // 1. Find bill by name
             const { data: foundBill } = await supabase
                .from('recurring_bills')
                .select('id')
                .eq('name', txTitle)
                .single()
             
             if (foundBill) {
                 console.log('Found potential bill match:', foundBill)
                 // 2. Find and delete payment for this bill in this month
                 // Only if transaction_id is NULL (safe to delete, implies legacy)
                 // OR just delete it because we are deleting the transaction anyway?
                 // Safer: delete where bill_id and month matches.
                  const { data: fallbackDeleted, error: fallbackError } = await supabase
                    .from('bill_payments')
                    .delete()
                    .eq('bill_id', foundBill.id)
                    .eq('month', txMonth)
                    .select()
                  
                  if (!fallbackError && fallbackDeleted && fallbackDeleted.length > 0) {
                      console.log('Fallback delete successful:', fallbackDeleted)
                      finalDeletedBills = fallbackDeleted
                  }
             } else {
                 console.log('No bill found with name:', txTitle)
             }
        }
    }

    if (finalDeletedBills && finalDeletedBills.length > 0) {
        console.log('Deleted bill payment:', finalDeletedBills)
        showToast('success', 'Status tagihan terkait berhasil di-reset!')
        // If a bill payment was deleted, trigger update to refresh RecurringBillsList
        setBillsUpdateTrigger(prev => prev + 1)
    } else {
        console.log('No linked bill payment found for this transaction.')
        // Setup fallback: try to find by bill_id/month if transaction_id is missing? 
        // No, let's just trigger update anyway to be safe.
        setBillsUpdateTrigger(prev => prev + 1)
    }

    setDeletingId(null)
  }
  const markDebtAsPaid = async (debt: Debt, targetWalletId: number) => {
     setRepayingWalletId(targetWalletId)

     // 1. Create Income Transaction
     const { data: trx, error: trxError } = await supabase.from('transactions').insert({
       title: `Pelunasan Piutang: ${debt.person_name}`,
       amount: debt.amount,
       type: 'pemasukan',
       category: 'Lainnya',
       wallet_id: targetWalletId,
       date: new Date().toISOString(),
       created_at: new Date().toISOString()
     }).select()

     if (trxError) {
       showToast('error', 'Gagal membuat transaksi pelunasan')
       setRepayingWalletId(null)
       return
     }

     // 2. Update Debt Status
     const { error: debtError } = await supabase.from('debts').update({
       status: 'paid',
       payment_wallet_id: targetWalletId,
       payment_transaction_id: trx[0].id,
       paid_at: new Date().toISOString()
     }).eq('id', debt.id)

     // 3. Fix Bug #2: Update saldo pakai fresh balance dari DB
     const freshBalance = await fetchFreshWalletBalance(targetWalletId)
     if (freshBalance !== null) {
       await supabase.from('wallets').update({
         balance: freshBalance + debt.amount
       }).eq('id', targetWalletId)
     }

     if (!debtError) {
       showSuccess({
         type: 'general',
         title: 'Piutang Lunas! 🎉',
         message: 'Piutang berhasil ditandai lunas dan saldo dompet diperbarui.'
       })
       fetchDebts()
       fetchTransactions()
       fetchWallets()
       setShowDebtModal(false)
     }
     setRepayingWalletId(null)
  }

  // 5. Delete Debt
  const deleteDebt = async (id: number) => {
    const confirmed = await showConfirm({
      title: 'Hapus Piutang?',
      message: 'Data piutang akan dihapus permanen.',
      confirmText: 'Hapus',
      cancelText: 'Batal'
    })
    
    if (!confirmed) return

    const { error } = await supabase.from('debts').delete().eq('id', id)
    if (!error) {
      showSuccess({
        type: 'delete',
        message: 'Data piutang berhasil dihapus.'
      })
      fetchDebts()
    }
  }

  // Helper: Get Icon Component based on category name
  const getCategoryIcon = (catName: string, type: 'pemasukan' | 'pengeluaran') => {
    const allCats = [...CATEGORIES.pemasukan, ...CATEGORIES.pengeluaran]
    const found = allCats.find(c => c.name === catName)
    return found ? { Icon: found.icon, color: found.color } : { Icon: Package, color: 'bg-slate-100 text-slate-600' }
  }

  // --- Derived Data with Performance Memoization ---

  // 1. Filter Transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const tDate = new Date(t.date || t.created_at)
      tDate.setHours(0, 0, 0, 0)

      if (filterMode === 'monthly') {
        return tDate.getMonth() === currentDate.getMonth() && tDate.getFullYear() === currentDate.getFullYear()
      } else {
        const start = new Date(customRange.start)
        start.setHours(0, 0, 0, 0)
        const end = new Date(customRange.end)
        end.setHours(0, 0, 0, 0)
        return tDate >= start && tDate <= end
      }
    })
  }, [transactions, filterMode, currentDate, customRange])

  // 2. Calculate Totals (piutang TIDAK dihitung sebagai pemasukan nyata, talangan TIDAK dihitung sebagai pengeluaran pribadi)
  const { currentIncome, currentExpense } = useMemo(() => {
    const income = filteredTransactions
      .filter(t => t.type === 'pemasukan' && !t.is_piutang)
      .reduce((acc, curr) => acc + curr.amount, 0)

    const expense = filteredTransactions
      .filter(t => t.type === 'pengeluaran' && !t.is_talangan)
      .reduce((acc, curr) => acc + curr.amount, 0)

    return { currentIncome: income, currentExpense: expense }
  }, [filteredTransactions])

  // 3. Previous Period Stats (Monthly Only)
  const { prevIncome, prevExpense } = useMemo(() => {
    // Only calculate for monthly mode for now
    const prevDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)

    const prevTx = transactions.filter(t => {
      const tDate = new Date(t.date || t.created_at)
      return tDate.getMonth() === prevDate.getMonth() && tDate.getFullYear() === prevDate.getFullYear()
    })

    const income = prevTx
      .filter(t => t.type === 'pemasukan' && !t.is_piutang)
      .reduce((acc, curr) => acc + curr.amount, 0)

    const expense = prevTx
      .filter(t => t.type === 'pengeluaran' && !t.is_talangan)
      .reduce((acc, curr) => acc + curr.amount, 0)

    return { prevIncome: income, prevExpense: expense }
  }, [transactions, currentDate])

  const getPercentageChange = (current: number, prev: number) => {
    if (prev === 0) return current > 0 ? 100 : 0
    return ((current - prev) / prev) * 100
  }

  const incomeChange = getPercentageChange(currentIncome, prevIncome)
  const expenseChange = getPercentageChange(currentExpense, prevExpense)

  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))

  // 4. Monthly Data for Chart (Current Year)
  const monthlyData = useMemo(() => {
    const currentYear = currentDate.getFullYear()
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
    
    // Initialize all months with 0
    const data = months.map(name => ({ name, income: 0, expense: 0 }))

    transactions.forEach(t => {
      const tDate = new Date(t.date || t.created_at)
      if (tDate.getFullYear() === currentYear) {
        const monthIndex = tDate.getMonth()
        if (t.type === 'pemasukan' && !t.is_piutang) {
          data[monthIndex].income += t.amount
        } else if (t.type === 'pengeluaran' && !t.is_talangan) {
          data[monthIndex].expense += t.amount
        }
      }
    })

    return data
  }, [transactions, currentDate])

  useEffect(() => {
    fetchBudgets()
  }, [currentDate])

  // --- Budget Awareness Logic (Memoized) ---
  const budgetInfo = useMemo(() => {
    if (type === 'pemasukan' || !category || !customDate) return null

    // 1. Find budget for the Selected Date's month (not necessarily Current Dashboard Month)
    // Note: 'budgets' state currently holds budgets for 'currentDate'. 
    // If user selects a date outside 'currentDate' month, we might not have the budget loaded.
    // In that case, we skip the warning (safe fallback).
    const targetDate = new Date(customDate)
    const budget = budgets.find(b => {
      const bDate = new Date(b.month)
      return bDate.getMonth() === targetDate.getMonth() && bDate.getFullYear() === targetDate.getFullYear()
    })

    if (!budget) return null

    // 2. Calculate actual spending for that specific month (ignoring dashboard filters)
    const currentSpent = transactions
      .filter(t => {
        const tDate = new Date(t.date || t.created_at)
        return (
          t.category === category &&
          t.type === 'pengeluaran' &&
          !t.is_talangan &&
          t.id !== editingId &&
          tDate.getMonth() === targetDate.getMonth() &&
          tDate.getFullYear() === targetDate.getFullYear()
        )
      })
      .reduce((acc, curr) => acc + curr.amount, 0)

    const newAmount = parseFloat(amount) || 0
    const totalProjected = currentSpent + newAmount
    const remaining = budget.amount - totalProjected
    const isOver = remaining < 0
    const percent = Math.min((totalProjected / budget.amount) * 100, 100)

    return { budget, currentSpent, totalProjected, remaining, isOver, percent }
  }, [category, type, budgets, transactions, amount, editingId, customDate])



  return (
    <main className="flex-1 bg-[#F9FAFB] min-h-screen overflow-x-hidden transition-all duration-300">
      
      {/* Top Header */}
      <div className="flex items-center justify-between w-full h-[90px] shrink-0 border-b border-[#F3F4F3] bg-white px-5 md:px-8">
        <div className="flex items-center gap-4">
             {/* Mobile toggle is handled in Sidebar.tsx, but we can add a spacer or title here */}
             <h2 className="font-bold text-2xl text-[#080C1A]">CatatDuit</h2>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Header Actions */}
           <div className="hidden md:flex items-center gap-3 pl-3">
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

      <div className="p-5 md:p-8 space-y-8">
        
        {/* Date Filter & Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-[#080C1A] text-2xl md:text-3xl font-bold mb-1">Hemat Yuk !!!</h1>
            <p className="text-[#6A7686] text-sm">Financial metrics for {getPeriodLabel()}.</p>
          </div>
          
          <div className="flex items-center gap-3 bg-white p-1.5 rounded-full border border-[#F3F4F3] shadow-sm">
             <button 
               onClick={prevMonth}
               className="p-2 hover:bg-[#EFF2F7] rounded-full text-[#6A7686] transition-all"
               disabled={filterMode === 'custom'}
             >
               <ChevronLeft className="w-5 h-5" />
             </button>
             
             <div className="px-4 text-sm font-bold text-[#080C1A] whitespace-nowrap min-w-[140px] text-center">
                {getPeriodLabel()}
             </div>

             <button 
               onClick={nextMonth}
               className="p-2 hover:bg-[#EFF2F7] rounded-full text-[#6A7686] transition-all"
               disabled={filterMode === 'custom'}
             >
               <ChevronRight className="w-5 h-5" />
             </button>

             <div className="w-px h-6 bg-[#F3F4F3] mx-1"></div>
             
             <button
               onClick={() => setShowSettings(!showSettings)}
               className="p-2 hover:bg-[#EFF2F7] rounded-full text-[#6A7686] transition-all"
             >
                <Settings className="w-5 h-5" />
             </button>
          </div>
        </div>

        {/* Settings / Filter Panel */}
        {showSettings && (
          <div className="w-full md:max-w-sm md:ml-auto lg:fixed lg:right-8 lg:top-32 lg:z-50 bg-white rounded-2xl shadow-xl border border-slate-100 p-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Settings className="w-4 h-4 text-slate-500" />
                Filter & Periode
              </h3>
              <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Mode Switcher */}
            <div className="flex bg-slate-100 p-1 rounded-xl mb-4">
              <button
                onClick={() => setFilterMode('monthly')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${filterMode === 'monthly' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Bulanan
              </button>
              <button
                onClick={() => setFilterMode('custom')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${filterMode === 'custom' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Custom
              </button>
            </div>

            <div className="space-y-4">
              {filterMode === 'monthly' ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5">Bulan</label>
                    <select
                      value={currentDate.getMonth()}
                      onChange={(e) => {
                        const newMonth = parseInt(e.target.value);
                        const newDate = new Date(currentDate);
                        newDate.setMonth(newMonth);
                        setCurrentDate(newDate);
                      }}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      {['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'].map((m, i) => (
                        <option key={i} value={i}>{m}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5">Tahun</label>
                    <select
                      value={currentDate.getFullYear()}
                      onChange={(e) => {
                        const newYear = parseInt(e.target.value);
                        const newDate = new Date(currentDate);
                        newDate.setFullYear(newYear);
                        setCurrentDate(newDate);
                      }}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      {[2023, 2024, 2025, 2026, 2027, 2028].map((y) => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5">Dari Tanggal</label>
                    <input
                      type="date"
                      value={customRange.start}
                      onChange={(e) => setCustomRange({ ...customRange, start: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5">Sampai Tanggal</label>
                    <input
                      type="date"
                      value={customRange.end}
                      onChange={(e) => setCustomRange({ ...customRange, end: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>
              )}
              <button
                onClick={() => {
                  setFilterMode('monthly')
                  setCurrentDate(new Date())
                  setShowSettings(false)
                }}
                className="w-full py-2 text-xs font-bold text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
              >
                Reset ke Bulan Ini
              </button>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {/* Card 1: Total Tabungan (Revenue style) */}
          <div className="flex flex-col rounded-2xl border border-[#F3F4F3] p-6 gap-3 bg-white hover:shadow-sm transition-all duration-300 group">
             <div className="flex items-center justify-between">
                <div className="flex items-center gap-[6px]">
                  <div className="size-11 bg-[#30B22D]/10 rounded-xl flex items-center justify-center shrink-0">
                    <WalletIcon className="size-6 text-[#30B22D]" />
                  </div>
                  <p className="font-medium text-[#6A7686]">Total Semua Uang</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <button 
                            onClick={() => setShowTotalTooltip(!showTotalTooltip)}
                            className="p-1 text-slate-400 hover:text-slate-600 transition-colors rounded-full hover:bg-slate-50 relative z-20"
                        >
                            <Info className="w-3.5 h-3.5" />
                        </button>
                        
                        {/* Invisible overlay */}
                        {showTotalTooltip && (
                            <div className="fixed inset-0 z-10" onClick={() => setShowTotalTooltip(false)} />
                        )}

                        <div className={`absolute right-0 top-full mt-3 w-64 p-3 bg-slate-800 text-white text-xs rounded-xl shadow-xl transition-all z-20 font-medium leading-relaxed ${
                            showTotalTooltip ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible -translate-y-1'
                        }`}>
                            <p>Total saldo dari semua dompet bertipe <span className="text-emerald-400 font-bold">Tabungan</span>.</p>
                            <div className="mt-2 pt-2 border-t border-slate-700/50">
                                <p className="text-slate-300">Uang yang disimpan dan tidak untuk pengeluaran harian.</p>
                            </div>
                            {/* Arrow up */}
                            <div className="absolute -top-1.5 right-6 w-3 h-3 bg-slate-800 rotate-45"></div>
                        </div>
                    </div>
                </div>
             </div>
             <p className="font-bold text-[28px] leading-10 text-[#080C1A]">
                {showBalance ? `Rp ${wallets.filter(w => w.category === 'savings').reduce((acc, curr) => acc + curr.balance, 0).toLocaleString('id-ID')}` : 'Rp ••••••••'}
             </p>
             <div className="flex justify-between items-center">
                 <p className="text-xs text-[#6A7686]">Total aset tersimpan</p>
                 <button onClick={() => setShowBalance(!showBalance)} className="text-[#6A7686] hover:text-[#165DFF]">
                     {showBalance ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                 </button>
             </div>
          </div>

          {/* Card 2: Saldo Aktif (Shipments style) */}
          <div className="flex flex-col rounded-2xl border border-[#F3F4F3] p-6 gap-3 bg-white hover:shadow-sm transition-all duration-300 group">
             <div className="flex items-center justify-between">
                <div className="flex items-center gap-[6px]">
                  <div className="size-11 bg-[#165DFF]/10 rounded-xl flex items-center justify-center shrink-0">
                    <CreditCard className="size-6 text-[#165DFF]" />
                  </div>
                  <p className="font-medium text-[#6A7686]">Saldo Aktif</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <button 
                            onClick={() => setShowActiveTooltip(!showActiveTooltip)}
                            className="p-1 text-slate-400 hover:text-slate-600 transition-colors rounded-full hover:bg-slate-50 relative z-20"
                        >
                            <Info className="w-3.5 h-3.5" />
                        </button>
                        
                        {/* Invisible overlay */}
                        {showActiveTooltip && (
                            <div className="fixed inset-0 z-10" onClick={() => setShowActiveTooltip(false)} />
                        )}

                        <div className={`absolute right-0 top-full mt-3 w-64 p-3 bg-slate-800 text-white text-xs rounded-xl shadow-xl transition-all z-20 font-medium leading-relaxed ${
                            showActiveTooltip ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible -translate-y-1'
                        }`}>
                            <p>Total sisa saldo dari dompet bertipe <span className="text-[#165DFF] font-bold">Aktif</span>.</p>
                            <div className="mt-2 pt-2 border-t border-slate-700/50">
                                <p className="text-slate-300">Uang yang siap digunakan untuk transaksi sehari-hari.</p>
                            </div>
                            {/* Arrow up */}
                            <div className="absolute -top-1.5 right-6 w-3 h-3 bg-slate-800 rotate-45"></div>
                        </div>
                    </div>
                </div>
             </div>
             <p className="font-bold text-[28px] leading-10 text-[#080C1A]">
                {showActiveBalance ? `Rp ${wallets.filter(w => w.category === 'active').reduce((acc, curr) => acc + curr.balance, 0).toLocaleString('id-ID')}` : 'Rp ••••••••'}
             </p>
             <div className="flex justify-between items-center">
                 <p className="text-xs text-[#6A7686]">Siap digunakan</p>
                 <button onClick={() => setShowActiveBalance(!showActiveBalance)} className="text-[#6A7686] hover:text-[#165DFF]">
                     {showActiveBalance ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                 </button>
             </div>
          </div>

          {/* Card 3: Pemasukan (On-Time Rate style) */}
          <div className="flex flex-col rounded-2xl border border-[#F3F4F3] p-6 gap-3 bg-white hover:shadow-sm transition-all duration-300 group">
             <div className="flex items-center justify-between">
                <div className="flex items-center gap-[6px]">
                  <div className="size-11 bg-[#FED71F]/10 rounded-xl flex items-center justify-center shrink-0">
                    <TrendingUp className="size-6 text-[#DAA200]" />
                  </div>
                  <p className="font-medium text-[#6A7686]">Pemasukan</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <button 
                            onClick={() => setShowIncomeTooltip(!showIncomeTooltip)}
                            className="p-1 text-slate-400 hover:text-slate-600 transition-colors rounded-full hover:bg-slate-50 relative z-20"
                        >
                            <Info className="w-3.5 h-3.5" />
                        </button>
                        
                        {/* Invisible overlay */}
                        {showIncomeTooltip && (
                            <div className="fixed inset-0 z-10" onClick={() => setShowIncomeTooltip(false)} />
                        )}

                        <div className={`absolute right-0 top-full mt-3 w-64 p-3 bg-slate-800 text-white text-xs rounded-xl shadow-xl transition-all z-20 font-medium leading-relaxed ${
                            showIncomeTooltip ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible -translate-y-1'
                        }`}>
                            <p>Semua <span className="text-emerald-400 font-bold">transaksi masuk</span> pada bulan ini.</p>
                            <div className="mt-2 pt-2 border-t border-slate-700/50">
                                <p className="text-slate-300">Catatan: <span className="font-bold">Pembayaran Piutang</span> tidak dihitung sebagai pemasukan.</p>
                            </div>
                            {/* Arrow up */}
                            <div className="absolute -top-1.5 right-6 w-3 h-3 bg-slate-800 rotate-45"></div>
                        </div>
                    </div>
                    {prevIncome > 0 && (
                     <span className={`text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1 ${incomeChange >= 0 ? 'bg-[#DCFCE7] text-[#14532D]' : 'bg-[#FEE2E2] text-[#7F1D1D]'}`}>
                       {incomeChange >= 0 ? '▲' : '▼'} {Math.abs(incomeChange).toFixed(1)}%
                     </span>
                    )}
                </div>
             </div>
             <p className="font-bold text-[28px] leading-10 text-[#080C1A]">
                 {showIncome ? `Rp ${currentIncome.toLocaleString('id-ID')}` : 'Rp ••••••••'}
             </p>
             <div className="flex justify-between items-center">
                <p className="text-xs text-[#6A7686]">Bulan ini</p>
                <button onClick={() => setShowIncome(!showIncome)} className="text-[#6A7686] hover:text-[#165DFF]">
                    {showIncome ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                </button>
             </div>
          </div>

          {/* Card 4: Pengeluaran (Active Fleet style) */}
          <div className="flex flex-col rounded-2xl border border-[#F3F4F3] p-6 gap-3 bg-white hover:shadow-sm transition-all duration-300 group">
             <div className="flex items-center justify-between">
                <div className="flex items-center gap-[6px]">
                  <div className="size-11 bg-[#ED6B60]/10 rounded-xl flex items-center justify-center shrink-0">
                    <TrendingDown className="size-6 text-[#ED6B60]" />
                  </div>
                  <p className="font-medium text-[#6A7686]">Pengeluaran</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <button 
                            onClick={() => setShowExpenseTooltip(!showExpenseTooltip)}
                            className="p-1 text-slate-400 hover:text-slate-600 transition-colors rounded-full hover:bg-slate-50 relative z-20"
                        >
                            <Info className="w-3.5 h-3.5" />
                        </button>
                        
                        {/* Invisible overlay */}
                        {showExpenseTooltip && (
                            <div className="fixed inset-0 z-10" onClick={() => setShowExpenseTooltip(false)} />
                        )}

                        <div className={`absolute right-0 top-full mt-3 w-64 p-3 bg-slate-800 text-white text-xs rounded-xl shadow-xl transition-all z-20 font-medium leading-relaxed ${
                            showExpenseTooltip ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible -translate-y-1'
                        }`}>
                            <p>Semua <span className="text-rose-400 font-bold">transaksi keluar</span> pada bulan ini.</p>
                            <div className="mt-2 pt-2 border-t border-slate-700/50">
                                <p className="text-slate-300">Catatan: Transaksi <span className="font-bold text-amber-300">Talangan</span> tidak dihitung sebagai pengeluaran.</p>
                            </div>
                            {/* Arrow up */}
                            <div className="absolute -top-1.5 right-6 w-3 h-3 bg-slate-800 rotate-45"></div>
                        </div>
                    </div>
                    {prevExpense > 0 && (
                     <span className={`text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1 ${expenseChange <= 0 ? 'bg-[#DCFCE7] text-[#14532D]' : 'bg-[#FEE2E2] text-[#7F1D1D]'}`}>
                       {expenseChange > 0 ? '▲' : '▼'} {Math.abs(expenseChange).toFixed(1)}%
                     </span>
                    )}
                </div>
             </div>
             <p className="font-bold text-[28px] leading-10 text-[#080C1A]">
                 Rp {currentExpense.toLocaleString('id-ID')}
             </p>
             <p className="text-xs text-[#6A7686]">Bulan ini</p>
          </div>
        </div>

        {/* Note (Mobile Only - After Stats, Before Chart) */}
        {latestNote && (
            <Link href="/notes" className="block lg:hidden rounded-2xl border border-[#FED71F] bg-[#FEF9C3] p-5 hover:shadow-md transition-all cursor-pointer relative">
                 {noteCount > 1 && (
                    <div className="absolute -top-2 -right-2 bg-rose-500 !text-white text-[10px] font-bold h-6 min-w-[24px] px-1 flex items-center justify-center rounded-full border-2 border-white shadow-sm ring-1 ring-rose-200">
                        {noteCount > 99 ? '99+' : noteCount}
                    </div>
                 )}
                 <div className="flex items-center gap-2 mb-2 text-[#B45309]">
                    <StickyNote className="w-5 h-5" />
                    <h3 className="font-bold">Catatan Terbaru</h3>
                 </div>
                 <h4 className="font-bold text-[#080C1A] mb-1">{latestNote.title}</h4>
                 <p className="text-sm text-[#4B5563] line-clamp-3">{latestNote.content}</p>
            </Link>
        )}

        {/* Gold & Currency Cards (Desktop Only - Above Chart) */}
        <div className="hidden lg:grid grid-cols-2 gap-6">
            <GoldPriceCard />
            <CurrencyCard />
        </div>

        {/* Charts & Bills */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 flex flex-col rounded-2xl border border-[#F3F4F3] p-6 bg-white">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="font-bold text-lg text-[#080C1A]">Arus Kas & Pertumbuhan</h3>
                        <p className="text-sm text-[#6A7686]">Analisis Perbandingan</p>
                    </div>
                </div>
                <div className="w-full">
                    {/* FinancialChart should be styled internally or wrap it */}
                    <FinancialChart data={monthlyData} />
                </div>
            </div>

            <div className="flex flex-col gap-6">
               {/* Reuse RecurringBillsList as 'Shipment Status' equivalent */}
               <div className="rounded-2xl border border-[#F3F4F3] bg-white overflow-hidden">
                  <div className="p-5 border-b border-[#F3F4F3]">
                    <h3 className="font-bold text-[#080C1A]">Tagihan Rutin</h3>
                  </div>
                  <div className="p-2">
                     <RecurringBillsList refreshTrigger={billsUpdateTrigger} onUpdate={handleBillsUpdate} />
                  </div>
               </div>
                
                {/* Note (Desktop Only - Below Tagihan Rutin) */}
                {latestNote && (
                    <Link href="/notes" className="hidden lg:block rounded-2xl border border-[#FED71F] bg-[#FEF9C3] p-5 hover:shadow-md transition-all cursor-pointer relative">
                         {noteCount > 1 && (
                            <div className="absolute -top-2 -right-2 bg-rose-500 !text-white text-[10px] font-bold h-6 min-w-[24px] px-1 flex items-center justify-center rounded-full border-2 border-white shadow-sm ring-1 ring-rose-200">
                                {noteCount > 99 ? '99+' : noteCount}
                            </div>
                         )}
                         <div className="flex items-center gap-2 mb-2 text-[#B45309]">
                            <StickyNote className="w-5 h-5" />
                            <h3 className="font-bold">Catatan Terbaru</h3>
                         </div>
                         <h4 className="font-bold text-[#080C1A] mb-1">{latestNote.title}</h4>
                         <p className="text-sm text-[#4B5563] line-clamp-3">{latestNote.content}</p>
                    </Link>
                )}
            </div>
        </div>

        {/* Transactions & Calendar */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Transactions List (Top Routes style) */}
            <div className="flex flex-col rounded-2xl border border-[#F3F4F3] bg-white overflow-hidden">
                <div className="flex items-center justify-between p-6 border-b border-[#F3F4F3]">
                    <h3 className="font-bold text-lg text-[#080C1A]">Riwayat Transaksi</h3>
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={fetchTransactions} 
                            disabled={loading}
                            className={`p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all ${loading ? 'animate-spin' : ''}`}
                            title="Refresh Data"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>
                        </button>
                        <Link href="/analytics" className="text-sm text-[#165DFF] font-semibold cursor-pointer hover:underline">Lihat Semua</Link>
                    </div>
                </div>
                <div className="max-h-[500px] lg:max-h-[700px] overflow-y-auto custom-scrollbar">
                   {filteredTransactions.length === 0 ? (
                        <div className="p-8 text-center text-[#6A7686]">Belum ada transaksi</div>
                   ) : (
                       filteredTransactions.map(t => {
                           const { Icon, color } = getCategoryIcon(t.category, t.type)
                           // Strip utility classes from color string and map to style if needed, or just use as is if compatible
                           // The original logic returns tailwind classes like 'bg-orange-100 text-orange-600'
                           // We might want to adjust these to be softer/SwiftLog style if possible, but let's keep for functionality
                           return (
                               <div key={t.id} className="flex items-center gap-4 p-5 border-b border-[#F3F4F3] hover:bg-[#F9FAFB] transition-all group cursor-pointer" onClick={() => handleEditClick(t)}>
                                   <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
                                       <Icon className="w-6 h-6" />
                                   </div>
                                   <div className="flex-1 min-w-0">
                                       <div className="flex items-center gap-2 mb-1">
                                           <span className="font-bold text-[#080C1A] truncate">{t.title}</span>
                                           {t.is_piutang && (
                                               <span className="shrink-0 text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200">
                                                   💸 Piutang{t.piutang_person ? ` • ${t.piutang_person}` : ''}
                                               </span>
                                           )}
                                           {t.is_talangan && (
                                               <span className="shrink-0 text-[10px] font-bold bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full border border-purple-200">
                                                   🤝 Talangan{t.talangan_person ? ` • ${t.talangan_person}` : ''}
                                               </span>
                                           )}
                                       </div>
                                       <p className="text-xs text-[#6A7686]">
                                            {new Date(t.date || t.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} • {t.category}
                                       </p>
                                   </div>
                                   <div className="text-right">
                                       <p className={`font-bold ${
                                         t.type === 'pemasukan'
                                           ? (t.is_piutang ? 'text-amber-500' : 'text-[#30B22D]')
                                           : (t.is_talangan ? 'text-purple-500' : 'text-[#080C1A]')
                                       }`}>
                                           {t.type === 'pengeluaran' ? '-' : '+'} Rp {t.amount.toLocaleString('id-ID')}
                                       </p>
                                       <button 
                                         onClick={(e) => { e.stopPropagation(); deleteTransaction(t.id); }} 
                                         disabled={deletingId === t.id}
                                         className={`text-xs font-medium hover:underline transition-all ${deletingId === t.id ? 'text-slate-400 cursor-not-allowed no-underline' : 'text-[#ED6B60]'}`}
                                       >
                                           {deletingId === t.id ? (
                                              <span className="flex items-center gap-1">
                                                <div className="w-3 h-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
                                                Hapus...
                                              </span>
                                           ) : 'Hapus'}
                                       </button>
                                   </div>
                               </div>
                           )
                       })
                   )}
                </div>
            </div>

            {/* Calendar / Other Widgets */}
            <div className="flex flex-col gap-6">
                <CalendarCard refreshTrigger={billsUpdateTrigger} onUpdate={handleBillsUpdate} />
            </div>
        </div>

        {/* Debts Section */}
        {debts.some(d => d.status === 'pending') && (
            <div className="rounded-2xl border border-[#F3F4F3] bg-white p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-lg text-[#080C1A]">Daftar Piutang</h3>
                     <span className="bg-[#FED71F]/20 text-[#B45309] text-xs font-bold px-3 py-1 rounded-full">
                         {debts.filter(d => d.status === 'pending').length} Active
                     </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {debts.filter(d => d.status === 'pending').map(debt => (
                        <div key={debt.id} className="flex items-center justify-between p-4 rounded-xl border border-[#F3F4F3] bg-[#F9FAFB]">
                            <div>
                                <p className="font-bold text-[#080C1A]">{debt.person_name}</p>
                                <p className="text-xs text-[#6A7686]">Rp {debt.amount.toLocaleString('id-ID')}</p>
                            </div>
                            <button
                              onClick={() => { setSelectedDebt(debt); setShowDebtModal(true); }} 
                              className="px-3 py-1.5 bg-[#165DFF] text-white text-xs font-bold rounded-lg hover:bg-[#0E4BD9]"
                            >
                                Lunas
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* Extras Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:hidden">
            <GoldPriceCard />
            <CurrencyCard />
        </div>

      </div>


      {/* Floating Action Button (Mobile & Desktop) */}
      <button
        onClick={() => {
          resetForm()
          setIsModalOpen(true)
        }}
        className="fixed bottom-10 right-6 md:bottom-10 md:right-10 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 !text-white p-4 rounded-full shadow-premium-lg hover:shadow-purple-500/50 transition-all active:scale-90 hover:scale-110 z-40"
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

          <div className="glass backdrop-blur-2xl w-full max-w-lg rounded-t-3xl md:rounded-3xl shadow-premium-lg border border-white/20 z-50 p-6 pb-32 md:pb-10 relative animate-in slide-in-from-bottom-10 fade-in zoom-in-95 duration-200 h-[85vh] md:h-auto md:max-h-[90vh] overflow-y-auto">
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

              {/* Piutang Toggle - hanya untuk Pemasukan */}
              {type === 'pemasukan' && (
                <div className={`p-4 rounded-2xl border transition-all duration-200 ${isPiutang ? 'bg-amber-50/60 border-amber-200' : 'bg-slate-50 border-slate-200'}`}>
                  <div
                    onClick={() => { setIsPiutang(!isPiutang); if (isPiutang) setPiutangPerson('') }}
                    className="flex items-center justify-between cursor-pointer group select-none"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full border-[1.5px] flex items-center justify-center transition-all ${isPiutang ? 'border-amber-500' : 'border-slate-300 group-hover:border-slate-400'}`}>
                        {isPiutang && <div className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-in zoom-in duration-200" />}
                      </div>
                      <span className={`text-sm font-bold transition-colors ${isPiutang ? 'text-amber-700' : 'text-slate-600 group-hover:text-slate-800'}`}>
                        💸 Ini adalah Piutang?
                      </span>
                    </div>
                    {isPiutang && <span className="text-[10px] uppercase font-bold text-amber-600 bg-white px-2 py-1 rounded-lg shadow-sm border border-amber-100">Aktif</span>}
                  </div>

                  {isPiutang && (
                    <div className="mt-3 animate-in slide-in-from-top-2 duration-200">
                      <input
                        type="text"
                        placeholder="Nama peminjam (Opsional)"
                        className="w-full p-2.5 bg-white border border-amber-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-400 outline-none font-medium"
                        value={piutangPerson}
                        onChange={(e) => setPiutangPerson(e.target.value)}
                      />
                      <p className="text-xs text-amber-600 mt-2 flex items-start gap-1.5">
                        <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        Nominal akan masuk ke saldo dompet, tapi <strong>tidak dihitung</strong> sebagai pemasukan di statistik.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Split Bill Toggle */}
              {type === 'pengeluaran' && (
                <div className={`p-4 rounded-2xl border transition-all duration-200 ${isSplitBill ? 'bg-blue-50/50 border-blue-200' : 'bg-slate-50 border-slate-200'}`}>
                  <div 
                    onClick={() => setIsSplitBill(!isSplitBill)}
                    className="flex items-center justify-between cursor-pointer group select-none mb-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full border-[1.5px] flex items-center justify-center transition-all ${isSplitBill ? 'border-[#165DFF]' : 'border-slate-300 group-hover:border-slate-400'}`}>
                        {isSplitBill && <div className="w-2.5 h-2.5 bg-[#165DFF] rounded-full animate-in zoom-in duration-200" />}
                      </div>
                      <span className={`text-sm font-bold transition-colors ${isSplitBill ? 'text-[#165DFF]' : 'text-slate-600 group-hover:text-slate-800'}`}>Ada yang nitip bayar? (Split Bill)</span>
                    </div>
                    {isSplitBill && <span className="text-[10px] uppercase font-bold text-[#165DFF] bg-white px-2 py-1 rounded-lg shadow-sm border border-blue-100">Aktif</span>}
                  </div>

                  {isSplitBill && (
                    <div className="space-y-3 animate-in slide-in-from-top-2 duration-200">
                      
                      {splitEntries.map((entry, idx) => (
                        <div key={idx} className="flex gap-2 items-start">
                          <div className="flex-1 grid grid-cols-2 gap-2">
                            <div>
                              <input
                                type="text"
                                placeholder={`Nama Teman #${idx + 1}`}
                                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                value={entry.name}
                                onChange={(e) => {
                                  const newEntries = [...splitEntries]
                                  newEntries[idx].name = e.target.value
                                  setSplitEntries(newEntries)
                                }}
                              />
                            </div>
                            <div>
                              <MoneyInput
                                placeholder="0"
                                value={entry.amount}
                                onChange={(val) => {
                                  const newEntries = [...splitEntries]
                                  newEntries[idx].amount = val
                                  setSplitEntries(newEntries)
                                }}
                                className="!text-sm !p-3" 
                              />
                            </div>
                          </div>
                          {splitEntries.length > 1 && (
                            <button 
                              type="button"
                              onClick={() => {
                                const newEntries = splitEntries.filter((_, i) => i !== idx)
                                setSplitEntries(newEntries)
                              }}
                              className="p-2.5 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}

                      <button
                        type="button"
                        onClick={() => setSplitEntries([...splitEntries, { name: '', amount: '' }])}
                        className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 mt-2"
                      >
                        <Plus className="w-3 h-3" /> Tambah Orang Lain
                      </button>

                      <div className="bg-blue-50 p-3 rounded-lg flex flex-col gap-1 mt-2">
                         <div className="flex justify-between items-center text-xs font-medium text-blue-900 border-b border-blue-100 pb-2 mb-1">
                           <span>Total Piutang:</span>
                           <span className="font-bold">Rp {splitEntries.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0).toLocaleString('id-ID')}</span>
                         </div>
                         <div className="flex items-start gap-2">
                           <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                           <p className="text-xs text-blue-700">
                             Total pengeluaran tercatat: <strong>Rp {parseInt(amount || '0').toLocaleString('id-ID')}</strong>.
                             <br/>
                             Sisa (Bagian Anda): <strong>Rp {Math.max(0, parseInt(amount || '0') - splitEntries.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0)).toLocaleString('id-ID')}</strong>.
                           </p>
                         </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Talangan Toggle - hanya untuk Pengeluaran */}
              {type === 'pengeluaran' && (
                <div className={`p-4 rounded-2xl border transition-all duration-200 ${isTalangan ? 'bg-purple-50/60 border-purple-200' : 'bg-slate-50 border-slate-200'}`}>
                  <div
                    onClick={() => { setIsTalangan(!isTalangan); if (isTalangan) setTalanganPerson('') }}
                    className="flex items-center justify-between cursor-pointer group select-none"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full border-[1.5px] flex items-center justify-center transition-all ${isTalangan ? 'border-purple-500' : 'border-slate-300 group-hover:border-slate-400'}`}>
                        {isTalangan && <div className="w-2.5 h-2.5 bg-purple-500 rounded-full animate-in zoom-in duration-200" />}
                      </div>
                      <span className={`text-sm font-bold transition-colors ${isTalangan ? 'text-purple-700' : 'text-slate-600 group-hover:text-slate-800'}`}>
                        🤝 Ini Talangan (bayarin orang lain)?
                      </span>
                    </div>
                    {isTalangan && <span className="text-[10px] uppercase font-bold text-purple-600 bg-white px-2 py-1 rounded-lg shadow-sm border border-purple-100">Aktif</span>}
                  </div>

                  {isTalangan && (
                    <div className="mt-3 animate-in slide-in-from-top-2 duration-200">
                      <input
                        type="text"
                        placeholder="Nama orang yang ditalangin (Opsional)"
                        className="w-full p-2.5 bg-white border border-purple-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-400 outline-none font-medium"
                        value={talanganPerson}
                        onChange={(e) => setTalanganPerson(e.target.value)}
                      />
                      <p className="text-xs text-purple-600 mt-2 flex items-start gap-1.5">
                        <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        Saldo dompet tetap berkurang, tapi <strong>tidak dihitung</strong> sebagai pengeluaran pribadi di statistik.
                      </p>
                    </div>
                  )}
                </div>
              )}


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

              {/* Budget Awareness Indicator */}
              {budgetInfo && (
                <div className={`p-4 rounded-xl border ${budgetInfo.isOver ? 'bg-rose-50 border-rose-200' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Budget {budgetInfo.budget.category}</span>
                    <span className={`text-xs font-bold ${budgetInfo.isOver ? 'text-rose-600' : 'text-slate-600'}`}>
                      {budgetInfo.isOver ? 'Limit Terlampaui!' : 'Dalam Batas'}
                    </span>
                  </div>

                  <div className="flex justify-between items-end mb-2">
                    <div className="flex flex-col">
                      <span className="text-xs text-slate-400">Terpakai + Baru</span>
                      <span className="font-bold text-slate-700">Rp {budgetInfo.totalProjected.toLocaleString('id-ID')}</span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-xs text-slate-400">Total Budget</span>
                      <span className="font-bold text-slate-700">Rp {budgetInfo.budget.amount.toLocaleString('id-ID')}</span>
                    </div>
                  </div>

                  <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden mb-2">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${budgetInfo.isOver ? 'bg-rose-500' : budgetInfo.percent > 80 ? 'bg-orange-500' : 'bg-blue-500'}`}
                      style={{ width: `${budgetInfo.percent}%` }}
                    />
                  </div>

                  {budgetInfo.isOver ? (
                    <div className="flex items-start gap-2 text-rose-600 text-xs font-medium mt-2 bg-rose-100 p-2 rounded-lg">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <p>
                        Awas! Transaksi ini akan membuat budget minus <strong>Rp {Math.abs(budgetInfo.remaining).toLocaleString('id-ID')}</strong>.
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-center text-slate-500">
                      Sisa budget setelah transaksi ini: <strong>Rp {budgetInfo.remaining.toLocaleString('id-ID')}</strong>
                    </p>
                  )}
                </div>
              )}

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
                disabled={saving}
                className={`w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 !text-white font-bold py-4 px-6 rounded-2xl active:scale-[0.98] transition-all shadow-lg shadow-purple-500/30 flex items-center justify-center gap-2 ${saving ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {saving && (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                )}
                {saving ? 'Menyimpan...' : (editingId ? 'Update Transaksi' : 'Simpan Transaksi')}
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
                    disabled={creatingWallet}
                    className={`w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 px-6 rounded-2xl transition-all active:scale-[0.98] shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-2 ${creatingWallet ? 'opacity-70 cursor-not-allowed' : ''}`}
                  >
                    {creatingWallet ? (
                        <>
                           <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                           Membuat Dompet...
                        </>
                    ) : (
                        <>✅ Buat Dompet Tabungan</>
                    )}
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

      {/* Debt Repayment Modal */}
      {showDebtModal && selectedDebt && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded-2xl w-full max-w-sm relative shadow-xl animate-in zoom-in-95 duration-200">
             <button onClick={() => setShowDebtModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
               <X className="w-5 h-5"/>
             </button>
             
             <div className="text-center mb-6">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3 text-2xl">
                   🧑‍🤝‍🧑
                </div>
                <h3 className="font-bold text-lg text-slate-800">Lunasi Piutang</h3>
                <p className="text-sm text-slate-500">
                  {selectedDebt ? `Pilih dompet penerima dana dari ${selectedDebt.person_name}` : 'Pilih dompet penerima dana'}
                </p>
                {selectedDebt && (
                 <div className="mt-3 bg-blue-50 py-2 rounded-lg">
                    <span className="text-blue-600 font-bold text-xl">Rp {selectedDebt.amount.toLocaleString('id-ID')}</span>
                 </div>
                )}
             </div>

             <div className="space-y-3 mb-4">
               <p className="text-xs font-bold text-slate-400 uppercase tracking-widest text-center">Masuk ke Dompet</p>
               <div className="grid gap-2">
                 {wallets.map(w => {
                   const isProcessing = repayingWalletId === w.id
                   return (
                   <button
                     key={w.id}
                     onClick={() => selectedDebt && markDebtAsPaid(selectedDebt, w.id)}
                     disabled={repayingWalletId !== null}
                     className={`w-full flex justify-between items-center p-4 rounded-xl border transition-all group ${
                       isProcessing 
                         ? 'bg-blue-50 border-blue-500 cursor-wait' 
                         : repayingWalletId !== null
                           ? 'bg-slate-50 border-slate-200 opacity-50 cursor-not-allowed'
                           : 'bg-white border-slate-200 hover:border-green-500 hover:bg-green-50'
                     }`}
                   >
                     <div className="flex items-center gap-3">
                       {isProcessing && (
                          <div className="w-4 h-4 rounded-full border-2 border-blue-600 border-t-transparent animate-spin"></div>
                       )}
                       <span className={`font-medium ${isProcessing ? 'text-blue-700' : 'text-slate-700'} group-hover:text-green-700`}>
                         {w.name} {isProcessing && '(Memproses...)'}
                       </span>
                     </div>
                     <span className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded-lg">
                       Rp {w.balance.toLocaleString('id-ID')}
                     </span>
                   </button>
                   )
                 })}
               </div>
             </div>

             <button
               onClick={() => setShowDebtModal(false)}
               className="w-full py-3 text-slate-400 font-bold hover:text-slate-600 transition-colors"
             >
               Batal
             </button>
          </div>
        </div>
      )}

    </main>
  )
}

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
import { Wallet, Transaction, Goal, Budget, Debt, CustomCategoryDef } from '@/types'
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
  User,
  Coffee,
  Plane,
  Gamepad2,
  Tv,
  Smartphone,
  Book,
  Scissors,
  Music,
  Shirt,
  Smile,
  Globe,
  Dumbbell,
  GraduationCap
} from 'lucide-react'

// --- Definitions ---
const AVAILABLE_ICONS: Record<string, any> = {
  Home, ShoppingBag, Utensils, Car, Zap, Package, HeartPulse, CreditCard, Film, Gift,
  Briefcase, TrendingUp, Landmark, Coffee, Plane, Gamepad2, Tv, Smartphone, Book,
  Scissors, Music, Shirt, Smile, Globe, Dumbbell, GraduationCap
}

const COLOR_PALETTES = [
  'bg-emerald-100 text-emerald-600',
  'bg-rose-100 dark:bg-rose-950/40 text-rose-600',
  'bg-blue-100 text-blue-600',
  'bg-teal-100 text-teal-600',
  'bg-yellow-100 text-yellow-600',
  'bg-purple-100 text-purple-600',
  'bg-red-100 text-red-600',
  'bg-stone-100 text-stone-600',
  'bg-pink-100 text-pink-600',
  'bg-indigo-100 text-indigo-600',
  'bg-amber-100 text-amber-600',
  'bg-slate-100 dark:bg-[var(--bg-hover)] text-slate-600 dark:text-slate-500'
]

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
    { name: 'Kebutuhan Dapur', icon: ShoppingBag, color: 'bg-orange-100 text-orange-600' },
    { name: 'Makan di Luar', icon: Utensils, color: 'bg-rose-100 dark:bg-rose-950/40 text-rose-600' },
    { name: 'Transportasi', icon: Car, color: 'bg-blue-100 text-blue-600' },
    { name: 'Tempat Tinggal', icon: Home, color: 'bg-teal-100 text-teal-600' },
    { name: 'Tagihan', icon: Zap, color: 'bg-yellow-100 text-yellow-600' },
    { name: 'Belanja', icon: Package, color: 'bg-purple-100 text-purple-600' },
    { name: 'Kesehatan', icon: HeartPulse, color: 'bg-red-100 text-red-600' },
    { name: 'Cicilan & Utang', icon: CreditCard, color: 'bg-stone-100 text-stone-600' },
    { name: 'Pribadi & Hiburan', icon: Film, color: 'bg-pink-100 text-pink-600' },
    { name: 'Edukasi & Donasi', icon: Gift, color: 'bg-indigo-100 text-indigo-600' },
    { name: 'Lainnya', icon: Package, color: 'bg-slate-100 dark:bg-[var(--bg-hover)] text-slate-600 dark:text-slate-500' },
  ],
  pemasukan: [
    { name: 'Gaji', icon: Briefcase, color: 'bg-emerald-100 text-emerald-600' },
    { name: 'Bonus & Hadiah', icon: Gift, color: 'bg-pink-100 text-pink-600' },
    { name: 'Investasi', icon: TrendingUp, color: 'bg-indigo-100 text-indigo-600' },
    { name: 'Penjualan', icon: TrendingUp, color: 'bg-amber-100 text-amber-600' },
    { name: 'Lainnya', icon: Landmark, color: 'bg-slate-100 dark:bg-[var(--bg-hover)] text-slate-600 dark:text-slate-500' },
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
  const [splitEntries, setSplitEntries] = useState<{ name: string, amount: string }[]>([{ name: '', amount: '' }])
  const [showDebtModal, setShowDebtModal] = useState(false)
  const [showMobileDebtList, setShowMobileDebtList] = useState(false)
  const [selectedDebt, setSelectedDebt] = useState<Debt | null>(null)
  const [repayingWalletId, setRepayingWalletId] = useState<number | null>(null)

  // Form State
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [adminFee, setAdminFee] = useState('')
  const [type, setType] = useState<'pemasukan' | 'pengeluaran' | 'topup'>('pemasukan')
  const [category, setCategory] = useState('')
  const [selectedWalletId, setSelectedWalletId] = useState<string>('')
  const [sourceWalletId, setSourceWalletId] = useState<string>('')
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
    Promise.all([fetchTransactions(), fetchWallets()]) // Refresh transactions list and wallet balances parallelly
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

  // Filter Date Range History
  type FilterHistoryEntry = { id: number; start_date: string; end_date: string; label?: string }
  const [filterHistory, setFilterHistory] = useState<FilterHistoryEntry[]>([])

  // User Custom Categories
  const [customCategories, setCustomCategories] = useState<{ pengeluaran: (string | CustomCategoryDef)[], pemasukan: (string | CustomCategoryDef)[] }>({ pengeluaran: [], pemasukan: [] })
  const [showAddCategory, setShowAddCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newCategoryIcon, setNewCategoryIcon] = useState('Package')
  const [newCategoryColor, setNewCategoryColor] = useState(COLOR_PALETTES[0])
  const [editingCategoryName, setEditingCategoryName] = useState<string | null>(null)

  const resetCategoryForm = () => {
    setShowAddCategory(false)
    setNewCategoryName('')
    setNewCategoryIcon('Package')
    setNewCategoryColor(COLOR_PALETTES[0])
    setEditingCategoryName(null)
  }

  const handleSaveCustomCategory = async () => {
    if (!newCategoryName.trim()) return
    const currentType = type as 'pemasukan' | 'pengeluaran'
    if (type === 'topup') return

    const getName = (c: string | CustomCategoryDef) => typeof c === 'string' ? c : c.name
    const oldNameObj = editingCategoryName
    const finalName = newCategoryName.trim()

    if (!oldNameObj && customCategories[currentType].map(getName).map(n => n.toLowerCase()).includes(finalName.toLowerCase())) {
      showToast('warning', 'Kategori ini sudah ada!')
      return
    }

    let updatedList = [...customCategories[currentType]]
    const newDef: CustomCategoryDef = {
      name: finalName,
      iconName: newCategoryIcon,
      color: newCategoryColor
    }

    if (oldNameObj) {
      updatedList = updatedList.map(c => getName(c) === oldNameObj ? newDef : c)
      if (oldNameObj !== finalName) {
        await supabase.from('transactions').update({ category: finalName }).eq('category', oldNameObj)
      }
    } else {
      updatedList.push(newDef)
    }

    const updated = {
      ...customCategories,
      [currentType]: updatedList
    }

    const { error } = await supabase.from('user_settings').update({ custom_categories: updated }).eq('id', 1)

    if (!error) {
      setCustomCategories(updated)
      setCategory(finalName)
      resetCategoryForm()
      setBillsUpdateTrigger(prev => prev + 1)
      showToast('success', oldNameObj ? 'Kategori diperbarui!' : 'Kategori ditambahkan!')
    } else {
      showToast('error', 'Gagal menyimpan kategori')
    }
  }

  const handleDeleteCustomCategory = async (catName: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    const currentType = type as 'pemasukan' | 'pengeluaran'

    const confirmed = await showConfirm({
      title: 'Hapus Kategori?',
      message: `Hapus kategori "${catName}"? Histori asli di database akan tetap aman namun logonya akan tereset menjadi default.`,
      confirmText: 'Hapus',
      cancelText: 'Batal'
    })

    if (!confirmed) return

    const getName = (c: string | CustomCategoryDef) => typeof c === 'string' ? c : c.name
    const updatedList = customCategories[currentType].filter(c => getName(c) !== catName)

    const updated = { ...customCategories, [currentType]: updatedList }
    const { error } = await supabase.from('user_settings').update({ custom_categories: updated }).eq('id', 1)

    if (!error) {
      setCustomCategories(updated)
      if (category === catName) setCategory('')
      showToast('success', 'Kategori dihapus')
    } else {
      showToast('error', 'Gagal menghapus kategori')
    }
  }

  const openEditCategory = (c: string | CustomCategoryDef, e: React.MouseEvent) => {
    e.stopPropagation()
    const isStr = typeof c === 'string'
    setEditingCategoryName(isStr ? c : c.name)
    setNewCategoryName(isStr ? c : c.name)
    setNewCategoryIcon(isStr ? 'Package' : c.iconName)
    setNewCategoryColor(isStr ? COLOR_PALETTES[0] : c.color)
    setShowAddCategory(true)
  }

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
        if (settings.custom_categories) setCustomCategories(settings.custom_categories as { pengeluaran: string[], pemasukan: string[] })
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

      // Load all saved filter date ranges
      const { data: historyData } = await supabase
        .from('filter_history')
        .select('*')
        .order('start_date', { ascending: true })
      if (historyData) setFilterHistory(historyData as FilterHistoryEntry[])

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

        // If custom mode, also save to filter_history (upsert prevents duplicates)
        // Guard: skip jika durasi < 3 hari — mencegah entri sampah hasil debounce setengah jalan
        if (filterMode === 'custom') {
          const durationMs = new Date(customRange.end).getTime() - new Date(customRange.start).getTime()
          const MIN_SAVE_DURATION_MS = 2 * 24 * 60 * 60 * 1000 // selisih >= 2 hari = minimal 3 hari
          if (durationMs >= MIN_SAVE_DURATION_MS) {
            const fmt = (d: string) => new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
            const label = `${fmt(customRange.start)} – ${fmt(customRange.end)}`
            const { data: upserted } = await supabase
              .from('filter_history')
              .upsert(
                { start_date: customRange.start, end_date: customRange.end, label },
                { onConflict: 'start_date,end_date' }
              )
              .select()
            // Refresh local filterHistory state
            const { data: historyData } = await supabase
              .from('filter_history')
              .select('*')
              .order('start_date', { ascending: true })
            if (historyData) setFilterHistory(historyData as FilterHistoryEntry[])
            void upserted
          }
        }
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
      .select('*')
      .order('created_at', { ascending: false }) // Order by actual creation time

    if (error) {
      console.error('Error fetching transactions:', error)
      showToast('error', `Gagal memuat transaksi: ${error.message || 'Coba refresh halaman'}`)
      setLoading(false)
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
    const { data } = await supabase
      .from('budgets')
      .select('*')
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

    const finalTitle = type === 'topup' ? (title || 'Topup Saldo') : (title || category)
    const amountNum = parseFloat(amount)
    const adminFeeNum = type === 'topup' && adminFee ? parseFloat(adminFee) : 0
    const newWalletId = parseInt(selectedWalletId)

    if (!finalTitle || !amountNum || amountNum <= 0 || isNaN(amountNum) || !category || !selectedWalletId || !customDate || (type === 'topup' && !sourceWalletId)) {
      showToast('warning', 'Mohon lengkapi data dengan benar! Jumlah harus lebih dari 0.')
      return
    }

    if (type === 'topup' && sourceWalletId === selectedWalletId) {
      showToast('warning', 'Sumber dana dan dompet tujuan tidak boleh sama!')
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

    let freshSourceWalletBalance: number | null = null
    if (type === 'topup') {
      freshSourceWalletBalance = await fetchFreshWalletBalance(parseInt(sourceWalletId))
      if (freshSourceWalletBalance === null) {
        showToast('error', 'Sumber dana tidak ditemukan!')
        setSaving(false)
        return
      }
      if (freshSourceWalletBalance < (amountNum + adminFeeNum)) {
        showToast('error', `Saldo sumber dana tidak mencukupi!`)
        setSaving(false)
        return
      }
    }

    // Fix Bug #9: Timezone-safe date — pakai T12:00:00 agar tidak shift 1 hari di WIB
    const safeDate = new Date(`${customDate}T12:00:00`).toISOString()

    const payload = {
      title: finalTitle,
      amount: amountNum,
      type,
      category,
      wallet_id: newWalletId,
      source_wallet_id: type === 'topup' ? parseInt(sourceWalletId) : null,
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
      const oldSourceWalletId = oldTransaction.source_wallet_id
      const isSameWallet = oldWalletId === newWalletId && (type !== 'topup' || oldSourceWalletId === parseInt(sourceWalletId))

      // Fix Bug: Jika topup lama memiliki Biaya Admin, cari & hapus transaksi tersebut
      // lalu rollback jumlahnya ke saldo source wallet
      let oldAdminFeeAmount = 0
      if (oldTransaction.type === 'topup' && oldTransaction.source_wallet_id) {
        // Fix BUG #5: Tambah order created_at desc agar admin fee yang diambil
        // adalah milik topup ini (paling dekat waktunya), bukan topup lain di hari sama
        const { data: adminFeeTrx } = await supabase
          .from('transactions')
          .select('*')
          .eq('wallet_id', oldTransaction.source_wallet_id)
          .eq('title', 'Biaya Admin')
          .eq('type', 'pengeluaran')
          .eq('date', oldTransaction.date)
          .order('created_at', { ascending: false })
          .limit(1)

        if (adminFeeTrx && adminFeeTrx.length > 0) {
          oldAdminFeeAmount = adminFeeTrx[0].amount
          await supabase.from('transactions').delete().eq('id', adminFeeTrx[0].id)
        }
      }

      // Fix Bug #2: Selalu fetch saldo fresh dari DB sebelum update
      // Fix Bug #1: Handle kasus wallet lama ≠ wallet baru
      if (isSameWallet) {
        // Rollback & apply di wallet yang sama
        // Saldo setelah rollback transaksi lama
        let balanceAfterRollback = freshNewWalletBalance
        let sourceBalanceAfterRollback = freshSourceWalletBalance || 0

        if (oldTransaction.type === 'pemasukan' || oldTransaction.type === 'topup') {
          balanceAfterRollback -= oldTransaction.amount
        } else {
          balanceAfterRollback += oldTransaction.amount
        }

        if (oldTransaction.type === 'topup' && oldTransaction.source_wallet_id) {
          sourceBalanceAfterRollback += oldTransaction.amount + oldAdminFeeAmount
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
          if (type === 'pemasukan' || type === 'topup') finalBalance += amountNum
          else finalBalance -= amountNum
          await supabase.from('wallets').update({ balance: finalBalance }).eq('id', newWalletId)

          if (type === 'topup') {
            // Fix BUG #4: Tidak lakukan dua kali update - langsung hitung final saldo termasuk adminFee
            const finalSourceBalance = sourceBalanceAfterRollback - amountNum - adminFeeNum
            await supabase.from('wallets').update({ balance: finalSourceBalance }).eq('id', parseInt(sourceWalletId))
            // Re-apply admin fee baru jika ada
            if (adminFeeNum > 0) {
              const adminPayload = {
                title: 'Biaya Admin',
                amount: adminFeeNum,
                type: 'pengeluaran',
                category: 'Lainnya',
                wallet_id: parseInt(sourceWalletId),
                date: safeDate,
                created_at: new Date().toISOString(),
                is_piutang: false,
                is_talangan: false
              }
              await supabase.from('transactions').insert([adminPayload])
            }
          }
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
          if (oldTransaction.type === 'pemasukan' || oldTransaction.type === 'topup') {
            oldWalletNewBalance -= oldTransaction.amount
          } else {
            oldWalletNewBalance += oldTransaction.amount
          }
          await supabase.from('wallets').update({ balance: oldWalletNewBalance }).eq('id', oldWalletId)

          if (oldTransaction.type === 'topup' && oldTransaction.source_wallet_id) {
            const freshOldSourceBal = await fetchFreshWalletBalance(oldTransaction.source_wallet_id)
            if (freshOldSourceBal !== null) {
              await supabase.from('wallets').update({ balance: freshOldSourceBal + oldTransaction.amount + oldAdminFeeAmount }).eq('id', oldTransaction.source_wallet_id)
            }
          }

          // 2. Apply transaksi baru ke wallet BARU
          let newWalletNewBalance = freshNewWalletBalance
          if (type === 'pemasukan' || type === 'topup') {
            newWalletNewBalance += amountNum
          } else {
            newWalletNewBalance -= amountNum
          }
          await supabase.from('wallets').update({ balance: newWalletNewBalance }).eq('id', newWalletId)

          if (type === 'topup' && freshSourceWalletBalance !== null) {
            // Fix BUG #7: Admin fee juga di-apply saat edit topup dengan wallet berbeda
            const finalSourceBalance = freshSourceWalletBalance - amountNum - adminFeeNum
            await supabase.from('wallets').update({ balance: finalSourceBalance }).eq('id', parseInt(sourceWalletId))
            if (adminFeeNum > 0) {
              const adminPayload = {
                title: 'Biaya Admin',
                amount: adminFeeNum,
                type: 'pengeluaran',
                category: 'Lainnya',
                wallet_id: parseInt(sourceWalletId),
                date: safeDate,
                created_at: new Date().toISOString(),
                is_piutang: false,
                is_talangan: false
              }
              await supabase.from('transactions').insert([adminPayload])
            }
          }

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
        let newBalance = type === 'pemasukan' || type === 'topup'
          ? freshNewWalletBalance + amountNum
          : freshNewWalletBalance - amountNum

        if (type === 'topup' && freshSourceWalletBalance !== null) {
          let srcNewBalance = freshSourceWalletBalance - amountNum
          if (adminFeeNum > 0) {
            srcNewBalance -= adminFeeNum
            const adminPayload = {
              title: 'Biaya Admin',
              amount: adminFeeNum,
              type: 'pengeluaran',
              category: 'Lainnya',
              wallet_id: parseInt(sourceWalletId),
              date: safeDate, // maintain the same safeDate
              created_at: new Date().toISOString(),
              is_piutang: false,
              is_talangan: false
            }
            await supabase.from('transactions').insert([adminPayload])
          }
          await supabase.from('wallets').update({ balance: srcNewBalance }).eq('id', parseInt(sourceWalletId))
        }

        await supabase.from('wallets').update({ balance: newBalance }).eq('id', newWalletId)
        fetchWallets()
      }
    }

    if (error) {
      console.error("Supabase Error Full:", error)
      showToast('error', `Gagal menyimpan: ${error.message || 'Cek console untuk detail'}`)
    } else {
      if (editingId) {
        await supabase.from('debts').delete().eq('original_transaction_id', editingId)
      }

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
        }
      }
      // Optimistic update: langsung update state lokal tanpa full re-fetch semua transaksi
      if (data && data.length > 0) {
        if (editingId) {
          setTransactions(prev => prev.map(t => t.id === editingId ? (data[0] as any) : t))
        } else {
          setTransactions(prev => [data[0] as any, ...prev])
        }
      }

      showSuccess({
        type: editingId ? 'edit' : 'create',
        message: editingId ? 'Transaksi berhasil diperbarui!' : 'Transaksi baru berhasil dicatat!'
      })
      resetForm()
      // Background fetches: refresh debts & budgets tanpa blokir UI
      Promise.all([fetchDebts(), fetchBudgets()])
    }

    setSaving(false)
  }

  const resetForm = () => {
    setTitle('')
    setAmount('')
    setAdminFee('')
    setCategory('')
    setType('pemasukan')
    setSelectedWalletId('')
    setSourceWalletId('')
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
    // Reset Custom Category Form
    setShowAddCategory(false)
    setNewCategoryName('')
  }

  const handleEditClick = (t: Transaction) => {
    // Mobile: navigate to full page
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      window.location.href = `/transaction?type=${t.type}&edit=${t.id}`
      return
    }
    // Desktop: open modal
    setEditingId(t.id)
    setTitle(t.title)
    setAmount(t.amount.toString())
    setAdminFee('') // admin fee cannot be directly edited via parent topup 
    setCategory(t.category)
    setType(t.type)
    setSelectedWalletId(t.wallet_id?.toString() || '')
    setSourceWalletId(t.source_wallet_id?.toString() || '')
    setCustomDate(new Date(t.date || t.created_at).toISOString().split('T')[0])
    // Load Split Bill State
    const associatedDebts = debts.filter(d => d.original_transaction_id === t.id)
    if (associatedDebts.length > 0) {
      setIsSplitBill(true)
      setSplitEntries(associatedDebts.map(d => ({ name: d.person_name, amount: d.amount.toString() })))
    } else {
      setIsSplitBill(false)
      setSplitEntries([{ name: '', amount: '' }])
    }
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

    // Optimistic update: hapus dari state UI langsung (rollback jika gagal)
    setTransactions(prev => prev.filter(t => t.id !== id))

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
          const restoredBalance = transaction.type === 'pemasukan' || transaction.type === 'topup'
            ? freshBalance - transaction.amount
            : freshBalance + transaction.amount
          await supabase.from('wallets').update({ balance: restoredBalance }).eq('id', transaction.wallet_id)
        }

        if (transaction.type === 'topup' && transaction.source_wallet_id) {
          // Cari dan hapus transaksi Biaya Admin terkait (jika ada)
          let adminFeeRollback = 0
          // Fix BUG #5: Tambah order created_at desc agar admin fee yang diambil
          // adalah milik topup ini (paling dekat waktunya), bukan topup lain di hari sama
          const { data: adminFeeTrx } = await supabase
            .from('transactions')
            .select('*')
            .eq('wallet_id', transaction.source_wallet_id)
            .eq('title', 'Biaya Admin')
            .eq('type', 'pengeluaran')
            .eq('date', transaction.date)
            .order('created_at', { ascending: false })
            .limit(1)

          if (adminFeeTrx && adminFeeTrx.length > 0) {
            adminFeeRollback = adminFeeTrx[0].amount
            await supabase.from('transactions').delete().eq('id', adminFeeTrx[0].id)
          }

          const freshSource = await fetchFreshWalletBalance(transaction.source_wallet_id)
          if (freshSource !== null) {
            await supabase.from('wallets').update({ balance: freshSource + transaction.amount + adminFeeRollback }).eq('id', transaction.source_wallet_id)
          }
        }
      }
      showSuccess({
        type: 'delete',
        message: 'Transaksi berhasil dihapus dan saldo dompet dikembalikan.'
      })
      // Parallelkan fetchWallets & fetchDebts (fetchTransactions tidak perlu, sudah diupdate optimistic)
      Promise.all([fetchWallets(), fetchDebts()])
    } else {
      // Rollback optimistic update jika delete gagal
      fetchTransactions()
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
      created_at: new Date().toISOString(),
      is_piutang: true,
      piutang_person: debt.person_name
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
      Promise.all([fetchDebts(), fetchTransactions(), fetchWallets()])
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
  const getCategoryIcon = (catName: string, type: 'pemasukan' | 'pengeluaran' | 'topup') => {
    if (type === 'topup') return { Icon: WalletIcon, color: 'bg-blue-100 text-blue-600' }

    // 1. Check Custom Categories
    const customList = customCategories[type] || []
    const foundCustom = customList.find(c => (typeof c === 'string' ? c : c.name) === catName)
    if (foundCustom) {
      if (typeof foundCustom === 'object') {
        return { Icon: AVAILABLE_ICONS[foundCustom.iconName] || Package, color: foundCustom.color }
      }
      return { Icon: Package, color: 'bg-slate-100 dark:bg-[var(--bg-hover)] text-slate-600 dark:text-slate-500' }
    }

    // 2. Check Standard Categories
    const allCats = [...CATEGORIES.pemasukan, ...CATEGORIES.pengeluaran]
    const found = allCats.find(c => c.name === catName)
    return found ? { Icon: found.icon, color: found.color } : { Icon: Package, color: 'bg-slate-100 dark:bg-[var(--bg-hover)] text-slate-600 dark:text-slate-500' }
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
      .reduce((acc, curr) => {
        const associatedDebts = debts.filter(d => d.original_transaction_id === curr.id)
        const splitBillAmount = associatedDebts.reduce((sum, d) => sum + d.amount, 0)
        return acc + Math.max(0, curr.amount - splitBillAmount)
      }, 0)

    return { currentIncome: income, currentExpense: expense }
  }, [filteredTransactions, debts])

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
      .reduce((acc, curr) => {
        const associatedDebts = debts.filter(d => d.original_transaction_id === curr.id)
        const splitBillAmount = associatedDebts.reduce((sum, d) => sum + d.amount, 0)
        return acc + Math.max(0, curr.amount - splitBillAmount)
      }, 0)

    return { prevIncome: income, prevExpense: expense }
  }, [transactions, currentDate, debts])

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
          const associatedDebts = debts.filter(d => d.original_transaction_id === t.id)
          const splitBillAmount = associatedDebts.reduce((sum, d) => sum + d.amount, 0)
          data[monthIndex].expense += Math.max(0, t.amount - splitBillAmount)
        }
      }
    })

    return data
  }, [transactions, currentDate, debts])

  useEffect(() => {
    fetchBudgets()
  }, [currentDate])

  // --- Budget Awareness Logic (Memoized) ---
  const budgetInfo = useMemo(() => {
    if (type === 'pemasukan' || type === 'topup' || !category || !customDate) return null

    // 1. Find budget for the Selected Date's month (not necessarily Current Dashboard Month)
    // Note: 'budgets' state currently holds budgets for 'currentDate'. 
    // If user selects a date outside 'currentDate' month, we might not have the budget loaded.
    // In that case, we skip the warning (safe fallback).
    const targetDate = new Date(customDate)
    const budget = budgets.find(b => {
      if (!b.start_date || !b.end_date) return false
      const bStart = new Date(b.start_date)
      const bEnd = new Date(b.end_date)
      return b.category === category && targetDate >= bStart && targetDate <= bEnd
    })

    if (!budget) return null

    // 2. Calculate actual spending for that specific budget's date range
    const currentSpent = transactions
      .filter(t => {
        const tDate = new Date(t.date || t.created_at)
        const bStart = new Date(budget.start_date)
        const bEnd = new Date(budget.end_date)
        bEnd.setHours(23, 59, 59, 999) // include end of day

        return (
          t.category === category &&
          t.type === 'pengeluaran' &&
          !t.is_talangan &&
          t.id !== editingId &&
          tDate >= bStart &&
          tDate <= bEnd
        )
      })
      .reduce((acc, curr) => {
        const associatedDebts = debts.filter(d => d.original_transaction_id === curr.id)
        const splitBillAmount = associatedDebts.reduce((sum, d) => sum + d.amount, 0)
        return acc + Math.max(0, curr.amount - splitBillAmount)
      }, 0)

    let splitBillInputTotal = 0
    if (isSplitBill) {
      splitBillInputTotal = splitEntries.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0)
    }
    const newAmount = Math.max(0, (parseFloat(amount) || 0) - splitBillInputTotal)
    const totalProjected = currentSpent + newAmount
    const remaining = budget.amount - totalProjected
    const isOver = remaining < 0
    const percent = Math.min((totalProjected / budget.amount) * 100, 100)

    return { budget, currentSpent, totalProjected, remaining, isOver, percent }
  }, [category, type, budgets, transactions, amount, editingId, customDate, debts, isSplitBill, splitEntries])
  const handleExportExcel = async () => {
    try {
      showToast('success', 'Sedang menyiapkan laporan Excel...')
      const ExcelJS = (await import('exceljs')).default
      const fileSaverModule = await import('file-saver')
      const saveAs = fileSaverModule.saveAs || (fileSaverModule as any).default?.saveAs

      const wb = new ExcelJS.Workbook()
      wb.creator = 'CatatDuit'
      wb.created = new Date()

      // --- Determine active period label ---
      let periodLabel = ''
      let fileNamePeriod = ''
      if (filterMode === 'monthly') {
        periodLabel = currentDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
        fileNamePeriod = currentDate.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' }).replace(/ /g, '_')
      } else {
        const s = new Date(customRange.start).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
        const e = new Date(customRange.end).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
        periodLabel = `${s} - ${e}`
        fileNamePeriod = `${customRange.start}_sd_${customRange.end}`
      }

      // Helpers
      const BORDER_STYLE: any = { style: 'thin', color: { argb: 'FFD1D5DB' } }
      const THICK_BORDER: any = { style: 'medium', color: { argb: 'FF9CA3AF' } }
      const CELL_BORDER = { top: BORDER_STYLE, left: BORDER_STYLE, bottom: BORDER_STYLE, right: BORDER_STYLE }
      const BOTTOM_THICK = { top: BORDER_STYLE, left: BORDER_STYLE, bottom: THICK_BORDER, right: BORDER_STYLE }
      const RP_FMT = '"Rp "#,##0'
      const RP_FMT_NEG = '"Rp "#,##0;[Red]-"Rp "#,##0'

      const applyBorderToRow = (row: any, colCount: number, borderStyle = CELL_BORDER) => {
        for (let c = 1; c <= colCount; c++) {
          row.getCell(c).border = borderStyle
        }
      }

      const addTitleRow = (ws: any, title: string, colCount: number, color: string) => {
        // Support up to 26 columns (A-Z)
        const colLetter = String.fromCharCode(64 + colCount)
        ws.addRow([title])
        ws.mergeCells(`A1:${colLetter}1`)
        const cell = ws.getCell('A1')
        cell.value = title
        cell.font = { bold: true, size: 13, color: { argb: 'FFFFFFFF' } }
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } }
        cell.alignment = { horizontal: 'center', vertical: 'middle' }
        ws.getRow(1).height = 30
      }

      const addColHeaderRow = (ws: any, headers: string[], colCount: number, color = 'FF374151') => {
        const hRow = ws.addRow(headers)
        hRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 }
        hRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } }
        hRow.height = 22
        hRow.alignment = { vertical: 'middle' }
        applyBorderToRow(hRow, colCount, BOTTOM_THICK)
        return hRow
      }

      // ==========================================
      // SHEET 1: TRANSAKSI (sesuai filter aktif)
      // ==========================================
      const wsTx = wb.addWorksheet('Transaksi')
      wsTx.properties.tabColor = { argb: 'FF165DFF' }

      // 10 columns: Tanggal | Tipe | Kategori | Dompet | Pemasukan | Pengeluaran | Transfer | Piutang | Talangan | Catatan
      wsTx.columns = [
        { key: 'date', width: 16 },
        { key: 'type', width: 16 },
        { key: 'category', width: 22 },
        { key: 'account', width: 18 },
        { key: 'inflow', width: 18 },
        { key: 'outflow', width: 18 },
        { key: 'transfer', width: 16 },
        { key: 'piutang', width: 18 },
        { key: 'talangan', width: 18 },
        { key: 'note', width: 30 },
      ]

      // Row 1: Title, Row 2: Column headers
      addTitleRow(wsTx, `Transaksi Periode: ${periodLabel}`, 10, 'FF165DFF')
      addColHeaderRow(wsTx, ['Tanggal', 'Tipe', 'Kategori', 'Dompet', 'Pemasukan', 'Pengeluaran', 'Transfer', 'Piutang', 'Talangan', 'Catatan'], 10)

      const filteredSorted = [...filteredTransactions].sort(
        (a, b) => new Date(a.date || a.created_at).getTime() - new Date(b.date || b.created_at).getTime()
      )

      filteredSorted.forEach(t => {
        const walletName = wallets.find(w => w.id === t.wallet_id)?.name || '-'
        const isPiutangTx = t.type === 'pemasukan' && t.is_piutang
        const isTalaganTx = t.type === 'pengeluaran' && t.is_talangan

        let typeLabel = 'Transfer'
        if (isPiutangTx) typeLabel = 'Piutang'
        else if (t.type === 'pemasukan') typeLabel = 'Pemasukan'
        if (isTalaganTx) typeLabel = 'Talangan/Split'
        else if (t.type === 'pengeluaran') typeLabel = 'Pengeluaran'

        const isOdd = (wsTx.rowCount % 2 === 0)
        const row = wsTx.addRow({
          date: new Date(t.date || t.created_at),
          type: typeLabel,
          category: t.category || '-',
          account: walletName,
          inflow: (t.type === 'pemasukan' && !isPiutangTx) ? t.amount : null,
          outflow: (t.type === 'pengeluaran' && !isTalaganTx) ? t.amount : null,
          transfer: t.type === 'topup' ? t.amount : null,
          piutang: isPiutangTx ? t.amount : null,
          talangan: isTalaganTx ? t.amount : null,
          note: t.title || '',
        })
        row.height = 18
        row.getCell('date').numFmt = 'dd mmm yyyy'
        row.getCell('inflow').numFmt = RP_FMT
        row.getCell('outflow').numFmt = RP_FMT
        row.getCell('transfer').numFmt = RP_FMT
        row.getCell('piutang').numFmt = RP_FMT
        row.getCell('talangan').numFmt = RP_FMT
        if (!isPiutangTx && t.type === 'pemasukan') row.getCell('inflow').font = { color: { argb: 'FF059669' }, bold: true }
        if (!isTalaganTx && t.type === 'pengeluaran') row.getCell('outflow').font = { color: { argb: 'FFDC2626' }, bold: true }
        if (isPiutangTx) row.getCell('piutang').font = { color: { argb: 'FF9333EA' }, bold: true }
        if (isTalaganTx) row.getCell('talangan').font = { color: { argb: 'FFEA580C' }, bold: true }
        if (isOdd) row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFF' } }
        applyBorderToRow(row, 10)
      })

      // Total row
      const totalIn = filteredTransactions.filter(t => t.type === 'pemasukan' && !t.is_piutang).reduce((s, t) => s + t.amount, 0)
      const totalOut = filteredTransactions.filter(t => t.type === 'pengeluaran' && !t.is_talangan).reduce((s, t) => s + t.amount, 0)
      const totalTrf = filteredTransactions.filter(t => t.type === 'topup').reduce((s, t) => s + t.amount, 0)
      const totalPiutangAmt = filteredTransactions.filter(t => t.is_piutang).reduce((s, t) => s + t.amount, 0)
      const totalTalaganAmt = filteredTransactions.filter(t => t.is_talangan).reduce((s, t) => s + t.amount, 0)
      const txTotalRow = wsTx.addRow({
        date: 'TOTAL PERIODE',
        inflow: totalIn || null,
        outflow: totalOut || null,
        transfer: totalTrf || null,
        piutang: totalPiutangAmt || null,
        talangan: totalTalaganAmt || null,
      })
      txTotalRow.font = { bold: true }
      txTotalRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0F2FE' } }
      txTotalRow.getCell('inflow').numFmt = RP_FMT
      txTotalRow.getCell('inflow').font = { bold: true, color: { argb: 'FF059669' } }
      txTotalRow.getCell('outflow').numFmt = RP_FMT
      txTotalRow.getCell('outflow').font = { bold: true, color: { argb: 'FFDC2626' } }
      txTotalRow.getCell('transfer').numFmt = RP_FMT
      txTotalRow.getCell('piutang').numFmt = RP_FMT
      txTotalRow.getCell('piutang').font = { bold: true, color: { argb: 'FF9333EA' } }
      txTotalRow.getCell('talangan').numFmt = RP_FMT
      txTotalRow.getCell('talangan').font = { bold: true, color: { argb: 'FFEA580C' } }
      applyBorderToRow(txTotalRow, 10, BOTTOM_THICK)
      wsTx.autoFilter = { from: 'A2', to: 'J2' }

      // ==========================================
      // SHEET 2: PER KATEGORI (filter aktif)
      // ==========================================
      const wsCat = wb.addWorksheet('Per Kategori')
      wsCat.properties.tabColor = { argb: 'FFEF4444' }
      wsCat.columns = [
        { key: 'category', width: 28 },
        { key: 'total', width: 22 },
        { key: 'percent', width: 16 },
      ]
      addTitleRow(wsCat, `Pengeluaran per Kategori — ${periodLabel}`, 3, 'FFEF4444')
      addColHeaderRow(wsCat, ['Kategori', 'Total Pengeluaran', '% dari Total'], 3)

      const totalExpensePeriod = filteredTransactions.filter(t => t.type === 'pengeluaran').reduce((s, t) => s + t.amount, 0)
      const expByCat: Record<string, number> = {}
      filteredTransactions.filter(t => t.type === 'pengeluaran').forEach(t => {
        const cat = t.category || 'Lainnya'
        expByCat[cat] = (expByCat[cat] || 0) + t.amount
      })
      Object.entries(expByCat).sort((a, b) => b[1] - a[1]).forEach(([cat, total], idx) => {
        const row = wsCat.addRow({ category: cat, total, percent: totalExpensePeriod > 0 ? total / totalExpensePeriod : 0 })
        row.height = 18
        row.getCell('total').numFmt = RP_FMT
        row.getCell('total').font = { bold: true, color: { argb: 'FF7F1D1D' } }  // dark red — readable on any bg
        row.getCell('percent').numFmt = '0.0%'
        row.getCell('percent').font = { color: { argb: 'FF374151' } }
        applyBorderToRow(row, 3)
      })
      if (Object.keys(expByCat).length > 0) {
        // Color scale: white (min) → light salmon (max) — keeps text readable
        wsCat.addConditionalFormatting({
          ref: `B3:B${2 + Object.keys(expByCat).length}`,
          rules: [{ type: 'colorScale', cfvo: [{ type: 'min' }, { type: 'max' }], color: [{ argb: 'FFFFFFFF' }, { argb: 'FFFCA5A5' }] } as any]
        })
      }

      // ==========================================
      // SHEET 3: REKAP PER RENTANG (dari filter_history)
      // ==========================================
      const wsSummary = wb.addWorksheet('Rekap per Rentang')
      wsSummary.properties.tabColor = { argb: 'FF059669' }
      wsSummary.columns = [
        { key: 'range', width: 32 },
        { key: 'income', width: 22 },
        { key: 'expense', width: 22 },
        { key: 'piutang', width: 20 },
        { key: 'talangan', width: 20 },
        { key: 'diff', width: 22 },
      ]
      addTitleRow(wsSummary, 'Rekap per Rentang Tanggal — Semua Riwayat', 6, 'FF059669')
      addColHeaderRow(wsSummary, ['Rentang Tanggal', 'Pemasukan', 'Pengeluaran', 'Piutang', 'Talangan', 'Selisih'], 6)

      // Filter out trivial/ambiguous entries before rendering:
      // 1. Skip rentang < 3 hari — hasil debounce saat user masih mengedit custom range
      // 2. Dedup berdasarkan key start_date|end_date (safety net, seharusnya sudah unique di DB)
      const MIN_DURATION_MS = 2 * 24 * 60 * 60 * 1000 // 3 hari minimum (selisih start→end >= 2 hari)
      const seenKeys = new Set<string>()
      const cleanHistory = filterHistory.filter(entry => {
        const durationMs = new Date(entry.end_date).getTime() - new Date(entry.start_date).getTime()
        if (durationMs < MIN_DURATION_MS) return false // skip rentang < 3 hari (kemungkinan sampah debounce)
        const key = `${entry.start_date}|${entry.end_date}`
        if (seenKeys.has(key)) return false
        seenKeys.add(key)
        return true
      })

      if (cleanHistory.length === 0) {
        // Fallback: no valid history yet, show a note
        const noteRow = wsSummary.addRow({ range: 'Belum ada history rentang tanggal. Gunakan filter custom minimal 3 hari dan data akan tercatat otomatis.' })
        noteRow.getCell('range').font = { italic: true, color: { argb: 'FF6B7280' } }
      } else {
        // Accumulate totals from each range row as we go
        let grandIn = 0, grandOut = 0

        cleanHistory.forEach((entry, idx) => {
          const start = new Date(entry.start_date)
          const end = new Date(entry.end_date)
          // Set end-of-day for end date to include all transactions on that day
          end.setHours(23, 59, 59, 999)

          const rangeTransactions = transactions.filter(t => {
            const d = new Date(t.date || t.created_at)
            return d >= start && d <= end
          })

          const income = rangeTransactions.filter(t => t.type === 'pemasukan' && !t.is_piutang).reduce((s, t) => s + t.amount, 0)
          const expense = rangeTransactions.filter(t => t.type === 'pengeluaran' && !t.is_talangan).reduce((s, t) => s + t.amount, 0)
          const piutang = rangeTransactions.filter(t => t.is_piutang).reduce((s, t) => s + t.amount, 0)
          const talangan = rangeTransactions.filter(t => t.is_talangan).reduce((s, t) => s + t.amount, 0)
          const diff = income - expense

          grandIn += income
          grandOut += expense

          const rangeLabel = entry.label || `${entry.start_date} – ${entry.end_date}`
          const row = wsSummary.addRow({ range: rangeLabel, income, expense, piutang, talangan, diff })
          row.height = 18
          row.getCell('income').numFmt = RP_FMT
          row.getCell('income').font = { color: { argb: 'FF059669' } }
          row.getCell('expense').numFmt = RP_FMT
          row.getCell('expense').font = { color: { argb: 'FFDC2626' } }
          row.getCell('piutang').numFmt = RP_FMT
          row.getCell('piutang').font = { color: { argb: 'FF9333EA' } }
          row.getCell('talangan').numFmt = RP_FMT
          row.getCell('talangan').font = { color: { argb: 'FFEA580C' } }
          row.getCell('diff').numFmt = RP_FMT_NEG
          row.getCell('diff').font = { bold: true, color: { argb: diff >= 0 ? 'FF165DFF' : 'FFDC2626' } }
          if (idx % 2 === 0) row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0FDF4' } }
          applyBorderToRow(row, 6)
        })

        // Grand total row — only show if more than 1 range (otherwise it's just a duplicate)
        if (cleanHistory.length > 1) {
          const grandDiff = grandIn - grandOut
          const grandRow = wsSummary.addRow({ range: 'TOTAL SEMUA RENTANG', income: grandIn, expense: grandOut, diff: grandDiff })
          grandRow.font = { bold: true }
          grandRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0F2FE' } }
          grandRow.getCell('income').numFmt = RP_FMT
          grandRow.getCell('income').font = { bold: true, color: { argb: 'FF059669' } }
          grandRow.getCell('expense').numFmt = RP_FMT
          grandRow.getCell('expense').font = { bold: true, color: { argb: 'FFDC2626' } }
          grandRow.getCell('diff').numFmt = RP_FMT_NEG
          grandRow.getCell('diff').font = { bold: true, color: { argb: grandDiff >= 0 ? 'FF165DFF' : 'FFDC2626' } }
          applyBorderToRow(grandRow, 6, BOTTOM_THICK)
        }
      }



      // ==========================================
      // SHEET 4: DOMPET
      // ==========================================
      const wsWallets = wb.addWorksheet('Dompet')
      wsWallets.properties.tabColor = { argb: 'FFF59E0B' }
      wsWallets.columns = [
        { key: 'name', width: 24 },
        { key: 'type', width: 16 },
        { key: 'category', width: 16 },
        { key: 'balance', width: 22 },
      ]
      addTitleRow(wsWallets, 'Saldo Dompet Saat Ini', 4, 'FFF59E0B')
      addColHeaderRow(wsWallets, ['Nama Dompet', 'Tipe', 'Kategori', 'Saldo'], 4)
      wallets.forEach((w, idx) => {
        const row = wsWallets.addRow({
          name: w.name,
          type: w.type === 'cash' ? 'Tunai' : 'Bank/E-Wallet',
          category: w.category === 'active' ? 'Saldo Aktif' : 'Tabungan',
          balance: w.balance,
        })
        row.height = 18
        row.getCell('balance').numFmt = RP_FMT
        row.getCell('balance').font = { bold: true, color: { argb: 'FF165DFF' } }
        if (idx % 2 === 0) row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFBEB' } }
        applyBorderToRow(row, 4)
      })
      const totalBalance = wallets.reduce((s, w) => s + w.balance, 0)
      const walletTotalRow = wsWallets.addRow({ name: 'TOTAL', balance: totalBalance })
      walletTotalRow.font = { bold: true }
      walletTotalRow.getCell('balance').numFmt = RP_FMT
      walletTotalRow.getCell('balance').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF3CD' } }
      applyBorderToRow(walletTotalRow, 4, BOTTOM_THICK)

      wb.views = [{ x: 0, y: 0, width: 10000, height: 20000, firstSheet: 0, activeTab: 0, visibility: 'visible' }]

      const buffer = await wb.xlsx.writeBuffer()
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      saveAs(blob, `CatatDuit_${fileNamePeriod}.xlsx`)
      showToast('success', `Berhasil mengekspor ${filteredTransactions.length} transaksi (${periodLabel})!`)

    } catch (error) {
      console.error('Export Excel error:', error)
      showToast('error', 'Gagal mengekspor file Excel.')
    }
  }

  return (
    <main className="flex-1 bg-[#F9FAFB] dark:bg-[#F9FAFB] dark:bg-[var(--bg-page)] min-h-screen overflow-x-hidden transition-all duration-300">

      {/* ============= DESKTOP TOP HEADER ============= */}
      <div className="hidden md:flex items-center justify-between w-full h-[90px] shrink-0 border-b border-[var(--border-default)] bg-white dark:bg-[var(--bg-card)] px-8">
        <div className="flex items-center gap-4">
          <h2 className="font-bold text-2xl text-[var(--text-primary)]">CatatDuit</h2>
        </div>
        <div className="flex items-center gap-3 pl-3">
          <div className="text-right">
            <p className="font-semibold text-[var(--text-primary)] text-sm">Eko Budi</p>
          </div>
          <div className="w-11 h-11 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center text-slate-500 dark:text-slate-400 font-bold border-2 border-white shadow-sm">
            EB
          </div>
        </div>
      </div>

      {/* ============= MOBILE DASHBOARD ============= */}
      <div className="md:hidden flex flex-col pb-[80px]">

        {/* Mobile Top Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 bg-white dark:bg-[var(--bg-card)] border-b border-[var(--border-default)]">
          <div>
            <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">CatatDuit</p>
            <h1 className="font-bold text-xl text-[var(--text-primary)]">Hemat Yuk! 💪</h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-[#F9FAFB] dark:bg-[var(--bg-page)] text-[var(--text-secondary)] active:scale-90 transition-all"
            >
              <Settings className="w-4 h-4" />
            </button>
            <div className="w-9 h-9 bg-[var(--primary)] rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm">
              EB
            </div>
          </div>
        </div>

        {/* Mobile Settings Panel */}
        {showSettings && (
          <div className="mx-4 mt-3 bg-white dark:bg-[var(--bg-card)] rounded-2xl shadow-lg border border-slate-100 dark:border-[var(--border-default)] p-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-slate-800 dark:text-[var(--text-primary)] text-sm flex items-center gap-2">
                <Settings className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                Filter & Periode
              </h3>
              <button onClick={() => setShowSettings(false)} className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 dark:text-slate-500">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex bg-slate-100 dark:bg-[var(--bg-elevated)] p-1 rounded-xl mb-3">
              <button onClick={() => setFilterMode('monthly')} className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${filterMode === 'monthly' ? 'bg-white dark:bg-[var(--bg-card)] text-blue-600 shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}>Bulanan</button>
              <button onClick={() => setFilterMode('custom')} className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${filterMode === 'custom' ? 'bg-white dark:bg-[var(--bg-card)] text-blue-600 shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}>Custom</button>
            </div>
            {filterMode === 'monthly' ? (
              <div className="grid grid-cols-2 gap-2">
                <select value={currentDate.getMonth()} onChange={(e) => { const d = new Date(currentDate); d.setMonth(parseInt(e.target.value)); setCurrentDate(d); }} className="p-2 bg-slate-50 dark:bg-[var(--bg-input)] border border-slate-200 dark:border-[var(--border-default)] rounded-xl text-sm font-medium text-[var(--text-primary)] outline-none">
                  {['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'].map((m, i) => <option key={i} value={i}>{m}</option>)}
                </select>
                <select value={currentDate.getFullYear()} onChange={(e) => { const d = new Date(currentDate); d.setFullYear(parseInt(e.target.value)); setCurrentDate(d); }} className="p-2 bg-slate-50 dark:bg-[var(--bg-input)] border border-slate-200 dark:border-[var(--border-default)] rounded-xl text-sm font-medium text-[var(--text-primary)] outline-none">
                  {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            ) : (
              <div className="space-y-2">
                <input type="date" value={customRange.start} onChange={(e) => setCustomRange({ ...customRange, start: e.target.value })} className="w-full p-2 bg-slate-50 dark:bg-[var(--bg-input)] border border-slate-200 dark:border-[var(--border-default)] rounded-xl text-sm text-[var(--text-primary)] outline-none" />
                <input type="date" value={customRange.end} onChange={(e) => setCustomRange({ ...customRange, end: e.target.value })} className="w-full p-2 bg-slate-50 dark:bg-[var(--bg-input)] border border-slate-200 dark:border-[var(--border-default)] rounded-xl text-sm text-[var(--text-primary)] outline-none" />
              </div>
            )}
            <button onClick={() => { setFilterMode('monthly'); setCurrentDate(new Date()); setShowSettings(false); }} className="w-full mt-2 py-1.5 text-xs font-bold text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-[var(--bg-elevated)] rounded-lg transition-colors">Reset ke Bulan Ini</button>
          </div>
        )}

        {/* Mobile Hero Card */}
        <div className="mx-4 mt-4 rounded-2xl bg-gradient-to-br from-[#165DFF] to-[#0E4BD9] p-5 shadow-lg shadow-blue-500/20 relative overflow-hidden">
          {/* Decorative circles */}
          <div className="absolute -top-6 -right-6 w-28 h-28 bg-white/5 rounded-full" />
          <div className="absolute -bottom-8 -left-4 w-36 h-36 bg-white/5 rounded-full" />

          {/* Period Row */}
          <div className="flex items-center justify-between mb-4 relative z-10">
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-full">
              <button onClick={prevMonth} disabled={filterMode === 'custom'} className="text-white/80 active:scale-90 transition-all disabled:opacity-40">
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="text-white/90 text-xs font-semibold">{getPeriodLabel()}</span>
              <button onClick={nextMonth} disabled={filterMode === 'custom'} className="text-white/80 active:scale-90 transition-all disabled:opacity-40">
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <button onClick={() => setShowBalance(!showBalance)} className="text-white/70 active:scale-90 transition-all">
              {showBalance ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {/* Total Balance */}
          <div className="mb-1 relative z-10">
            <p className="text-white/70 text-xs font-semibold uppercase tracking-wider mb-1">Total Semua Uang</p>
            <p className="text-white font-bold text-3xl leading-tight">
              {showBalance
                ? `Rp ${wallets.reduce((acc, curr) => acc + curr.balance, 0).toLocaleString('id-ID')}`
                : 'Rp ••••••••'}
            </p>
          </div>

          {/* Income & Expense mini stats */}
          <div className="grid grid-cols-2 gap-3 mt-5 relative z-10">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-300" />
                <p className="text-white/70 text-[10px] font-semibold">Pemasukan</p>
              </div>
              <p className="text-white font-bold text-sm">
                {showIncome ? `Rp ${currentIncome.toLocaleString('id-ID')}` : 'Rp ••••••'}
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <TrendingDown className="w-3.5 h-3.5 text-rose-300" />
                <p className="text-white/70 text-[10px] font-semibold">Pengeluaran</p>
              </div>
              <p className="text-white font-bold text-sm">Rp {currentExpense.toLocaleString('id-ID')}</p>
            </div>
          </div>
        </div>

        {/* Mobile Quick Actions */}
        <div className="px-4 mt-5">
          <p className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-3">Aksi Cepat</p>
          <div className="grid grid-cols-4 gap-3">
            <Link
              href="/transaction?type=pemasukan"
              className="flex flex-col items-center gap-2 active:scale-90 transition-all"
            >
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-800/30 flex items-center justify-center shadow-sm">
                <TrendingUp className="w-7 h-7 text-emerald-600" />
              </div>
              <span className="text-[11px] font-semibold text-[var(--text-secondary)]">Masuk</span>
            </Link>
            <Link
              href="/transaction?type=pengeluaran"
              className="flex flex-col items-center gap-2 active:scale-90 transition-all"
            >
              <div className="w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-800/30 flex items-center justify-center shadow-sm">
                <TrendingDown className="w-7 h-7 text-rose-500" />
              </div>
              <span className="text-[11px] font-semibold text-[var(--text-secondary)]">Keluar</span>
            </Link>
            <Link
              href="/transaction?type=topup"
              className="flex flex-col items-center gap-2 active:scale-90 transition-all"
            >
              <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-800/30 flex items-center justify-center shadow-sm">
                <WalletIcon className="w-7 h-7 text-[var(--primary)]" />
              </div>
              <span className="text-[11px] font-semibold text-[var(--text-secondary)]">Transfer</span>
            </Link>
            <Link href="/budgets" className="flex flex-col items-center gap-2 active:scale-90 transition-all">
              <div className="w-14 h-14 rounded-2xl bg-purple-50 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-800/30 flex items-center justify-center shadow-sm">
                <CreditCard className="w-7 h-7 text-purple-600" />
              </div>
              <span className="text-[11px] font-semibold text-[var(--text-secondary)]">Anggaran</span>
            </Link>
          </div>
        </div>

        {/* Mobile Stats Row */}
        <div className="px-4 mt-5 grid grid-cols-2 gap-3">
          {/* Saldo Aktif */}
          <div className="bg-white dark:bg-[var(--bg-card)] rounded-2xl p-4 border border-[var(--border-default)] shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center">
                  <CreditCard className="w-4 h-4 text-[var(--primary)]" />
                </div>
                <p className="text-[11px] font-semibold text-[var(--text-secondary)]">Saldo Aktif</p>
              </div>
              <button onClick={() => setShowActiveBalance(!showActiveBalance)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] active:scale-90 transition-all">
                {showActiveBalance ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="font-bold text-base text-[var(--text-primary)] leading-tight">
              {showActiveBalance
                ? `Rp ${wallets.filter(w => w.category === 'active').reduce((acc, curr) => acc + curr.balance, 0).toLocaleString('id-ID')}`
                : 'Rp ••••••'}
            </p>
            <p className="text-[10px] text-[var(--text-secondary)] mt-1">Siap digunakan</p>
          </div>
          {/* Pemasukan Bulan Ini */}
          <div className="bg-white dark:bg-[var(--bg-card)] rounded-2xl p-4 border border-[var(--border-default)] shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                </div>
                <p className="text-[11px] font-semibold text-[var(--text-secondary)]">Pemasukan</p>
              </div>
              <button onClick={() => setShowIncome(!showIncome)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] active:scale-90 transition-all">
                {showIncome ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="font-bold text-base text-[var(--text-primary)] leading-tight">
              {showIncome ? `Rp ${currentIncome.toLocaleString('id-ID')}` : 'Rp ••••••'}
            </p>
            <div className="flex items-center gap-1.5 mt-1">
              <p className="text-[10px] text-[var(--text-secondary)]">Bulan ini</p>
              {prevIncome > 0 && (
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${incomeChange >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 dark:bg-rose-950/40 text-rose-700'}`}>
                  {incomeChange >= 0 ? '▲' : '▼'} {Math.abs(incomeChange).toFixed(0)}%
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Debt Quick View */}
        {debts.some(d => d.status === 'pending') && (
          <div className="mx-4 mt-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/30 rounded-2xl p-4 transition-all">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <p className="text-sm font-bold text-amber-800">
                  {debts.filter(d => d.status === 'pending').length} Piutang Belum Lunas
                </p>
              </div>
              <button onClick={() => setShowMobileDebtList(!showMobileDebtList)} className="text-xs font-bold text-amber-700 bg-amber-200 px-3 py-1 rounded-full active:scale-95 transition-all">
                {showMobileDebtList ? 'Tutup' : 'Lihat'}
              </button>
            </div>

            {showMobileDebtList && (
              <div className="mt-4 flex flex-col gap-2">
                {debts.filter(d => d.status === 'pending').map(debt => (
                  <div key={debt.id} className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-[var(--bg-card)] border border-amber-100 shadow-sm">
                    <div>
                      <p className="font-bold text-amber-900 text-sm">{debt.person_name}</p>
                      <p className="text-xs text-amber-700 font-semibold">Rp {debt.amount.toLocaleString('id-ID')}</p>
                    </div>
                    <button
                      onClick={() => { setSelectedDebt(debt); setShowDebtModal(true); setShowMobileDebtList(false); }}
                      className="px-3 py-1.5 bg-[var(--primary)] text-white text-xs font-bold rounded-lg active:scale-95 transition-all"
                    >
                      Lunas
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Mobile Transaction History - All Transactions Scrollable */}
        <div className="mx-4 mt-5">
          <div className="flex items-center justify-between mb-3">
            <p className="font-bold text-[var(--text-primary)]">Riwayat Transaksi</p>
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportExcel}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-all font-semibold text-xs border border-emerald-200"
                title="Export ke Excel"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" /></svg>
                Export
              </button>
              <button
                onClick={fetchTransactions}
                disabled={loading}
                className={`p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-[var(--bg-hover)] text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 dark:text-slate-500 transition-all ${loading ? 'animate-spin' : ''}`}
                title="Refresh"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" /><path d="M8 16H3v5" /></svg>
              </button>
              <Link href="/analytics" className="text-xs font-semibold text-[var(--primary)] flex items-center gap-1">
                Lihat Semua <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
          <div className="bg-white dark:bg-[var(--bg-card)] rounded-2xl border border-[var(--border-default)] shadow-sm overflow-hidden max-h-[420px] overflow-y-auto custom-scrollbar">
            {loading ? (
              <div className="flex items-center justify-center p-10">
                <div className="w-6 h-6 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="p-10 text-center">
                <p className="text-[var(--text-secondary)] text-sm">Belum ada transaksi bulan ini</p>
              </div>
            ) : (
              filteredTransactions.map((t, idx) => {
                const { Icon, color } = getCategoryIcon(t.category, t.type)
                return (
                  <div
                    key={t.id}
                    onClick={() => handleEditClick(t)}
                    className={`flex items-center gap-3 px-4 py-4 active:bg-slate-50 dark:active:bg-[var(--bg-hover)] dark:bg-[var(--bg-page)] cursor-pointer transition-colors ${idx < filteredTransactions.length - 1 ? 'border-b border-[var(--border-default)]' : ''}`}
                  >
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                        <p className="font-semibold text-[var(--text-primary)] text-sm truncate max-w-[140px]">
                          {t.type === 'topup' && t.source_wallet_id
                            ? `${t.title} (${wallets.find(w => w.id === t.source_wallet_id)?.name || '?'} → ${wallets.find(w => w.id === t.wallet_id)?.name || '?'})`
                            : t.title}
                        </p>
                        {t.is_piutang && (
                          <span className="text-[9px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full shrink-0">💸 Piutang</span>
                        )}
                        {t.is_talangan && (
                          <span className="text-[9px] font-bold bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full shrink-0">🤝 Talangan</span>
                        )}
                        {debts.some(d => d.original_transaction_id === t.id) && (
                          <span className="text-[9px] font-bold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full shrink-0">🧑‍🤝‍🧑 Split Bill</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-[#8C9AAA] mb-1">
                        <span>{new Date(t.date || t.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
                        <span>{new Date(t.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-[var(--bg-hover)] text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        {t.category}
                      </span>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <p className={`font-bold text-sm mb-1 ${t.type === 'topup' ? 'text-blue-600' :
                        t.type === 'pemasukan' ? (t.is_piutang ? 'text-amber-500' : 'text-emerald-600') :
                          (t.is_talangan ? 'text-purple-500' : 'text-[var(--text-primary)]')
                        }`}>
                        {t.type === 'pengeluaran' ? '-' : '+'} Rp {t.amount.toLocaleString('id-ID')}
                      </p>
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteTransaction(t.id); }}
                        disabled={deletingId === t.id}
                        className={`text-xs font-medium transition-all ${deletingId === t.id ? 'text-slate-400 dark:text-slate-500 cursor-not-allowed' : 'text-[#ED6B60]'}`}
                      >
                        {deletingId === t.id ? (
                          <span className="flex items-center gap-1">
                            <div className="w-3 h-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
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

        {/* Mobile Note Preview */}
        {latestNote && (
          <Link href="/notes" className="mx-4 mt-4 block rounded-2xl border border-[#FED71F] dark:border-amber-700/50 bg-[#FEF9C3] dark:bg-amber-950/30 p-4 active:opacity-80 transition-all relative">
            {noteCount > 1 && (
              <div className="absolute -top-2 -right-2 bg-rose-500 text-white text-[10px] font-bold h-5 min-w-[20px] px-1 flex items-center justify-center rounded-full border-2 border-white dark:border-[var(--bg-page)] shadow-sm">
                {noteCount > 99 ? '99+' : noteCount}
              </div>
            )}
            <div className="flex items-center gap-2 mb-1 text-[#B45309] dark:text-amber-400">
              <StickyNote className="w-4 h-4" />
              <span className="font-bold text-sm">Catatan Terbaru</span>
            </div>
            <p className="font-bold text-[var(--text-primary)] text-sm mb-0.5">{latestNote.title}</p>
            <p className="text-xs text-[#4B5563] dark:text-amber-300/70 line-clamp-2">{latestNote.content}</p>
          </Link>
        )}

        {/* Mobile Chart - Arus Kas & Pertumbuhan */}
        <div className="mx-4 mt-5">
          <div className="bg-white dark:bg-[var(--bg-card)] rounded-2xl border border-[var(--border-default)] shadow-sm p-4">
            <div className="mb-4">
              <h3 className="font-bold text-[var(--text-primary)]">Arus Kas & Pertumbuhan</h3>
              <p className="text-xs text-[var(--text-secondary)]">Analisis Perbandingan</p>
            </div>
            <FinancialChart data={monthlyData} />
          </div>
        </div>

        {/* Mobile Tagihan Rutin */}
        <div className="mx-4 mt-4">
          <div className="bg-white dark:bg-[var(--bg-card)] rounded-2xl border border-[var(--border-default)] shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-[var(--border-default)]">
              <h3 className="font-bold text-[var(--text-primary)]">Tagihan Rutin</h3>
            </div>
            <div className="p-2">
              <RecurringBillsList refreshTrigger={billsUpdateTrigger} onUpdate={handleBillsUpdate} />
            </div>
          </div>
        </div>

        {/* Mobile Calendar */}
        <div className="mx-4 mt-4">
          <CalendarCard refreshTrigger={billsUpdateTrigger} onUpdate={handleBillsUpdate} />
        </div>

        {/* Mobile Gold Price & Currency */}
        <div className="mx-4 mt-4 grid grid-cols-1 gap-4">
          <GoldPriceCard />
          <CurrencyCard />
        </div>

      </div>{/* end mobile dashboard */}

      {/* ============= DESKTOP DASHBOARD ============= */}
      <div className="hidden md:block p-8 space-y-8">

        {/* Date Filter & Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-[var(--text-primary)] text-2xl md:text-3xl font-bold mb-1">Hemat Yuk !!!</h1>
            <p className="text-[var(--text-secondary)] text-sm">Financial metrics for {getPeriodLabel()}.</p>
          </div>

          <div className="flex items-center gap-3 bg-white dark:bg-[var(--bg-card)] p-1.5 rounded-full border border-[var(--border-default)] shadow-sm">
            <button
              onClick={prevMonth}
              className="p-2 hover:bg-[#F9FAFB] dark:hover:bg-[var(--bg-hover)] rounded-full text-[var(--text-secondary)] transition-all"
              disabled={filterMode === 'custom'}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="px-4 text-sm font-bold text-[var(--text-primary)] whitespace-nowrap min-w-[140px] text-center">
              {getPeriodLabel()}
            </div>

            <button
              onClick={nextMonth}
              className="p-2 hover:bg-[#F9FAFB] dark:hover:bg-[var(--bg-hover)] rounded-full text-[var(--text-secondary)] transition-all"
              disabled={filterMode === 'custom'}
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            <div className="w-px h-6 bg-[var(--border-default)] mx-1"></div>

            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 hover:bg-[#F9FAFB] dark:hover:bg-[var(--bg-hover)] rounded-full text-[var(--text-secondary)] transition-all"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Settings / Filter Panel */}
        {showSettings && (
          <div className="w-full md:max-w-sm md:ml-auto lg:fixed lg:right-8 lg:top-32 lg:z-50 bg-white dark:bg-[var(--bg-card)] rounded-2xl shadow-xl border border-slate-100 dark:border-[var(--border-default)] p-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-slate-800 dark:text-[var(--text-primary)] text-sm flex items-center gap-2">
                <Settings className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                Filter & Periode
              </h3>
              <button onClick={() => setShowSettings(false)} className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 dark:text-slate-500">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Mode Switcher */}
            <div className="flex bg-slate-100 dark:bg-[var(--bg-hover)] p-1 rounded-xl mb-4">
              <button
                onClick={() => setFilterMode('monthly')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${filterMode === 'monthly' ? 'bg-white dark:bg-[var(--bg-card)] text-blue-600 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-300'}`}
              >
                Bulanan
              </button>
              <button
                onClick={() => setFilterMode('custom')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${filterMode === 'custom' ? 'bg-white dark:bg-[var(--bg-card)] text-blue-600 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-300'}`}
              >
                Custom
              </button>
            </div>

            <div className="space-y-4">
              {filterMode === 'monthly' ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">Bulan</label>
                    <select
                      value={currentDate.getMonth()}
                      onChange={(e) => {
                        const newMonth = parseInt(e.target.value);
                        const newDate = new Date(currentDate);
                        newDate.setMonth(newMonth);
                        setCurrentDate(newDate);
                      }}
                      className="w-full p-2.5 bg-slate-50 dark:bg-[var(--bg-elevated)] border border-slate-200 dark:border-[var(--border-default)] rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 outline-none"
                    >
                      {['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'].map((m, i) => (
                        <option key={i} value={i}>{m}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">Tahun</label>
                    <select
                      value={currentDate.getFullYear()}
                      onChange={(e) => {
                        const newYear = parseInt(e.target.value);
                        const newDate = new Date(currentDate);
                        newDate.setFullYear(newYear);
                        setCurrentDate(newDate);
                      }}
                      className="w-full p-2.5 bg-slate-50 dark:bg-[var(--bg-elevated)] border border-slate-200 dark:border-[var(--border-default)] rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 outline-none"
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
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">Dari Tanggal</label>
                    <input
                      type="date"
                      value={customRange.start}
                      onChange={(e) => setCustomRange({ ...customRange, start: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 dark:bg-[var(--bg-elevated)] border border-slate-200 dark:border-[var(--border-default)] rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">Sampai Tanggal</label>
                    <input
                      type="date"
                      value={customRange.end}
                      onChange={(e) => setCustomRange({ ...customRange, end: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 dark:bg-[var(--bg-elevated)] border border-slate-200 dark:border-[var(--border-default)] rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 outline-none"
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
                className="w-full py-2 text-xs font-bold text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-[var(--bg-elevated)] rounded-lg transition-colors"
              >
                Reset ke Bulan Ini
              </button>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {/* Card 1: Total Tabungan (Revenue style) */}
          <div className="flex flex-col rounded-2xl border border-[var(--border-default)] p-6 gap-3 bg-white dark:bg-[var(--bg-card)] hover:shadow-sm transition-all duration-300 group">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-[6px]">
                <div className="size-11 bg-[#30B22D]/10 rounded-xl flex items-center justify-center shrink-0">
                  <WalletIcon className="size-6 text-[#30B22D]" />
                </div>
                <p className="font-medium text-[var(--text-secondary)]">Total Semua Uang</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <button
                    onClick={() => setShowTotalTooltip(!showTotalTooltip)}
                    className="p-1 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 dark:text-slate-500 transition-colors rounded-full hover:bg-slate-50 dark:hover:bg-[var(--bg-elevated)] relative z-20"
                  >
                    <Info className="w-3.5 h-3.5" />
                  </button>

                  {/* Invisible overlay */}
                  {showTotalTooltip && (
                    <div className="fixed inset-0 z-10" onClick={() => setShowTotalTooltip(false)} />
                  )}

                  <div className={`absolute right-0 top-full mt-3 w-64 p-3 bg-slate-800 text-white text-xs rounded-xl shadow-xl transition-all z-20 font-medium leading-relaxed ${showTotalTooltip ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible -translate-y-1'
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
            <p className="font-bold text-[28px] leading-10 text-[var(--text-primary)]">
              {showBalance ? `Rp ${wallets.filter(w => w.category === 'savings').reduce((acc, curr) => acc + curr.balance, 0).toLocaleString('id-ID')}` : 'Rp ••••••••'}
            </p>
            <div className="flex justify-between items-center">
              <p className="text-xs text-[var(--text-secondary)]">Total aset tersimpan</p>
              <button onClick={() => setShowBalance(!showBalance)} className="text-[var(--text-secondary)] hover:text-[var(--primary)]">
                {showBalance ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Card 2: Saldo Aktif (Shipments style) */}
          <div className="flex flex-col rounded-2xl border border-[var(--border-default)] p-6 gap-3 bg-white dark:bg-[var(--bg-card)] hover:shadow-sm transition-all duration-300 group">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-[6px]">
                <div className="size-11 bg-[var(--primary)]/10 rounded-xl flex items-center justify-center shrink-0">
                  <CreditCard className="size-6 text-[var(--primary)]" />
                </div>
                <p className="font-medium text-[var(--text-secondary)]">Saldo Aktif</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <button
                    onClick={() => setShowActiveTooltip(!showActiveTooltip)}
                    className="p-1 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 dark:text-slate-500 transition-colors rounded-full hover:bg-slate-50 dark:hover:bg-[var(--bg-elevated)] relative z-20"
                  >
                    <Info className="w-3.5 h-3.5" />
                  </button>

                  {/* Invisible overlay */}
                  {showActiveTooltip && (
                    <div className="fixed inset-0 z-10" onClick={() => setShowActiveTooltip(false)} />
                  )}

                  <div className={`absolute right-0 top-full mt-3 w-64 p-3 bg-slate-800 text-white text-xs rounded-xl shadow-xl transition-all z-20 font-medium leading-relaxed ${showActiveTooltip ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible -translate-y-1'
                    }`}>
                    <p>Total sisa saldo dari dompet bertipe <span className="text-[var(--primary)] font-bold">Aktif</span>.</p>
                    <div className="mt-2 pt-2 border-t border-slate-700/50">
                      <p className="text-slate-300">Uang yang siap digunakan untuk transaksi sehari-hari.</p>
                    </div>
                    {/* Arrow up */}
                    <div className="absolute -top-1.5 right-6 w-3 h-3 bg-slate-800 rotate-45"></div>
                  </div>
                </div>
              </div>
            </div>
            <p className="font-bold text-[28px] leading-10 text-[var(--text-primary)]">
              {showActiveBalance ? `Rp ${wallets.filter(w => w.category === 'active').reduce((acc, curr) => acc + curr.balance, 0).toLocaleString('id-ID')}` : 'Rp ••••••••'}
            </p>
            <div className="flex justify-between items-center">
              <p className="text-xs text-[var(--text-secondary)]">Siap digunakan</p>
              <button onClick={() => setShowActiveBalance(!showActiveBalance)} className="text-[var(--text-secondary)] hover:text-[var(--primary)]">
                {showActiveBalance ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Card 3: Pemasukan (On-Time Rate style) */}
          <div className="flex flex-col rounded-2xl border border-[var(--border-default)] p-6 gap-3 bg-white dark:bg-[var(--bg-card)] hover:shadow-sm transition-all duration-300 group">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-[6px]">
                <div className="size-11 bg-[#FED71F]/10 rounded-xl flex items-center justify-center shrink-0">
                  <TrendingUp className="size-6 text-[#DAA200]" />
                </div>
                <p className="font-medium text-[var(--text-secondary)]">Pemasukan</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <button
                    onClick={() => setShowIncomeTooltip(!showIncomeTooltip)}
                    className="p-1 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 dark:text-slate-500 transition-colors rounded-full hover:bg-slate-50 dark:hover:bg-[var(--bg-elevated)] relative z-20"
                  >
                    <Info className="w-3.5 h-3.5" />
                  </button>

                  {/* Invisible overlay */}
                  {showIncomeTooltip && (
                    <div className="fixed inset-0 z-10" onClick={() => setShowIncomeTooltip(false)} />
                  )}

                  <div className={`absolute right-0 top-full mt-3 w-64 p-3 bg-slate-800 text-white text-xs rounded-xl shadow-xl transition-all z-20 font-medium leading-relaxed ${showIncomeTooltip ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible -translate-y-1'
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
            <p className="font-bold text-[28px] leading-10 text-[var(--text-primary)]">
              {showIncome ? `Rp ${currentIncome.toLocaleString('id-ID')}` : 'Rp ••••••••'}
            </p>
            <div className="flex justify-between items-center">
              <p className="text-xs text-[var(--text-secondary)]">Bulan ini</p>
              <button onClick={() => setShowIncome(!showIncome)} className="text-[var(--text-secondary)] hover:text-[var(--primary)]">
                {showIncome ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Card 4: Pengeluaran (Active Fleet style) */}
          <div className="flex flex-col rounded-2xl border border-[var(--border-default)] p-6 gap-3 bg-white dark:bg-[var(--bg-card)] hover:shadow-sm transition-all duration-300 group">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-[6px]">
                <div className="size-11 bg-[#ED6B60]/10 rounded-xl flex items-center justify-center shrink-0">
                  <TrendingDown className="size-6 text-[#ED6B60]" />
                </div>
                <p className="font-medium text-[var(--text-secondary)]">Pengeluaran</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <button
                    onClick={() => setShowExpenseTooltip(!showExpenseTooltip)}
                    className="p-1 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 dark:text-slate-500 transition-colors rounded-full hover:bg-slate-50 dark:hover:bg-[var(--bg-elevated)] relative z-20"
                  >
                    <Info className="w-3.5 h-3.5" />
                  </button>

                  {/* Invisible overlay */}
                  {showExpenseTooltip && (
                    <div className="fixed inset-0 z-10" onClick={() => setShowExpenseTooltip(false)} />
                  )}

                  <div className={`absolute right-0 top-full mt-3 w-64 p-3 bg-slate-800 text-white text-xs rounded-xl shadow-xl transition-all z-20 font-medium leading-relaxed ${showExpenseTooltip ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible -translate-y-1'
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
            <p className="font-bold text-[28px] leading-10 text-[var(--text-primary)]">
              Rp {currentExpense.toLocaleString('id-ID')}
            </p>
            <p className="text-xs text-[var(--text-secondary)]">Bulan ini</p>
          </div>
        </div>

        {/* Note (Mobile Only - After Stats, Before Chart) */}
        {latestNote && (
          <Link href="/notes" className="block lg:hidden rounded-2xl border border-[#FED71F] bg-[#FEF9C3] p-5 hover:shadow-md transition-all cursor-pointer relative">
            {noteCount > 1 && (
              <div className="absolute -top-2 -right-2 bg-rose-50 dark:bg-rose-950/300 !text-white text-[10px] font-bold h-6 min-w-[24px] px-1 flex items-center justify-center rounded-full border-2 border-white shadow-sm ring-1 ring-rose-200">
                {noteCount > 99 ? '99+' : noteCount}
              </div>
            )}
            <div className="flex items-center gap-2 mb-2 text-[#B45309]">
              <StickyNote className="w-5 h-5" />
              <h3 className="font-bold">Catatan Terbaru</h3>
            </div>
            <h4 className="font-bold text-[var(--text-primary)] mb-1">{latestNote.title}</h4>
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
          <div className="lg:col-span-2 flex flex-col rounded-2xl border border-[var(--border-default)] p-6 bg-white dark:bg-[var(--bg-card)]">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-bold text-lg text-[var(--text-primary)]">Arus Kas & Pertumbuhan</h3>
                <p className="text-sm text-[var(--text-secondary)]">Analisis Perbandingan</p>
              </div>
            </div>
            <div className="w-full">
              {/* FinancialChart should be styled internally or wrap it */}
              <FinancialChart data={monthlyData} />
            </div>
          </div>

          <div className="flex flex-col gap-6">
            {/* Reuse RecurringBillsList as 'Shipment Status' equivalent */}
            <div className="rounded-2xl border border-[var(--border-default)] bg-white dark:bg-[var(--bg-card)] overflow-hidden">
              <div className="p-5 border-b border-[var(--border-default)]">
                <h3 className="font-bold text-[var(--text-primary)]">Tagihan Rutin</h3>
              </div>
              <div className="p-2">
                <RecurringBillsList refreshTrigger={billsUpdateTrigger} onUpdate={handleBillsUpdate} />
              </div>
            </div>

            {/* Note (Desktop Only - Below Tagihan Rutin) */}
            {latestNote && (
              <Link href="/notes" className="hidden lg:block rounded-2xl border border-[#FED71F] dark:border-amber-700/50 bg-[#FEF9C3] dark:bg-amber-950/30 p-5 hover:shadow-md transition-all cursor-pointer relative">
                {noteCount > 1 && (
                  <div className="absolute -top-2 -right-2 bg-rose-500 text-white text-[10px] font-bold h-6 min-w-[24px] px-1 flex items-center justify-center rounded-full border-2 border-white dark:border-[var(--bg-card)] shadow-sm ring-1 ring-rose-200 dark:ring-rose-800">
                    {noteCount > 99 ? '99+' : noteCount}
                  </div>
                )}
                <div className="flex items-center gap-2 mb-2 text-[#B45309] dark:text-amber-400">
                  <StickyNote className="w-5 h-5" />
                  <h3 className="font-bold">Catatan Terbaru</h3>
                </div>
                <h4 className="font-bold text-[var(--text-primary)] mb-1">{latestNote.title}</h4>
                <p className="text-sm text-[#4B5563] dark:text-amber-300/70 line-clamp-3">{latestNote.content}</p>
              </Link>
            )}
          </div>
        </div>

        {/* Debts Section */}
        {debts.some(d => d.status === 'pending') && (
          <div className="rounded-2xl border border-[var(--border-default)] bg-white dark:bg-[var(--bg-card)] p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg text-[var(--text-primary)]">Daftar Piutang</h3>
              <span className="bg-[#FED71F]/20 text-[#B45309] text-xs font-bold px-3 py-1 rounded-full">
                {debts.filter(d => d.status === 'pending').length} Active
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {debts.filter(d => d.status === 'pending').map(debt => (
                <div key={debt.id} className="flex items-center justify-between p-4 rounded-xl border border-[var(--border-default)] bg-[#F9FAFB] dark:bg-[var(--bg-page)]">
                  <div>
                    <p className="font-bold text-[var(--text-primary)]">{debt.person_name}</p>
                    <p className="text-xs text-[var(--text-secondary)]">Rp {debt.amount.toLocaleString('id-ID')}</p>
                  </div>
                  <button
                    onClick={() => { setSelectedDebt(debt); setShowDebtModal(true); }}
                    className="px-3 py-1.5 bg-[var(--primary)] text-white text-xs font-bold rounded-lg hover:opacity-90"
                  >
                    Lunas
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Transactions & Calendar */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Transactions List (Top Routes style) */}
          <div className="flex flex-col rounded-2xl border border-[var(--border-default)] bg-white dark:bg-[var(--bg-card)] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-[var(--border-default)]">
              <h3 className="font-bold text-lg text-[var(--text-primary)]">Riwayat Transaksi</h3>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleExportExcel}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-all font-semibold text-xs border border-emerald-200"
                  title="Export ke Excel"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" /></svg>
                  <span className="hidden sm:inline">Export</span>
                </button>
                <button
                  onClick={fetchTransactions}
                  disabled={loading}
                  className={`p-2 rounded-full hover:bg-slate-100 dark:hover:bg-[var(--bg-hover)] text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 dark:text-slate-500 transition-all ${loading ? 'animate-spin' : ''}`}
                  title="Refresh Data"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" /><path d="M8 16H3v5" /></svg>
                </button>
                <Link href="/analytics" className="text-sm text-[var(--primary)] font-semibold cursor-pointer hover:underline">Lihat Semua</Link>
              </div>
            </div>
            <div className="max-h-[500px] lg:max-h-[700px] overflow-y-auto custom-scrollbar">
              {filteredTransactions.length === 0 ? (
                <div className="p-8 text-center text-[var(--text-secondary)]">Belum ada transaksi</div>
              ) : (
                filteredTransactions.map(t => {
                  const { Icon, color } = getCategoryIcon(t.category, t.type)
                  // Strip utility classes from color string and map to style if needed, or just use as is if compatible
                  // The original logic returns tailwind classes like 'bg-orange-100 text-orange-600'
                  // We might want to adjust these to be softer/SwiftLog style if possible, but let's keep for functionality
                  return (
                    <div key={t.id} className="flex items-center gap-4 p-5 border-b border-[var(--border-default)] hover:bg-[#F9FAFB] dark:hover:bg-[var(--bg-hover)] transition-all group cursor-pointer" onClick={() => handleEditClick(t)}>
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-[var(--text-primary)] truncate">
                            {t.type === 'topup' && t.source_wallet_id
                              ? `${t.title} (${wallets.find(w => w.id === t.source_wallet_id)?.name || '?'} → ${wallets.find(w => w.id === t.wallet_id)?.name || '?'})`
                              : t.title}
                          </span>
                          {t.is_piutang && (
                            <span className="shrink-0 text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800/30">
                              💸 Piutang{t.piutang_person ? ` • ${t.piutang_person}` : ''}
                            </span>
                          )}
                          {t.is_talangan && (
                            <span className="shrink-0 text-[10px] font-bold bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full border border-purple-200 dark:border-purple-800/30">
                              🤝 Talangan{t.talangan_person ? ` • ${t.talangan_person}` : ''}
                            </span>
                          )}
                          {debts.some(d => d.original_transaction_id === t.id) && (
                            <span className="shrink-0 text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-800/30">
                              🧑‍🤝‍🧑 Split Bill
                            </span>
                          )}
                        </div>
                        <div className="flex flex-col gap-1.5 mt-1">
                          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#8C9AAA]">
                            <span>{new Date(t.date || t.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                            <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600"></span>
                            <span>{new Date(t.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-[var(--bg-hover)] text-slate-500 dark:text-slate-400 inline-block uppercase tracking-wider">
                              {t.category}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold ${t.type === 'topup' ? 'text-blue-600' :
                          t.type === 'pemasukan'
                            ? (t.is_piutang ? 'text-amber-500' : 'text-[#30B22D]')
                            : (t.is_talangan ? 'text-purple-500' : 'text-[var(--text-primary)]')
                          }`}>
                          {t.type === 'pengeluaran' ? '-' : '+'} Rp {t.amount.toLocaleString('id-ID')}
                        </p>
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteTransaction(t.id); }}
                          disabled={deletingId === t.id}
                          className={`text-xs font-medium hover:underline transition-all ${deletingId === t.id ? 'text-slate-400 dark:text-slate-500 cursor-not-allowed no-underline' : 'text-[#ED6B60]'}`}
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

        {/* Extras Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:hidden">
          <GoldPriceCard />
          <CurrencyCard />
        </div>

      </div>{/* end desktop content div */}


      {/* Floating Action Button (Desktop only - Mobile uses Quick Actions) */}
      <button
        onClick={() => {
          resetForm()
          setIsModalOpen(true)
        }}
        className="hidden md:flex fixed bottom-10 right-10 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 !text-white p-4 rounded-full shadow-premium-lg hover:shadow-purple-500/50 transition-all active:scale-90 hover:scale-110 z-40"
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

          {/* ===== MOBILE BOTTOM SHEET ===== */}
          <div className="md:hidden w-full rounded-t-3xl bg-white dark:bg-[var(--bg-card)] shadow-2xl z-50 relative animate-in slide-in-from-bottom-10 fade-in duration-200 h-[92vh] flex flex-col overflow-hidden">
            {/* Drag Handle */}
            <div className="flex justify-center pt-3 pb-1 shrink-0">
              <div className="w-10 h-1 bg-slate-200 dark:bg-slate-700 rounded-full" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 shrink-0">
              <h3 className="text-lg font-bold text-[var(--text-primary)]">
                {editingId ? 'Edit Transaksi' : 'Tambah Transaksi'}
              </h3>
              <button onClick={resetForm} className="p-2 hover:bg-slate-100 dark:hover:bg-[var(--bg-hover)] rounded-full text-slate-400 dark:text-slate-500 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Type Tabs */}
            <div className="px-5 shrink-0">
              <div className="flex border-b border-[var(--border-default)]">
                {[
                  { key: 'pemasukan', label: 'Pemasukan' },
                  { key: 'pengeluaran', label: 'Pengeluaran' },
                  { key: 'topup', label: 'Topup' },
                ].map(tab => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => { setType(tab.key as 'pemasukan' | 'pengeluaran' | 'topup'); setCategory(tab.key === 'topup' ? 'Topup' : ''); }}
                    className={`flex-1 py-3 text-sm font-bold transition-all border-b-2 -mb-px ${type === tab.key
                      ? tab.key === 'pemasukan' ? 'border-[var(--primary)] text-[var(--primary)]'
                        : tab.key === 'pengeluaran' ? 'border-rose-500 text-rose-500'
                          : 'border-violet-600 text-violet-600'
                      : 'border-transparent text-slate-400 dark:text-slate-500'
                      }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Scrollable Body */}
            <form onSubmit={handleSaveTransaction} className="flex-1 overflow-y-auto">

              {/* Topup: Source → Destination (before amount card) */}
              {type === 'topup' && (
                <div className="mx-4 mt-4 flex items-center gap-2">
                  <div className="flex-1 bg-slate-50 dark:bg-[var(--bg-elevated)] border border-slate-200 dark:border-[var(--border-default)] rounded-xl p-3">
                    <p className="text-[9px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">Sumber Dana</p>
                    <select
                      className="w-full bg-transparent outline-none font-semibold text-[var(--text-primary)] text-sm appearance-none"
                      value={sourceWalletId}
                      onChange={(e) => setSourceWalletId(e.target.value)}
                      required
                    >
                      <option value="" disabled>Pilih Sumber</option>
                      {wallets.map(w => <option key={w.id} value={w.id} disabled={selectedWalletId === w.id.toString()}>{w.name}</option>)}
                    </select>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                  </div>
                  <div className="flex-1 bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800/30 rounded-xl p-3">
                    <p className="text-[9px] font-bold text-violet-500 uppercase tracking-wider mb-1">Tujuan Topup</p>
                    <select
                      className="w-full bg-transparent outline-none font-semibold text-violet-800 text-sm appearance-none"
                      value={selectedWalletId}
                      onChange={(e) => setSelectedWalletId(e.target.value)}
                      required
                    >
                      <option value="" disabled>Pilih Tujuan</option>
                      {wallets.map(w => <option key={w.id} value={w.id} disabled={sourceWalletId === w.id.toString()}>{w.name}</option>)}
                    </select>
                  </div>
                </div>
              )}

              {/* Amount Display */}
              <div className={`mx-4 mt-4 rounded-2xl p-5 relative overflow-hidden ${type === 'pemasukan' ? 'bg-gradient-to-br from-[#165DFF] to-[#0E4BD9]' :
                type === 'pengeluaran' ? 'bg-gradient-to-br from-rose-500 to-rose-700' :
                  'bg-gradient-to-br from-violet-600 to-purple-700'
                }`}>
                <div className="absolute -top-6 -right-6 w-28 h-28 bg-white/5 rounded-full" />
                <div className="absolute -bottom-8 -left-4 w-36 h-36 bg-white/5 rounded-full" />
                <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest mb-2 relative z-10">{type === 'topup' ? 'Nominal Topup (RP)' : 'Jumlah (RP)'}</p>
                {/* Visible amount input — transparent on gradient */}
                <div className="relative z-10 mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-extrabold text-3xl shrink-0">Rp</span>
                    <input
                      id="mobile-amount-input"
                      type="text"
                      inputMode="numeric"
                      placeholder="0"
                      className="flex-1 bg-transparent border-none outline-none text-white font-extrabold text-3xl placeholder:text-white/30 min-w-0"
                      value={amount ? parseInt(amount.replace(/\D/g, '') || '0').toLocaleString('id-ID') : ''}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/\D/g, '')
                        setAmount(raw)
                      }}
                      autoFocus={!editingId}
                    />
                  </div>
                  {/* +000 shortcut below the input */}
                  <button
                    type="button"
                    onClick={() => {
                      const raw = amount.replace(/\D/g, '')
                      if (!raw) { setAmount('1000') } else { setAmount(raw + '000') }
                    }}
                    className="mt-2 px-3 py-1 bg-white/20 hover:bg-white  text-white font-bold text-sm rounded-lg active:scale-95 transition-all"
                  >
                    +000
                  </button>
                </div>
                {/* Quick Amount Buttons — contextual per type */}
                <div className="flex gap-2 flex-wrap mt-3 relative z-10">
                  {(type === 'pengeluaran'
                    ? [10000, 50000, 100000, 500000]
                    : [50000, 100000, 500000, 1000000]
                  ).map(val => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setAmount(String((parseInt(amount.replace(/\D/g, '') || '0') + val)))}
                      className="px-3 py-1.5 rounded-full bg-white/20 text-white text-[11px] font-bold hover:bg-white  active:scale-95 transition-all"
                    >
                      +{val >= 1000000 ? `${val / 1000000}jt` : `${val / 1000}rb`}
                    </button>
                  ))}
                </div>
              </div>

              <div className="px-4 mt-4 space-y-4 pb-6">
                {/* Date & Wallet */}
                {type !== 'topup' ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">Tanggal</label>
                      <input
                        type="date"
                        className="w-full px-3 py-2.5 bg-slate-50 dark:bg-[var(--bg-elevated)] border border-slate-200 dark:border-[var(--border-default)] rounded-xl text-base font-semibold text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] transition-all"
                        value={customDate}
                        onChange={(e) => setCustomDate(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">Dompet</label>
                      <select
                        className="w-full px-3 py-2.5 bg-slate-50 dark:bg-[var(--bg-elevated)] border border-slate-200 dark:border-[var(--border-default)] rounded-xl text-base font-semibold text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] transition-all appearance-none"
                        value={selectedWalletId}
                        onChange={(e) => setSelectedWalletId(e.target.value)}
                        required
                      >
                        <option value="" disabled>Pilih Dompet</option>
                        {wallets.map(w => (
                          <option key={w.id} value={w.id}>{w.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                ) : (
                  /* Topup-specific: Biaya Admin + Summary + Date */
                  <div className="space-y-3">
                    {/* Biaya Admin compact row */}
                    <div className="bg-slate-50 dark:bg-[var(--bg-elevated)] border border-slate-200 dark:border-[var(--border-default)] rounded-xl p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-bold text-sm text-[var(--text-primary)]">Biaya Admin</p>
                          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">Optional — Isi jika ada potongan</p>
                        </div>
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder="0"
                          className="w-28 text-right bg-slate-100 dark:bg-[var(--bg-hover)] border border-slate-200 dark:border-[var(--border-default)] rounded-lg px-3 py-1.5 font-bold text-base text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"
                          value={adminFee ? parseInt(adminFee.replace(/\D/g, '') || '0').toLocaleString('id-ID') : ''}
                          onChange={(e) => setAdminFee(e.target.value.replace(/\D/g, ''))}
                        />
                      </div>
                    </div>

                    {/* Summary rows */}
                    <div className="bg-white dark:bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl px-4 py-3 space-y-2">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-500 dark:text-slate-400">Nominal topup</span>
                        <span className="font-semibold text-[var(--text-primary)]">Rp {amount ? parseInt(amount.replace(/\D/g, '') || '0').toLocaleString('id-ID') : '0'}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-500 dark:text-slate-400">Biaya admin</span>
                        <span className="font-semibold text-[var(--text-primary)]">Rp {adminFee ? parseInt(adminFee.replace(/\D/g, '') || '0').toLocaleString('id-ID') : '0'}</span>
                      </div>
                      <div className="border-t border-[var(--border-default)] pt-2 flex justify-between items-center text-sm">
                        <span className="font-bold text-violet-700">Total keluar</span>
                        <span className="font-bold text-violet-700">Rp {((parseInt(amount.replace(/\D/g, '') || '0')) + (parseInt(adminFee.replace(/\D/g, '') || '0'))).toLocaleString('id-ID')}</span>
                      </div>
                    </div>

                    {/* Date - full width */}
                    <div>
                      <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">Tanggal</label>
                      <input type="date" className="w-full px-3 py-2.5 bg-slate-50 dark:bg-[var(--bg-elevated)] border border-slate-200 dark:border-[var(--border-default)] rounded-xl text-base font-semibold focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all" value={customDate} onChange={(e) => setCustomDate(e.target.value)} required />
                    </div>
                  </div>
                )}

                {/* Piutang Toggle */}
                {type === 'pemasukan' && (
                  <div className={`p-4 rounded-2xl border transition-all duration-200 ${isPiutang ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/30' : 'bg-slate-50 dark:bg-[var(--bg-elevated)] border-slate-200 dark:border-[var(--border-default)]'}`}>
                    <div onClick={() => { setIsPiutang(!isPiutang); if (isPiutang) setPiutangPerson('') }} className="flex items-center justify-between cursor-pointer select-none">
                      <div className="flex items-center gap-3">
                        <span className={`text-sm font-bold ${isPiutang ? 'text-amber-700' : 'text-slate-600 dark:text-slate-500'}`}>💸 Ini adalah Piutang?</span>
                        <p className={`text-[11px] ${isPiutang ? 'text-amber-500' : 'text-slate-400 dark:text-slate-500'}`}>Tandai jika uang akan dikembalikan</p>
                      </div>
                      {/* Toggle switch */}
                      <div className={`w-11 h-6 rounded-full transition-colors duration-200 flex items-center px-0.5 shrink-0 ${isPiutang ? 'bg-amber-400' : 'bg-slate-200 dark:bg-slate-700'}`}>
                        <div className={`w-5 h-5 bg-white dark:bg-[var(--bg-card)] rounded-full shadow transition-transform duration-200 ${isPiutang ? 'translate-x-5' : 'translate-x-0'}`} />
                      </div>
                    </div>
                    {isPiutang && (
                      <input type="text" placeholder="Nama peminjam (Opsional)" className="mt-3 w-full p-2.5 bg-white dark:bg-[var(--bg-card)] border border-amber-200 dark:border-amber-800/30 rounded-xl text-base focus:ring-2 focus:ring-amber-400 outline-none font-medium" value={piutangPerson} onChange={(e) => setPiutangPerson(e.target.value)} />
                    )}
                  </div>
                )}

                {/* Split Bill Toggle */}
                {type === 'pengeluaran' && (
                  <div className={`p-4 rounded-2xl border transition-all duration-200 ${isSplitBill ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800/30' : 'bg-slate-50 dark:bg-[var(--bg-elevated)] border-slate-200 dark:border-[var(--border-default)]'}`}>
                    <div onClick={() => setIsSplitBill(!isSplitBill)} className="flex items-center justify-between cursor-pointer select-none">
                      <span className={`text-sm font-bold ${isSplitBill ? 'text-[var(--primary)]' : 'text-slate-600 dark:text-slate-500'}`}>Ada yang nitip bayar? (Split Bill)</span>
                      <div className={`w-11 h-6 rounded-full transition-colors duration-200 flex items-center px-0.5 shrink-0 ${isSplitBill ? 'bg-[var(--primary)]' : 'bg-slate-200 dark:bg-slate-700'}`}>
                        <div className={`w-5 h-5 bg-white dark:bg-[var(--bg-card)] rounded-full shadow transition-transform duration-200 ${isSplitBill ? 'translate-x-5' : 'translate-x-0'}`} />
                      </div>
                    </div>
                    {isSplitBill && (
                      <div className="space-y-3 mt-3 animate-in slide-in-from-top-2 duration-200">
                        {splitEntries.map((entry, idx) => (
                          <div key={idx} className="flex gap-2 items-start">
                            <div className="flex-1 grid grid-cols-2 gap-2">
                              <input type="text" placeholder={`Nama #${idx + 1}`} className="w-full p-2.5 bg-white dark:bg-[var(--bg-card)] border border-slate-200 dark:border-[var(--border-default)] rounded-xl text-base focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 outline-none" value={entry.name} onChange={(e) => { const n = [...splitEntries]; n[idx].name = e.target.value; setSplitEntries(n); }} />
                              <MoneyInput placeholder="0" value={entry.amount} onChange={(val) => { const n = [...splitEntries]; n[idx].amount = val; setSplitEntries(n); }} className="!text-sm !p-3" />
                            </div>
                            {splitEntries.length > 1 && <button type="button" onClick={() => setSplitEntries(splitEntries.filter((_, i) => i !== idx))} className="p-2.5 text-rose-500 hover:bg-rose-50 dark:bg-rose-950/30 rounded-xl transition-colors"><Trash2 className="w-4 h-4" /></button>}
                          </div>
                        ))}
                        <button type="button" onClick={() => setSplitEntries([...splitEntries, { name: '', amount: '' }])} className="text-xs font-bold text-blue-600 flex items-center gap-1"><Plus className="w-3 h-3" /> Tambah Orang Lain</button>
                      </div>
                    )}
                  </div>
                )}

                {/* Talangan Toggle */}
                {type === 'pengeluaran' && (
                  <div className={`p-4 rounded-2xl border transition-all duration-200 ${isTalangan ? 'bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800/30' : 'bg-slate-50 dark:bg-[var(--bg-elevated)] border-slate-200 dark:border-[var(--border-default)]'}`}>
                    <div onClick={() => { setIsTalangan(!isTalangan); if (isTalangan) setTalanganPerson('') }} className="flex items-center justify-between cursor-pointer select-none">
                      <span className={`text-sm font-bold ${isTalangan ? 'text-purple-700' : 'text-slate-600 dark:text-slate-500'}`}>🤝 Ini Talangan?</span>
                      <div className={`w-11 h-6 rounded-full transition-colors duration-200 flex items-center px-0.5 shrink-0 ${isTalangan ? 'bg-purple-400' : 'bg-slate-200 dark:bg-slate-700'}`}>
                        <div className={`w-5 h-5 bg-white dark:bg-[var(--bg-card)] rounded-full shadow transition-transform duration-200 ${isTalangan ? 'translate-x-5' : 'translate-x-0'}`} />
                      </div>
                    </div>
                    {isTalangan && (
                      <input type="text" placeholder="Nama orang yang ditalangin (Opsional)" className="mt-3 w-full p-2.5 bg-white dark:bg-[var(--bg-card)] border border-purple-200 dark:border-purple-800/30 rounded-xl text-base focus:ring-2 focus:ring-purple-400 outline-none font-medium" value={talanganPerson} onChange={(e) => setTalanganPerson(e.target.value)} />
                    )}
                  </div>
                )}

                {/* Category Grid */}
                {type !== 'topup' && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Kategori <span className="text-rose-500">*</span></label>
                      <span className="text-[10px] text-[var(--primary)] font-bold">Wajib dipilih</span>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        ...(CATEGORIES[type as 'pemasukan' | 'pengeluaran'].map(c => ({ ...c, isCustom: false, originalObj: null }))),
                        ...(customCategories[type as 'pemasukan' | 'pengeluaran'] || []).map(c => {
                          if (typeof c === 'string') return { name: c, color: 'bg-slate-100 dark:bg-[var(--bg-hover)] text-slate-600 dark:text-slate-500', icon: Package, isCustom: true, originalObj: c };
                          return { name: c.name, color: c.color, icon: AVAILABLE_ICONS[c.iconName] || Package, isCustom: true, originalObj: c };
                        })
                      ].map((cat) => {
                        const isSelected = category === cat.name
                        return (
                          <button
                            key={cat.name}
                            type="button"
                            onClick={() => setCategory(cat.name)}
                            className={`flex flex-col items-center justify-center p-2.5 rounded-2xl transition-all border-2 ${isSelected ? 'border-[var(--primary)] bg-blue-50 dark:bg-blue-950/30' : 'border-transparent bg-slate-50 dark:bg-[var(--bg-elevated)] hover:bg-slate-100 dark:hover:bg-[var(--bg-hover)] dark:bg-[var(--bg-hover)]'}`}
                          >
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-1.5 ${cat.color}`}>
                              <cat.icon className="w-5 h-5" />
                            </div>
                            <span className={`text-[10px] font-bold text-center leading-tight ${isSelected ? 'text-[var(--primary)]' : 'text-slate-600 dark:text-slate-500'}`}>{cat.name}</span>
                          </button>
                        )
                      })}
                      <button type="button" onClick={() => { resetCategoryForm(); setShowAddCategory(true); }} className="flex flex-col items-center justify-center p-2.5 rounded-2xl border-2 border-dashed border-slate-300 hover:border-[var(--primary)] transition-all">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center mb-1.5 bg-slate-50 dark:bg-[var(--bg-elevated)] text-slate-400 dark:text-slate-500">
                          <Plus className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">Custom</span>
                      </button>
                    </div>
                    {showAddCategory && (
                      <div className="mt-4 p-4 rounded-2xl bg-slate-50 dark:bg-[var(--bg-elevated)] border border-slate-200 dark:border-[var(--border-default)] animate-in slide-in-from-top-2 duration-200">
                        <div className="flex justify-between items-center mb-4">
                          <span className="font-bold text-slate-700 dark:text-slate-300">Kelola Kategori Custom</span>
                          <button type="button" onClick={resetCategoryForm} className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 dark:text-slate-500"><X className="w-4 h-4" /></button>
                        </div>
                        {(customCategories[type as 'pemasukan' | 'pengeluaran'] || []).length > 0 && (
                          <div className="mb-6 space-y-2">
                            <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Pilih Untuk Edit/Hapus</label>
                            <div className="flex flex-col gap-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                              {customCategories[type as 'pemasukan' | 'pengeluaran'].map((c, idx) => {
                                const isStr = typeof c === 'string'; const name = isStr ? c : c.name; const Ico = isStr ? Package : (AVAILABLE_ICONS[c.iconName] || Package)
                                return (
                                  <div key={idx} className="flex flex-row items-center justify-between bg-white dark:bg-[var(--bg-card)] p-2.5 border border-slate-200 dark:border-[var(--border-default)] rounded-xl">
                                    <div className="flex items-center gap-3">
                                      <div className={`w-8 h-8 rounded-full flex items-center justify-center bg-slate-50 dark:bg-[var(--bg-elevated)] ${isStr ? 'text-slate-500 dark:text-slate-400' : c.color.split(' ')[1]}`}><Ico className="w-4 h-4" /></div>
                                      <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{name}</span>
                                    </div>
                                    <div className="flex items-center border-l border-slate-100 dark:border-[var(--border-default)] pl-2">
                                      <button type="button" onClick={(e) => openEditCategory(c, e)} className="p-2 text-slate-400 dark:text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:bg-blue-950/30 rounded-lg transition-colors"><Pencil className="w-4 h-4" /></button>
                                      <button type="button" onClick={(e) => handleDeleteCustomCategory(name, e)} className="p-2 text-slate-400 dark:text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:bg-rose-950/30 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )}
                        <div className="space-y-4 border-t border-slate-200 dark:border-[var(--border-default)] pt-4">
                          <span className="font-bold text-sm text-slate-700 dark:text-slate-300 block mb-2">{editingCategoryName ? 'Edit Kategori Terpilih' : 'Buat Kategori Baru'}</span>
                          <input type="text" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} placeholder="Nama kategori..." className="w-full p-3 bg-white dark:bg-[var(--bg-card)] border border-slate-200 dark:border-[var(--border-default)] rounded-xl text-base focus:ring-2 focus:ring-blue-400 outline-none font-bold" />
                          <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Pilih Icon</label>
                            <div className="grid grid-cols-7 gap-2">
                              {Object.keys(AVAILABLE_ICONS).map(iconKey => { const Ico = AVAILABLE_ICONS[iconKey]; const isSel = newCategoryIcon === iconKey; return (<button type="button" key={iconKey} onClick={() => setNewCategoryIcon(iconKey)} className={`flex items-center justify-center aspect-square rounded-xl border-2 transition-all ${isSel ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30 text-blue-600' : 'border-transparent bg-white dark:bg-[var(--bg-card)] text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[var(--bg-hover)] dark:bg-[var(--bg-hover)]'}`}><Ico className="w-5 h-5" /></button>) })}
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Pilih Warna</label>
                            <div className="grid grid-cols-6 gap-2">
                              {COLOR_PALETTES.map((colorSet, idx) => { const isSel = newCategoryColor === colorSet; return (<button type="button" key={idx} onClick={() => setNewCategoryColor(colorSet)} className={`w-full aspect-square rounded-full flex items-center justify-center transition-all border-2 ${isSel ? 'border-slate-800 scale-110 shadow-sm' : 'border-transparent hover:scale-110'} ${colorSet}`}>{isSel && <div className="w-3 h-3 bg-current rounded-full" />}</button>) })}
                            </div>
                          </div>
                          <button type="button" onClick={handleSaveCustomCategory} className="w-full py-3 bg-[var(--primary)] text-white rounded-xl text-sm font-bold shadow-sm hover:bg-blue-600 transition-colors">Simpan Kategori</button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Budget Indicator */}
                {budgetInfo && (
                  <div className={`p-4 rounded-xl border ${budgetInfo.isOver ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-200' : 'bg-slate-50 dark:bg-[var(--bg-elevated)] border-slate-200 dark:border-[var(--border-default)]'}`}>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Budget {budgetInfo.budget.category}</span>
                      <span className={`text-xs font-bold ${budgetInfo.isOver ? 'text-rose-600' : 'text-slate-600 dark:text-slate-500'}`}>
                        {budgetInfo.isOver ? 'Limit Terlampaui!' : 'Dalam Batas'}
                      </span>
                    </div>

                    <div className="flex justify-between items-end mb-2">
                      <div className="flex flex-col">
                        <span className="text-xs text-slate-400 dark:text-slate-500">Terpakai + Baru</span>
                        <span className="font-bold text-slate-700 dark:text-slate-300">Rp {budgetInfo.totalProjected.toLocaleString('id-ID')}</span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-xs text-slate-400 dark:text-slate-500">Total Budget</span>
                        <span className="font-bold text-slate-700 dark:text-slate-300">Rp {budgetInfo.budget.amount.toLocaleString('id-ID')}</span>
                      </div>
                    </div>

                    <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mb-2">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${budgetInfo.isOver ? 'bg-rose-50 dark:bg-rose-950/300' : budgetInfo.percent > 80 ? 'bg-orange-50 dark:bg-orange-950/300' : 'bg-blue-50 dark:bg-blue-950/300'}`}
                        style={{ width: `${budgetInfo.percent}%` }}
                      />
                    </div>

                    {budgetInfo.isOver ? (
                      <div className="flex items-start gap-2 text-rose-600 text-xs font-medium mt-2 bg-rose-100 dark:bg-rose-950/40 p-2 rounded-lg">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <p>
                          Awas! Transaksi ini akan membuat budget minus <strong>Rp {Math.abs(budgetInfo.remaining).toLocaleString('id-ID')}</strong>.
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs text-center text-slate-500 dark:text-slate-400 mt-2">
                        Sisa budget setelah transaksi ini: <strong>Rp {budgetInfo.remaining.toLocaleString('id-ID')}</strong>
                      </p>
                    )}
                  </div>
                )}

                {/* Notes */}
                <div>
                  <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">Catatan <span className="text-slate-400 dark:text-slate-500 font-normal">(Opsional)</span></label>
                  <input
                    type="text"
                    placeholder={category ? `Contoh: ${category} Enak` : "Catatan transaksi..."}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-[var(--bg-elevated)] border border-slate-200 dark:border-[var(--border-default)] rounded-2xl focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] outline-none transition-all font-medium text-base"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={saving}
                  className={`w-full font-bold py-4 px-6 rounded-2xl active:scale-[0.98] transition-all shadow-lg flex items-center justify-center gap-2 ${saving ? 'opacity-70 cursor-not-allowed' : ''} ${type === 'pemasukan' ? 'bg-gradient-to-r from-[#165DFF] to-[#0E4BD9] shadow-blue-500/30' :
                    type === 'pengeluaran' ? 'bg-gradient-to-r from-rose-500 to-rose-700 shadow-rose-500/30' :
                      'bg-gradient-to-r from-slate-700 to-slate-900 shadow-slate-500/30'
                    } text-white`}
                >
                  {saving && <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  {saving ? 'Menyimpan...' : (editingId ? 'Update Transaksi' : 'Simpan Transaksi')}
                </button>
              </div>
            </form>
          </div>

          {/* ===== DESKTOP MODAL ===== */}
          <div className="hidden md:block glass backdrop-blur-2xl w-full max-w-lg rounded-3xl shadow-premium-lg border border-white/20 z-50 p-6 pb-10 relative animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-800 dark:text-[var(--text-primary)]">
                {editingId ? 'Edit Transaksi' : 'Tambah Transaksi'}
              </h3>
              <button
                onClick={resetForm}
                className="p-2 bg-slate-100 dark:bg-[var(--bg-hover)] hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-slate-500 dark:text-slate-400 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTransaction} className="space-y-6">

              {/* Type Switcher */}
              <div className="flex bg-slate-100 dark:bg-[var(--bg-hover)] p-1 rounded-2xl">
                <button
                  type="button"
                  onClick={() => { setType('pemasukan'); setCategory(''); }}
                  className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${type === 'pemasukan' ? 'bg-white dark:bg-[var(--bg-card)] text-emerald-600 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-300'}`}
                >
                  Pemasukan
                </button>
                <button
                  type="button"
                  onClick={() => { setType('pengeluaran'); setCategory(''); }}
                  className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${type === 'pengeluaran' ? 'bg-white dark:bg-[var(--bg-card)] text-rose-600 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-300'}`}
                >
                  Pengeluaran
                </button>
                <button
                  type="button"
                  onClick={() => { setType('topup'); setCategory('Topup'); }}
                  className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${type === 'topup' ? 'bg-white dark:bg-[var(--bg-card)] text-blue-600 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-300'}`}
                >
                  Topup
                </button>
              </div>

              {/* Date & Wallet Grid */}
              <div className={`grid gap-4 ${type === 'topup' ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-2'}`}>
                <div className={type === 'topup' ? 'md:col-span-1' : ''}>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Tanggal</label>
                  <input
                    type="date"
                    className="w-full p-3 bg-slate-50 dark:bg-[var(--bg-elevated)] border border-slate-200 dark:border-[var(--border-default)] rounded-xl focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 outline-none"
                    value={customDate}
                    onChange={(e) => setCustomDate(e.target.value)}
                    required
                  />
                </div>
                {type === 'topup' ? (
                  <>
                    <div className="border border-slate-200 dark:border-[var(--border-default)] p-3 rounded-xl bg-slate-50 dark:bg-[var(--bg-elevated)] relative">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Sumber Dana</label>
                      <select
                        className="w-full bg-transparent outline-none font-semibold text-slate-800 dark:text-[var(--text-primary)] text-sm"
                        value={sourceWalletId}
                        onChange={(e) => setSourceWalletId(e.target.value)}
                        required
                      >
                        <option value="" disabled>Pilih Sumber</option>
                        {wallets.map(w => (
                          <option key={w.id} value={w.id} disabled={selectedWalletId === w.id.toString()}>{w.name} (Rp {w.balance.toLocaleString('id-ID')})</option>
                        ))}
                      </select>
                    </div>
                    <div className="border border-blue-200 dark:border-blue-800/30 p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-blue-600 mb-1">Tujuan Topup</label>
                      <select
                        className="w-full bg-transparent outline-none font-semibold text-blue-800 text-sm"
                        value={selectedWalletId}
                        onChange={(e) => setSelectedWalletId(e.target.value)}
                        required
                      >
                        <option value="" disabled>Pilih Tujuan</option>
                        {wallets.map(w => (
                          <option key={w.id} value={w.id} disabled={sourceWalletId === w.id.toString()}>{w.name} (Rp {w.balance.toLocaleString('id-ID')})</option>
                        ))}
                      </select>
                    </div>
                  </>
                ) : (
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Dompet</label>
                    <select
                      className="w-full p-3 bg-slate-50 dark:bg-[var(--bg-elevated)] border border-slate-200 dark:border-[var(--border-default)] rounded-xl focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 outline-none"
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
                )}
              </div>

              {/* Amount Input */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    {type === 'topup' ? 'Nominal Topup (Rp)' : 'Jumlah (Rp)'}
                  </label>
                  <MoneyInput
                    value={amount}
                    onChange={setAmount}
                    autoFocus={!editingId}
                  />
                </div>

                {type === 'topup' && (
                  <div className="animate-in slide-in-from-top-2 duration-200">
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Biaya Admin (Opsional)</label>
                    <MoneyInput
                      value={adminFee}
                      onChange={setAdminFee}
                      placeholder="0"
                    />
                  </div>
                )}
              </div>

              {/* Piutang Toggle - hanya untuk Pemasukan */}
              {type === 'pemasukan' && (
                <div className={`p-4 rounded-2xl border transition-all duration-200 ${isPiutang ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/30' : 'bg-slate-50 dark:bg-[var(--bg-elevated)] border-slate-200 dark:border-[var(--border-default)]'}`}>
                  <div
                    onClick={() => { setIsPiutang(!isPiutang); if (isPiutang) setPiutangPerson('') }}
                    className="flex items-center justify-between cursor-pointer group select-none"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full border-[1.5px] flex items-center justify-center transition-all ${isPiutang ? 'border-amber-500' : 'border-slate-300 group-hover:border-slate-400'}`}>
                        {isPiutang && <div className="w-2.5 h-2.5 bg-amber-50 dark:bg-amber-950/300 rounded-full animate-in zoom-in duration-200" />}
                      </div>
                      <span className={`text-sm font-bold transition-colors ${isPiutang ? 'text-amber-700' : 'text-slate-600 dark:text-slate-500 group-hover:text-slate-800 dark:hover:text-[var(--text-primary)] dark:text-[var(--text-primary)]'}`}>
                        💸 Ini adalah Piutang?
                      </span>
                    </div>
                    {isPiutang && <span className="text-[10px] uppercase font-bold text-amber-600 bg-white dark:bg-[var(--bg-card)] px-2 py-1 rounded-lg shadow-sm border border-amber-100">Aktif</span>}
                  </div>

                  {isPiutang && (
                    <div className="mt-3 animate-in slide-in-from-top-2 duration-200">
                      <input
                        type="text"
                        placeholder="Nama peminjam (Opsional)"
                        className="w-full p-2.5 bg-white dark:bg-[var(--bg-card)] border border-amber-200 dark:border-amber-800/30 rounded-xl text-sm focus:ring-2 focus:ring-amber-400 outline-none font-medium"
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
                <div className={`p-4 rounded-2xl border transition-all duration-200 ${isSplitBill ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800/30' : 'bg-slate-50 dark:bg-[var(--bg-elevated)] border-slate-200 dark:border-[var(--border-default)]'}`}>
                  <div
                    onClick={() => setIsSplitBill(!isSplitBill)}
                    className="flex items-center justify-between cursor-pointer group select-none mb-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full border-[1.5px] flex items-center justify-center transition-all ${isSplitBill ? 'border-[var(--primary)]' : 'border-slate-300 group-hover:border-slate-400'}`}>
                        {isSplitBill && <div className="w-2.5 h-2.5 bg-[var(--primary)] rounded-full animate-in zoom-in duration-200" />}
                      </div>
                      <span className={`text-sm font-bold transition-colors ${isSplitBill ? 'text-[var(--primary)]' : 'text-slate-600 dark:text-slate-500 group-hover:text-slate-800 dark:hover:text-[var(--text-primary)] dark:text-[var(--text-primary)]'}`}>Ada yang nitip bayar? (Split Bill)</span>
                    </div>
                    {isSplitBill && <span className="text-[10px] uppercase font-bold text-[var(--primary)] bg-white dark:bg-[var(--bg-card)] px-2 py-1 rounded-lg shadow-sm border border-blue-100 dark:border-blue-800/30">Aktif</span>}
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
                                className="w-full p-2.5 bg-white dark:bg-[var(--bg-card)] border border-slate-200 dark:border-[var(--border-default)] rounded-xl text-sm focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 outline-none"
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
                              className="p-2.5 text-rose-500 hover:bg-rose-50 dark:bg-rose-950/30 rounded-xl transition-colors"
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

                      <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg flex flex-col gap-1 mt-2">
                        <div className="flex justify-between items-center text-xs font-medium text-blue-900 border-b border-blue-100 dark:border-blue-800/30 pb-2 mb-1">
                          <span>Total Piutang:</span>
                          <span className="font-bold">Rp {splitEntries.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0).toLocaleString('id-ID')}</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                          <p className="text-xs text-blue-700">
                            Total pengeluaran tercatat: <strong>Rp {parseInt(amount || '0').toLocaleString('id-ID')}</strong>.
                            <br />
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
                <div className={`p-4 rounded-2xl border transition-all duration-200 ${isTalangan ? 'bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800/30' : 'bg-slate-50 dark:bg-[var(--bg-elevated)] border-slate-200 dark:border-[var(--border-default)]'}`}>
                  <div
                    onClick={() => { setIsTalangan(!isTalangan); if (isTalangan) setTalanganPerson('') }}
                    className="flex items-center justify-between cursor-pointer group select-none"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full border-[1.5px] flex items-center justify-center transition-all ${isTalangan ? 'border-purple-500' : 'border-slate-300 group-hover:border-slate-400'}`}>
                        {isTalangan && <div className="w-2.5 h-2.5 bg-purple-50 dark:bg-purple-950/300 rounded-full animate-in zoom-in duration-200" />}
                      </div>
                      <span className={`text-sm font-bold transition-colors ${isTalangan ? 'text-purple-700' : 'text-slate-600 dark:text-slate-500 group-hover:text-slate-800 dark:hover:text-[var(--text-primary)] dark:text-[var(--text-primary)]'}`}>
                        🤝 Ini Talangan (bayarin orang lain)?
                      </span>
                    </div>
                    {isTalangan && <span className="text-[10px] uppercase font-bold text-purple-600 bg-white dark:bg-[var(--bg-card)] px-2 py-1 rounded-lg shadow-sm border border-purple-100 dark:border-purple-800/30">Aktif</span>}
                  </div>

                  {isTalangan && (
                    <div className="mt-3 animate-in slide-in-from-top-2 duration-200">
                      <input
                        type="text"
                        placeholder="Nama orang yang ditalangin (Opsional)"
                        className="w-full p-2.5 bg-white dark:bg-[var(--bg-card)] border border-purple-200 dark:border-purple-800/30 rounded-xl text-sm focus:ring-2 focus:ring-purple-400 outline-none font-medium"
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


              {type !== 'topup' && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Kategori <span className="text-red-500 font-normal text-xs">*Wajib</span></label>
                  <div className="grid grid-cols-4 gap-3">
                    {[
                      ...(CATEGORIES[type as 'pemasukan' | 'pengeluaran'].map(c => ({ ...c, isCustom: false, originalObj: null }))),
                      ...(customCategories[type as 'pemasukan' | 'pengeluaran'] || []).map(c => {
                        if (typeof c === 'string') return { name: c, color: 'bg-slate-100 dark:bg-[var(--bg-hover)] text-slate-600 dark:text-slate-500', icon: Package, isCustom: true, originalObj: c };
                        return { name: c.name, color: c.color, icon: AVAILABLE_ICONS[c.iconName] || Package, isCustom: true, originalObj: c };
                      })
                    ].map((cat) => {
                      const isSelected = category === cat.name
                      return (
                        <div key={cat.name} className="relative group">
                          <button
                            type="button"
                            onClick={() => setCategory(cat.name)}
                            className={`w-full h-full flex flex-col items-center justify-center p-3 rounded-2xl transition-all border-2 ${isSelected ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30' : 'border-transparent hover:bg-slate-50 dark:hover:bg-[var(--bg-elevated)] dark:bg-[var(--bg-elevated)]'}`}
                          >
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${cat.color}`}>
                              <cat.icon className="w-5 h-5" />
                            </div>
                            <span className={`text-[10px] font-medium text-center leading-tight ${isSelected ? 'text-blue-700' : 'text-slate-600 dark:text-slate-500'}`}>
                              {cat.name}
                            </span>
                          </button>
                        </div>
                      )
                    })}
                    <button type="button" onClick={() => { resetCategoryForm(); setShowAddCategory(true); }} className="flex flex-col items-center justify-center p-3 rounded-2xl transition-all border-2 border-dashed border-slate-300 hover:border-blue-500 hover:bg-slate-50 dark:hover:bg-[var(--bg-elevated)] dark:bg-[var(--bg-elevated)]">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center mb-2 bg-slate-50 dark:bg-[var(--bg-elevated)] text-slate-400 dark:text-slate-500">
                        <Plus className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-bold text-center leading-tight text-slate-500 dark:text-slate-400">Custom</span>
                    </button>
                  </div>

                  {showAddCategory && (
                    <div className="mt-4 p-4 rounded-2xl bg-slate-50 dark:bg-[var(--bg-elevated)] border border-slate-200 dark:border-[var(--border-default)] animate-in slide-in-from-top-2 duration-200">
                      <div className="flex justify-between items-center mb-4">
                        <span className="font-bold text-slate-700 dark:text-slate-300">Kelola Kategori Custom</span>
                        <button type="button" onClick={resetCategoryForm} className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 dark:text-slate-500"><X className="w-4 h-4" /></button>
                      </div>

                      {/* Existing Custom Categories List */}
                      {(customCategories[type as 'pemasukan' | 'pengeluaran'] || []).length > 0 && (
                        <div className="mb-6 space-y-2">
                          <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Pilih Untuk Edit/Hapus</label>
                          <div className="flex flex-col gap-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                            {customCategories[type as 'pemasukan' | 'pengeluaran'].map((c, idx) => {
                              const isStr = typeof c === 'string'
                              const name = isStr ? c : c.name
                              const Ico = isStr ? Package : (AVAILABLE_ICONS[c.iconName] || Package)
                              return (
                                <div key={idx} className="flex flex-row items-center justify-between bg-white dark:bg-[var(--bg-card)] p-2.5 border border-slate-200 dark:border-[var(--border-default)] rounded-xl">
                                  <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center bg-slate-50 dark:bg-[var(--bg-elevated)] ${isStr ? 'text-slate-500 dark:text-slate-400' : c.color.split(' ')[1]}`}>
                                      <Ico className="w-4 h-4" />
                                    </div>
                                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300 px-1">{name}</span>
                                  </div>
                                  <div className="flex items-center border-l border-slate-100 dark:border-[var(--border-default)] pl-2">
                                    <button type="button" onClick={(e) => openEditCategory(c, e)} className="p-2 text-slate-400 dark:text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:bg-blue-950/30 rounded-lg transition-colors"><Pencil className="w-4 h-4" /></button>
                                    <button type="button" onClick={(e) => handleDeleteCustomCategory(name, e)} className="p-2 text-slate-400 dark:text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:bg-rose-950/30 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}

                      <div className="space-y-4 border-t border-slate-200 dark:border-[var(--border-default)] pt-4">
                        <span className="font-bold text-sm text-slate-700 dark:text-slate-300 block mb-2">{editingCategoryName ? 'Edit Kategori Terpilih' : 'Buat Kategori Baru'}</span>
                        {/* Name */}
                        <div>
                          <input type="text" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} placeholder="Nama kategori..." className="w-full p-3 bg-white dark:bg-[var(--bg-card)] border border-slate-200 dark:border-[var(--border-default)] rounded-xl text-sm focus:ring-2 focus:ring-blue-400 outline-none font-bold" />
                        </div>
                        {/* Icon Picker */}
                        <div>
                          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Pilih Icon</label>
                          <div className="grid grid-cols-7 gap-2">
                            {Object.keys(AVAILABLE_ICONS).map(iconKey => {
                              const Ico = AVAILABLE_ICONS[iconKey]
                              const isSelected = newCategoryIcon === iconKey
                              return (
                                <button type="button" key={iconKey} onClick={() => setNewCategoryIcon(iconKey)} className={`flex items-center justify-center aspect-square rounded-xl border-2 transition-all ${isSelected ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30 text-blue-600' : 'border-transparent bg-white dark:bg-[var(--bg-card)] text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[var(--bg-hover)] dark:bg-[var(--bg-hover)]'}`}>
                                  <Ico className="w-5 h-5" />
                                </button>
                              )
                            })}
                          </div>
                        </div>
                        {/* Color Picker */}
                        <div>
                          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Pilih Warna</label>
                          <div className="grid grid-cols-6 gap-2">
                            {COLOR_PALETTES.map((colorSet, idx) => {
                              const isSelected = newCategoryColor === colorSet
                              return (
                                <button type="button" key={idx} onClick={() => setNewCategoryColor(colorSet)} className={`w-full aspect-square rounded-full flex items-center justify-center transition-all border-2 ${isSelected ? 'border-slate-800 scale-110 shadow-sm' : 'border-transparent hover:scale-110'} ${colorSet}`}>
                                  {isSelected && <div className="w-3 h-3 bg-current rounded-full" />}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                        {/* Actions */}
                        <div className="flex gap-2 pt-2 border-t border-slate-200 dark:border-[var(--border-default)]">
                          <button type="button" onClick={handleSaveCustomCategory} className="flex-1 py-3 bg-[var(--primary)] text-white rounded-xl text-sm font-bold shadow-sm hover:bg-blue-600 transition-colors">Simpan Kategori</button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Budget Awareness Indicator */}
              {budgetInfo && (
                <div className={`p-4 rounded-xl border ${budgetInfo.isOver ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-200' : 'bg-slate-50 dark:bg-[var(--bg-elevated)] border-slate-200 dark:border-[var(--border-default)]'}`}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Budget {budgetInfo.budget.category}</span>
                    <span className={`text-xs font-bold ${budgetInfo.isOver ? 'text-rose-600' : 'text-slate-600 dark:text-slate-500'}`}>
                      {budgetInfo.isOver ? 'Limit Terlampaui!' : 'Dalam Batas'}
                    </span>
                  </div>

                  <div className="flex justify-between items-end mb-2">
                    <div className="flex flex-col">
                      <span className="text-xs text-slate-400 dark:text-slate-500">Terpakai + Baru</span>
                      <span className="font-bold text-slate-700 dark:text-slate-300">Rp {budgetInfo.totalProjected.toLocaleString('id-ID')}</span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-xs text-slate-400 dark:text-slate-500">Total Budget</span>
                      <span className="font-bold text-slate-700 dark:text-slate-300">Rp {budgetInfo.budget.amount.toLocaleString('id-ID')}</span>
                    </div>
                  </div>

                  <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mb-2">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${budgetInfo.isOver ? 'bg-rose-50 dark:bg-rose-950/300' : budgetInfo.percent > 80 ? 'bg-orange-50 dark:bg-orange-950/300' : 'bg-blue-50 dark:bg-blue-950/300'}`}
                      style={{ width: `${budgetInfo.percent}%` }}
                    />
                  </div>

                  {budgetInfo.isOver ? (
                    <div className="flex items-start gap-2 text-rose-600 text-xs font-medium mt-2 bg-rose-100 dark:bg-rose-950/40 p-2 rounded-lg">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <p>
                        Awas! Transaksi ini akan membuat budget minus <strong>Rp {Math.abs(budgetInfo.remaining).toLocaleString('id-ID')}</strong>.
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-center text-slate-500 dark:text-slate-400">
                      Sisa budget setelah transaksi ini: <strong>Rp {budgetInfo.remaining.toLocaleString('id-ID')}</strong>
                    </p>
                  )}
                </div>
              )}

              {/* Title Input */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Catatan <span className="text-slate-400 dark:text-slate-500 font-normal text-xs">(Opsional)</span>
                </label>
                <input
                  type="text"
                  placeholder={category ? `Contoh: ${category} Enak` : "Catatan Transaksi"}
                  className="w-full p-4 bg-slate-50 dark:bg-[var(--bg-elevated)] border border-slate-200 dark:border-[var(--border-default)] rounded-2xl focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent outline-none transition-all font-medium"
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
              <div className={`h-1.5 rounded-full transition-all duration-300 ${welcomeStep === 1 ? 'w-8 bg-blue-600' : 'w-2 bg-slate-200 dark:bg-slate-700'}`}></div>
              <div className={`h-1.5 rounded-full transition-all duration-300 ${welcomeStep === 2 ? 'w-8 bg-blue-600' : 'w-2 bg-slate-200 dark:bg-slate-700'}`}></div>
            </div>

            {welcomeStep === 1 ? (
              /* STEP 1: ACTIVE WALLETS INTRO */
              <div className="text-center">
                <div className="text-6xl mb-4 animate-bounce">🎉</div>

                <h2 className="text-2xl font-bold text-slate-800 dark:text-[var(--text-primary)] mb-2">
                  Selamat Datang di My Money!
                </h2>
                <p className="text-slate-600 dark:text-slate-500 mb-6 text-sm">
                  Kami sudah siapkan 2 dompet untuk transaksi harian Anda:
                </p>

                {/* Active Wallets Preview */}
                <div className="bg-slate-50 dark:bg-[var(--bg-elevated)] rounded-2xl p-4 mb-6 space-y-3 text-left">
                  <div className="flex items-start gap-3 bg-white dark:bg-[var(--bg-card)] p-3 rounded-xl border border-slate-100 dark:border-[var(--border-default)] shadow-sm">
                    <div className="text-2xl mt-1">💵</div>
                    <div className="flex-1">
                      <div className="flex justify-between items-center">
                        <p className="font-bold text-slate-800 dark:text-[var(--text-primary)]">Tunai</p>
                        <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">Saldo Aktif</span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Untuk uang cash sehari-hari</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 bg-white dark:bg-[var(--bg-card)] p-3 rounded-xl border border-slate-100 dark:border-[var(--border-default)] shadow-sm">
                    <div className="text-2xl mt-1">🏦</div>
                    <div className="flex-1">
                      <div className="flex justify-between items-center">
                        <p className="font-bold text-slate-800 dark:text-[var(--text-primary)]">Rekening Bank</p>
                        <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">Saldo Aktif</span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Untuk transfer & belanja online</p>
                    </div>
                  </div>
                </div>

                {/* Education Box */}
                <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-800/30 rounded-xl p-4 mb-6 text-left flex gap-3">
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
                    className="w-full bg-white dark:bg-[var(--bg-card)] hover:bg-slate-50 dark:hover:bg-[var(--bg-elevated)] text-slate-600 dark:text-slate-500 font-medium py-3 rounded-2xl transition-colors text-sm"
                  >
                    Mulai Tracking Saja
                  </button>
                </div>
              </div>
            ) : (
              /* STEP 2: SAVINGS SETUP (OPTIONAL) */
              <div className="text-center animate-in slide-in-from-right-10 duration-300">
                <div className="text-5xl mb-4">🏦</div>

                <h2 className="text-2xl font-bold text-slate-800 dark:text-[var(--text-primary)] mb-2">
                  Setup Tabungan (Opsional)
                </h2>
                <p className="text-slate-600 dark:text-slate-500 mb-8 text-sm px-4">
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
                    className="w-full bg-white dark:bg-[var(--bg-card)] hover:bg-slate-50 dark:hover:bg-[var(--bg-elevated)] text-slate-500 dark:text-slate-400 font-medium py-3 rounded-2xl transition-colors text-sm"
                  >
                    Lewati, nanti saja
                  </button>
                </div>

                <button
                  onClick={() => setWelcomeStep(1)}
                  className="mt-4 text-xs text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 dark:text-slate-500"
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
          <div className="bg-white dark:bg-[var(--bg-card)] p-6 rounded-2xl w-full max-w-sm relative shadow-xl animate-in zoom-in-95 duration-200">
            <button onClick={() => setShowDebtModal(false)} className="absolute top-4 right-4 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 dark:text-slate-500">
              <X className="w-5 h-5" />
            </button>

            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3 text-2xl">
                🧑‍🤝‍🧑
              </div>
              <h3 className="font-bold text-lg text-slate-800 dark:text-[var(--text-primary)]">Lunasi Piutang</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {selectedDebt ? `Pilih dompet penerima dana dari ${selectedDebt.person_name}` : 'Pilih dompet penerima dana'}
              </p>
              {selectedDebt && (
                <div className="mt-3 bg-blue-50 dark:bg-blue-950/30 py-2 rounded-lg">
                  <span className="text-blue-600 font-bold text-xl">Rp {selectedDebt.amount.toLocaleString('id-ID')}</span>
                </div>
              )}
            </div>

            <div className="space-y-3 mb-4">
              <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">Masuk ke Dompet</p>
              <div className="grid gap-2 max-h-64 overflow-y-auto pr-2">
                {wallets.map(w => {
                  const isProcessing = repayingWalletId === w.id
                  return (
                    <button
                      key={w.id}
                      onClick={() => selectedDebt && markDebtAsPaid(selectedDebt, w.id)}
                      disabled={repayingWalletId !== null}
                      className={`w-full flex justify-between items-center p-4 rounded-xl border transition-all group ${isProcessing
                        ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-500 cursor-wait'
                        : repayingWalletId !== null
                          ? 'bg-slate-50 dark:bg-[var(--bg-elevated)] border-slate-200 dark:border-[var(--border-default)] opacity-50 cursor-not-allowed'
                          : 'bg-white dark:bg-[var(--bg-card)] border-slate-200 dark:border-[var(--border-default)] hover:border-green-500 hover:bg-green-50 dark:bg-green-950/30'
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        {isProcessing && (
                          <div className="w-4 h-4 rounded-full border-2 border-blue-600 border-t-transparent animate-spin"></div>
                        )}
                        <span className={`font-medium ${isProcessing ? 'text-blue-700' : 'text-slate-700 dark:text-slate-300'} group-hover:text-green-700`}>
                          {w.name} {isProcessing && '(Memproses...)'}
                        </span>
                      </div>
                      <span className="text-xs bg-slate-100 dark:bg-[var(--bg-hover)] text-slate-500 dark:text-slate-400 px-2 py-1 rounded-lg">
                        Rp {w.balance.toLocaleString('id-ID')}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            <button
              onClick={() => setShowDebtModal(false)}
              className="w-full py-3 text-slate-400 dark:text-slate-500 font-bold hover:text-slate-600 dark:hover:text-slate-300 dark:text-slate-500 transition-colors"
            >
              Batal
            </button>
          </div>
        </div>
      )}

    </main>
  )
}

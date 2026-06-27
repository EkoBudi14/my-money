'use client'
import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/useToast'
import { useConfirm } from '@/hooks/useConfirm'
import { useSuccessModal } from '@/hooks/useSuccessModal'
import MoneyInput from '@/components/MoneyInput'
import NeoSelect from '@/components/NeoSelect'
import { Wallet, Transaction, Budget, CustomCategoryDef } from '@/types'
import {
  Plus, Trash2, X, Package, Pencil, Info, AlertTriangle,
  ShoppingBag, Utensils, Car, Zap, Home, Film, HeartPulse,
  CreditCard, Gift, Briefcase, TrendingUp, Landmark, Coffee,
  Plane, Gamepad2, Tv, Smartphone, Book, Scissors, Music,
  Shirt, Smile, Globe, Dumbbell, GraduationCap, ArrowLeft
} from 'lucide-react'

// ── Constants (duplicated from page.tsx to keep component self-contained) ──────
const AVAILABLE_ICONS: Record<string, any> = {
  Home, ShoppingBag, Utensils, Car, Zap, Package, HeartPulse, CreditCard, Film, Gift,
  Briefcase, TrendingUp, Landmark, Coffee, Plane, Gamepad2, Tv, Smartphone, Book,
  Scissors, Music, Shirt, Smile, Globe, Dumbbell, GraduationCap
}

const COLOR_PALETTES = [
  'bg-emerald-100 text-emerald-600', 'bg-rose-100 dark:bg-rose-950/40 text-rose-600',
  'bg-blue-100 text-blue-600', 'bg-teal-100 text-teal-600',
  'bg-yellow-100 text-yellow-600', 'bg-purple-100 text-purple-600',
  'bg-red-100 text-red-600', 'bg-stone-100 text-stone-600',
  'bg-pink-100 text-pink-600', 'bg-indigo-100 text-indigo-600',
  'bg-amber-100 text-amber-600', 'bg-slate-100 dark:bg-[var(--bg-hover)] text-slate-600 dark:text-slate-500'
]

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

// ── Types ────────────────────────────────────────────────────────────────────
interface Props {
  isOpen: boolean
  editingTransaction: Transaction | null
  wallets: Wallet[]
  transactions: Transaction[]
  budgets: Budget[]
  customCategories: { pengeluaran: (string | CustomCategoryDef)[]; pemasukan: (string | CustomCategoryDef)[] }
  onClose: () => void
  onSaved: () => void
  onCustomCategoriesChange: (updated: { pengeluaran: (string | CustomCategoryDef)[]; pemasukan: (string | CustomCategoryDef)[] }) => void
  mode?: 'modal' | 'page'
  initialType?: 'pemasukan' | 'pengeluaran' | 'topup'
  isLoading?: boolean
}

// ── Helper ───────────────────────────────────────────────────────────────────
const fetchFreshWalletBalance = async (walletId: number): Promise<number | null> => {
  const { data, error } = await supabase.from('wallets').select('balance').eq('id', walletId).single()
  if (error || !data) return null
  return data.balance
}

// ── Component ────────────────────────────────────────────────────────────────
export default function TransactionModal({
  isOpen, editingTransaction, wallets, transactions, budgets,
  customCategories, onClose, onSaved, onCustomCategoriesChange,
  mode = 'modal', initialType, isLoading = false
}: Props) {
  const { showToast } = useToast()
  const { showConfirm } = useConfirm()
  const { showSuccess } = useSuccessModal()

  // ── Form State (ALL of this lives here, NOT in page.tsx) ──────────────────
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [adminFee, setAdminFee] = useState('')
  const [type, setType] = useState<'pemasukan' | 'pengeluaran' | 'topup'>('pemasukan')
  const [category, setCategory] = useState('')
  const [selectedWalletId, setSelectedWalletId] = useState('')
  const [sourceWalletId, setSourceWalletId] = useState('')
  const [customDate, setCustomDate] = useState(new Date().toISOString().split('T')[0])
  const [saving, setSaving] = useState(false)

  // Piutang
  const [isPiutang, setIsPiutang] = useState(false)
  const [piutangPerson, setPiutangPerson] = useState('')
  // Talangan
  const [isTalangan, setIsTalangan] = useState(false)
  const [talanganPerson, setTalanganPerson] = useState('')
  // Split Bill
  const [isSplitBill, setIsSplitBill] = useState(false)
  const [splitEntries, setSplitEntries] = useState<{ name: string; amount: string }[]>([{ name: '', amount: '' }])

  // Category form
  const [showAddCategory, setShowAddCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newCategoryIcon, setNewCategoryIcon] = useState('Package')
  const [newCategoryColor, setNewCategoryColor] = useState(COLOR_PALETTES[0])
  const [editingCategoryName, setEditingCategoryName] = useState<string | null>(null)

  // Debounce amount for budget awareness (expensive useMemo)
  const [debouncedAmount, setDebouncedAmount] = useState('')
  useEffect(() => {
    const t = setTimeout(() => setDebouncedAmount(amount), 300)
    return () => clearTimeout(t)
  }, [amount])

  // ── Populate form when editing ────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return
    if (editingTransaction) {
      setTitle(editingTransaction.title)
      setAmount(editingTransaction.amount.toString())
      setAdminFee('')
      setCategory(editingTransaction.category)
      setType(editingTransaction.type)
      setSelectedWalletId(editingTransaction.wallet_id?.toString() || '')
      setSourceWalletId(editingTransaction.source_wallet_id?.toString() || '')
      setCustomDate(new Date(editingTransaction.date || editingTransaction.created_at).toISOString().split('T')[0])
      setIsPiutang(editingTransaction.is_piutang || false)
      setPiutangPerson(editingTransaction.piutang_person || '')
      setIsTalangan(editingTransaction.is_talangan || false)
      setTalanganPerson(editingTransaction.talangan_person || '')
    } else {
      // Reset for new transaction
      setTitle('')
      setAmount('')
      setAdminFee('')
      setCategory(initialType === 'topup' ? 'Topup' : '')
      setType(initialType || 'pemasukan')
      setSelectedWalletId('')
      setSourceWalletId('')
      setCustomDate(new Date().toISOString().split('T')[0])
      setIsPiutang(false)
      setPiutangPerson('')
      setIsTalangan(false)
      setTalanganPerson('')
      setIsSplitBill(false)
      setSplitEntries([{ name: '', amount: '' }])
    }
    setShowAddCategory(false)
    setNewCategoryName('')
    setDebouncedAmount('')
  }, [isOpen, editingTransaction])

  const resetCategoryForm = () => {
    setShowAddCategory(false)
    setNewCategoryName('')
    setNewCategoryIcon('Package')
    setNewCategoryColor(COLOR_PALETTES[0])
    setEditingCategoryName(null)
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

  // ── Budget awareness (only recalculates 300ms after typing stops) ─────────
  const budgetInfo = useMemo(() => {
    if (type !== 'pengeluaran' || !category || !debouncedAmount) return null
    const budget = budgets.find(b => b.category === category)
    if (!budget) return null

    const filterStart = new Date(customDate)
    filterStart.setDate(1)
    const filterEnd = new Date(filterStart.getFullYear(), filterStart.getMonth() + 1, 0)

    const currentSpent = transactions
      .filter(t =>
        t.type === 'pengeluaran' &&
        t.category === category &&
        !t.is_talangan &&
        t.id !== editingTransaction?.id &&
        new Date(t.date || t.created_at) >= filterStart &&
        new Date(t.date || t.created_at) <= filterEnd
      )
      .reduce((acc, curr) => acc + curr.amount, 0)

    const newAmount = parseFloat(debouncedAmount) || 0
    const totalProjected = currentSpent + newAmount
    const remaining = budget.amount - totalProjected
    const isOver = remaining < 0
    const percent = Math.min((totalProjected / budget.amount) * 100, 100)

    return { budget, currentSpent, totalProjected, remaining, isOver, percent }
  }, [category, type, budgets, transactions, debouncedAmount, editingTransaction, customDate])

  // ── Custom category handlers ──────────────────────────────────────────────
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
    const newDef: CustomCategoryDef = { name: finalName, iconName: newCategoryIcon, color: newCategoryColor }

    if (oldNameObj) {
      updatedList = updatedList.map(c => getName(c) === oldNameObj ? newDef : c)
      if (oldNameObj !== finalName) {
        await supabase.from('transactions').update({ category: finalName }).eq('category', oldNameObj)
      }
    } else {
      updatedList.push(newDef)
    }

    const updated = { ...customCategories, [currentType]: updatedList }
    const { error } = await supabase.from('user_settings').update({ custom_categories: updated }).eq('id', 1)

    if (!error) {
      onCustomCategoriesChange(updated)
      setCategory(finalName)
      resetCategoryForm()
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
      onCustomCategoriesChange(updated)
      if (category === catName) setCategory('')
      showToast('success', 'Kategori dihapus')
    } else {
      showToast('error', 'Gagal menghapus kategori')
    }
  }

  // ── Save transaction (full logic, identical to page.tsx original) ─────────
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

    let error: any
    let data: any

    if (editingTransaction) {
      const editingId = editingTransaction.id
      const { data: oldTransaction } = await supabase.from('transactions').select('*').eq('id', editingId).single()
      if (!oldTransaction) {
        showToast('error', 'Transaksi tidak ditemukan')
        setSaving(false)
        return
      }

      const oldWalletId = oldTransaction.wallet_id
      const oldSourceWalletId = oldTransaction.source_wallet_id
      const isSameWallet = oldWalletId === newWalletId && (type !== 'topup' || oldSourceWalletId === parseInt(sourceWalletId))

      let oldAdminFeeAmount = 0
      if (oldTransaction.type === 'topup' && oldTransaction.source_wallet_id) {
        const { data: adminFeeTrx } = await supabase
          .from('transactions').select('*')
          .eq('wallet_id', oldTransaction.source_wallet_id).eq('title', 'Biaya Admin')
          .eq('type', 'pengeluaran').eq('date', oldTransaction.date)
          .order('created_at', { ascending: false }).limit(1)
        if (adminFeeTrx && adminFeeTrx.length > 0) {
          oldAdminFeeAmount = adminFeeTrx[0].amount
          await supabase.from('transactions').delete().eq('id', adminFeeTrx[0].id)
        }
      }

      if (isSameWallet) {
        let balanceAfterRollback = freshNewWalletBalance
        let sourceBalanceAfterRollback = freshSourceWalletBalance || 0

        if (oldTransaction.type === 'pemasukan' || oldTransaction.type === 'topup') balanceAfterRollback -= oldTransaction.amount
        else balanceAfterRollback += oldTransaction.amount

        if (oldTransaction.type === 'topup' && oldTransaction.source_wallet_id) {
          sourceBalanceAfterRollback += oldTransaction.amount + oldAdminFeeAmount
        }

        if (type === 'pengeluaran' && balanceAfterRollback < amountNum) {
          showToast('error', `Saldo tidak mencukupi setelah perubahan! Saldo tersedia: Rp ${balanceAfterRollback.toLocaleString('id-ID')}`)
          setSaving(false)
          return
        }

        const res = await supabase.from('transactions').update(payload).eq('id', editingId).select()
        error = res.error
        data = res.data

        if (!error) {
          let finalBalance = balanceAfterRollback
          if (type === 'pemasukan' || type === 'topup') finalBalance += amountNum
          else finalBalance -= amountNum
          await supabase.from('wallets').update({ balance: finalBalance }).eq('id', newWalletId)

          if (type === 'topup') {
            const finalSourceBalance = sourceBalanceAfterRollback - amountNum - adminFeeNum
            await supabase.from('wallets').update({ balance: finalSourceBalance }).eq('id', parseInt(sourceWalletId))
            if (adminFeeNum > 0) {
              await supabase.from('transactions').insert([{
                title: 'Biaya Admin', amount: adminFeeNum, type: 'pengeluaran', category: 'Lainnya',
                wallet_id: parseInt(sourceWalletId), date: safeDate, created_at: new Date().toISOString(),
                is_piutang: false, is_talangan: false
              }])
            }
          }
        }
      } else {
        const freshOldWalletBalance = await fetchFreshWalletBalance(oldWalletId)
        if (freshOldWalletBalance === null) {
          showToast('error', 'Wallet lama tidak ditemukan!')
          setSaving(false)
          return
        }

        if (type === 'pengeluaran' && freshNewWalletBalance < amountNum) {
          const walletName = wallets.find(w => w.id === newWalletId)?.name || 'Dompet baru'
          showToast('error', `Saldo tidak mencukupi! Saldo ${walletName}: Rp ${freshNewWalletBalance.toLocaleString('id-ID')}`)
          setSaving(false)
          return
        }

        const res = await supabase.from('transactions').update(payload).eq('id', editingId).select()
        error = res.error
        data = res.data

        if (!error) {
          let oldWalletNewBalance = freshOldWalletBalance
          if (oldTransaction.type === 'pemasukan' || oldTransaction.type === 'topup') oldWalletNewBalance -= oldTransaction.amount
          else oldWalletNewBalance += oldTransaction.amount
          await supabase.from('wallets').update({ balance: oldWalletNewBalance }).eq('id', oldWalletId)

          if (oldTransaction.type === 'topup' && oldTransaction.source_wallet_id) {
            const freshOldSourceBal = await fetchFreshWalletBalance(oldTransaction.source_wallet_id)
            if (freshOldSourceBal !== null) {
              await supabase.from('wallets').update({ balance: freshOldSourceBal + oldTransaction.amount + oldAdminFeeAmount }).eq('id', oldTransaction.source_wallet_id)
            }
          }

          let newWalletNewBalance = freshNewWalletBalance
          if (type === 'pemasukan' || type === 'topup') newWalletNewBalance += amountNum
          else newWalletNewBalance -= amountNum
          await supabase.from('wallets').update({ balance: newWalletNewBalance }).eq('id', newWalletId)

          if (type === 'topup' && freshSourceWalletBalance !== null) {
            const finalSourceBalance = freshSourceWalletBalance - amountNum - adminFeeNum
            await supabase.from('wallets').update({ balance: finalSourceBalance }).eq('id', parseInt(sourceWalletId))
            if (adminFeeNum > 0) {
              await supabase.from('transactions').insert([{
                title: 'Biaya Admin', amount: adminFeeNum, type: 'pengeluaran', category: 'Lainnya',
                wallet_id: parseInt(sourceWalletId), date: safeDate, created_at: new Date().toISOString(),
                is_piutang: false, is_talangan: false
              }])
            }
          }
        }
      }
    } else {
      // Insert Mode
      if (type === 'pengeluaran' && freshNewWalletBalance < amountNum) {
        const walletName = wallets.find(w => w.id === newWalletId)?.name || 'Dompet'
        showToast('error', `Saldo tidak mencukupi! Saldo ${walletName}: Rp ${freshNewWalletBalance.toLocaleString('id-ID')}`)
        setSaving(false)
        return
      }

      const res = await supabase.from('transactions').insert([payload]).select()
      error = res.error
      data = res.data

      if (!error) {
        let newBalance = type === 'pemasukan' || type === 'topup'
          ? freshNewWalletBalance + amountNum
          : freshNewWalletBalance - amountNum

        if (type === 'topup' && freshSourceWalletBalance !== null) {
          let srcNewBalance = freshSourceWalletBalance - amountNum
          if (adminFeeNum > 0) {
            srcNewBalance -= adminFeeNum
            await supabase.from('transactions').insert([{
              title: 'Biaya Admin', amount: adminFeeNum, type: 'pengeluaran', category: 'Lainnya',
              wallet_id: parseInt(sourceWalletId), date: safeDate, created_at: new Date().toISOString(),
              is_piutang: false, is_talangan: false
            }])
          }
          await supabase.from('wallets').update({ balance: srcNewBalance }).eq('id', parseInt(sourceWalletId))
        }

        await supabase.from('wallets').update({ balance: newBalance }).eq('id', newWalletId)
      }
    }

    if (error) {
      console.error('Supabase Error:', error)
      showToast('error', `Gagal menyimpan: ${error.message || 'Cek console untuk detail'}`)
    } else {
      // Split Bill / Debt Creation
      if (data && data.length > 0 && isSplitBill && type === 'pengeluaran') {
        const validDebts = splitEntries.filter(e => e.name.trim() !== '' && parseFloat(e.amount) > 0)
        if (validDebts.length > 0) {
          await supabase.from('debts').insert(validDebts.map(d => ({
            person_name: d.name,
            amount: parseFloat(d.amount),
            status: 'pending',
            original_transaction_id: data[0].id,
            created_at: new Date().toISOString()
          })))
        }
      }

      showSuccess({
        type: editingTransaction ? 'edit' : 'create',
        message: editingTransaction ? 'Transaksi berhasil diperbarui!' : 'Transaksi baru berhasil dicatat!'
      })
      onSaved()
      onClose()
    }

    setSaving(false)
  }

  if (!isOpen && mode !== 'page') return null

  // ── All category options combined ─────────────────────────────────────────
  const allCategories = type !== 'topup' ? [
    ...(CATEGORIES[type as 'pemasukan' | 'pengeluaran'].map(c => ({ ...c, isCustom: false }))),
    ...(customCategories[type as 'pemasukan' | 'pengeluaran'] || []).map(c => {
      if (typeof c === 'string') return { name: c, color: 'bg-slate-100 dark:bg-[var(--bg-hover)] text-slate-600 dark:text-slate-500', icon: Package, isCustom: true, originalObj: c }
      return { name: c.name, color: c.color, icon: AVAILABLE_ICONS[c.iconName] || Package, isCustom: true, originalObj: c }
    })
  ] : []

  // ── Page Mode (full screen, no overlay) ────────────────────────────────────
  if (mode === 'page') {
    return (
      <div className="min-h-screen bg-[#F9FAFB] dark:bg-[var(--bg-page)] pb-8">
        {/* Header */}
        <div className="sticky top-0 z-20 bg-white dark:bg-[var(--bg-card)] border-b border-slate-100 dark:border-[var(--border-default)] shadow-sm">
          <div className="flex items-center gap-3 px-4 py-3">
            <button onClick={onClose} className="p-2 -ml-2 hover:bg-slate-100 dark:hover:bg-[var(--bg-hover)] rounded-xl text-slate-600 dark:text-slate-500 transition-colors active:scale-90">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="font-black text-2xl uppercase tracking-tighter text-[var(--text-primary)]">
              {editingTransaction ? 'Edit Transaksi' : type === 'pemasukan' ? 'Pemasukan Baru' : type === 'pengeluaran' ? 'Pengeluaran Baru' : 'Transfer Saldo'}
            </h1>
          </div>

          {/* Type Tabs */}
          <div className="px-4 pb-0">
            <div className="flex border-b border-[var(--border-default)]">
              {[
                { key: 'pemasukan', label: 'Pemasukan' },
                { key: 'pengeluaran', label: 'Pengeluaran' },
                { key: 'topup', label: 'Transfer' },
              ].map(tab => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => { setType(tab.key as any); setCategory(tab.key === 'topup' ? 'Topup' : '') }}
                  className={`flex-1 py-3 text-sm font-black transition-all border-b-[4px] -mb-[2px] ${type === tab.key
                    ? 'border-[var(--neo-ink)] text-[var(--neo-ink)]'
                    : 'border-transparent text-[var(--text-muted)]'
                    }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Form Content */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 mt-10 gap-3">
            <div className="w-8 h-8 border-3 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
            <p className="neo-label mt-2">Menyiapkan form...</p>
          </div>
        ) : (
        <form onSubmit={handleSaveTransaction} className="px-4 pt-5">
          {/* Topup wallet selectors */}
          {type === 'topup' && (
            <div className="flex items-center gap-2 mb-5">
              <div className="flex-1 brutal-card-sm p-3" style={{ background: 'var(--neo-sky)' }}>
                <p className="neo-label mb-1">Sumber Dana</p>
                <NeoSelect
                  value={sourceWalletId}
                  onChange={setSourceWalletId}
                  options={wallets.map(w => ({ label: w.name, value: w.id.toString(), disabled: selectedWalletId === w.id.toString() }))}
                  placeholder="Pilih Sumber"
                  className="bg-transparent font-black text-[var(--text-primary)] text-sm"
                  required
                />
              </div>
              <div className="w-8 h-8 rounded-full bg-[var(--neo-ink)] flex items-center justify-center shrink-0 shadow-[2px_2px_0_#141414]">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
              </div>
              <div className="flex-1 brutal-card-sm p-3" style={{ background: 'var(--neo-lav)' }}>
                <p className="neo-label mb-1">Tujuan Topup</p>
                <NeoSelect
                  value={selectedWalletId}
                  onChange={setSelectedWalletId}
                  options={wallets.map(w => ({ label: w.name, value: w.id.toString(), disabled: sourceWalletId === w.id.toString() }))}
                  placeholder="Pilih Tujuan"
                  className="bg-transparent font-black text-[var(--text-primary)] text-sm"
                  required
                />
              </div>
            </div>
          )}

          {/* Amount Display */}
          <div className={`brutal-card-md p-6 relative overflow-hidden ${type === 'pemasukan' ? 'bg-[var(--neo-mint)]' :
            type === 'pengeluaran' ? 'bg-[var(--neo-peach)]' :
              'bg-[var(--neo-lav)]'
            }`}>
            <p className="text-[var(--text-primary)] text-[10px] font-black uppercase tracking-widest mb-3 relative z-10">{type === 'topup' ? 'Nominal Topup (RP)' : 'Jumlah (RP)'}</p>
            <div className="relative z-10 mb-1">
              <div className="flex items-center gap-2">
                <span className="text-[var(--text-primary)] font-black text-4xl shrink-0">Rp</span>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  className="flex-1 bg-transparent border-none outline-none text-[var(--text-primary)] font-black text-4xl placeholder:text-[var(--text-primary)]/30 min-w-0"
                  value={amount ? parseInt(amount.replace(/\D/g, '') || '0').toLocaleString('id-ID') : ''}
                  onChange={(e) => { const raw = e.target.value.replace(/\D/g, ''); setAmount(raw) }}
                  autoFocus={!editingTransaction}
                />
              </div>
              <button type="button" onClick={() => { const raw = amount.replace(/\D/g, ''); if (!raw) { setAmount('1000') } else { setAmount(raw + '000') } }} className="mt-3 px-3 py-1.5 brutal-btn-ghost !py-1.5 !px-4 !text-xs bg-white dark:bg-[var(--bg-elevated)] active:scale-95 transition-all">
                +000
              </button>
            </div>
            <div className="flex gap-2 flex-wrap mt-4 relative z-10">
              {(type === 'pengeluaran' ? [10000, 50000, 100000, 500000] : [50000, 100000, 500000, 1000000]).map(val => (
                <button key={val} type="button" onClick={() => setAmount(String((parseInt(amount.replace(/\D/g, '') || '0') + val)))} className="brutal-btn-ghost !py-1.5 !px-4 !text-xs bg-white dark:bg-[var(--bg-elevated)] active:scale-95 transition-all">
                  +{val >= 1000000 ? `${val / 1000000}jt` : `${val / 1000}rb`}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5 space-y-4">
            {/* Date & Wallet */}
            {type !== 'topup' ? (
              <div className="grid grid-cols-2 gap-3">
                <div className="brutal-card-sm p-3">
                  <p className="neo-label mb-1">Tanggal</p>
                  <input type="date" className="w-full bg-transparent outline-none font-black text-[var(--text-primary)] text-sm" value={customDate} onChange={(e) => setCustomDate(e.target.value)} required />
                </div>
                <div className="brutal-card-sm p-3">
                  <p className="neo-label mb-1">Dompet</p>
                  <NeoSelect
                    value={selectedWalletId}
                    onChange={setSelectedWalletId}
                    options={wallets.map(w => ({ label: w.name, value: w.id.toString() }))}
                    placeholder="Pilih"
                    className="bg-transparent font-black text-[var(--text-primary)] text-sm"
                    required
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="brutal-card-sm p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="neo-label">Biaya Admin</p>
                      <p className="neo-label mt-1">Optional — Isi jika ada potongan</p>
                    </div>
                    <input
                      type="text" inputMode="numeric" placeholder="0"
                      className="w-28 text-right bg-[var(--bg-elevated)] border-2 border-[var(--neo-ink)] shadow-[2px_2px_0_var(--neo-ink)] rounded-[12px] px-3 py-1.5 font-black text-base text-[var(--text-primary)] focus:outline-none"
                      value={adminFee ? parseInt(adminFee.replace(/\D/g, '') || '0').toLocaleString('id-ID') : ''}
                      onChange={(e) => setAdminFee(e.target.value.replace(/\D/g, ''))}
                    />
                  </div>
                </div>
                <div className="brutal-card-sm px-4 py-3 space-y-2">
                  <div className="flex justify-between items-center text-sm"><span className="neo-label">Nominal topup</span><span className="font-black text-[var(--text-primary)]">Rp {amount ? parseInt(amount.replace(/\D/g, '') || '0').toLocaleString('id-ID') : '0'}</span></div>
                  <div className="flex justify-between items-center text-sm"><span className="neo-label">Biaya admin</span><span className="font-black text-[var(--text-primary)]">Rp {adminFee ? parseInt(adminFee.replace(/\D/g, '') || '0').toLocaleString('id-ID') : '0'}</span></div>
                  <div className="border-t-2 border-[var(--neo-ink)] pt-2 flex justify-between items-center text-sm"><span className="font-black text-violet-700">Total keluar</span><span className="font-black text-violet-700">Rp {((parseInt(amount.replace(/\D/g, '') || '0')) + (parseInt(adminFee.replace(/\D/g, '') || '0'))).toLocaleString('id-ID')}</span></div>
                </div>
                <div className="brutal-card-sm p-3">
                  <p className="neo-label mb-1">Tanggal</p>
                  <input type="date" className="w-full bg-transparent outline-none font-black text-[var(--text-primary)] text-sm" value={customDate} onChange={(e) => setCustomDate(e.target.value)} required />
                </div>
              </div>
            )}

            {/* Piutang Toggle */}
            {type === 'pemasukan' && (
              <div className={`p-4 brutal-card-sm transition-all duration-200 ${isPiutang ? 'bg-[var(--neo-yellow-vivid)]' : ''}`}>
                <div onClick={() => { setIsPiutang(!isPiutang); if (isPiutang) setPiutangPerson('') }} className="flex items-center justify-between cursor-pointer select-none">
                  <div className="flex items-center gap-3">
                    <span className={`neo-label !text-sm ${isPiutang ? '!text-[var(--neo-ink)]' : '!text-[var(--text-primary)]'}`}>💸 Ini adalah Piutang?</span>
                    <p className={`neo-label mt-1 ${isPiutang ? '!text-[var(--neo-ink)]/70' : '!text-[var(--text-muted)]'}`}>Tandai jika uang akan dikembalikan</p>
                  </div>
                  <div className={`w-12 h-7 rounded-full border-2 border-[var(--neo-ink)] transition-colors duration-200 flex items-center px-0.5 shrink-0 ${isPiutang ? 'bg-white' : 'bg-[var(--bg-elevated)]'}`}>
                    <div className={`w-5 h-5 bg-[var(--neo-ink)] rounded-full transition-transform duration-200 ${isPiutang ? 'translate-x-5' : 'translate-x-0'}`} />
                  </div>
                </div>
                {isPiutang && (
                  <input type="text" placeholder="Nama peminjam (Opsional)" className="mt-4 w-full px-[18px] py-[14px] bg-white border-[3px] border-[var(--neo-ink)] shadow-[4px_4px_0_var(--neo-ink)] rounded-[18px] text-[14px] focus:outline-none font-[800] text-[var(--neo-ink)]" value={piutangPerson} onChange={(e) => setPiutangPerson(e.target.value)} />
                )}
              </div>
            )}

            {/* Split Bill */}
            {type === 'pengeluaran' && (
              <div className={`p-4 brutal-card-sm transition-all duration-200 ${isSplitBill ? 'bg-[var(--neo-sky)]' : ''}`}>
                <div onClick={() => setIsSplitBill(!isSplitBill)} className="flex items-center justify-between cursor-pointer select-none">
                  <span className={`neo-label !text-sm ${isSplitBill ? '!text-[var(--neo-ink)]' : '!text-[var(--text-primary)]'}`}>Ada yang nitip bayar? (Split Bill)</span>
                  <div className={`w-12 h-7 rounded-full border-2 border-[var(--neo-ink)] transition-colors duration-200 flex items-center px-0.5 shrink-0 ${isSplitBill ? 'bg-white' : 'bg-[var(--bg-elevated)]'}`}>
                    <div className={`w-5 h-5 bg-[var(--neo-ink)] rounded-full transition-transform duration-200 ${isSplitBill ? 'translate-x-5' : 'translate-x-0'}`} />
                  </div>
                </div>
                {isSplitBill && (
                  <div className="space-y-3 mt-3">
                    {splitEntries.map((entry, idx) => (
                      <div key={idx} className="flex gap-2 items-start">
                        <div className="flex-1 grid grid-cols-2 gap-2">
                          <input type="text" placeholder={`Nama #${idx + 1}`} className="w-full px-[18px] py-[14px] bg-white border-[3px] border-[var(--neo-ink)] shadow-[4px_4px_0_var(--neo-ink)] rounded-[18px] text-[14px] focus:outline-none font-[800] text-[var(--neo-ink)]" value={entry.name} onChange={(e) => { const n = [...splitEntries]; n[idx].name = e.target.value; setSplitEntries(n) }} />
                          <MoneyInput placeholder="0" value={entry.amount} onChange={(val) => { const n = [...splitEntries]; n[idx].amount = val; setSplitEntries(n) }} className="!text-[14px] !px-[18px] !py-[14px] !border-[3px] !border-[var(--neo-ink)] !shadow-[4px_4px_0_var(--neo-ink)] !rounded-[18px] font-[800] text-[var(--neo-ink)] bg-white" />
                        </div>
                        {splitEntries.length > 1 && <button type="button" onClick={() => setSplitEntries(splitEntries.filter((_, i) => i !== idx))} className="p-2.5 text-[var(--neo-ink)] bg-[var(--neo-peach)] border-2 border-[var(--neo-ink)] shadow-[2px_2px_0_var(--neo-ink)] rounded-[12px] transition-colors"><Trash2 className="w-4 h-4" /></button>}
                      </div>
                    ))}
                    <button type="button" onClick={() => setSplitEntries([...splitEntries, { name: '', amount: '' }])} className="text-xs font-black text-[var(--neo-ink)] flex items-center gap-1 mt-2 p-2 bg-white border-2 border-[var(--neo-ink)] shadow-[2px_2px_0_var(--neo-ink)] rounded-[10px]"><Plus className="w-3 h-3" />Tambah Orang</button>
                  </div>
                )}
              </div>
            )}

            {/* Talangan Toggle */}
            {type === 'pengeluaran' && (
              <div className={`p-4 brutal-card-sm transition-all duration-200 ${isTalangan ? 'bg-[var(--neo-lav)]' : ''}`}>
                <div onClick={() => { setIsTalangan(!isTalangan); if (isTalangan) setTalanganPerson('') }} className="flex items-center justify-between cursor-pointer select-none">
                  <span className={`neo-label !text-sm ${isTalangan ? '!text-[var(--neo-ink)]' : '!text-[var(--text-primary)]'}`}>🤝 Ini Talangan?</span>
                  <div className={`w-12 h-7 rounded-full border-2 border-[var(--neo-ink)] transition-colors duration-200 flex items-center px-0.5 shrink-0 ${isTalangan ? 'bg-white' : 'bg-[var(--bg-elevated)]'}`}>
                    <div className={`w-5 h-5 bg-[var(--neo-ink)] rounded-full transition-transform duration-200 ${isTalangan ? 'translate-x-5' : 'translate-x-0'}`} />
                  </div>
                </div>
                {isTalangan && (
                  <input type="text" placeholder="Nama orang yang ditalangin (Opsional)" className="mt-4 w-full px-[18px] py-[14px] bg-white border-[3px] border-[var(--neo-ink)] shadow-[4px_4px_0_var(--neo-ink)] rounded-[18px] text-[14px] focus:outline-none font-[800] text-[var(--neo-ink)]" value={talanganPerson} onChange={(e) => setTalanganPerson(e.target.value)} />
                )}
              </div>
            )}

            {/* Category Picker */}
            {type !== 'topup' && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="neo-label">Kategori <span className="text-rose-500">*</span></label>
                  <span className="neo-label !text-[var(--primary)]">Wajib dipilih</span>
                </div>
                <div className="grid grid-cols-4 gap-2.5">
                  {allCategories.map((cat) => {
                    const isSelected = category === cat.name
                    return (
                      <button key={cat.name} type="button" onClick={() => setCategory(cat.name)} className="flex flex-col items-center justify-center group">
                        <div className={`w-14 h-14 rounded-[14px] flex items-center justify-center mb-2 border-[3px] border-[var(--neo-ink)] transition-all ${isSelected ? 'shadow-[4px_4px_0_var(--neo-ink)] scale-110 translate-y-[-2px] bg-[var(--neo-yellow-vivid)] text-[var(--neo-ink)]' : `shadow-[2px_2px_0_var(--neo-ink)] group-hover:scale-105 group-hover:translate-y-[-1px] ${cat.color} [&>svg]:!text-[var(--neo-ink)]`}`}>
                          <cat.icon className="w-6 h-6 stroke-[2.5px]" />
                        </div>
                        <span className={`text-[10px] font-black text-center leading-tight mt-1 ${isSelected ? 'text-[var(--neo-ink)]' : 'text-[var(--text-primary)]'}`}>{cat.name}</span>
                      </button>
                    )
                  })}
                  <button type="button" onClick={() => { resetCategoryForm(); setShowAddCategory(true); }} className="flex flex-col items-center justify-center group">
                    <div className="w-14 h-14 rounded-[14px] flex items-center justify-center mb-2 border-[3px] border-dashed border-[var(--neo-ink)] shadow-[2px_2px_0_var(--neo-ink)] bg-[var(--bg-elevated)] text-[var(--text-primary)] group-hover:scale-105 group-hover:translate-y-[-1px] transition-all">
                      <Plus className="w-6 h-6 stroke-[3px]" />
                    </div>
                    <span className="text-[10px] font-black text-center leading-tight mt-1 uppercase tracking-widest text-[var(--text-primary)]">Custom</span>
                  </button>
                </div>

                {showAddCategory && (
                  <div className="mt-4 p-4 rounded-[16px] bg-[var(--bg-card)] border-2 border-[var(--neo-ink)] shadow-[2px_2px_0_var(--neo-ink)]">
                    <div className="flex justify-between items-center mb-4">
                      <span className="font-black text-[var(--text-primary)]">Kelola Kategori Custom</span>
                      <button type="button" onClick={resetCategoryForm} className="flex items-center justify-center p-1.5 rounded-xl bg-[#ffd84d] border-2 border-[#141414] shadow-[2px_2px_0_#141414] hover:-translate-y-[1px] hover:shadow-[3px_3px_0_#141414] active:translate-y-[2px] active:translate-x-[2px] active:shadow-none transition-all"><X className="w-4 h-4 text-[#141414]" strokeWidth={3} /></button>
                    </div>
                    {(customCategories[type as 'pemasukan' | 'pengeluaran'] || []).length > 0 && (
                      <div className="mb-6 space-y-2">
                        <label className="neo-label mb-2 block">Pilih Untuk Edit/Hapus</label>
                        <div className="flex flex-col gap-2 max-h-40 overflow-y-auto pr-1">
                          {customCategories[type as 'pemasukan' | 'pengeluaran'].map((c, idx) => {
                            const isStr = typeof c === 'string'; const name = isStr ? c : c.name; const Ico = isStr ? Package : (AVAILABLE_ICONS[c.iconName] || Package)
                            return (
                              <div key={idx} className="flex flex-row items-center justify-between bg-white p-2.5 border-2 border-[var(--neo-ink)] shadow-[2px_2px_0_var(--neo-ink)] rounded-[12px]">
                                <div className="flex items-center gap-3">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center bg-[var(--bg-elevated)] border-2 border-[var(--neo-ink)] ${isStr ? 'text-[var(--text-secondary)]' : c.color.split(' ')[1]}`}><Ico className="w-4 h-4" /></div>
                                  <span className="text-sm font-black text-[var(--text-primary)]">{name}</span>
                                </div>
                                <div className="flex items-center border-l-2 border-[var(--neo-ink)] pl-2 gap-1">
                                  <button type="button" onClick={(e) => openEditCategory(c, e)} className="p-2 text-[var(--neo-ink)] bg-[var(--neo-sky)] border-2 border-[var(--neo-ink)] shadow-[2px_2px_0_var(--neo-ink)] rounded-[8px] transition-colors"><Pencil className="w-4 h-4" /></button>
                                  <button type="button" onClick={(e) => handleDeleteCustomCategory(name, e)} className="p-2 text-[var(--neo-ink)] bg-[var(--neo-peach)] border-2 border-[var(--neo-ink)] shadow-[2px_2px_0_var(--neo-ink)] rounded-[8px] transition-colors"><Trash2 className="w-4 h-4" /></button>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                    <div className="space-y-4 border-t-2 border-[var(--neo-ink)] pt-4">
                      <span className="font-black text-sm text-[var(--text-primary)] block mb-2">{editingCategoryName ? 'Edit Kategori Terpilih' : 'Buat Kategori Baru'}</span>
                      <input type="text" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} placeholder="Nama kategori..." className="w-full px-[18px] py-[14px] bg-white border-[3px] border-[var(--neo-ink)] shadow-[4px_4px_0_var(--neo-ink)] rounded-[18px] text-[14px] focus:outline-none font-[800] text-[var(--text-primary)]" />
                      <div>
                        <label className="neo-label mb-2 block">Pilih Icon</label>
                        <div className="grid grid-cols-7 gap-2">
                          {Object.keys(AVAILABLE_ICONS).map(iconKey => { const Ico = AVAILABLE_ICONS[iconKey]; const isSel = newCategoryIcon === iconKey; return (<button type="button" key={iconKey} onClick={() => setNewCategoryIcon(iconKey)} className={`flex items-center justify-center aspect-square rounded-[12px] border-2 transition-all ${isSel ? 'border-[var(--neo-ink)] bg-[var(--neo-yellow)] shadow-[2px_2px_0_var(--neo-ink)] text-[var(--neo-ink)]' : 'border-transparent bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:border-[var(--neo-ink)]'}`}><Ico className="w-5 h-5" /></button>) })}
                        </div>
                      </div>
                      <div>
                        <label className="neo-label mb-2 block">Pilih Warna</label>
                        <div className="grid grid-cols-6 gap-2">
                          {COLOR_PALETTES.map((colorSet, idx) => { const isSel = newCategoryColor === colorSet; return (<button type="button" key={idx} onClick={() => setNewCategoryColor(colorSet)} className={`w-full aspect-square rounded-full flex items-center justify-center transition-all border-2 ${isSel ? 'border-[var(--neo-ink)] scale-110 shadow-[2px_2px_0_var(--neo-ink)]' : 'border-transparent hover:scale-110'} ${colorSet}`}>{isSel && <div className="w-3 h-3 bg-current rounded-full" />}</button>) })}
                        </div>
                      </div>
                      <button type="button" onClick={handleSaveCustomCategory} className="w-full brutal-btn !py-3 !text-sm !bg-[var(--neo-sky)]">Simpan Kategori</button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Budget Indicator */}
            {budgetInfo && (
              <div className={`brutal-card-sm p-4 ${budgetInfo.isOver ? 'bg-[var(--neo-peach)]' : ''}`}>
                <div className="flex justify-between items-center mb-2">
                  <span className="neo-label">Budget {budgetInfo.budget.category}</span>
                  <span className={`text-xs font-black ${budgetInfo.isOver ? 'text-rose-600' : 'text-[var(--text-primary)]'}`}>{budgetInfo.isOver ? 'Limit Terlampaui!' : 'Dalam Batas'}</span>
                </div>
                <div className="w-full h-2 border-2 border-[var(--neo-ink)] rounded-full overflow-hidden mb-2 bg-[var(--bg-elevated)]">
                  <div className={`h-full border-r-2 border-[var(--neo-ink)] transition-all duration-500 ${budgetInfo.isOver ? 'bg-[var(--neo-pink)]' : budgetInfo.percent > 80 ? 'bg-[var(--neo-yellow-vivid)]' : 'bg-[var(--neo-sky)]'}`} style={{ width: `${budgetInfo.percent}%` }} />
                </div>
                <p className="text-xs text-center text-[var(--text-muted)]">Sisa: <strong className="text-[var(--text-primary)] font-black">Rp {budgetInfo.remaining.toLocaleString('id-ID')}</strong></p>
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="neo-label mb-1.5 block">Catatan <span className="font-normal">(Opsional)</span></label>
              <input
                type="text"
                placeholder={category ? `Contoh: ${category} Enak` : "Catatan transaksi..."}
                className="w-full px-[18px] py-[14px] bg-[var(--bg-input)] border-[3px] border-[var(--neo-ink)] shadow-[4px_4px_0_var(--neo-ink)] rounded-[18px] outline-none transition-all font-[800] text-[14px] text-[var(--text-primary)]"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={saving || isLoading}
              className={`w-full brutal-btn !py-4 !text-base ${(saving || isLoading) ? 'opacity-70 cursor-not-allowed' : ''} ${type === 'pemasukan' ? '!bg-[var(--neo-mint)]' : type === 'pengeluaran' ? '!bg-[var(--neo-peach)]' : '!bg-[var(--neo-lav)]'}`}
            >
              {saving ? 'Menyimpan...' : (editingTransaction ? 'Update Transaksi' : `Simpan ${type === 'pemasukan' ? 'Pemasukan' : type === 'pengeluaran' ? 'Pengeluaran' : 'Transfer'}`)}
            </button>

            {/* Bottom padding for safe area */}
            <div className="h-15" />
          </div>
        </form>
        )}
      </div>
    )
  }

  // ── Modal Mode (default — original behavior) ──────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={onClose} />

      {/* ===== MOBILE BOTTOM SHEET ===== */}
      <div className="md:hidden w-full rounded-t-3xl bg-white dark:bg-[var(--bg-card)] shadow-2xl z-50 relative animate-in slide-in-from-bottom-10 fade-in duration-200 h-[92vh] flex flex-col overflow-hidden">
        {/* Drag Handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 bg-slate-200 dark:bg-slate-700 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 shrink-0">
          <h3 className="font-black text-xl uppercase tracking-tighter text-[var(--text-primary)]">
            {editingTransaction ? 'Edit Transaksi' : 'Tambah Transaksi'}
          </h3>
          <button onClick={onClose} className="flex items-center justify-center p-2 rounded-xl bg-[#ffd84d] border-2 border-[#141414] shadow-[2px_2px_0_#141414] hover:-translate-y-[1px] hover:shadow-[3px_3px_0_#141414] active:translate-y-[2px] active:translate-x-[2px] active:shadow-none transition-all">
            <X className="w-5 h-5 text-[#141414]" strokeWidth={3} />
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
                onClick={() => { setType(tab.key as any); setCategory(tab.key === 'topup' ? 'Topup' : '') }}
                className={`flex-1 py-3 text-sm font-black transition-all border-b-[4px] -mb-[2px] ${type === tab.key
                  ? 'border-[var(--neo-ink)] text-[var(--neo-ink)]'
                  : 'border-transparent text-[var(--text-muted)]'
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable Content */}
        <form onSubmit={handleSaveTransaction} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto overscroll-contain">

          {/* Topup wallet selectors */}
          {type === 'topup' && (
            <div className="mx-4 mt-4 flex items-center gap-2">
              <div className="flex-1 brutal-card-sm p-3" style={{ background: 'var(--neo-sky)' }}>
                <p className="neo-label mb-1">Sumber Dana</p>
                <NeoSelect
                  value={sourceWalletId}
                  onChange={setSourceWalletId}
                  options={wallets.map(w => ({ label: w.name, value: w.id.toString(), disabled: selectedWalletId === w.id.toString() }))}
                  placeholder="Pilih Sumber"
                  className="bg-transparent font-black text-[var(--text-primary)] text-sm"
                  required
                />
              </div>
              <div className="w-8 h-8 rounded-full bg-[var(--neo-ink)] flex items-center justify-center shrink-0 shadow-[2px_2px_0_#141414]">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
              </div>
              <div className="flex-1 brutal-card-sm p-3" style={{ background: 'var(--neo-lav)' }}>
                <p className="neo-label mb-1">Tujuan Topup</p>
                <NeoSelect
                  value={selectedWalletId}
                  onChange={setSelectedWalletId}
                  options={wallets.map(w => ({ label: w.name, value: w.id.toString(), disabled: sourceWalletId === w.id.toString() }))}
                  placeholder="Pilih Tujuan"
                  className="bg-transparent font-black text-[var(--text-primary)] text-sm"
                  required
                />
              </div>
            </div>
          )}

          {/* Amount Display */}
          <div className={`mx-4 mt-4 brutal-card-sm p-5 relative overflow-hidden ${type === 'pemasukan' ? 'bg-[var(--neo-mint)]' :
            type === 'pengeluaran' ? 'bg-[var(--neo-peach)]' :
              'bg-[var(--neo-lav)]'
            }`}>
            <p className="text-[var(--text-primary)] text-[10px] font-black uppercase tracking-widest mb-2 relative z-10">{type === 'topup' ? 'Nominal Topup (RP)' : 'Jumlah (RP)'}</p>
            <div className="relative z-10 mb-1">
              <div className="flex items-center gap-2">
                <span className="text-[var(--text-primary)] font-black text-3xl shrink-0">Rp</span>
                <input
                  id="mobile-amount-input"
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  className="flex-1 bg-transparent border-none outline-none text-[var(--text-primary)] font-black text-3xl placeholder:text-[var(--text-primary)]/30 min-w-0"
                  value={amount ? parseInt(amount.replace(/\D/g, '') || '0').toLocaleString('id-ID') : ''}
                  onChange={(e) => { const raw = e.target.value.replace(/\D/g, ''); setAmount(raw) }}
                  autoFocus={!editingTransaction}
                />
              </div>
              <button type="button" onClick={() => { const raw = amount.replace(/\D/g, ''); if (!raw) { setAmount('1000') } else { setAmount(raw + '000') } }} className="mt-2 px-3 py-1 brutal-btn-ghost !py-1 !px-3 !text-[11px] bg-[var(--bg-elevated)] active:scale-95 transition-all">
                +000
              </button>
            </div>
            <div className="flex gap-2 flex-wrap mt-3 relative z-10">
              {(type === 'pengeluaran' ? [10000, 50000, 100000, 500000] : [50000, 100000, 500000, 1000000]).map(val => (
                <button key={val} type="button" onClick={() => setAmount(String((parseInt(amount.replace(/\D/g, '') || '0') + val)))} className="brutal-btn-ghost !py-1 !px-3 !text-[11px] bg-[var(--bg-elevated)] active:scale-95 transition-all">
                  +{val >= 1000000 ? `${val / 1000000}jt` : `${val / 1000}rb`}
                </button>
              ))}
            </div>
          </div>

          <div className="px-4 mt-4 space-y-4 pb-6">
            {/* Date & Wallet */}
            {type !== 'topup' ? (
              <div className="grid grid-cols-2 gap-3">
                <div className="brutal-card-sm p-3">
                  <p className="neo-label mb-1">Tanggal</p>
                  <input type="date" className="w-full bg-transparent outline-none font-black text-[var(--text-primary)] text-sm" value={customDate} onChange={(e) => setCustomDate(e.target.value)} required />
                </div>
                <div className="brutal-card-sm p-3">
                  <p className="neo-label mb-1">Dompet</p>
                  <NeoSelect
                    value={selectedWalletId}
                    onChange={setSelectedWalletId}
                    options={wallets.map(w => ({ label: w.name, value: w.id.toString() }))}
                    placeholder="Pilih"
                    className="bg-transparent font-black text-[var(--text-primary)] text-sm"
                    required
                  />
                </div>
              </div>
            ) : (
              <div className="brutal-card-sm p-3">
                <p className="neo-label mb-1">Tanggal</p>
                <input type="date" className="w-full bg-transparent outline-none font-black text-[var(--text-primary)] text-sm" value={customDate} onChange={(e) => setCustomDate(e.target.value)} required />
              </div>
            )}

            {/* Admin Fee (Topup only) */}
            {type === 'topup' && (
              <div className="brutal-card-sm p-3">
                <p className="neo-label mb-1">Biaya Admin (Opsional)</p>
                <MoneyInput value={adminFee} onChange={setAdminFee} placeholder="0" className="!bg-[var(--bg-elevated)] !border-2 !border-[var(--neo-ink)] !shadow-[2px_2px_0_var(--neo-ink)] !rounded-[12px] !font-black !text-[var(--text-primary)]" />
              </div>
            )}

            {/* Piutang Toggle */}
            {type === 'pemasukan' && (
              <div className={`p-4 brutal-card-sm transition-all duration-200 ${isPiutang ? 'bg-[var(--neo-yellow-vivid)]' : ''}`}>
                <div onClick={() => { setIsPiutang(!isPiutang); if (isPiutang) setPiutangPerson('') }} className="flex items-center justify-between cursor-pointer group select-none">
                  <div className="flex items-center gap-3">
                    <span className={`text-sm font-black transition-colors ${isPiutang ? 'text-[var(--neo-ink)]' : 'text-[var(--text-primary)]'}`}>💸 Ini adalah Piutang?</span>
                  </div>
                  <div className={`w-12 h-7 rounded-full border-2 border-[var(--neo-ink)] transition-colors duration-200 flex items-center px-0.5 shrink-0 ${isPiutang ? 'bg-white' : 'bg-[var(--bg-elevated)]'}`}>
                    <div className={`w-5 h-5 bg-[var(--neo-ink)] rounded-full transition-transform duration-200 ${isPiutang ? 'translate-x-5' : 'translate-x-0'}`} />
                  </div>
                </div>
                {isPiutang && (
                  <div className="mt-3">
                    <input type="text" placeholder="Nama peminjam (Opsional)" className="w-full px-[18px] py-[14px] bg-white border-[3px] border-[var(--neo-ink)] shadow-[4px_4px_0_var(--neo-ink)] rounded-[18px] text-[14px] focus:outline-none font-[800] text-[var(--neo-ink)]" value={piutangPerson} onChange={(e) => setPiutangPerson(e.target.value)} />
                    <p className="text-xs text-[var(--neo-ink)]/70 mt-2 font-bold">Nominal akan masuk ke saldo dompet, tapi tidak dihitung sebagai pemasukan di statistik.</p>
                  </div>
                )}
              </div>
            )}

            {/* Split Bill */}
            {type === 'pengeluaran' && (
              <div className={`p-4 brutal-card-sm transition-all duration-200 ${isSplitBill ? 'bg-[var(--neo-sky)]' : ''}`}>
                <div onClick={() => setIsSplitBill(!isSplitBill)} className="flex items-center justify-between cursor-pointer group select-none mb-3">
                  <div className="flex items-center gap-3">
                    <span className={`text-sm font-black transition-colors ${isSplitBill ? 'text-[var(--neo-ink)]' : 'text-[var(--text-primary)]'}`}>Ada yang nitip bayar? (Split Bill)</span>
                  </div>
                  <div className={`w-12 h-7 rounded-full border-2 border-[var(--neo-ink)] transition-colors duration-200 flex items-center px-0.5 shrink-0 ${isSplitBill ? 'bg-white' : 'bg-[var(--bg-elevated)]'}`}>
                    <div className={`w-5 h-5 bg-[var(--neo-ink)] rounded-full transition-transform duration-200 ${isSplitBill ? 'translate-x-5' : 'translate-x-0'}`} />
                  </div>
                </div>
                {isSplitBill && (
                  <div className="space-y-3">
                    {splitEntries.map((entry, idx) => (
                      <div key={idx} className="flex gap-2 items-start">
                        <div className="flex-1 grid grid-cols-2 gap-2">
                          <input type="text" placeholder={`Nama #${idx + 1}`} className="w-full px-[18px] py-[14px] bg-white border-[3px] border-[var(--neo-ink)] shadow-[4px_4px_0_var(--neo-ink)] rounded-[18px] text-[14px] focus:outline-none font-[800] text-[var(--neo-ink)]" value={entry.name} onChange={(e) => { const n = [...splitEntries]; n[idx].name = e.target.value; setSplitEntries(n) }} />
                          <MoneyInput placeholder="0" value={entry.amount} onChange={(val) => { const n = [...splitEntries]; n[idx].amount = val; setSplitEntries(n) }} className="!text-[14px] !px-[18px] !py-[14px] !border-[3px] !border-[var(--neo-ink)] !shadow-[4px_4px_0_var(--neo-ink)] !rounded-[18px] font-[800] text-[var(--neo-ink)] bg-white" />
                        </div>
                        {splitEntries.length > 1 && <button type="button" onClick={() => setSplitEntries(splitEntries.filter((_, i) => i !== idx))} className="p-2.5 text-[var(--neo-ink)] bg-[var(--neo-peach)] border-2 border-[var(--neo-ink)] shadow-[2px_2px_0_var(--neo-ink)] rounded-[12px] transition-colors"><Trash2 className="w-4 h-4" /></button>}
                      </div>
                    ))}
                    <button type="button" onClick={() => setSplitEntries([...splitEntries, { name: '', amount: '' }])} className="text-xs font-black text-[var(--neo-ink)] flex items-center gap-1 mt-2 p-2 bg-white border-2 border-[var(--neo-ink)] shadow-[2px_2px_0_var(--neo-ink)] rounded-[10px]"><Plus className="w-3 h-3" />Tambah Orang</button>
                  </div>
                )}
              </div>
            )}

            {/* Talangan Toggle */}
            {type === 'pengeluaran' && (
              <div className={`p-4 brutal-card-sm transition-all duration-200 ${isTalangan ? 'bg-[var(--neo-lav)]' : ''}`}>
                <div onClick={() => { setIsTalangan(!isTalangan); if (isTalangan) setTalanganPerson('') }} className="flex items-center justify-between cursor-pointer group select-none">
                  <div className="flex items-center gap-3">
                    <span className={`text-sm font-black ${isTalangan ? 'text-[var(--neo-ink)]' : 'text-[var(--text-primary)]'}`}>🤝 Ini Talangan (bayarin orang lain)?</span>
                  </div>
                  <div className={`w-12 h-7 rounded-full border-2 border-[var(--neo-ink)] transition-colors duration-200 flex items-center px-0.5 shrink-0 ${isTalangan ? 'bg-white' : 'bg-[var(--bg-elevated)]'}`}>
                    <div className={`w-5 h-5 bg-[var(--neo-ink)] rounded-full transition-transform duration-200 ${isTalangan ? 'translate-x-5' : 'translate-x-0'}`} />
                  </div>
                </div>
                {isTalangan && (
                  <div className="mt-3">
                    <input type="text" placeholder="Nama orang yang ditalangin (Opsional)" className="w-full px-[18px] py-[14px] bg-white border-[3px] border-[var(--neo-ink)] shadow-[4px_4px_0_var(--neo-ink)] rounded-[18px] text-[14px] focus:outline-none font-[800] text-[var(--neo-ink)]" value={talanganPerson} onChange={(e) => setTalanganPerson(e.target.value)} />
                    <p className="text-xs text-[var(--neo-ink)]/70 font-bold mt-2">Saldo dompet tetap berkurang, tapi tidak dihitung sebagai pengeluaran pribadi di statistik.</p>
                  </div>
                )}
              </div>
            )}

            {/* Category Picker */}
            {type !== 'topup' && (
              <div>
                <label className="neo-label block mb-2">Kategori <span className="text-rose-500">*Wajib</span></label>
                <div className="grid grid-cols-4 gap-2">
                  {allCategories.map((cat) => {
                    const isSelected = category === cat.name
                    return (
                      <button key={cat.name} type="button" onClick={() => setCategory(cat.name)} className="flex flex-col items-center justify-center group">
                        <div className={`w-14 h-14 rounded-[14px] flex items-center justify-center mb-2 border-[3px] border-[var(--neo-ink)] transition-all ${isSelected ? 'shadow-[4px_4px_0_var(--neo-ink)] scale-110 translate-y-[-2px] bg-[var(--neo-yellow-vivid)] text-[var(--neo-ink)]' : `shadow-[2px_2px_0_var(--neo-ink)] group-hover:scale-105 group-hover:translate-y-[-1px] ${cat.color} [&>svg]:!text-[var(--neo-ink)]`}`}>
                          <cat.icon className="w-6 h-6 stroke-[2.5px]" />
                        </div>
                        <span className={`text-[10px] font-black text-center leading-tight mt-1 ${isSelected ? 'text-[var(--neo-ink)]' : 'text-[var(--text-primary)]'}`}>{cat.name}</span>
                      </button>
                    )
                  })}
                  <button type="button" onClick={() => { resetCategoryForm(); setShowAddCategory(true); }} className="flex flex-col items-center justify-center group">
                    <div className="w-14 h-14 rounded-[14px] flex items-center justify-center mb-2 border-[3px] border-dashed border-[var(--neo-ink)] shadow-[2px_2px_0_var(--neo-ink)] bg-[var(--bg-elevated)] text-[var(--text-primary)] group-hover:scale-105 group-hover:translate-y-[-1px] transition-all">
                      <Plus className="w-6 h-6 stroke-[3px]" />
                    </div>
                    <span className="text-[10px] font-black text-center leading-tight mt-1 uppercase tracking-widest text-[var(--text-primary)]">Custom</span>
                  </button>
                </div>

                {showAddCategory && (
                  <div className="mt-4 p-4 rounded-[16px] bg-[var(--bg-card)] border-2 border-[var(--neo-ink)] shadow-[2px_2px_0_var(--neo-ink)]">
                    <div className="flex justify-between items-center mb-4">
                      <span className="font-black text-[var(--text-primary)]">Kelola Kategori Custom</span>
                      <button type="button" onClick={resetCategoryForm} className="flex items-center justify-center p-1.5 rounded-xl bg-[#ffd84d] border-2 border-[#141414] shadow-[2px_2px_0_#141414] hover:-translate-y-[1px] hover:shadow-[3px_3px_0_#141414] active:translate-y-[2px] active:translate-x-[2px] active:shadow-none transition-all"><X className="w-4 h-4 text-[#141414]" strokeWidth={3} /></button>
                    </div>
                    {(customCategories[type as 'pemasukan' | 'pengeluaran'] || []).length > 0 && (
                      <div className="mb-6 space-y-2">
                        <label className="neo-label mb-2 block">Pilih Untuk Edit/Hapus</label>
                        <div className="flex flex-col gap-2 max-h-40 overflow-y-auto pr-1">
                          {customCategories[type as 'pemasukan' | 'pengeluaran'].map((c, idx) => {
                            const isStr = typeof c === 'string'; const name = isStr ? c : c.name; const Ico = isStr ? Package : (AVAILABLE_ICONS[c.iconName] || Package)
                            return (
                              <div key={idx} className="flex flex-row items-center justify-between bg-white p-2.5 border-2 border-[var(--neo-ink)] shadow-[2px_2px_0_var(--neo-ink)] rounded-[12px]">
                                <div className="flex items-center gap-3">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center bg-[var(--bg-elevated)] border-2 border-[var(--neo-ink)] ${isStr ? 'text-[var(--text-secondary)]' : c.color.split(' ')[1]}`}><Ico className="w-4 h-4" /></div>
                                  <span className="text-sm font-black text-[var(--text-primary)]">{name}</span>
                                </div>
                                <div className="flex items-center border-l-2 border-[var(--neo-ink)] pl-2 gap-1">
                                  <button type="button" onClick={(e) => openEditCategory(c, e)} className="p-2 text-[var(--neo-ink)] bg-[var(--neo-sky)] border-2 border-[var(--neo-ink)] shadow-[2px_2px_0_var(--neo-ink)] rounded-[8px] transition-colors"><Pencil className="w-4 h-4" /></button>
                                  <button type="button" onClick={(e) => handleDeleteCustomCategory(name, e)} className="p-2 text-[var(--neo-ink)] bg-[var(--neo-peach)] border-2 border-[var(--neo-ink)] shadow-[2px_2px_0_var(--neo-ink)] rounded-[8px] transition-colors"><Trash2 className="w-4 h-4" /></button>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                    <div className="space-y-4 border-t-2 border-[var(--neo-ink)] pt-4">
                      <span className="font-black text-sm text-[var(--text-primary)] block mb-2">{editingCategoryName ? 'Edit Kategori Terpilih' : 'Buat Kategori Baru'}</span>
                      <input type="text" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} placeholder="Nama kategori..." className="w-full px-[18px] py-[14px] bg-white border-[3px] border-[var(--neo-ink)] shadow-[4px_4px_0_var(--neo-ink)] rounded-[18px] text-[14px] focus:outline-none font-[800] text-[var(--neo-ink)]" />
                      <div>
                        <label className="neo-label mb-2 block">Pilih Icon</label>
                        <div className="grid grid-cols-7 gap-2">
                          {Object.keys(AVAILABLE_ICONS).map(iconKey => { const Ico = AVAILABLE_ICONS[iconKey]; const isSel = newCategoryIcon === iconKey; return (<button type="button" key={iconKey} onClick={() => setNewCategoryIcon(iconKey)} className={`flex items-center justify-center aspect-square rounded-[12px] border-2 transition-all ${isSel ? 'border-[var(--neo-ink)] bg-[var(--neo-yellow)] shadow-[2px_2px_0_var(--neo-ink)] text-[var(--neo-ink)]' : 'border-transparent bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:border-[var(--neo-ink)]'}`}><Ico className="w-5 h-5" /></button>) })}
                        </div>
                      </div>
                      <div>
                        <label className="neo-label mb-2 block">Pilih Warna</label>
                        <div className="grid grid-cols-6 gap-2">
                          {COLOR_PALETTES.map((colorSet, idx) => { const isSel = newCategoryColor === colorSet; return (<button type="button" key={idx} onClick={() => setNewCategoryColor(colorSet)} className={`w-full aspect-square rounded-full flex items-center justify-center transition-all border-2 ${isSel ? 'border-[var(--neo-ink)] scale-110 shadow-[2px_2px_0_var(--neo-ink)]' : 'border-transparent hover:scale-110'} ${colorSet}`}>{isSel && <div className="w-3 h-3 bg-current rounded-full" />}</button>) })}
                        </div>
                      </div>
                      <button type="button" onClick={handleSaveCustomCategory} className="w-full brutal-btn !py-3 !text-sm !bg-[var(--neo-sky)]">Simpan Kategori</button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Budget Indicator */}
            {budgetInfo && (
              <div className={`brutal-card-sm p-4 ${budgetInfo.isOver ? 'bg-[var(--neo-peach)]' : ''}`}>
                <div className="flex justify-between items-center mb-2">
                  <span className="neo-label">Budget {budgetInfo.budget.category}</span>
                  <span className={`text-xs font-black ${budgetInfo.isOver ? 'text-rose-600' : 'text-[var(--text-primary)]'}`}>{budgetInfo.isOver ? 'Limit Terlampaui!' : 'Dalam Batas'}</span>
                </div>
                <div className="w-full h-2 border-2 border-[var(--neo-ink)] rounded-full overflow-hidden mb-2 bg-[var(--bg-elevated)]">
                  <div className={`h-full border-r-2 border-[var(--neo-ink)] transition-all duration-500 ${budgetInfo.isOver ? 'bg-[var(--neo-pink)]' : budgetInfo.percent > 80 ? 'bg-[var(--neo-yellow-vivid)]' : 'bg-[var(--neo-sky)]'}`} style={{ width: `${budgetInfo.percent}%` }} />
                </div>
                <p className="text-xs text-center text-[var(--text-muted)]">Sisa: <strong className="text-[var(--text-primary)] font-black">Rp {budgetInfo.remaining.toLocaleString('id-ID')}</strong></p>
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="neo-label mb-1.5 block">Catatan <span className="font-normal">(Opsional)</span></label>
              <input
                type="text"
                placeholder={category ? `Contoh: ${category} Enak` : "Catatan transaksi..."}
                className="w-full px-[18px] py-[14px] bg-[var(--bg-input)] border-[3px] border-[var(--neo-ink)] shadow-[4px_4px_0_var(--neo-ink)] rounded-[18px] outline-none transition-all font-[800] text-[14px] text-[var(--text-primary)]"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

          </div>
        </div>

          {/* Sticky Submit Footer — outside scroll area, always above bottom nav */}
          <div className="shrink-0 px-4 pt-4 pb-24 bg-[var(--bg-card)] border-t-[4px] border-[var(--neo-ink)]">
            <button
              type="submit"
              disabled={saving}
              className={`w-full brutal-btn !py-4 !text-base ${(saving) ? 'opacity-70 cursor-not-allowed' : ''} ${type === 'pemasukan' ? '!bg-[var(--neo-mint)]' : type === 'pengeluaran' ? '!bg-[var(--neo-peach)]' : '!bg-[var(--neo-lav)]'}`}
            >
              {saving && <div className="w-5 h-5 border-2 border-[var(--neo-ink)] border-t-transparent rounded-full animate-spin" />}
              {saving ? 'Menyimpan...' : (editingTransaction ? 'Update Transaksi' : `Simpan ${type === 'pemasukan' ? 'Pemasukan' : type === 'pengeluaran' ? 'Pengeluaran' : 'Topup'}`)}
            </button>
          </div>
        </form>
      </div>

      {/* ===== DESKTOP MODAL ===== */}
      <div className="hidden md:block w-full max-w-2xl brutal-card bg-[var(--bg-card)] z-50 relative animate-in zoom-in-95 fade-in duration-200 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-[var(--bg-card)] border-b-4 border-[var(--neo-ink)] shadow-[0_4px_0_var(--neo-ink)] px-6 pt-6 pb-4 z-10 mb-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-black text-[var(--text-primary)]">
              {editingTransaction ? '✏️ Edit Transaksi' : '➕ Tambah Transaksi'}
            </h3>
            <button onClick={onClose} className="flex items-center justify-center p-2 rounded-xl bg-[#ffd84d] border-2 border-[#141414] shadow-[2px_2px_0_#141414] hover:-translate-y-[1px] hover:shadow-[3px_3px_0_#141414] active:translate-y-[2px] active:translate-x-[2px] active:shadow-none transition-all"><X className="w-5 h-5 text-[#141414]" strokeWidth={3} /></button>
          </div>
        </div>

        <form onSubmit={handleSaveTransaction} className="p-6 pt-2 space-y-5">
          {/* Type Tabs */}
          <div className="flex bg-[var(--bg-elevated)] p-1.5 rounded-[16px] border-2 border-[var(--neo-ink)] shadow-[2px_2px_0_var(--neo-ink)] gap-1">
            <button type="button" onClick={() => { setType('pemasukan'); setCategory(''); }} className={`flex-1 py-3 px-1 rounded-[12px] text-xs font-black transition-all border-2 ${type === 'pemasukan' ? 'border-[var(--neo-ink)] bg-[var(--neo-mint)] shadow-[2px_2px_0_var(--neo-ink)]' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'}`}>Pemasukan</button>
            <button type="button" onClick={() => { setType('pengeluaran'); setCategory(''); }} className={`flex-1 py-3 px-1 rounded-[12px] text-xs font-black transition-all border-2 ${type === 'pengeluaran' ? 'border-[var(--neo-ink)] bg-[var(--neo-peach)] shadow-[2px_2px_0_var(--neo-ink)]' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'}`}>Pengeluaran</button>
            <button type="button" onClick={() => { setType('topup'); setCategory('Topup'); }} className={`flex-1 py-3 px-1 rounded-[12px] text-xs font-black transition-all border-2 ${type === 'topup' ? 'border-[var(--neo-ink)] bg-[var(--neo-lav)] shadow-[2px_2px_0_var(--neo-ink)]' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'}`}>Topup</button>
          </div>

          {/* Date & Wallet Grid */}
          <div className={`grid gap-4 ${type === 'topup' ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-2'}`}>
            <div className={type === 'topup' ? 'md:col-span-1' : ''}>
              <label className="neo-label mb-2 block">Tanggal</label>
              <input type="date" className="w-full p-3 bg-[var(--bg-input)] border-2 border-[var(--neo-ink)] shadow-[2px_2px_0_var(--neo-ink)] rounded-[12px] outline-none font-black text-[var(--text-primary)]" value={customDate} onChange={(e) => setCustomDate(e.target.value)} required />
            </div>
            {type === 'topup' ? (
              <>
                <div className="brutal-card-sm p-3 bg-[var(--neo-sky)]">
                  <label className="neo-label mb-1">Sumber Dana</label>
                  <NeoSelect
                    value={sourceWalletId}
                    onChange={setSourceWalletId}
                    options={wallets.map(w => ({ label: w.name, value: w.id.toString(), disabled: selectedWalletId === w.id.toString() }))}
                    placeholder="Pilih Sumber"
                    className="bg-transparent font-black text-[var(--text-primary)] text-sm"
                    required
                  />
                </div>
                <div className="brutal-card-sm p-3 bg-[var(--neo-lav)]">
                  <label className="neo-label mb-1">Tujuan Topup</label>
                  <NeoSelect
                    value={selectedWalletId}
                    onChange={setSelectedWalletId}
                    options={wallets.map(w => ({ label: w.name, value: w.id.toString(), disabled: sourceWalletId === w.id.toString() }))}
                    placeholder="Pilih Tujuan"
                    className="bg-transparent font-black text-[var(--text-primary)] text-sm"
                    required
                  />
                </div>
              </>
            ) : (
              <div>
                <label className="neo-label mb-2 block">Dompet</label>
                <NeoSelect
                  value={selectedWalletId}
                  onChange={setSelectedWalletId}
                  options={wallets.map(w => ({ label: `${w.name} (Rp ${w.balance.toLocaleString('id-ID')})`, value: w.id.toString() }))}
                  placeholder="Pilih Dompet"
                  className="p-3 bg-[var(--bg-input)] border-2 border-[var(--neo-ink)] shadow-[2px_2px_0_var(--neo-ink)] rounded-[12px] font-black text-[var(--text-primary)]"
                  required
                />
              </div>
            )}
          </div>

          {/* Amount Input */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="neo-label mb-2 block">{type === 'topup' ? 'Nominal Topup (Rp)' : 'Jumlah (Rp)'}</label>
              <MoneyInput value={amount} onChange={setAmount} autoFocus={!editingTransaction} className="!bg-[var(--bg-input)] !border-2 !border-[var(--neo-ink)] !shadow-[2px_2px_0_var(--neo-ink)] !rounded-[12px] !font-black !text-[var(--text-primary)] !p-3" />
            </div>
            {type === 'topup' && (
              <div>
                <label className="neo-label mb-2 block">Biaya Admin (Opsional)</label>
                <MoneyInput value={adminFee} onChange={setAdminFee} placeholder="0" className="!bg-[var(--bg-input)] !border-2 !border-[var(--neo-ink)] !shadow-[2px_2px_0_var(--neo-ink)] !rounded-[12px] !font-black !text-[var(--text-primary)] !p-3" />
              </div>
            )}
          </div>

          {/* Piutang */}
          {type === 'pemasukan' && (
            <div className={`p-4 brutal-card-sm transition-all duration-200 ${isPiutang ? 'bg-[var(--neo-yellow-vivid)]' : ''}`}>
              <div onClick={() => { setIsPiutang(!isPiutang); if (isPiutang) setPiutangPerson('') }} className="flex items-center justify-between cursor-pointer select-none">
                <div className="flex items-center gap-3">
                  <span className={`text-sm font-black transition-colors ${isPiutang ? 'text-[var(--neo-ink)]' : 'text-[var(--text-primary)]'}`}>💸 Ini adalah Piutang?</span>
                </div>
                <div className={`w-12 h-7 rounded-full border-2 border-[var(--neo-ink)] transition-colors duration-200 flex items-center px-0.5 shrink-0 ${isPiutang ? 'bg-white' : 'bg-[var(--bg-elevated)]'}`}>
                  <div className={`w-5 h-5 bg-[var(--neo-ink)] rounded-full transition-transform duration-200 ${isPiutang ? 'translate-x-5' : 'translate-x-0'}`} />
                </div>
              </div>
              {isPiutang && (
                <div className="mt-3">
                  <input type="text" placeholder="Nama peminjam (Opsional)" className="w-full p-2.5 bg-white border-2 border-[var(--neo-ink)] shadow-[2px_2px_0_var(--neo-ink)] rounded-[12px] text-base focus:outline-none font-black text-[var(--neo-ink)]" value={piutangPerson} onChange={(e) => setPiutangPerson(e.target.value)} />
                  <p className="text-xs text-[var(--neo-ink)]/70 mt-2 font-bold">Nominal akan masuk ke saldo dompet, tapi tidak dihitung sebagai pemasukan di statistik.</p>
                </div>
              )}
            </div>
          )}

          {/* Split Bill */}
          {type === 'pengeluaran' && (
            <div className={`p-4 brutal-card-sm transition-all duration-200 ${isSplitBill ? 'bg-[var(--neo-sky)]' : ''}`}>
              <div onClick={() => setIsSplitBill(!isSplitBill)} className="flex items-center justify-between cursor-pointer select-none mb-3">
                <div className="flex items-center gap-3">
                  <span className={`text-sm font-black transition-colors ${isSplitBill ? 'text-[var(--neo-ink)]' : 'text-[var(--text-primary)]'}`}>Ada yang nitip bayar? (Split Bill)</span>
                </div>
                <div className={`w-12 h-7 rounded-full border-2 border-[var(--neo-ink)] transition-colors duration-200 flex items-center px-0.5 shrink-0 ${isSplitBill ? 'bg-white' : 'bg-[var(--bg-elevated)]'}`}>
                  <div className={`w-5 h-5 bg-[var(--neo-ink)] rounded-full transition-transform duration-200 ${isSplitBill ? 'translate-x-5' : 'translate-x-0'}`} />
                </div>
              </div>
              {isSplitBill && (
                <div className="space-y-3">
                  {splitEntries.map((entry, idx) => (
                    <div key={idx} className="flex gap-2 items-start">
                      <div className="flex-1 grid grid-cols-2 gap-2">
                        <input type="text" placeholder={`Nama Teman #${idx + 1}`} className="w-full p-2.5 bg-white border-2 border-[var(--neo-ink)] shadow-[2px_2px_0_var(--neo-ink)] rounded-[12px] text-base focus:outline-none font-black text-[var(--neo-ink)]" value={entry.name} onChange={(e) => { const n = [...splitEntries]; n[idx].name = e.target.value; setSplitEntries(n) }} />
                        <MoneyInput placeholder="0" value={entry.amount} onChange={(val) => { const n = [...splitEntries]; n[idx].amount = val; setSplitEntries(n) }} className="!text-sm !p-3 !border-2 !border-[var(--neo-ink)] !shadow-[2px_2px_0_var(--neo-ink)] !rounded-[12px] font-black text-[var(--neo-ink)] bg-white" />
                      </div>
                      {splitEntries.length > 1 && <button type="button" onClick={() => setSplitEntries(splitEntries.filter((_, i) => i !== idx))} className="p-2.5 text-[var(--neo-ink)] bg-[var(--neo-peach)] border-2 border-[var(--neo-ink)] shadow-[2px_2px_0_var(--neo-ink)] rounded-[12px] transition-colors"><Trash2 className="w-4 h-4" /></button>}
                    </div>
                  ))}
                  <button type="button" onClick={() => setSplitEntries([...splitEntries, { name: '', amount: '' }])} className="text-xs font-black text-[var(--neo-ink)] flex items-center gap-1 mt-2 p-2 bg-white border-2 border-[var(--neo-ink)] shadow-[2px_2px_0_var(--neo-ink)] rounded-[10px]"><Plus className="w-3 h-3" />Tambah Orang</button>
                  <div className="bg-[var(--neo-yellow)] border-2 border-[var(--neo-ink)] shadow-[2px_2px_0_var(--neo-ink)] p-3 rounded-[12px] mt-2">
                    <p className="text-xs text-[var(--neo-ink)] font-bold">Total pengeluaran: <strong>Rp {parseInt(amount || '0').toLocaleString('id-ID')}</strong> | Sisa (bagian Anda): <strong>Rp {Math.max(0, parseInt(amount || '0') - splitEntries.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0)).toLocaleString('id-ID')}</strong></p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Talangan */}
          {type === 'pengeluaran' && (
            <div className={`p-4 brutal-card-sm transition-all duration-200 ${isTalangan ? 'bg-[var(--neo-lav)]' : ''}`}>
              <div onClick={() => { setIsTalangan(!isTalangan); if (isTalangan) setTalanganPerson('') }} className="flex items-center justify-between cursor-pointer select-none">
                <div className="flex items-center gap-3">
                  <span className={`text-sm font-black ${isTalangan ? 'text-[var(--neo-ink)]' : 'text-[var(--text-primary)]'}`}>🤝 Ini Talangan (bayarin orang lain)?</span>
                </div>
                <div className={`w-12 h-7 rounded-full border-2 border-[var(--neo-ink)] transition-colors duration-200 flex items-center px-0.5 shrink-0 ${isTalangan ? 'bg-white' : 'bg-[var(--bg-elevated)]'}`}>
                  <div className={`w-5 h-5 bg-[var(--neo-ink)] rounded-full transition-transform duration-200 ${isTalangan ? 'translate-x-5' : 'translate-x-0'}`} />
                </div>
              </div>
              {isTalangan && (
                <div className="mt-3">
                  <input type="text" placeholder="Nama orang yang ditalangin (Opsional)" className="w-full p-2.5 bg-white border-2 border-[var(--neo-ink)] shadow-[2px_2px_0_var(--neo-ink)] rounded-[12px] text-base focus:outline-none font-black text-[var(--neo-ink)]" value={talanganPerson} onChange={(e) => setTalanganPerson(e.target.value)} />
                  <p className="text-xs text-[var(--neo-ink)]/70 font-bold mt-2">Saldo dompet tetap berkurang, tapi tidak dihitung sebagai pengeluaran pribadi di statistik.</p>
                </div>
              )}
            </div>
          )}

          {/* Category Picker (desktop) */}
          {type !== 'topup' && (
            <div>
              <label className="neo-label mb-2 block">Kategori <span className="text-rose-500 font-normal text-xs">*Wajib</span></label>
              <div className="grid grid-cols-4 gap-3">
                {allCategories.map((cat) => {
                  const isSelected = category === cat.name
                  return (
                    <button key={cat.name} type="button" onClick={() => setCategory(cat.name)} className="flex flex-col items-center justify-center group">
                      <div className={`w-14 h-14 rounded-[14px] flex items-center justify-center mb-2 border-[3px] border-[var(--neo-ink)] transition-all ${isSelected ? 'shadow-[4px_4px_0_var(--neo-ink)] scale-110 translate-y-[-2px] bg-[var(--neo-yellow-vivid)] text-[var(--neo-ink)]' : `shadow-[2px_2px_0_var(--neo-ink)] group-hover:scale-105 group-hover:translate-y-[-1px] ${cat.color} [&>svg]:!text-[var(--neo-ink)]`}`}>
                        <cat.icon className="w-6 h-6 stroke-[2.5px]" />
                      </div>
                      <span className={`text-[10px] font-black text-center leading-tight mt-1 ${isSelected ? 'text-[var(--neo-ink)]' : 'text-[var(--text-primary)]'}`}>{cat.name}</span>
                    </button>
                  )
                })}
                <button type="button" onClick={() => { resetCategoryForm(); setShowAddCategory(true); }} className="flex flex-col items-center justify-center group relative">
                  <div className="w-14 h-14 rounded-[14px] flex items-center justify-center mb-2 border-[3px] border-dashed border-[var(--neo-ink)] shadow-[2px_2px_0_var(--neo-ink)] bg-[var(--bg-elevated)] text-[var(--text-primary)] group-hover:scale-105 group-hover:translate-y-[-1px] transition-all">
                    <Plus className="w-6 h-6 stroke-[3px]" />
                  </div>
                  <span className="text-[10px] font-black text-center leading-tight mt-1 uppercase tracking-widest text-[var(--text-primary)]">Custom</span>
                </button>
              </div>
              {showAddCategory && (
                <div className="mt-4 p-4 rounded-[16px] bg-[var(--bg-card)] border-2 border-[var(--neo-ink)] shadow-[2px_2px_0_var(--neo-ink)]">
                  <div className="flex justify-between items-center mb-4">
                    <span className="font-black text-[var(--text-primary)]">Kelola Kategori Custom</span>
                    <button type="button" onClick={resetCategoryForm} className="flex items-center justify-center p-1.5 rounded-xl bg-[#ffd84d] border-2 border-[#141414] shadow-[2px_2px_0_#141414] hover:-translate-y-[1px] hover:shadow-[3px_3px_0_#141414] active:translate-y-[2px] active:translate-x-[2px] active:shadow-none transition-all"><X className="w-4 h-4 text-[#141414]" strokeWidth={3} /></button>
                  </div>
                  {(customCategories[type as 'pemasukan' | 'pengeluaran'] || []).length > 0 && (
                    <div className="mb-6 space-y-2">
                      <label className="neo-label mb-2 block">Pilih Untuk Edit/Hapus</label>
                      <div className="flex flex-col gap-2 max-h-40 overflow-y-auto pr-1">
                        {customCategories[type as 'pemasukan' | 'pengeluaran'].map((c, idx) => {
                          const isStr = typeof c === 'string'; const name = isStr ? c : c.name; const Ico = isStr ? Package : (AVAILABLE_ICONS[c.iconName] || Package)
                          return (
                            <div key={idx} className="flex flex-row items-center justify-between bg-white p-2.5 border-2 border-[var(--neo-ink)] shadow-[2px_2px_0_var(--neo-ink)] rounded-[12px]">
                              <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center bg-[var(--bg-elevated)] border-2 border-[var(--neo-ink)] ${isStr ? 'text-[var(--text-secondary)]' : c.color.split(' ')[1]}`}><Ico className="w-4 h-4" /></div>
                                <span className="text-sm font-black text-[var(--text-primary)]">{name}</span>
                              </div>
                              <div className="flex items-center border-l-2 border-[var(--neo-ink)] pl-2 gap-1">
                                <button type="button" onClick={(e) => openEditCategory(c, e)} className="p-2 text-[var(--neo-ink)] bg-[var(--neo-sky)] border-2 border-[var(--neo-ink)] shadow-[2px_2px_0_var(--neo-ink)] rounded-[8px] transition-colors"><Pencil className="w-4 h-4" /></button>
                                <button type="button" onClick={(e) => handleDeleteCustomCategory(name, e)} className="p-2 text-[var(--neo-ink)] bg-[var(--neo-peach)] border-2 border-[var(--neo-ink)] shadow-[2px_2px_0_var(--neo-ink)] rounded-[8px] transition-colors"><Trash2 className="w-4 h-4" /></button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                  <div className="space-y-4 border-t-2 border-[var(--neo-ink)] pt-4">
                    <span className="font-black text-sm text-[var(--text-primary)] block mb-2">{editingCategoryName ? 'Edit Kategori Terpilih' : 'Buat Kategori Baru'}</span>
                    <input type="text" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} placeholder="Nama kategori..." className="w-full p-3 bg-white border-2 border-[var(--neo-ink)] shadow-[2px_2px_0_var(--neo-ink)] rounded-[12px] text-base focus:outline-none font-black text-[var(--text-primary)]" />
                    <div>
                      <label className="neo-label mb-2 block">Pilih Icon</label>
                      <div className="grid grid-cols-7 gap-2">
                        {Object.keys(AVAILABLE_ICONS).map(iconKey => { const Ico = AVAILABLE_ICONS[iconKey]; const isSelected = newCategoryIcon === iconKey; return (<button type="button" key={iconKey} onClick={() => setNewCategoryIcon(iconKey)} className={`flex items-center justify-center aspect-square rounded-[12px] border-2 transition-all ${isSelected ? 'border-[var(--neo-ink)] bg-[var(--neo-yellow)] shadow-[2px_2px_0_var(--neo-ink)] text-[var(--neo-ink)]' : 'border-transparent bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:border-[var(--neo-ink)]'}`}><Ico className="w-5 h-5" /></button>) })}
                      </div>
                    </div>
                    <div>
                      <label className="neo-label mb-2 block">Pilih Warna</label>
                      <div className="grid grid-cols-6 gap-2">
                        {COLOR_PALETTES.map((colorSet, idx) => { const isSelected = newCategoryColor === colorSet; return (<button type="button" key={idx} onClick={() => setNewCategoryColor(colorSet)} className={`w-full aspect-square rounded-full flex items-center justify-center transition-all border-2 ${isSelected ? 'border-[var(--neo-ink)] scale-110 shadow-[2px_2px_0_var(--neo-ink)]' : 'border-transparent hover:scale-110'} ${colorSet}`}>{isSelected && <div className="w-3 h-3 bg-current rounded-full" />}</button>) })}
                      </div>
                    </div>
                    <div className="flex gap-2 pt-2 border-t-2 border-[var(--neo-ink)]">
                      <button type="button" onClick={handleSaveCustomCategory} className="flex-1 brutal-btn !py-3 !text-sm !bg-[var(--neo-sky)]">Simpan Kategori</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Budget Awareness */}
          {budgetInfo && (
            <div className={`brutal-card-sm p-4 ${budgetInfo.isOver ? 'bg-[var(--neo-peach)]' : ''}`}>
              <div className="flex justify-between items-center mb-2">
                <span className="neo-label">Budget {budgetInfo.budget.category}</span>
                <span className={`text-xs font-black ${budgetInfo.isOver ? 'text-rose-600' : 'text-[var(--text-primary)]'}`}>{budgetInfo.isOver ? 'Limit Terlampaui!' : 'Dalam Batas'}</span>
              </div>
              <div className="flex justify-between items-end mb-2">
                <div className="flex flex-col"><span className="text-xs text-[var(--text-muted)] font-bold">Terpakai + Baru</span><span className="font-black text-[var(--text-primary)]">Rp {budgetInfo.totalProjected.toLocaleString('id-ID')}</span></div>
                <div className="flex flex-col items-end"><span className="text-xs text-[var(--text-muted)] font-bold">Total Budget</span><span className="font-black text-[var(--text-primary)]">Rp {budgetInfo.budget.amount.toLocaleString('id-ID')}</span></div>
              </div>
              <div className="w-full h-2 border-2 border-[var(--neo-ink)] rounded-full overflow-hidden mb-2 bg-[var(--bg-elevated)]">
                <div className={`h-full border-r-2 border-[var(--neo-ink)] transition-all duration-500 ${budgetInfo.isOver ? 'bg-[var(--neo-pink)]' : budgetInfo.percent > 80 ? 'bg-[var(--neo-yellow-vivid)]' : 'bg-[var(--neo-sky)]'}`} style={{ width: `${budgetInfo.percent}%` }} />
              </div>
              {budgetInfo.isOver ? (
                <div className="flex items-start gap-2 text-[var(--neo-ink)] text-xs font-bold mt-2 bg-white border-2 border-[var(--neo-ink)] shadow-[2px_2px_0_var(--neo-ink)] p-2 rounded-[12px]"><AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" /><p>Awas! Transaksi ini akan membuat budget minus <strong>Rp {Math.abs(budgetInfo.remaining).toLocaleString('id-ID')}</strong>.</p></div>
              ) : (
                <p className="text-xs text-center text-[var(--text-muted)] font-bold">Sisa budget setelah transaksi ini: <strong>Rp {budgetInfo.remaining.toLocaleString('id-ID')}</strong></p>
              )}
            </div>
          )}

          {/* Title/Notes */}
          <div>
            <label className="neo-label mb-2 block">Catatan <span className="text-[var(--text-muted)] font-normal text-xs">(Opsional)</span></label>
            <input
              type="text"
              placeholder={category ? `Contoh: ${category} Enak` : "Catatan Transaksi"}
              className="w-full p-4 bg-[var(--bg-input)] border-2 border-[var(--neo-ink)] shadow-[2px_2px_0_var(--neo-ink)] rounded-[16px] outline-none transition-all font-black text-base text-[var(--text-primary)]"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <button type="submit" disabled={saving} className={`w-full brutal-btn !py-4 !text-base ${(saving) ? 'opacity-70 cursor-not-allowed' : ''} ${type === 'pemasukan' ? '!bg-[var(--neo-mint)]' : type === 'pengeluaran' ? '!bg-[var(--neo-peach)]' : '!bg-[var(--neo-lav)]'}`}>
            {saving && <div className="w-5 h-5 border-2 border-[var(--neo-ink)] border-t-transparent rounded-full animate-spin" />}
            {saving ? 'Menyimpan...' : (editingTransaction ? 'Update Transaksi' : 'Simpan Transaksi')}
          </button>
        </form>
      </div>
    </div>
  )
}

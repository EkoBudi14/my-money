'use client'
import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/useToast'
import { useConfirm } from '@/hooks/useConfirm'
import { useSuccessModal } from '@/hooks/useSuccessModal'
import MoneyInput from '@/components/MoneyInput'
import { Wallet, Transaction, Budget, CustomCategoryDef } from '@/types'
import {
  Plus, Trash2, X, Package, Pencil, Info, AlertTriangle,
  ShoppingBag, Utensils, Car, Zap, Home, Film, HeartPulse,
  CreditCard, Gift, Briefcase, TrendingUp, Landmark, Coffee,
  Plane, Gamepad2, Tv, Smartphone, Book, Scissors, Music,
  Shirt, Smile, Globe, Dumbbell, GraduationCap
} from 'lucide-react'

// ── Constants (duplicated from page.tsx to keep component self-contained) ──────
const AVAILABLE_ICONS: Record<string, any> = {
  Home, ShoppingBag, Utensils, Car, Zap, Package, HeartPulse, CreditCard, Film, Gift,
  Briefcase, TrendingUp, Landmark, Coffee, Plane, Gamepad2, Tv, Smartphone, Book,
  Scissors, Music, Shirt, Smile, Globe, Dumbbell, GraduationCap
}

const COLOR_PALETTES = [
  'bg-emerald-100 text-emerald-600', 'bg-rose-100 text-rose-600',
  'bg-blue-100 text-blue-600', 'bg-teal-100 text-teal-600',
  'bg-yellow-100 text-yellow-600', 'bg-purple-100 text-purple-600',
  'bg-red-100 text-red-600', 'bg-stone-100 text-stone-600',
  'bg-pink-100 text-pink-600', 'bg-indigo-100 text-indigo-600',
  'bg-amber-100 text-amber-600', 'bg-slate-100 text-slate-600'
]

const CATEGORIES = {
  pengeluaran: [
    { name: 'Kebutuhan Dapur', icon: ShoppingBag, color: 'bg-orange-100 text-orange-600' },
    { name: 'Makan di Luar', icon: Utensils, color: 'bg-rose-100 text-rose-600' },
    { name: 'Transportasi', icon: Car, color: 'bg-blue-100 text-blue-600' },
    { name: 'Tempat Tinggal', icon: Home, color: 'bg-teal-100 text-teal-600' },
    { name: 'Tagihan', icon: Zap, color: 'bg-yellow-100 text-yellow-600' },
    { name: 'Belanja', icon: Package, color: 'bg-purple-100 text-purple-600' },
    { name: 'Kesehatan', icon: HeartPulse, color: 'bg-red-100 text-red-600' },
    { name: 'Cicilan & Utang', icon: CreditCard, color: 'bg-stone-100 text-stone-600' },
    { name: 'Pribadi & Hiburan', icon: Film, color: 'bg-pink-100 text-pink-600' },
    { name: 'Edukasi & Donasi', icon: Gift, color: 'bg-indigo-100 text-indigo-600' },
    { name: 'Lainnya', icon: Package, color: 'bg-slate-100 text-slate-600' },
  ],
  pemasukan: [
    { name: 'Gaji', icon: Briefcase, color: 'bg-emerald-100 text-emerald-600' },
    { name: 'Bonus & Hadiah', icon: Gift, color: 'bg-pink-100 text-pink-600' },
    { name: 'Investasi', icon: TrendingUp, color: 'bg-indigo-100 text-indigo-600' },
    { name: 'Penjualan', icon: TrendingUp, color: 'bg-amber-100 text-amber-600' },
    { name: 'Lainnya', icon: Landmark, color: 'bg-slate-100 text-slate-600' },
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
  customCategories, onClose, onSaved, onCustomCategoriesChange
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
      setCategory('')
      setType('pemasukan')
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

  if (!isOpen) return null

  // ── All category options combined ─────────────────────────────────────────
  const allCategories = type !== 'topup' ? [
    ...(CATEGORIES[type as 'pemasukan' | 'pengeluaran'].map(c => ({ ...c, isCustom: false }))),
    ...(customCategories[type as 'pemasukan' | 'pengeluaran'] || []).map(c => {
      if (typeof c === 'string') return { name: c, color: 'bg-slate-100 text-slate-600', icon: Package, isCustom: true, originalObj: c }
      return { name: c.name, color: c.color, icon: AVAILABLE_ICONS[c.iconName] || Package, isCustom: true, originalObj: c }
    })
  ] : []

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={onClose} />

      {/* ===== MOBILE BOTTOM SHEET ===== */}
      <div className="md:hidden w-full rounded-t-3xl bg-white shadow-2xl z-50 relative animate-in slide-in-from-bottom-10 fade-in duration-200 h-[92vh] flex flex-col overflow-hidden">
        {/* Drag Handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 bg-slate-200 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 shrink-0">
          <h3 className="text-lg font-bold text-[#080C1A]">
            {editingTransaction ? 'Edit Transaksi' : 'Tambah Transaksi'}
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Type Tabs */}
        <div className="px-5 shrink-0">
          <div className="flex border-b border-[#F3F4F3]">
            {[
              { key: 'pemasukan', label: 'Pemasukan' },
              { key: 'pengeluaran', label: 'Pengeluaran' },
              { key: 'topup', label: 'Topup' },
            ].map(tab => (
              <button
                key={tab.key}
                type="button"
                onClick={() => { setType(tab.key as any); setCategory(tab.key === 'topup' ? 'Topup' : '') }}
                className={`flex-1 py-2.5 text-sm font-bold transition-all border-b-2 -mb-px ${
                  type === tab.key
                    ? tab.key === 'pemasukan' ? 'border-emerald-500 text-emerald-600'
                      : tab.key === 'pengeluaran' ? 'border-rose-500 text-rose-600'
                      : 'border-violet-500 text-violet-600'
                    : 'border-transparent text-slate-400'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable Content */}
        <form onSubmit={handleSaveTransaction} className="flex-1 overflow-y-auto overscroll-contain">
          
          {/* Topup wallet selectors */}
          {type === 'topup' && (
            <div className="mx-4 mt-4 flex items-center gap-2">
              <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-3">
                <p className="text-[9px] font-bold text-[#6A7686] uppercase tracking-wider mb-1">Sumber Dana</p>
                <select className="w-full bg-transparent outline-none font-semibold text-[#080C1A] text-sm appearance-none" value={sourceWalletId} onChange={(e) => setSourceWalletId(e.target.value)} required>
                  <option value="" disabled>Pilih Sumber</option>
                  {wallets.map(w => <option key={w.id} value={w.id} disabled={selectedWalletId === w.id.toString()}>{w.name}</option>)}
                </select>
              </div>
              <div className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </div>
              <div className="flex-1 bg-violet-50 border border-violet-200 rounded-xl p-3">
                <p className="text-[9px] font-bold text-violet-500 uppercase tracking-wider mb-1">Tujuan Topup</p>
                <select className="w-full bg-transparent outline-none font-semibold text-violet-800 text-sm appearance-none" value={selectedWalletId} onChange={(e) => setSelectedWalletId(e.target.value)} required>
                  <option value="" disabled>Pilih Tujuan</option>
                  {wallets.map(w => <option key={w.id} value={w.id} disabled={sourceWalletId === w.id.toString()}>{w.name}</option>)}
                </select>
              </div>
            </div>
          )}

          {/* Amount Display */}
          <div className={`mx-4 mt-4 rounded-2xl p-5 relative overflow-hidden ${
            type === 'pemasukan' ? 'bg-gradient-to-br from-[#165DFF] to-[#0E4BD9]' :
            type === 'pengeluaran' ? 'bg-gradient-to-br from-rose-500 to-rose-700' :
            'bg-gradient-to-br from-violet-600 to-purple-700'
          }`}>
            <div className="absolute -top-6 -right-6 w-28 h-28 bg-white/5 rounded-full" />
            <div className="absolute -bottom-8 -left-4 w-36 h-36 bg-white/5 rounded-full" />
            <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest mb-2 relative z-10">{type === 'topup' ? 'Nominal Topup (RP)' : 'Jumlah (RP)'}</p>
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
                  onChange={(e) => { const raw = e.target.value.replace(/\D/g, ''); setAmount(raw) }}
                  autoFocus={!editingTransaction}
                />
              </div>
              <button type="button" onClick={() => { const raw = amount.replace(/\D/g, ''); if (!raw) { setAmount('1000') } else { setAmount(raw + '000') } }} className="mt-2 px-3 py-1 bg-white/20 hover:bg-white/30 text-white font-bold text-sm rounded-lg active:scale-95 transition-all">
                +000
              </button>
            </div>
            <div className="flex gap-2 flex-wrap mt-3 relative z-10">
              {(type === 'pengeluaran' ? [10000, 50000, 100000, 500000] : [50000, 100000, 500000, 1000000]).map(val => (
                <button key={val} type="button" onClick={() => setAmount(String((parseInt(amount.replace(/\D/g, '') || '0') + val)))} className="px-3 py-1.5 rounded-full bg-white/20 text-white text-[11px] font-bold hover:bg-white/30 active:scale-95 transition-all">
                  +{val >= 1000000 ? `${val/1000000}jt` : `${val/1000}rb`}
                </button>
              ))}
            </div>
          </div>

          <div className="px-4 mt-4 space-y-4 pb-6">
            {/* Date & Wallet */}
            {type !== 'topup' ? (
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                  <p className="text-[9px] font-bold text-[#6A7686] uppercase tracking-wider mb-1">Tanggal</p>
                  <input type="date" className="w-full bg-transparent outline-none font-semibold text-[#080C1A] text-sm" value={customDate} onChange={(e) => setCustomDate(e.target.value)} required />
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                  <p className="text-[9px] font-bold text-[#6A7686] uppercase tracking-wider mb-1">Dompet</p>
                  <select className="w-full bg-transparent outline-none font-semibold text-[#080C1A] text-sm appearance-none" value={selectedWalletId} onChange={(e) => setSelectedWalletId(e.target.value)} required>
                    <option value="" disabled>Pilih</option>
                    {wallets.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                <p className="text-[9px] font-bold text-[#6A7686] uppercase tracking-wider mb-1">Tanggal</p>
                <input type="date" className="w-full bg-transparent outline-none font-semibold text-[#080C1A] text-sm" value={customDate} onChange={(e) => setCustomDate(e.target.value)} required />
              </div>
            )}

            {/* Admin Fee (Topup only) */}
            {type === 'topup' && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                <p className="text-[9px] font-bold text-[#6A7686] uppercase tracking-wider mb-1">Biaya Admin (Opsional)</p>
                <MoneyInput value={adminFee} onChange={setAdminFee} placeholder="0" />
              </div>
            )}

            {/* Piutang Toggle */}
            {type === 'pemasukan' && (
              <div className={`p-4 rounded-2xl border transition-all duration-200 ${isPiutang ? 'bg-amber-50/60 border-amber-200' : 'bg-slate-50 border-slate-200'}`}>
                <div onClick={() => { setIsPiutang(!isPiutang); if (isPiutang) setPiutangPerson('') }} className="flex items-center justify-between cursor-pointer group select-none">
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border-[1.5px] flex items-center justify-center transition-all ${isPiutang ? 'border-amber-500' : 'border-slate-300'}`}>
                      {isPiutang && <div className="w-2.5 h-2.5 bg-amber-500 rounded-full" />}
                    </div>
                    <span className={`text-sm font-bold transition-colors ${isPiutang ? 'text-amber-700' : 'text-slate-600'}`}>💸 Ini adalah Piutang?</span>
                  </div>
                  {isPiutang && <span className="text-[10px] uppercase font-bold text-amber-600 bg-white px-2 py-1 rounded-lg shadow-sm border border-amber-100">Aktif</span>}
                </div>
                {isPiutang && (
                  <div className="mt-3">
                    <input type="text" placeholder="Nama peminjam (Opsional)" className="w-full p-2.5 bg-white border border-amber-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-400 outline-none font-medium" value={piutangPerson} onChange={(e) => setPiutangPerson(e.target.value)} />
                    <p className="text-xs text-amber-600 mt-2 flex items-start gap-1.5"><Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />Nominal akan masuk ke saldo dompet, tapi <strong>tidak dihitung</strong> sebagai pemasukan di statistik.</p>
                  </div>
                )}
              </div>
            )}

            {/* Split Bill */}
            {type === 'pengeluaran' && (
              <div className={`p-4 rounded-2xl border transition-all duration-200 ${isSplitBill ? 'bg-blue-50/50 border-blue-200' : 'bg-slate-50 border-slate-200'}`}>
                <div onClick={() => setIsSplitBill(!isSplitBill)} className="flex items-center justify-between cursor-pointer group select-none mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border-[1.5px] flex items-center justify-center transition-all ${isSplitBill ? 'border-[#165DFF]' : 'border-slate-300'}`}>
                      {isSplitBill && <div className="w-2.5 h-2.5 bg-[#165DFF] rounded-full" />}
                    </div>
                    <span className={`text-sm font-bold transition-colors ${isSplitBill ? 'text-[#165DFF]' : 'text-slate-600'}`}>Ada yang nitip bayar? (Split Bill)</span>
                  </div>
                  {isSplitBill && <span className="text-[10px] uppercase font-bold text-[#165DFF] bg-white px-2 py-1 rounded-lg shadow-sm border border-blue-100">Aktif</span>}
                </div>
                {isSplitBill && (
                  <div className="space-y-3">
                    {splitEntries.map((entry, idx) => (
                      <div key={idx} className="flex gap-2 items-start">
                        <div className="flex-1 grid grid-cols-2 gap-2">
                          <input type="text" placeholder={`Nama #${idx + 1}`} className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={entry.name} onChange={(e) => { const n = [...splitEntries]; n[idx].name = e.target.value; setSplitEntries(n) }} />
                          <MoneyInput placeholder="0" value={entry.amount} onChange={(val) => { const n = [...splitEntries]; n[idx].amount = val; setSplitEntries(n) }} className="!text-sm !p-3" />
                        </div>
                        {splitEntries.length > 1 && <button type="button" onClick={() => setSplitEntries(splitEntries.filter((_, i) => i !== idx))} className="p-2.5 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors"><Trash2 className="w-4 h-4" /></button>}
                      </div>
                    ))}
                    <button type="button" onClick={() => setSplitEntries([...splitEntries, { name: '', amount: '' }])} className="text-xs font-bold text-blue-600 flex items-center gap-1 mt-2"><Plus className="w-3 h-3" />Tambah Orang Lain</button>
                  </div>
                )}
              </div>
            )}

            {/* Talangan Toggle */}
            {type === 'pengeluaran' && (
              <div className={`p-4 rounded-2xl border transition-all duration-200 ${isTalangan ? 'bg-purple-50/60 border-purple-200' : 'bg-slate-50 border-slate-200'}`}>
                <div onClick={() => { setIsTalangan(!isTalangan); if (isTalangan) setTalanganPerson('') }} className="flex items-center justify-between cursor-pointer group select-none">
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border-[1.5px] flex items-center justify-center transition-all ${isTalangan ? 'border-purple-500' : 'border-slate-300'}`}>
                      {isTalangan && <div className="w-2.5 h-2.5 bg-purple-500 rounded-full" />}
                    </div>
                    <span className={`text-sm font-bold ${isTalangan ? 'text-purple-700' : 'text-slate-600'}`}>🤝 Ini Talangan (bayarin orang lain)?</span>
                  </div>
                  {isTalangan && <span className="text-[10px] uppercase font-bold text-purple-600 bg-white px-2 py-1 rounded-lg shadow-sm border border-purple-100">Aktif</span>}
                </div>
                {isTalangan && (
                  <div className="mt-3">
                    <input type="text" placeholder="Nama orang yang ditalangin (Opsional)" className="w-full p-2.5 bg-white border border-purple-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-400 outline-none font-medium" value={talanganPerson} onChange={(e) => setTalanganPerson(e.target.value)} />
                    <p className="text-xs text-purple-600 mt-2 flex items-start gap-1.5"><Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />Saldo dompet tetap berkurang, tapi <strong>tidak dihitung</strong> sebagai pengeluaran pribadi di statistik.</p>
                  </div>
                )}
              </div>
            )}

            {/* Category Picker */}
            {type !== 'topup' && (
              <div>
                <label className="block text-[10px] font-bold text-[#6A7686] uppercase tracking-wider mb-2">Kategori <span className="text-red-400 font-normal">*Wajib</span></label>
                <div className="grid grid-cols-4 gap-2">
                  {allCategories.map((cat) => {
                    const isSelected = category === cat.name
                    return (
                      <div key={cat.name} className="relative group">
                        <button type="button" onClick={() => setCategory(cat.name)} className={`w-full h-full flex flex-col items-center justify-center p-2.5 rounded-2xl transition-all border-2 ${isSelected ? 'border-[#165DFF] bg-blue-50' : 'border-transparent bg-slate-50 hover:bg-slate-100'}`}>
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-1.5 ${cat.color}`}><cat.icon className="w-5 h-5" /></div>
                          <span className={`text-[10px] font-bold text-center leading-tight ${isSelected ? 'text-[#165DFF]' : 'text-slate-600'}`}>{cat.name}</span>
                        </button>
                      </div>
                    )
                  })}
                  <button type="button" onClick={() => { resetCategoryForm(); setShowAddCategory(true); }} className="flex flex-col items-center justify-center p-2.5 rounded-2xl border-2 border-dashed border-slate-300 hover:border-[#165DFF] transition-all">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center mb-1.5 bg-slate-50 text-slate-400"><Plus className="w-5 h-5" /></div>
                    <span className="text-[10px] font-bold text-slate-500">Custom</span>
                  </button>
                </div>

                {showAddCategory && (
                  <div className="mt-4 p-4 rounded-2xl bg-slate-50 border border-slate-200">
                    <div className="flex justify-between items-center mb-4">
                      <span className="font-bold text-slate-700">Kelola Kategori Custom</span>
                      <button type="button" onClick={resetCategoryForm} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4"/></button>
                    </div>
                    {(customCategories[type as 'pemasukan' | 'pengeluaran'] || []).length > 0 && (
                      <div className="mb-6 space-y-2">
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Pilih Untuk Edit/Hapus</label>
                        <div className="flex flex-col gap-2 max-h-40 overflow-y-auto pr-1">
                          {customCategories[type as 'pemasukan' | 'pengeluaran'].map((c, idx) => {
                            const isStr = typeof c === 'string'; const name = isStr ? c : c.name; const Ico = isStr ? Package : (AVAILABLE_ICONS[c.iconName] || Package)
                            return (
                              <div key={idx} className="flex flex-row items-center justify-between bg-white p-2.5 border border-slate-200 rounded-xl">
                                <div className="flex items-center gap-3">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center bg-slate-50 ${isStr ? 'text-slate-500' : c.color.split(' ')[1]}`}><Ico className="w-4 h-4" /></div>
                                  <span className="text-sm font-bold text-slate-700">{name}</span>
                                </div>
                                <div className="flex items-center border-l border-slate-100 pl-2">
                                  <button type="button" onClick={(e) => openEditCategory(c, e)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Pencil className="w-4 h-4" /></button>
                                  <button type="button" onClick={(e) => handleDeleteCustomCategory(name, e)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                    <div className="space-y-4 border-t border-slate-200 pt-4">
                      <span className="font-bold text-sm text-slate-700 block mb-2">{editingCategoryName ? 'Edit Kategori Terpilih' : 'Buat Kategori Baru'}</span>
                      <input type="text" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} placeholder="Nama kategori..." className="w-full p-3 bg-white border border-slate-200 rounded-xl text-base focus:ring-2 focus:ring-blue-400 outline-none font-bold" />
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Pilih Icon</label>
                        <div className="grid grid-cols-7 gap-2">
                          {Object.keys(AVAILABLE_ICONS).map(iconKey => { const Ico = AVAILABLE_ICONS[iconKey]; const isSel = newCategoryIcon === iconKey; return (<button type="button" key={iconKey} onClick={() => setNewCategoryIcon(iconKey)} className={`flex items-center justify-center aspect-square rounded-xl border-2 transition-all ${isSel ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-transparent bg-white text-slate-500 hover:bg-slate-100'}`}><Ico className="w-5 h-5" /></button>) })}
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Pilih Warna</label>
                        <div className="grid grid-cols-6 gap-2">
                          {COLOR_PALETTES.map((colorSet, idx) => { const isSel = newCategoryColor === colorSet; return (<button type="button" key={idx} onClick={() => setNewCategoryColor(colorSet)} className={`w-full aspect-square rounded-full flex items-center justify-center transition-all border-2 ${isSel ? 'border-slate-800 scale-110 shadow-sm' : 'border-transparent hover:scale-110'} ${colorSet}`}>{isSel && <div className="w-3 h-3 bg-current rounded-full" />}</button>) })}
                        </div>
                      </div>
                      <button type="button" onClick={handleSaveCustomCategory} className="w-full py-3 bg-[#165DFF] text-white rounded-xl text-sm font-bold shadow-sm hover:bg-blue-600 transition-colors">Simpan Kategori</button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Budget Indicator */}
            {budgetInfo && (
              <div className={`p-4 rounded-xl border ${budgetInfo.isOver ? 'bg-rose-50 border-rose-200' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Budget {budgetInfo.budget.category}</span>
                  <span className={`text-xs font-bold ${budgetInfo.isOver ? 'text-rose-600' : 'text-slate-600'}`}>{budgetInfo.isOver ? 'Limit Terlampaui!' : 'Dalam Batas'}</span>
                </div>
                <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden mb-2">
                  <div className={`h-full rounded-full transition-all duration-500 ${budgetInfo.isOver ? 'bg-rose-500' : budgetInfo.percent > 80 ? 'bg-orange-500' : 'bg-blue-500'}`} style={{ width: `${budgetInfo.percent}%` }} />
                </div>
                <p className="text-xs text-center text-slate-500">Sisa: <strong>Rp {budgetInfo.remaining.toLocaleString('id-ID')}</strong></p>
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="block text-[10px] font-bold text-[#6A7686] uppercase tracking-wider mb-1.5">Catatan <span className="text-slate-400 font-normal">(Opsional)</span></label>
              <input
                type="text"
                placeholder={category ? `Contoh: ${category} Enak` : "Catatan transaksi..."}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-[#165DFF]/20 focus:border-[#165DFF] outline-none transition-all font-medium text-base"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={saving}
              className={`w-full py-4 rounded-2xl font-bold text-white text-base transition-all active:scale-[0.98] shadow-lg flex items-center justify-center gap-2 ${
                type === 'pemasukan' ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 shadow-emerald-500/30' :
                type === 'pengeluaran' ? 'bg-gradient-to-r from-rose-500 to-rose-600 shadow-rose-500/30' :
                'bg-gradient-to-r from-violet-600 to-purple-600 shadow-violet-500/30'
              } ${saving ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {saving && <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {saving ? 'Menyimpan...' : (editingTransaction ? 'Update Transaksi' : `Simpan ${type === 'pemasukan' ? 'Pemasukan' : type === 'pengeluaran' ? 'Pengeluaran' : 'Topup'}`)}
            </button>
          </div>
        </form>
      </div>

      {/* ===== DESKTOP MODAL ===== */}
      <div className="hidden md:block w-full max-w-2xl rounded-2xl bg-white shadow-2xl z-50 relative animate-in zoom-in-95 fade-in duration-200 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-100 px-6 pt-6 pb-4 z-10">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-[#080C1A]">
              {editingTransaction ? '✏️ Edit Transaksi' : '➕ Tambah Transaksi'}
            </h3>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"><X className="w-5 h-5" /></button>
          </div>
        </div>

        <form onSubmit={handleSaveTransaction} className="p-6 space-y-5">
          {/* Type Tabs */}
          <div className="flex bg-slate-100 p-1.5 rounded-2xl">
            <button type="button" onClick={() => { setType('pemasukan'); setCategory(''); }} className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${type === 'pemasukan' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Pemasukan</button>
            <button type="button" onClick={() => { setType('pengeluaran'); setCategory(''); }} className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${type === 'pengeluaran' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Pengeluaran</button>
            <button type="button" onClick={() => { setType('topup'); setCategory('Topup'); }} className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${type === 'topup' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Topup</button>
          </div>

          {/* Date & Wallet Grid */}
          <div className={`grid gap-4 ${type === 'topup' ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-2'}`}>
            <div className={type === 'topup' ? 'md:col-span-1' : ''}>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Tanggal</label>
              <input type="date" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" value={customDate} onChange={(e) => setCustomDate(e.target.value)} required />
            </div>
            {type === 'topup' ? (
              <>
                <div className="border border-slate-200 p-3 rounded-xl bg-slate-50">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Sumber Dana</label>
                  <select className="w-full bg-transparent outline-none font-semibold text-slate-800 text-sm" value={sourceWalletId} onChange={(e) => setSourceWalletId(e.target.value)} required>
                    <option value="" disabled>Pilih Sumber</option>
                    {wallets.map(w => <option key={w.id} value={w.id} disabled={selectedWalletId === w.id.toString()}>{w.name} (Rp {w.balance.toLocaleString('id-ID')})</option>)}
                  </select>
                </div>
                <div className="border border-blue-200 p-3 rounded-xl bg-blue-50/50">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-blue-600 mb-1">Tujuan Topup</label>
                  <select className="w-full bg-transparent outline-none font-semibold text-blue-800 text-sm" value={selectedWalletId} onChange={(e) => setSelectedWalletId(e.target.value)} required>
                    <option value="" disabled>Pilih Tujuan</option>
                    {wallets.map(w => <option key={w.id} value={w.id} disabled={sourceWalletId === w.id.toString()}>{w.name} (Rp {w.balance.toLocaleString('id-ID')})</option>)}
                  </select>
                </div>
              </>
            ) : (
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Dompet</label>
                <select className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" value={selectedWalletId} onChange={(e) => setSelectedWalletId(e.target.value)} required>
                  <option value="" disabled>Pilih Dompet</option>
                  {wallets.map(w => <option key={w.id} value={w.id}>{w.name} (Rp {w.balance.toLocaleString('id-ID')})</option>)}
                </select>
              </div>
            )}
          </div>

          {/* Amount Input */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">{type === 'topup' ? 'Nominal Topup (Rp)' : 'Jumlah (Rp)'}</label>
              <MoneyInput value={amount} onChange={setAmount} autoFocus={!editingTransaction} />
            </div>
            {type === 'topup' && (
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Biaya Admin (Opsional)</label>
                <MoneyInput value={adminFee} onChange={setAdminFee} placeholder="0" />
              </div>
            )}
          </div>

          {/* Piutang */}
          {type === 'pemasukan' && (
            <div className={`p-4 rounded-2xl border transition-all duration-200 ${isPiutang ? 'bg-amber-50/60 border-amber-200' : 'bg-slate-50 border-slate-200'}`}>
              <div onClick={() => { setIsPiutang(!isPiutang); if (isPiutang) setPiutangPerson('') }} className="flex items-center justify-between cursor-pointer select-none">
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full border-[1.5px] flex items-center justify-center transition-all ${isPiutang ? 'border-amber-500' : 'border-slate-300'}`}>{isPiutang && <div className="w-2.5 h-2.5 bg-amber-500 rounded-full" />}</div>
                  <span className={`text-sm font-bold ${isPiutang ? 'text-amber-700' : 'text-slate-600'}`}>💸 Ini adalah Piutang?</span>
                </div>
                {isPiutang && <span className="text-[10px] uppercase font-bold text-amber-600 bg-white px-2 py-1 rounded-lg shadow-sm border border-amber-100">Aktif</span>}
              </div>
              {isPiutang && (
                <div className="mt-3">
                  <input type="text" placeholder="Nama peminjam (Opsional)" className="w-full p-2.5 bg-white border border-amber-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-400 outline-none font-medium" value={piutangPerson} onChange={(e) => setPiutangPerson(e.target.value)} />
                  <p className="text-xs text-amber-600 mt-2 flex items-start gap-1.5"><Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />Nominal akan masuk ke saldo dompet, tapi <strong>tidak dihitung</strong> sebagai pemasukan di statistik.</p>
                </div>
              )}
            </div>
          )}

          {/* Split Bill */}
          {type === 'pengeluaran' && (
            <div className={`p-4 rounded-2xl border transition-all duration-200 ${isSplitBill ? 'bg-blue-50/50 border-blue-200' : 'bg-slate-50 border-slate-200'}`}>
              <div onClick={() => setIsSplitBill(!isSplitBill)} className="flex items-center justify-between cursor-pointer select-none mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full border-[1.5px] flex items-center justify-center transition-all ${isSplitBill ? 'border-[#165DFF]' : 'border-slate-300'}`}>{isSplitBill && <div className="w-2.5 h-2.5 bg-[#165DFF] rounded-full" />}</div>
                  <span className={`text-sm font-bold ${isSplitBill ? 'text-[#165DFF]' : 'text-slate-600'}`}>Ada yang nitip bayar? (Split Bill)</span>
                </div>
                {isSplitBill && <span className="text-[10px] uppercase font-bold text-[#165DFF] bg-white px-2 py-1 rounded-lg shadow-sm border border-blue-100">Aktif</span>}
              </div>
              {isSplitBill && (
                <div className="space-y-3">
                  {splitEntries.map((entry, idx) => (
                    <div key={idx} className="flex gap-2 items-start">
                      <div className="flex-1 grid grid-cols-2 gap-2">
                        <input type="text" placeholder={`Nama Teman #${idx + 1}`} className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={entry.name} onChange={(e) => { const n = [...splitEntries]; n[idx].name = e.target.value; setSplitEntries(n) }} />
                        <MoneyInput placeholder="0" value={entry.amount} onChange={(val) => { const n = [...splitEntries]; n[idx].amount = val; setSplitEntries(n) }} className="!text-sm !p-3" />
                      </div>
                      {splitEntries.length > 1 && <button type="button" onClick={() => setSplitEntries(splitEntries.filter((_, i) => i !== idx))} className="p-2.5 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors"><Trash2 className="w-4 h-4" /></button>}
                    </div>
                  ))}
                  <button type="button" onClick={() => setSplitEntries([...splitEntries, { name: '', amount: '' }])} className="text-xs font-bold text-blue-600 flex items-center gap-1 mt-2"><Plus className="w-3 h-3" />Tambah Orang Lain</button>
                  <div className="bg-blue-50 p-3 rounded-lg mt-2">
                    <p className="text-xs text-blue-700">Total pengeluaran: <strong>Rp {parseInt(amount || '0').toLocaleString('id-ID')}</strong> | Sisa (bagian Anda): <strong>Rp {Math.max(0, parseInt(amount || '0') - splitEntries.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0)).toLocaleString('id-ID')}</strong></p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Talangan */}
          {type === 'pengeluaran' && (
            <div className={`p-4 rounded-2xl border transition-all duration-200 ${isTalangan ? 'bg-purple-50/60 border-purple-200' : 'bg-slate-50 border-slate-200'}`}>
              <div onClick={() => { setIsTalangan(!isTalangan); if (isTalangan) setTalanganPerson('') }} className="flex items-center justify-between cursor-pointer select-none">
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full border-[1.5px] flex items-center justify-center transition-all ${isTalangan ? 'border-purple-500' : 'border-slate-300'}`}>{isTalangan && <div className="w-2.5 h-2.5 bg-purple-500 rounded-full" />}</div>
                  <span className={`text-sm font-bold ${isTalangan ? 'text-purple-700' : 'text-slate-600'}`}>🤝 Ini Talangan (bayarin orang lain)?</span>
                </div>
                {isTalangan && <span className="text-[10px] uppercase font-bold text-purple-600 bg-white px-2 py-1 rounded-lg shadow-sm border border-purple-100">Aktif</span>}
              </div>
              {isTalangan && (
                <div className="mt-3">
                  <input type="text" placeholder="Nama orang yang ditalangin (Opsional)" className="w-full p-2.5 bg-white border border-purple-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-400 outline-none font-medium" value={talanganPerson} onChange={(e) => setTalanganPerson(e.target.value)} />
                  <p className="text-xs text-purple-600 mt-2 flex items-start gap-1.5"><Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />Saldo dompet tetap berkurang, tapi <strong>tidak dihitung</strong> sebagai pengeluaran pribadi di statistik.</p>
                </div>
              )}
            </div>
          )}

          {/* Category Picker (desktop) */}
          {type !== 'topup' && (
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Kategori <span className="text-red-500 font-normal text-xs">*Wajib</span></label>
              <div className="grid grid-cols-4 gap-3">
                {allCategories.map((cat) => {
                  const isSelected = category === cat.name
                  return (
                    <div key={cat.name} className="relative group">
                      <button type="button" onClick={() => setCategory(cat.name)} className={`w-full h-full flex flex-col items-center justify-center p-3 rounded-2xl transition-all border-2 ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-transparent hover:bg-slate-50'}`}>
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${cat.color}`}><cat.icon className="w-5 h-5" /></div>
                        <span className={`text-[10px] font-medium text-center leading-tight ${isSelected ? 'text-blue-700' : 'text-slate-600'}`}>{cat.name}</span>
                      </button>
                    </div>
                  )
                })}
                <button type="button" onClick={() => { resetCategoryForm(); setShowAddCategory(true); }} className="flex flex-col items-center justify-center p-3 rounded-2xl transition-all border-2 border-dashed border-slate-300 hover:border-blue-500 hover:bg-slate-50">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center mb-2 bg-slate-50 text-slate-400"><Plus className="w-5 h-5" /></div>
                  <span className="text-[10px] font-bold text-center leading-tight text-slate-500">Custom</span>
                </button>
              </div>
              {showAddCategory && (
                <div className="mt-4 p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <div className="flex justify-between items-center mb-4">
                    <span className="font-bold text-slate-700">Kelola Kategori Custom</span>
                    <button type="button" onClick={resetCategoryForm} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4"/></button>
                  </div>
                  {(customCategories[type as 'pemasukan' | 'pengeluaran'] || []).length > 0 && (
                    <div className="mb-6 space-y-2">
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Pilih Untuk Edit/Hapus</label>
                      <div className="flex flex-col gap-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                        {customCategories[type as 'pemasukan' | 'pengeluaran'].map((c, idx) => {
                          const isStr = typeof c === 'string'; const name = isStr ? c : c.name; const Ico = isStr ? Package : (AVAILABLE_ICONS[c.iconName] || Package)
                          return (
                            <div key={idx} className="flex flex-row items-center justify-between bg-white p-2.5 border border-slate-200 rounded-xl">
                              <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center bg-slate-50 ${isStr ? 'text-slate-500' : c.color.split(' ')[1]}`}><Ico className="w-4 h-4" /></div>
                                <span className="text-sm font-bold text-slate-700 px-1">{name}</span>
                              </div>
                              <div className="flex items-center border-l border-slate-100 pl-2">
                                <button type="button" onClick={(e) => openEditCategory(c, e)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Pencil className="w-4 h-4" /></button>
                                <button type="button" onClick={(e) => handleDeleteCustomCategory(name, e)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                  <div className="space-y-4 border-t border-slate-200 pt-4">
                    <span className="font-bold text-sm text-slate-700 block mb-2">{editingCategoryName ? 'Edit Kategori Terpilih' : 'Buat Kategori Baru'}</span>
                    <input type="text" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} placeholder="Nama kategori..." className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-400 outline-none font-bold" />
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Pilih Icon</label>
                      <div className="grid grid-cols-7 gap-2">
                        {Object.keys(AVAILABLE_ICONS).map(iconKey => { const Ico = AVAILABLE_ICONS[iconKey]; const isSelected = newCategoryIcon === iconKey; return (<button type="button" key={iconKey} onClick={() => setNewCategoryIcon(iconKey)} className={`flex items-center justify-center aspect-square rounded-xl border-2 transition-all ${isSelected ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-transparent bg-white text-slate-500 hover:bg-slate-100'}`}><Ico className="w-5 h-5" /></button>) })}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Pilih Warna</label>
                      <div className="grid grid-cols-6 gap-2">
                        {COLOR_PALETTES.map((colorSet, idx) => { const isSelected = newCategoryColor === colorSet; return (<button type="button" key={idx} onClick={() => setNewCategoryColor(colorSet)} className={`w-full aspect-square rounded-full flex items-center justify-center transition-all border-2 ${isSelected ? 'border-slate-800 scale-110 shadow-sm' : 'border-transparent hover:scale-110'} ${colorSet}`}>{isSelected && <div className="w-3 h-3 bg-current rounded-full" />}</button>) })}
                      </div>
                    </div>
                    <div className="flex gap-2 pt-2 border-t border-slate-200">
                      <button type="button" onClick={handleSaveCustomCategory} className="flex-1 py-3 bg-[#165DFF] text-white rounded-xl text-sm font-bold shadow-sm hover:bg-blue-600 transition-colors">Simpan Kategori</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Budget Awareness */}
          {budgetInfo && (
            <div className={`p-4 rounded-xl border ${budgetInfo.isOver ? 'bg-rose-50 border-rose-200' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Budget {budgetInfo.budget.category}</span>
                <span className={`text-xs font-bold ${budgetInfo.isOver ? 'text-rose-600' : 'text-slate-600'}`}>{budgetInfo.isOver ? 'Limit Terlampaui!' : 'Dalam Batas'}</span>
              </div>
              <div className="flex justify-between items-end mb-2">
                <div className="flex flex-col"><span className="text-xs text-slate-400">Terpakai + Baru</span><span className="font-bold text-slate-700">Rp {budgetInfo.totalProjected.toLocaleString('id-ID')}</span></div>
                <div className="flex flex-col items-end"><span className="text-xs text-slate-400">Total Budget</span><span className="font-bold text-slate-700">Rp {budgetInfo.budget.amount.toLocaleString('id-ID')}</span></div>
              </div>
              <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden mb-2">
                <div className={`h-full rounded-full transition-all duration-500 ${budgetInfo.isOver ? 'bg-rose-500' : budgetInfo.percent > 80 ? 'bg-orange-500' : 'bg-blue-500'}`} style={{ width: `${budgetInfo.percent}%` }} />
              </div>
              {budgetInfo.isOver ? (
                <div className="flex items-start gap-2 text-rose-600 text-xs font-medium mt-2 bg-rose-100 p-2 rounded-lg"><AlertTriangle className="w-4 h-4 shrink-0" /><p>Awas! Transaksi ini akan membuat budget minus <strong>Rp {Math.abs(budgetInfo.remaining).toLocaleString('id-ID')}</strong>.</p></div>
              ) : (
                <p className="text-xs text-center text-slate-500">Sisa budget setelah transaksi ini: <strong>Rp {budgetInfo.remaining.toLocaleString('id-ID')}</strong></p>
              )}
            </div>
          )}

          {/* Title/Notes */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Catatan <span className="text-slate-400 font-normal text-xs">(Opsional)</span></label>
            <input
              type="text"
              placeholder={category ? `Contoh: ${category} Enak` : "Catatan Transaksi"}
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all font-medium"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <button type="submit" disabled={saving} className={`w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 !text-white font-bold py-4 px-6 rounded-2xl active:scale-[0.98] transition-all shadow-lg shadow-purple-500/30 flex items-center justify-center gap-2 ${saving ? 'opacity-70 cursor-not-allowed' : ''}`}>
            {saving && <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            {saving ? 'Menyimpan...' : (editingTransaction ? 'Update Transaksi' : 'Simpan Transaksi')}
          </button>
        </form>
      </div>
    </div>
  )
}

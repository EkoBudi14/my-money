'use client'
import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/useToast'
import { useSuccessModal } from '@/hooks/useSuccessModal'
import { useIsWeb } from '@/hooks/useIsWeb'
import { useConfirm } from '@/hooks/useConfirm'
import { deleteTransactionWithRollback } from '@/lib/transactions'
import FieldError from '@/components/FieldError'
import NeoSelect from '@/components/NeoSelect'
import DatePickerNeo from '@/components/DatePickerNeo'
import { Wallet, Transaction, Budget, CustomCategoryDef } from '@/types'
import {
  Trash2, X, Package,
  ShoppingBag, Utensils, Car, Zap, Home, Film, HeartPulse,
  CreditCard, Gift, Briefcase, TrendingUp, Landmark, Coffee,
  Plane, Gamepad2, Tv, Smartphone, Book, Scissors, Music,
  Shirt, Smile, Globe, Dumbbell, GraduationCap,
  ScanLine, Mic, ArrowLeftRight, Settings2
} from 'lucide-react'

// Built-in category name -> catatduit color class (DESIGN.md section 6).
const CAT_CLASS: Record<string, string> = {
  'Kebutuhan Dapur': 'c-dapur', 'Makan di Luar': 'c-makan', 'Transportasi': 'c-transport',
  'Tempat Tinggal': 'c-rumah', 'Tagihan': 'c-tagihan', 'Belanja': 'c-belanja',
  'Kesehatan': 'c-kesehatan', 'Cicilan & Utang': 'c-cicilan', 'Pribadi & Hiburan': 'c-hiburan',
  'Edukasi & Donasi': 'c-edukasi', 'Gaji': 'c-gaji', 'Bonus & Hadiah': 'c-bonus',
  'Investasi': 'c-investasi', 'Penjualan': 'c-belanja', 'Lainnya': 'c-lain',
}

// ── Constants (duplicated from page.tsx to keep component self-contained) ──────
const AVAILABLE_ICONS: Record<string, any> = {
  Home, ShoppingBag, Utensils, Car, Zap, Package, HeartPulse, CreditCard, Film, Gift,
  Briefcase, TrendingUp, Landmark, Coffee, Plane, Gamepad2, Tv, Smartphone, Book,
  Scissors, Music, Shirt, Smile, Globe, Dumbbell, GraduationCap
}

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
const pad2 = (n: number) => String(n).padStart(2, '0')
const localDate = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
const localTime = (d: Date) => `${pad2(d.getHours())}:${pad2(d.getMinutes())}`
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
  const { showSuccess } = useSuccessModal()
  const { showConfirm } = useConfirm()
  const isWeb = useIsWeb()

  // Delete from inside the edit form (DESIGN-TAMBAHAN.md §8). Reuses the shared
  // rollback + section 3 dialog; on success the caller navigates away.
  const handleDeleteFromForm = async () => {
    if (!editingTransaction) return
    const res = await deleteTransactionWithRollback(editingTransaction.id, { confirm: showConfirm, toast: showToast })
    if (res.deleted) onSaved()
  }

  // Inline field validation (DESIGN-TAMBAHAN.md §5)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const clearErr = (k: string) => setErrors(prev => { const n = { ...prev }; delete n[k]; return n })

  // ── Form State (ALL of this lives here, NOT in page.tsx) ──────────────────
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [adminFee, setAdminFee] = useState('')
  const [type, setType] = useState<'pemasukan' | 'pengeluaran' | 'topup'>('pemasukan')
  const [category, setCategory] = useState('')
  const [selectedWalletId, setSelectedWalletId] = useState('')
  const [sourceWalletId, setSourceWalletId] = useState('')
  const [customDate, setCustomDate] = useState(localDate(new Date()))
  // Jam (DESIGN-TAMBAHAN §10: optional time field). Stored inside transactions.date.
  const [customTime, setCustomTime] = useState(localTime(new Date()))
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
      setCustomDate(localDate(new Date(editingTransaction.date || editingTransaction.created_at)))
      setCustomTime(localTime(new Date(editingTransaction.date || editingTransaction.created_at)))
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
      // Default wallet = the one used by the most recent transaction (DESIGN.md 7.2).
      const lastUsed = [...transactions]
        .filter(t => t.type !== 'topup' && t.wallet_id != null && wallets.some(w => w.id === t.wallet_id))
        .sort((a, z) => new Date(z.created_at).getTime() - new Date(a.created_at).getTime())[0]
      setSelectedWalletId(initialType !== 'topup' && lastUsed?.wallet_id ? lastUsed.wallet_id.toString() : '')
      setSourceWalletId('')
      setCustomDate(localDate(new Date()))
      setCustomTime(localTime(new Date()))
      setIsPiutang(false)
      setPiutangPerson('')
      setIsTalangan(false)
      setTalanganPerson('')
      setIsSplitBill(false)
      setSplitEntries([{ name: '', amount: '' }])
    }
    setDebouncedAmount('')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, editingTransaction, transactions.length, wallets.length])

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

  // Custom category CRUD now lives on the /kategori page (see app/kategori/page.tsx).

  // ── Save transaction (full logic, identical to page.tsx original) ─────────
  const handleSaveTransaction = async (e: React.FormEvent) => {
    e.preventDefault()

    const finalTitle = type === 'topup' ? (title || 'Topup Saldo') : (title || category)
    const amountNum = parseFloat(amount)
    const adminFeeNum = type === 'topup' && adminFee ? parseFloat(adminFee) : 0
    const newWalletId = parseInt(selectedWalletId)

    const ve: Record<string, string> = {}
    if (!amountNum || amountNum <= 0 || isNaN(amountNum)) ve.amount = 'Isi jumlah lebih dari Rp 0.'
    if (!category) ve.category = 'Pilih satu kategori.'
    if (!selectedWalletId) ve[type === 'topup' ? 'destWallet' : 'wallet'] = 'Pilih dompet.'
    if (type === 'topup' && !sourceWalletId) ve.sourceWallet = 'Pilih dompet.'
    if (type === 'topup' && sourceWalletId && sourceWalletId === selectedWalletId) ve.destWallet = 'Dompet tujuan harus beda dengan dompet asal.'
    setErrors(ve)
    if (Object.keys(ve).length > 0) return

    setSaving(true)

    const freshNewWalletBalance = await fetchFreshWalletBalance(newWalletId)
    if (freshNewWalletBalance === null) {
      showToast('error', 'Dompet tidak ditemukan.')
      setSaving(false)
      return
    }

    let freshSourceWalletBalance: number | null = null
    if (type === 'topup') {
      freshSourceWalletBalance = await fetchFreshWalletBalance(parseInt(sourceWalletId))
      if (freshSourceWalletBalance === null) {
        showToast('error', 'Sumber dana tidak ditemukan.')
        setSaving(false)
        return
      }
      if (freshSourceWalletBalance < (amountNum + adminFeeNum)) {
        const src = wallets.find(w => w.id === parseInt(sourceWalletId))
        setErrors({ sourceWallet: `Saldo ${src?.name || 'dompet'} kurang Rp ${((amountNum + adminFeeNum) - freshSourceWalletBalance).toLocaleString('id-ID')}. Pilih dompet lain atau ubah jumlah.` })
        setSaving(false)
        return
      }
    }

    const safeDate = new Date(`${customDate}T${customTime || '12:00'}:00`).toISOString()
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
          const w = wallets.find(x => x.id === newWalletId)
          setErrors({ wallet: `Saldo ${w?.name || 'dompet'} kurang Rp ${(amountNum - balanceAfterRollback).toLocaleString('id-ID')}. Pilih dompet lain atau ubah jumlah.` })
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
          const walletName = wallets.find(w => w.id === newWalletId)?.name || 'dompet'
          setErrors({ wallet: `Saldo ${walletName} kurang Rp ${(amountNum - freshNewWalletBalance).toLocaleString('id-ID')}. Pilih dompet lain atau ubah jumlah.` })
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
        const walletName = wallets.find(w => w.id === newWalletId)?.name || 'dompet'
        setErrors({ wallet: `Saldo ${walletName} kurang Rp ${(amountNum - freshNewWalletBalance).toLocaleString('id-ID')}. Pilih dompet lain atau ubah jumlah.` })
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

      const savedMsg = editingTransaction
        ? 'Perubahan tersimpan'
        : type === 'topup' ? 'Transfer tersimpan'
          : type === 'pemasukan' ? 'Pemasukan tersimpan'
            : 'Pengeluaran tersimpan'
      showToast('success', savedMsg)
      onSaved()
      onClose()
    }

    setSaving(false)
  }

  // Esc closes the modal (DESIGN.md 5 / 8). Enter submits through the form.
  useEffect(() => {
    if (mode === 'page' || !isOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !saving) onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mode, isOpen, saving, onClose])

  if (!isOpen && mode !== 'page') return null

  // ── All category options combined ─────────────────────────────────────────
  const allCategories = type !== 'topup' ? [
    ...(CATEGORIES[type as 'pemasukan' | 'pengeluaran'].map(c => ({ ...c, isCustom: false }))),
    ...(customCategories[type as 'pemasukan' | 'pengeluaran'] || []).map(c => {
      if (typeof c === 'string') return { name: c, color: 'bg-slate-100 dark:bg-[var(--bg-hover)] text-slate-600 dark:text-slate-500', icon: Package, isCustom: true, originalObj: c }
      return { name: c.name, color: c.color, icon: AVAILABLE_ICONS[c.iconName] || Package, isCustom: true, originalObj: c }
    })
  ] : []

  // ── Shared form body (same markup for page / mobile sheet / desktop modal) ──
  // Field groups (shared by page, mobile sheet and the 2-column web modal).
  const renderTop = () => (
    <>
      {/* Transfer wallet selectors */}
      {type === 'topup' && (
        <div className="stack-12">
          <div className="field">Dari dompet
            <NeoSelect
              value={sourceWalletId}
              onChange={(v) => { setSourceWalletId(v); clearErr('sourceWallet'); clearErr('destWallet') }}
              options={wallets.map(w => ({ label: w.name, value: w.id.toString(), disabled: selectedWalletId === w.id.toString() }))}
              placeholder="Pilih sumber"
              required
            />
            <FieldError>{errors.sourceWallet}</FieldError>
          </div>
          <button
            type="button"
            className="icon-btn"
            aria-label="Tukar dompet asal dan tujuan"
            style={{ alignSelf: 'center' }}
            onClick={() => { const s = sourceWalletId; setSourceWalletId(selectedWalletId); setSelectedWalletId(s) }}
          >
            <ArrowLeftRight className="i" />
          </button>
          <div className="field">Ke dompet
            <NeoSelect
              value={selectedWalletId}
              onChange={(v) => { setSelectedWalletId(v); clearErr('destWallet') }}
              options={wallets.map(w => ({ label: w.name, value: w.id.toString(), disabled: sourceWalletId === w.id.toString() }))}
              placeholder="Pilih tujuan"
              required
            />
            <FieldError>{errors.destWallet}</FieldError>
          </div>
        </div>
      )}

      {/* Amount */}
      <div className="stack">
        <div className="lbl" style={{ fontWeight: 600 }}>{type === 'topup' ? 'Nominal transfer' : 'Jumlah'}</div>
        <div className={`amount-box ${errors.amount ? 'bad' : ''}`}>
          <span className="cur">Rp</span>
          <input
            type="text"
            inputMode="numeric"
            placeholder="0"
            className="val"
            style={{ color: type === 'pemasukan' ? 'var(--income)' : 'var(--text)' }}
            value={amount ? parseInt(amount.replace(/\D/g, '') || '0').toLocaleString('id-ID') : ''}
            onChange={(e) => { const raw = e.target.value.replace(/\D/g, ''); setAmount(raw); clearErr('amount') }}
            autoFocus={!editingTransaction}
          />
        </div>
        <FieldError>{errors.amount}</FieldError>
        <div className="chips">
          <button type="button" className="chip" onClick={() => { const raw = amount.replace(/\D/g, ''); if (!raw) { setAmount('1000') } else { setAmount(raw + '000') } }}>+000</button>
          {[10000, 50000, 100000, 500000, 1000000].map(val => (
            <button key={val} type="button" className="chip" onClick={() => setAmount(String((parseInt(amount.replace(/\D/g, '') || '0') + val)))}>
              +{val >= 1000000 ? `${val / 1000000}jt` : `${val / 1000}rb`}
            </button>
          ))}
          <button type="button" className="chip" style={{ color: 'var(--text-2)' }} onClick={() => setAmount('')}>Reset</button>
        </div>
      </div>

      <div className="stack-12">
        {/* Date & Wallet */}
        {type !== 'topup' ? (
          <>
            <div className="g2">
              <div className="field">Tanggal
                <DatePickerNeo className="input" value={customDate} onChange={(e) => setCustomDate(e.target.value)} required />
              </div>
              <label className="field">Jam
                <input type="time" className="input" value={customTime} onChange={(e) => setCustomTime(e.target.value)} />
              </label>
            </div>
            <div className="field">Dompet
              <div className="chips scrollx">
                {wallets.map(w => (
                  <button
                    key={w.id}
                    type="button"
                    className={`chip ${selectedWalletId === w.id.toString() ? 'on' : ''} ${errors.wallet ? 'bad' : ''}`}
                    onClick={() => { setSelectedWalletId(w.id.toString()); clearErr('wallet') }}
                  >
                    {w.name}<span className="lbl" style={{ fontWeight: 500 }}>Rp {w.balance.toLocaleString('id-ID')}</span>
                  </button>
                ))}
              </div>
              <FieldError>{errors.wallet}</FieldError>
            </div>
          </>
        ) : (
          <>
            <div className="field">Biaya admin (opsional)
              <input
                type="text" inputMode="numeric" placeholder="0" className="input"
                value={adminFee ? parseInt(adminFee.replace(/\D/g, '') || '0').toLocaleString('id-ID') : ''}
                onChange={(e) => setAdminFee(e.target.value.replace(/\D/g, ''))}
              />
            </div>
            <div className="card stack" style={{ background: 'var(--surface-2)' }}>
              <div className="between" style={{ fontSize: 13 }}><span className="lbl">Nominal transfer</span><span style={{ fontWeight: 600 }}>Rp {amount ? parseInt(amount.replace(/\D/g, '') || '0').toLocaleString('id-ID') : '0'}</span></div>
              <div className="between" style={{ fontSize: 13 }}><span className="lbl">Biaya admin</span><span style={{ fontWeight: 600 }}>Rp {adminFee ? parseInt(adminFee.replace(/\D/g, '') || '0').toLocaleString('id-ID') : '0'}</span></div>
              <div className="between" style={{ borderTop: '1px solid var(--border)', paddingTop: 8 }}><span style={{ fontWeight: 700, fontSize: 14 }}>Total keluar</span><span style={{ fontWeight: 700, fontSize: 15 }}>Rp {((parseInt(amount.replace(/\D/g, '') || '0')) + (parseInt(adminFee.replace(/\D/g, '') || '0'))).toLocaleString('id-ID')}</span></div>
            </div>
            <div className="g2">
              <div className="field">Tanggal
                <DatePickerNeo className="input" value={customDate} onChange={(e) => setCustomDate(e.target.value)} required />
              </div>
              <label className="field">Jam
                <input type="time" className="input" value={customTime} onChange={(e) => setCustomTime(e.target.value)} />
              </label>
            </div>
          </>
        )}

      </div>
    </>
  )

  const renderCategory = () => (
    <div className="stack-12">
        {/* Category Picker */}
        {type !== 'topup' && (
          <div className="field">
            <div className="between"><span>Kategori</span><span className="lbl" style={{ fontWeight: 500 }}>Wajib dipilih</span></div>
            <div className="g4">
              {allCategories.map((cat) => {
                const isSelected = category === cat.name
                const cls = CAT_CLASS[cat.name] || (cat.isCustom ? cat.color : 'c-lain')
                return (
                  <button key={cat.name} type="button" className={`catb ${isSelected ? 'on' : ''} ${errors.category ? 'bad' : ''}`} onClick={() => { setCategory(cat.name); clearErr('category') }}>
                    <span className={`ic-s ${cls}`}><cat.icon className="i i-s" /></span>
                    {cat.name}
                  </button>
                )
              })}
              <Link href="/kategori" className="catb add" style={{ textDecoration: 'none' }}>
                <span className="ic-s" style={{ border: '1.5px dashed var(--border-strong)' }}><Settings2 className="i i-s" /></span>
                Kelola kategori
              </Link>
            </div>
            <FieldError>{errors.category}</FieldError>
          </div>
        )}

        {/* Budget Indicator */}
        {budgetInfo && (
          <div className="card stack">
            <div className="between">
              <span className="lbl">Budget {budgetInfo.budget.category}</span>
              <span className="badge" style={{ background: budgetInfo.isOver ? 'var(--danger-tint)' : 'var(--accent-tint)', color: budgetInfo.isOver ? 'var(--danger-text)' : 'var(--accent-hover)' }}>{budgetInfo.isOver ? 'Limit terlampaui' : 'Dalam batas'}</span>
            </div>
            <div className="between" style={{ fontSize: 13 }}>
              <span className="lbl">Terpakai + baru</span>
              <span style={{ fontWeight: 600 }}>Rp {budgetInfo.totalProjected.toLocaleString('id-ID')} / Rp {budgetInfo.budget.amount.toLocaleString('id-ID')}</span>
            </div>
            <div className={`bar ${budgetInfo.isOver ? 'over' : ''}`}>
              <div style={{ width: `${budgetInfo.percent}%`, ...(!budgetInfo.isOver && budgetInfo.percent > 80 ? { background: '#F59E0B' } : {}) }} />
            </div>
            <p className="lbl">Sisa: <strong style={{ color: 'var(--text)', fontWeight: 700 }}>Rp {budgetInfo.remaining.toLocaleString('id-ID')}</strong></p>
          </div>
        )}

        {/* Piutang Toggle */}
        {type === 'pemasukan' && (
          <div className="stack">
            <div className="toggle-row">
              <div className="grow">
                <div className="t">Ini pengembalian piutang?</div>
                <div className="meta" style={{ whiteSpace: 'normal' }}>Uang balik dari teman, tidak dihitung pemasukan.</div>
              </div>
              <button type="button" className={`switch ${isPiutang ? 'on' : ''}`} aria-label="Pengembalian piutang" aria-pressed={isPiutang} onClick={() => { setIsPiutang(!isPiutang); if (isPiutang) setPiutangPerson('') }} />
            </div>
            {isPiutang && (
              <label className="field">Nama peminjam (opsional)
                <input type="text" className="input" placeholder="Sigit" value={piutangPerson} onChange={(e) => setPiutangPerson(e.target.value)} />
              </label>
            )}
          </div>
        )}

        {/* Split Bill */}
        {type === 'pengeluaran' && (
          <div className="stack">
            <div className="toggle-row">
              <div className="grow">
                <div className="t">Ada yang nitip bayar?</div>
                <div className="meta" style={{ whiteSpace: 'normal' }}>Split bill. Bagian teman dicatat jadi piutang.</div>
              </div>
              <button type="button" className={`switch ${isSplitBill ? 'on' : ''}`} aria-label="Split bill" aria-pressed={isSplitBill} onClick={() => setIsSplitBill(!isSplitBill)} />
            </div>
            {isSplitBill && (
              <div className="card stack" style={{ background: 'var(--surface-2)' }}>
                {splitEntries.map((entry, idx) => (
                  <div key={idx} className="hstack" style={{ gap: 8 }}>
                    <input type="text" placeholder={`Nama #${idx + 1}`} className="input" value={entry.name} onChange={(e) => { const n = [...splitEntries]; n[idx].name = e.target.value; setSplitEntries(n) }} />
                    <input type="text" inputMode="numeric" placeholder="0" className="input" style={{ maxWidth: 130 }} value={entry.amount ? parseInt(entry.amount.replace(/\D/g, '') || '0').toLocaleString('id-ID') : ''} onChange={(e) => { const n = [...splitEntries]; n[idx].amount = e.target.value.replace(/\D/g, ''); setSplitEntries(n) }} />
                    {splitEntries.length > 1 && <button type="button" className="icon-btn" style={{ color: 'var(--danger)' }} aria-label="Hapus orang" onClick={() => setSplitEntries(splitEntries.filter((_, i) => i !== idx))}><Trash2 className="i i-s" /></button>}
                  </div>
                ))}
                <button type="button" className="link" style={{ alignSelf: 'flex-start' }} onClick={() => setSplitEntries([...splitEntries, { name: '', amount: '' }])}>+ Tambah orang</button>
              </div>
            )}
          </div>
        )}

        {/* Talangan Toggle */}
        {type === 'pengeluaran' && (
          <div className="stack">
            <div className="toggle-row">
              <div className="grow">
                <div className="t">Ini talangan?</div>
                <div className="meta" style={{ whiteSpace: 'normal' }}>Uang ditalangi dulu, tidak dihitung pengeluaran.</div>
              </div>
              <button type="button" className={`switch ${isTalangan ? 'on' : ''}`} aria-label="Talangan" aria-pressed={isTalangan} onClick={() => { setIsTalangan(!isTalangan); if (isTalangan) setTalanganPerson('') }} />
            </div>
            {isTalangan && (
              <label className="field">Nama orang yang ditalangi (opsional)
                <input type="text" className="input" placeholder="Rudi" value={talanganPerson} onChange={(e) => setTalanganPerson(e.target.value)} />
              </label>
            )}
          </div>
        )}

    </div>
  )

  const renderNotes = () => (
      <label className="field">Catatan (opsional)
        <textarea
          className="input"
          placeholder={category ? `Contoh: ${category}` : 'Catatan transaksi…'}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </label>
  )

  const renderFields = () => (
    <>
      {renderTop()}
      {renderCategory()}
      {renderNotes()}
    </>
  )

  const submitLabel = saving ? 'Menyimpan…' : (editingTransaction ? 'Simpan perubahan' : type === 'pemasukan' ? 'Simpan pemasukan' : type === 'pengeluaran' ? 'Simpan pengeluaran' : 'Simpan transfer')


  const renderSubmit = () => (
    <div className="stack">
      <button type="submit" disabled={saving || isLoading} className="btn btn-block">
        {saving ? 'Menyimpan…' : (editingTransaction ? 'Simpan perubahan' : type === 'pemasukan' ? 'Simpan pemasukan' : type === 'pengeluaran' ? 'Simpan pengeluaran' : 'Simpan transfer')}
      </button>
      {editingTransaction && (
        <button type="button" className="link" style={{ color: 'var(--danger)', alignSelf: 'center', padding: '8px 0' }} disabled={saving} onClick={handleDeleteFromForm}>
          Hapus transaksi
        </button>
      )}
    </div>
  )

  const loadingState = (
    <div className="stack" style={{ alignItems: 'center', padding: '48px 0' }}>
      <div className="w-8 h-8 border-[3px] border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
      <p className="lbl">Menyiapkan form…</p>
    </div>
  )

  const titleText = editingTransaction
    ? 'Ubah transaksi'
    : type === 'pemasukan' ? 'Pemasukan baru' : type === 'pengeluaran' ? 'Pengeluaran baru' : 'Transfer saldo'

  const typeTabs = (
    <div className="seg" role="tablist">
      {[
        { key: 'pengeluaran', label: 'Pengeluaran' },
        { key: 'pemasukan', label: 'Pemasukan' },
        { key: 'topup', label: 'Transfer' },
      ].map(tab => (
        <button
          key={tab.key}
          type="button"
          className={type === tab.key ? 'on' : ''}
          onClick={() => { setType(tab.key as any); setCategory(tab.key === 'topup' ? 'Topup' : '') }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )

  // ── Page Mode (full screen, no overlay) ────────────────────────────────────
  if (mode === 'page') {
    return (
      <div className="cd scroll" style={{ minHeight: '100vh', background: 'var(--surface)', maxWidth: 560, margin: '0 auto', paddingBottom: 0 }}>
        {/* Header */}
        <div className="top">
          <div className="top-l">
            <button type="button" onClick={onClose} className="icon-btn ghost" aria-label="Tutup">
              <X className="i" />
            </button>
            <h1 className="h2">
              {editingTransaction ? 'Ubah transaksi' : type === 'pemasukan' ? 'Pemasukan baru' : type === 'pengeluaran' ? 'Pengeluaran baru' : 'Transfer saldo'}
            </h1>
          </div>
          <div className="hstack" style={{ gap: 6 }}>
            <Link href="/scan-receipt" className="icon-btn" aria-label="Scan struk"><ScanLine className="i" /></Link>
            <Link href="/voice-transaction" className="icon-btn" aria-label="Input suara"><Mic className="i" /></Link>
          </div>
        </div>

        {typeTabs}

        {/* Form Content */}
        {isLoading ? loadingState : (
          <form onSubmit={handleSaveTransaction} className="stack-12">
            {renderFields()}
            <div className="sticky-foot" style={{ borderTop: '1px solid var(--border)', paddingBottom: 'calc(12px + env(safe-area-inset-bottom))' }}>
              {renderSubmit()}
            </div>
          </form>
        )}
      </div>
    )
  }

  // ── Modal Mode (overlay: mobile bottom-sheet + desktop centered modal) ─────
  return (
    <div className="cd" style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      {/* Backdrop */}
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(8,20,18,.55)', backdropFilter: 'blur(4px)' }} onClick={onClose} />

      {/* ===== MOBILE BOTTOM SHEET ===== */}
      {!isWeb && (
      <div
        style={{ position: 'relative', zIndex: 50, width: '100%', maxHeight: '92vh', display: 'flex', flexDirection: 'column', background: 'var(--surface)', borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' }}
      >
        {/* Drag handle */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 10, paddingBottom: 2, flexShrink: 0 }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--border-strong)' }} />
        </div>

        {/* Header */}
        <div className="top" style={{ padding: '4px 16px 8px', flexShrink: 0 }}>
          <div className="top-l">
            <button type="button" onClick={onClose} className="icon-btn ghost" aria-label="Tutup"><X className="i" /></button>
            <h2 className="h2">{titleText}</h2>
          </div>
          <div className="hstack" style={{ gap: 6 }}>
            <Link href="/scan-receipt" className="icon-btn" aria-label="Scan struk"><ScanLine className="i" /></Link>
            <Link href="/voice-transaction" className="icon-btn" aria-label="Input suara"><Mic className="i" /></Link>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ padding: '0 16px 12px', flexShrink: 0 }}>{typeTabs}</div>

        {isLoading ? (
          <div style={{ padding: '0 16px' }}>{loadingState}</div>
        ) : (
          <form onSubmit={handleSaveTransaction} style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div className="stack-12" style={{ flex: 1, overflowY: 'auto', overscrollBehavior: 'contain', padding: '4px 16px 16px' }}>
              {renderFields()}
            </div>
            <div style={{ flexShrink: 0, padding: '12px 16px calc(12px + env(safe-area-inset-bottom))', borderTop: '1px solid var(--border)', background: 'var(--surface)' }}>
              {renderSubmit()}
            </div>
          </form>
        )}
      </div>
      )}

      {/* ===== DESKTOP MODAL (TambahWeb: 760px, two columns) ===== */}
      {isWeb && (
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="tx-modal-title"
        style={{ position: 'relative', zIndex: 50, width: 'calc(100% - 48px)', maxWidth: 760, maxHeight: '90vh', display: 'flex', flexDirection: 'column', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 24, overflow: 'hidden', margin: 'auto' }}
      >
        <div className="between" style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <h2 className="h2" id="tx-modal-title" style={{ fontSize: 18 }}>{titleText}</h2>
          <div className="hstack" style={{ gap: 6 }}>
            <Link href="/scan-receipt" className="btn-2" style={{ height: 40 }}><ScanLine className="i i-s" />Scan struk</Link>
            <Link href="/voice-transaction" className="btn-2" style={{ height: 40 }}><Mic className="i i-s" />Suara</Link>
            <button type="button" onClick={onClose} className="icon-btn ghost" aria-label="Tutup"><X className="i" /></button>
          </div>
        </div>

        {isLoading ? (
          <div style={{ padding: '0 24px' }}>{loadingState}</div>
        ) : (
          <form onSubmit={handleSaveTransaction} style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'flex-start' }}>
              <div className="stack-12" style={{ flex: '1 1 280px', minWidth: 0 }}>
                {typeTabs}
                {renderTop()}
                {renderNotes()}
              </div>
              {type !== 'topup' && (
                <div style={{ flex: '1.3 1 340px', minWidth: 0 }}>
                  {renderCategory()}
                </div>
              )}
            </div>
            <div className="between" style={{ flexShrink: 0, padding: '16px 24px', borderTop: '1px solid var(--border)', background: 'var(--surface)', gap: 12 }}>
              <div className="hstack" style={{ gap: 16 }}>
                {editingTransaction && (
                  <button type="button" className="link" style={{ color: 'var(--danger)', display: 'inline-flex', alignItems: 'center', gap: 6 }} disabled={saving} onClick={handleDeleteFromForm}>
                    <Trash2 className="i i-s" />Hapus transaksi
                  </button>
                )}
                <span className="lbl">Tekan Enter untuk simpan, Esc untuk tutup</span>
              </div>
              <div className="hstack" style={{ gap: 8 }}>
                <button type="button" className="btn-2" onClick={onClose} disabled={saving}>Batal</button>
                <button type="submit" className="btn" style={{ height: 44, fontSize: 14 }} disabled={saving || isLoading}>{submitLabel}</button>
              </div>
            </div>
          </form>
        )}
      </div>
      )}
    </div>
  )
}

'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ChevronLeft, ChevronRight, Calendar, Eye, EyeOff, ArrowDownLeft, ArrowUpRight,
  AlertTriangle, X, StickyNote, HandCoins, Info, Download, RotateCw, Receipt, Plus, Trash2,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import {
  getTransactions, getWallets, getBudgets, getDebts, getLatestNote, getNotesCount,
  getFreshWalletBalance,
} from '@/lib/queries'
import { useToast } from '@/hooks/useToast'
import { useConfirm } from '@/hooks/useConfirm'
import { useIsWeb } from '@/hooks/useIsWeb'
import { deleteTransactionWithRollback } from '@/lib/transactions'
import TransactionModal from '@/components/TransactionModal'
import { SkeletonRows } from '@/components/Skeleton'
import { getRecurringBills } from '@/lib/recurring-bills'
import { getCategoryIcon } from '@/lib/categories'
import { getPercentageChange, formatPeriodLabel } from '@/lib/format'
import { Wallet, Transaction, Budget, Debt, Note, RecurringBill, CustomCategoryDef } from '@/types'
import PeriodSheet from '@/components/PeriodSheet'
import CalendarCard from '@/components/CalendarCard'
import EmptyState from '@/components/EmptyState'
import { exportTransactionsExcel, FilterHistoryEntry } from '@/lib/exportExcel'

type CustomMap = { pengeluaran: (string | CustomCategoryDef)[]; pemasukan: (string | CustomCategoryDef)[] }

// Built-in category -> catatduit color class (DESIGN.md section 6).
const CAT_CLASS: Record<string, string> = {
  'Kebutuhan Dapur': 'c-dapur', 'Makan di Luar': 'c-makan', 'Transportasi': 'c-transport',
  'Tempat Tinggal': 'c-rumah', 'Tagihan': 'c-tagihan', 'Belanja': 'c-belanja',
  'Kesehatan': 'c-kesehatan', 'Cicilan & Utang': 'c-cicilan', 'Pribadi & Hiburan': 'c-hiburan',
  'Edukasi & Donasi': 'c-edukasi', 'Gaji': 'c-gaji', 'Bonus & Hadiah': 'c-bonus',
  'Investasi': 'c-investasi', 'Penjualan': 'c-belanja', 'Lainnya': 'c-lain',
}
const rp = (n: number) => `Rp ${n.toLocaleString('id-ID')}`
const rpShort = (n: number) => {
  const a = Math.abs(n)
  if (a >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(a % 1_000_000 ? 1 : 0)}jt`
  if (a >= 1_000) return `Rp ${Math.round(n / 1_000)}rb`
  return `Rp ${n}`
}
const timeLabel = (t: Transaction) =>
  new Date(t.date || t.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace(':', '.')

// Small info icon next to a metric label; tap toggles the definition (DESIGN.md 7.1).
function InfoTip({ label, children }: { label: string; children: React.ReactNode }) {
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null)
  useEffect(() => {
    if (!pos) return
    const close = () => setPos(null)
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    return () => { window.removeEventListener('scroll', close, true); window.removeEventListener('resize', close) }
  }, [pos])
  const toggle = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault(); e.stopPropagation()
    if (pos) { setPos(null); return }
    // Fixed position, clamped so the 240px popover stays inside the viewport.
    const r = e.currentTarget.getBoundingClientRect()
    setPos({ left: Math.max(16, Math.min(r.left - 8, window.innerWidth - 256)), top: r.bottom + 6 })
  }
  return (
    <span className="tip-anchor">
      <button type="button" className="tip-btn" aria-label={`Info ${label}`} aria-expanded={!!pos} onClick={toggle}>
        <Info className="i" />
      </button>
      {pos && (
        <>
          <span className="tip-scrim" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPos(null) }} />
          <span className="tip-pop" role="tooltip" style={{ left: pos.left, top: pos.top }}>{children}</span>
        </>
      )}
    </span>
  )
}

export default function HomePage() {
  const router = useRouter()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [wallets, setWallets] = useState<Wallet[]>([])
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [debts, setDebts] = useState<Debt[]>([])
  const [latestNote, setLatestNote] = useState<Note | null>(null)
  const [noteCount, setNoteCount] = useState(0)
  const [bills, setBills] = useState<RecurringBill[]>([])
  const [billPayments, setBillPayments] = useState<Record<number, boolean>>({})
  const [customCategories, setCustomCategories] = useState<CustomMap>({ pengeluaran: [], pemasukan: [] })
  const [loading, setLoading] = useState(true)

  const [currentDate, setCurrentDate] = useState(new Date())
  const [filterMode, setFilterMode] = useState<'monthly' | 'custom'>('monthly')
  const [customRange, setCustomRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0],
  })
  const [showSettings, setShowSettings] = useState(false)
  // Nominal is hidden every time the app opens (old behaviour, DESIGN.md 6).
  const [showBalance, setShowBalance] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  const [filterHistory, setFilterHistory] = useState<FilterHistoryEntry[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const [calendarKey, setCalendarKey] = useState(0)
  // Web (>=768px) layout + transaction modal (DESIGN.md 7.1 web, TambahWeb)
  const isWeb = useIsWeb()
  const [recentNotes, setRecentNotes] = useState<Note[]>([])
  const [txModal, setTxModal] = useState<{ editing: Transaction | null; type?: 'pengeluaran' | 'pemasukan' | 'topup' } | null>(null)
  const { showConfirm } = useConfirm()

  const { showToast } = useToast()
  const [lunasiDebt, setLunasiDebt] = useState<Debt | null>(null)
  const [repayingWalletId, setRepayingWalletId] = useState<number | null>(null)

  const loadAll = useCallback(async () => {
    const month = new Date().toISOString().slice(0, 7)
    const [txRes, wRes, bRes, dRes, noteRes, noteCountRes, billsData, bpRes, csRes, notesRes] = await Promise.all([
      getTransactions(), getWallets(), getBudgets(), getDebts(),
      getLatestNote(), getNotesCount(), getRecurringBills(),
      supabase.from('bill_payments').select('bill_id').eq('month', month),
      supabase.from('user_settings').select('custom_categories').eq('id', 1).single(),
      supabase.from('notes').select('*').order('updated_at', { ascending: false }).limit(2),
    ])
    if (txRes.data) setTransactions(txRes.data as Transaction[])
    if (wRes.data) setWallets(wRes.data as Wallet[])
    if (bRes.data) setBudgets(bRes.data as Budget[])
    if (dRes.data) setDebts(dRes.data as Debt[])
    if (noteRes.data) setLatestNote(noteRes.data as Note)
    if (notesRes.data) setRecentNotes(notesRes.data as Note[])
    if (typeof noteCountRes.count === 'number') setNoteCount(noteCountRes.count)
    setBills(billsData || [])
    const bp: Record<number, boolean> = {}
    bpRes.data?.forEach(p => { bp[p.bill_id] = true })
    setBillPayments(bp)
    if (csRes.data?.custom_categories) setCustomCategories(csRes.data.custom_categories as CustomMap)
    setLoading(false)
  }, [])

  useEffect(() => { loadAll() }, [loadAll])

  // Filter settings sync with user_settings + filter_history (restored from the old dashboard).
  useEffect(() => {
    const loadSettings = async () => {
      const { data: settings } = await supabase.from('user_settings').select('*').eq('id', 1).single()
      if (settings) {
        if (settings.filter_mode) setFilterMode(settings.filter_mode as 'monthly' | 'custom')
        if (settings.custom_start_date && settings.custom_end_date) {
          setCustomRange({ start: settings.custom_start_date, end: settings.custom_end_date })
        }
      } else {
        await supabase.from('user_settings').insert({
          id: 1,
          filter_mode: 'monthly',
          custom_start_date: customRange.start,
          custom_end_date: customRange.end,
          updated_at: new Date().toISOString(),
        })
      }
      const { data: historyData } = await supabase.from('filter_history').select('*').order('start_date', { ascending: true })
      if (historyData) setFilterHistory(historyData as FilterHistoryEntry[])
      setIsInitialized(true)
    }
    loadSettings()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!isInitialized) return
    const timeoutId = setTimeout(async () => {
      await supabase.from('user_settings').update({
        filter_mode: filterMode,
        custom_start_date: customRange.start,
        custom_end_date: customRange.end,
        updated_at: new Date().toISOString(),
      }).eq('id', 1)

      // Custom ranges of 2+ days are kept for the "Rekap per rentang" Excel sheet.
      if (filterMode === 'custom') {
        const durationMs = new Date(customRange.end).getTime() - new Date(customRange.start).getTime()
        if (durationMs >= 2 * 24 * 60 * 60 * 1000) {
          const fmt = (d: string) => new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
          await supabase.from('filter_history').upsert(
            { start_date: customRange.start, end_date: customRange.end, label: `${fmt(customRange.start)} – ${fmt(customRange.end)}` },
            { onConflict: 'start_date,end_date' },
          )
          const { data: historyData } = await supabase.from('filter_history').select('*').order('start_date', { ascending: true })
          if (historyData) setFilterHistory(historyData as FilterHistoryEntry[])
        }
      }
    }, 500)
    return () => clearTimeout(timeoutId)
  }, [filterMode, customRange, isInitialized])

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadAll()
    setCalendarKey(k => k + 1)
    setRefreshing(false)
    showToast('success', 'Data diperbarui')
  }

  const handleExport = () => {
    let periodLabel: string
    let fileNamePeriod: string
    if (filterMode === 'monthly') {
      periodLabel = currentDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
      fileNamePeriod = currentDate.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' }).replace(/ /g, '_')
    } else {
      const s = new Date(customRange.start).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
      const e = new Date(customRange.end).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
      periodLabel = `${s} - ${e}`
      fileNamePeriod = `${customRange.start}_sd_${customRange.end}`
    }
    exportTransactionsExcel({ periodLabel, fileNamePeriod, filteredTransactions, transactions, wallets, filterHistory, showToast })
  }

  // Mark a piutang as paid: create the income transaction, flag the debt paid,
  // and credit the receiving wallet (fresh balance). Mirrors the old dashboard.
  const markDebtAsPaid = async (debt: Debt, targetWalletId: number) => {
    setRepayingWalletId(targetWalletId)
    const { data: trx, error: trxError } = await supabase.from('transactions').insert({
      title: `Pelunasan Piutang: ${debt.person_name}`,
      amount: debt.amount,
      type: 'pemasukan',
      category: 'Lainnya',
      wallet_id: targetWalletId,
      date: new Date().toISOString(),
      created_at: new Date().toISOString(),
      is_piutang: true,
      piutang_person: debt.person_name,
    }).select()

    if (trxError || !trx) {
      showToast('error', 'Pelunasan gagal disimpan. Coba lagi.')
      setRepayingWalletId(null)
      return
    }

    const { error: debtError } = await supabase.from('debts').update({
      status: 'paid',
      payment_wallet_id: targetWalletId,
      payment_transaction_id: trx[0].id,
      paid_at: new Date().toISOString(),
    }).eq('id', debt.id)

    const freshBalance = await getFreshWalletBalance(targetWalletId)
    if (freshBalance !== null) {
      await supabase.from('wallets').update({ balance: freshBalance + debt.amount }).eq('id', targetWalletId)
    }

    if (!debtError) {
      showToast('success', `Piutang ${debt.person_name} lunas`)
      setLunasiDebt(null)
      await loadAll()
    } else {
      showToast('error', 'Pelunasan gagal disimpan. Coba lagi.')
    }
    setRepayingWalletId(null)
  }

  const activeDebts = useMemo(() => debts.filter(d => d.status === 'pending'), [debts])
  const totalPiutang = useMemo(() => activeDebts.reduce((a, d) => a + d.amount, 0), [activeDebts])
  const debtSource = (d: Debt) => {
    const src = transactions.find(t => t.id === d.original_transaction_id)
    const date = new Date(d.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
    return src?.title ? `Dari “${src.title}” · ${date}` : `Piutang · ${date}`
  }

  const getPeriodLabel = () => formatPeriodLabel(filterMode, currentDate, customRange)
  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))

  // ── Period-filtered transactions (same logic as before) ───────────────────
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const tDate = new Date(t.date || t.created_at); tDate.setHours(0, 0, 0, 0)
      if (filterMode === 'monthly') {
        return tDate.getMonth() === currentDate.getMonth() && tDate.getFullYear() === currentDate.getFullYear()
      }
      const start = new Date(customRange.start); start.setHours(0, 0, 0, 0)
      const end = new Date(customRange.end); end.setHours(0, 0, 0, 0)
      return tDate >= start && tDate <= end
    })
  }, [transactions, filterMode, currentDate, customRange])

  const { currentIncome, currentExpense } = useMemo(() => {
    const income = filteredTransactions.filter(t => t.type === 'pemasukan' && !t.is_piutang).reduce((a, c) => a + c.amount, 0)
    const expense = filteredTransactions.filter(t => t.type === 'pengeluaran' && !t.is_talangan).reduce((a, curr) => {
      const associated = debts.filter(d => d.original_transaction_id === curr.id)
      const split = associated.reduce((s, d) => s + d.amount, 0)
      return a + Math.max(0, curr.amount - split)
    }, 0)
    return { currentIncome: income, currentExpense: expense }
  }, [filteredTransactions, debts])

  const totalUsed = useMemo(() =>
    filteredTransactions.filter(t => t.type === 'pengeluaran' || t.type === 'topup').reduce((a, c) => a + c.amount, 0),
    [filteredTransactions])

  const { prevIncome, prevExpense } = useMemo(() => {
    let prevTx: Transaction[]
    if (filterMode === 'custom') {
      const DAY = 86400000
      const start = new Date(customRange.start); start.setHours(0, 0, 0, 0)
      const end = new Date(customRange.end); end.setHours(0, 0, 0, 0)
      const dur = end.getTime() - start.getTime()
      const prevEnd = new Date(start.getTime() - DAY); prevEnd.setHours(0, 0, 0, 0)
      const prevStart = new Date(prevEnd.getTime() - dur); prevStart.setHours(0, 0, 0, 0)
      prevTx = transactions.filter(t => { const d = new Date(t.date || t.created_at); d.setHours(0, 0, 0, 0); return d >= prevStart && d <= prevEnd })
    } else {
      const prev = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
      prevTx = transactions.filter(t => { const d = new Date(t.date || t.created_at); return d.getMonth() === prev.getMonth() && d.getFullYear() === prev.getFullYear() })
    }
    const income = prevTx.filter(t => t.type === 'pemasukan' && !t.is_piutang).reduce((a, c) => a + c.amount, 0)
    const expense = prevTx.filter(t => t.type === 'pengeluaran' && !t.is_talangan).reduce((a, curr) => {
      const associated = debts.filter(d => d.original_transaction_id === curr.id)
      const split = associated.reduce((s, d) => s + d.amount, 0)
      return a + Math.max(0, curr.amount - split)
    }, 0)
    return { prevIncome: income, prevExpense: expense }
  }, [transactions, currentDate, debts, filterMode, customRange])

  const incomeChange = getPercentageChange(currentIncome, prevIncome)
  const expenseChange = getPercentageChange(currentExpense, prevExpense)

  const activeWallets = wallets.filter(w => w.category === 'active')
  const activeBalance = activeWallets.reduce((a, w) => a + w.balance, 0)
  const savingsTotal = wallets.filter(w => w.category === 'savings').reduce((a, w) => a + w.balance, 0)

  // Cash-flow status
  const usedPct = currentIncome > 0 ? Math.min(100, Math.round((totalUsed / currentIncome) * 100)) : 0
  const sisa = currentIncome - totalUsed
  const cashStatus = usedPct > 100 || sisa < 0
    ? { cls: 'b-bad', text: 'Lewat' }
    : usedPct >= 80 ? { cls: 'b-warn', text: 'Hati-hati' } : { cls: 'b-ok', text: 'Masih terkendali' }

  // Top budgets this period
  const topBudgets = useMemo(() => {
    const spentOf = (cat: string) => filteredTransactions.filter(t => t.type === 'pengeluaran' && !t.is_talangan && t.category === cat).reduce((a, c) => a + c.amount, 0)
    return budgets.map(b => {
      const spent = spentOf(b.category)
      const pct = b.amount > 0 ? (spent / b.amount) * 100 : 0
      return { b, spent, pct, over: spent > b.amount }
    }).sort((a, z) => z.pct - a.pct).slice(0, 2)
  }, [budgets, filteredTransactions])

  // Recurring bills: unpaid expense bills, soonest first, top 3 + urgent flag
  const dueBills = useMemo(() => {
    const today = new Date().getDate()
    const eff = (d: number) => (d < today ? d + 31 : d)
    return bills.filter(b => (b.type ?? 'pengeluaran') === 'pengeluaran' && !billPayments[b.id])
      .sort((a, z) => eff(a.due_date) - eff(z.due_date))
  }, [bills, billPayments])
  const urgentBill = dueBills.find(b => { const diff = b.due_date - new Date().getDate(); return diff >= 0 && diff <= 3 })
  const topBills = dueBills.slice(0, 3)

  const recentTx = useMemo(() => {
    return [...filteredTransactions].sort((a, z) => {
      const d = new Date(z.date || z.created_at).getTime() - new Date(a.date || a.created_at).getTime()
      return d !== 0 ? d : new Date(z.created_at).getTime() - new Date(a.created_at).getTime()
    }).slice(0, 4)
  }, [filteredTransactions])

  const walletName = (id: number | null | undefined) => wallets.find(w => w.id === id)?.name || '—'

  const txIcon = (t: Transaction) => {
    const { Icon } = getCategoryIcon(t.category, t.type, customCategories)
    const cls = t.is_piutang ? 'c-piutang' : t.type === 'topup' ? 'c-transfer' : (CAT_CLASS[t.category] || 'c-lain')
    return { Icon, cls }
  }

  const today = new Date().toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })

  // Sheets / modals shared by the mobile and web layouts.
  const overlays = (
    <>
      {/* Filter & period sheet */}
      <PeriodSheet
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        filterMode={filterMode}
        setFilterMode={setFilterMode}
        currentDate={currentDate}
        setCurrentDate={setCurrentDate}
        customRange={customRange}
        setCustomRange={setCustomRange}
      />

      {/* Lunasi piutang sheet */}
      {lunasiDebt && (
        <>
          <div className="scrim" onClick={() => repayingWalletId === null && setLunasiDebt(null)} />
          <div className="sheet">
            <div className="grabber" />
            <div className="between">
              <h2 className="h2">Lunasi piutang</h2>
              <button className="icon-btn ghost" aria-label="Tutup" onClick={() => setLunasiDebt(null)} disabled={repayingWalletId !== null}><X className="i" /></button>
            </div>
            <div className="hstack" style={{ gap: 12 }}>
              <div className="ic c-piutang"><HandCoins className="i" /></div>
              <div>
                <div className="t">{lunasiDebt.person_name}</div>
                <div className="meta">Terima {rp(lunasiDebt.amount)} ke dompet</div>
              </div>
            </div>
            <div className="field">Masuk ke dompet
              <div className="stack" style={{ gap: 8 }}>
                {activeWallets.map(w => (
                  <button
                    key={w.id}
                    className="input"
                    style={{ justifyContent: 'space-between', cursor: 'pointer', textAlign: 'left' }}
                    disabled={repayingWalletId !== null}
                    onClick={() => markDebtAsPaid(lunasiDebt, w.id)}
                  >
                    <span style={{ fontWeight: 600 }}>{w.name}</span>
                    <span className="lbl">{repayingWalletId === w.id ? 'Menyimpan…' : rp(w.balance)}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
      {/* Transaction add / edit modal (web) */}
      {txModal && (
        <TransactionModal
          isOpen
          mode="modal"
          editingTransaction={txModal.editing}
          initialType={txModal.editing ? undefined : (txModal.type || 'pengeluaran')}
          wallets={wallets}
          transactions={transactions}
          budgets={budgets}
          customCategories={customCategories}
          onCustomCategoriesChange={(c) => setCustomCategories(c)}
          onClose={() => setTxModal(null)}
          onSaved={() => { setTxModal(null); loadAll() }}
        />
      )}
    </>
  )

  // ── 6-period cash-flow chart (web) — same income/expense rules as the cards ──
  const chartMonths = (() => {
    const anchor = filterMode === 'monthly' ? currentDate : new Date(customRange.end)
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(anchor.getFullYear(), anchor.getMonth() - 5 + i, 1)
      const inMonth = transactions.filter(t => { const td = new Date(t.date || t.created_at); return td.getMonth() === d.getMonth() && td.getFullYear() === d.getFullYear() })
      const income = inMonth.filter(t => t.type === 'pemasukan' && !t.is_piutang).reduce((a, c) => a + c.amount, 0)
      const expense = inMonth.filter(t => t.type === 'pengeluaran' && !t.is_talangan).reduce((a, c) => {
        const split = debts.filter(x => x.original_transaction_id === c.id).reduce((q, x) => q + x.amount, 0)
        return a + Math.max(0, c.amount - split)
      }, 0)
      return { key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleDateString('id-ID', { month: 'short' }), income, expense, current: i === 5 }
    })
  })()
  const chartMax = Math.max(1, ...chartMonths.map(m => Math.max(m.income, m.expense)))

  const billStatus = (b: RecurringBill) => {
    if (billPayments[b.id]) return { cls: 'b-ok', text: 'Lunas' }
    const diff = b.due_date - new Date().getDate()
    if (diff < 0) return { cls: 'b-bad', text: 'Terlewat' }
    if (diff <= 3) return { cls: 'b-warn', text: diff === 0 ? 'Hari ini' : `${diff} hari lagi` }
    return { cls: 'b-neutral', text: `Tgl ${b.due_date}` }
  }
  const webBills = [
    ...dueBills,
    ...bills.filter(b => (b.type ?? 'pengeluaran') === 'pengeluaran' && billPayments[b.id]),
  ].slice(0, 4)
  const webBudgets = budgets.map(b => {
    const spent = filteredTransactions.filter(t => t.type === 'pengeluaran' && !t.is_talangan && t.category === b.category).reduce((a, c) => a + c.amount, 0)
    const pct = b.amount > 0 ? (spent / b.amount) * 100 : 0
    return { b, spent, pct, over: spent > b.amount }
  }).sort((a, z) => z.pct - a.pct).slice(0, 4)
  const webTx = [...filteredTransactions].sort((a, z) => {
    const d = new Date(z.date || z.created_at).getTime() - new Date(a.date || a.created_at).getTime()
    return d !== 0 ? d : new Date(z.created_at).getTime() - new Date(a.created_at).getTime()
  }).slice(0, 6)
  const handleWebDelete = async (id: number) => {
    const res = await deleteTransactionWithRollback(id, { confirm: showConfirm, toast: showToast })
    if (res.deleted) await loadAll()
  }
  const longDate = new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const changeText = (pct: number, prev: number) => prev > 0 ? `${pct >= 0 ? 'Naik' : 'Turun'} ${Math.abs(pct).toFixed(0)}% dari periode lalu` : 'Belum ada data periode lalu'

  if (isWeb) {
    return (
      <div className="cd" style={{ minHeight: '100vh', background: 'var(--bg)' }}>
        <main className="main">
          {/* Header */}
          <div className="ptop">
            <div>
              <p className="sub" style={{ textTransform: 'capitalize' }}>{longDate}</p>
              <h1 className="ptitle">Halo, Eko</h1>
            </div>
            <div className="hstack" style={{ flexWrap: 'wrap', gap: 8 }}>
              <button className="icon-btn" aria-label="Periode sebelumnya" disabled={filterMode === 'custom'} onClick={prevMonth}><ChevronLeft className="i i-s" /></button>
              <button className="btn-2" onClick={() => setShowSettings(true)}><Calendar className="i i-s" />{getPeriodLabel()}</button>
              <button className="icon-btn" aria-label="Periode berikutnya" disabled={filterMode === 'custom'} onClick={nextMonth}><ChevronRight className="i i-s" /></button>
              <button className="icon-btn" aria-label={showBalance ? 'Sembunyikan angka' : 'Tampilkan angka'} aria-pressed={showBalance} onClick={() => setShowBalance(v => !v)}>{showBalance ? <EyeOff className="i" /> : <Eye className="i" />}</button>
              <button className="btn" onClick={() => setTxModal({ editing: null, type: 'pengeluaran' })}><Plus className="i i-s" />Tambah transaksi</button>
            </div>
          </div>

          {/* Row 1: hero + income + expense */}
          <div className="wrap">
            <div className="hero stack-12" style={{ flex: '2 1 380px' }}>
              <div className="lbl hstack" style={{ gap: 4 }}>Saldo aktif · siap dipakai dari {activeWallets.length} dompet<InfoTip label="saldo aktif">Total sisa saldo dari dompet bertipe Aktif. Uang yang siap digunakan untuk transaksi sehari-hari.</InfoTip></div>
              <div className="num-xl" style={{ fontSize: 36 }}>{showBalance ? rp(activeBalance) : 'Rp ••••••'}</div>
              <Link href="/wallets?tab=tabungan" className="between" style={{ color: '#FFFFFF', textDecoration: 'none', borderTop: '1px solid rgba(255,255,255,.18)', paddingTop: 12, marginTop: 'auto' }}>
                <span className="lbl hstack" style={{ gap: 4 }}>Aset tersimpan (tabungan inti)<InfoTip label="aset tersimpan">Total saldo dari semua dompet bertipe Tabungan. Uang yang disimpan dan tidak untuk pengeluaran harian.</InfoTip></span>
                <span className="hstack" style={{ fontWeight: 700 }}>{showBalance ? rp(savingsTotal) : 'Rp ••••'}<ChevronRight className="i i-s" /></span>
              </Link>
            </div>
            <div className="card stack" style={{ flex: '1 1 200px', padding: 20 }}>
              <div className="ic c-gaji"><ArrowDownLeft className="i" /></div>
              <div className="lbl hstack" style={{ marginTop: 4, gap: 4 }}>Pemasukan<InfoTip label="pemasukan">Semua transaksi masuk pada periode ini. Pembayaran piutang tidak dihitung sebagai pemasukan.</InfoTip></div>
              <div className="num-l">{showBalance ? rp(currentIncome) : 'Rp ••••••'}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: incomeChange >= 0 ? 'var(--income)' : 'var(--text-2)' }}>{changeText(incomeChange, prevIncome)}</div>
            </div>
            <div className="card stack" style={{ flex: '1 1 200px', padding: 20 }}>
              <div className="ic c-transfer"><ArrowUpRight className="i" /></div>
              <div className="lbl hstack" style={{ marginTop: 4, gap: 4 }}>Pengeluaran<InfoTip label="pengeluaran">Semua transaksi keluar pada periode ini. Transaksi talangan tidak dihitung sebagai pengeluaran.</InfoTip></div>
              <div className="num-l">{showBalance ? rp(currentExpense) : 'Rp ••••••'}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)' }}>{changeText(expenseChange, prevExpense)}</div>
            </div>
          </div>

          {/* Row 2: cash flow + recurring bills (+ active piutang) */}
          <div className="wrap">
            <section className="card stack-12" style={{ flex: '3 1 420px', padding: 20 }}>
              <div className="between"><h2 className="h2">Ringkasan arus kas</h2><span className={`badge ${cashStatus.cls}`}>{cashStatus.text}</span></div>
              <div style={{ fontSize: 14 }}>Kamu sudah pakai <b>{usedPct}%</b> dari pemasukan periode ini.</div>
              <div className={`bar thick ${sisa < 0 ? 'over' : ''}`}><div style={{ width: `${usedPct}%` }} /></div>
              <div className="g3" style={{ gap: 16 }}>
                <div><div className="lbl">Pemasukan</div><div className="num-m">{rp(currentIncome)}</div><div className="lbl">Tidak termasuk piutang</div></div>
                <div><div className="lbl">Uang dipakai</div><div className="num-m">{rp(totalUsed)}</div><div className="lbl">Pengeluaran + transfer</div></div>
                <div><div className="lbl">Sisa belum terpakai</div><div className="num-m" style={{ color: sisa >= 0 ? 'var(--accent)' : 'var(--danger)' }}>{rp(sisa)}</div><div className="lbl">Pemasukan − dipakai</div></div>
              </div>
            </section>
            <div className="stack" style={{ flex: '2 1 300px', gap: 16 }}>
              {webBills.length > 0 && (
                <section className="card stack" style={{ padding: 20 }}>
                  <div className="between"><h2 className="h2">Tagihan rutin</h2><Link className="link" href="/recurring">Kelola</Link></div>
                  {urgentBill && <div className="banner warn"><AlertTriangle className="i" />{urgentBill.name} jatuh tempo {Math.max(0, urgentBill.due_date - new Date().getDate())} hari lagi</div>}
                  {webBills.map(b => {
                    const st = billStatus(b)
                    return (
                      <div className="row" key={b.id}>
                        <div className="ic-s c-tagihan"><Calendar className="i i-s" /></div>
                        <div className="grow"><div className="t">{b.name}</div><div className="meta">{rp(b.amount)} · tgl {b.due_date}</div></div>
                        <span className={`badge ${st.cls}`}>{st.text}</span>
                      </div>
                    )
                  })}
                </section>
              )}
              {activeDebts.length > 0 && (
                <section className="card stack" style={{ padding: 20, gap: 4 }} aria-labelledby="pa-web-title">
                  <div className="between" style={{ paddingBottom: 8 }}>
                    <div><h2 className="h2" id="pa-web-title">Piutang aktif</h2><p className="sub">Uang kamu yang masih di orang lain</p></div>
                    <div style={{ textAlign: 'right' }}><div className="lbl">Total</div><div className="num-m">{rp(totalPiutang)}</div></div>
                  </div>
                  {activeDebts.map(d => (
                    <div className="row" key={d.id}>
                      <div className="avatar" style={{ width: 36, height: 36, fontSize: 13, borderRadius: 10, background: 'var(--income-tint)', color: 'var(--income)' }}>{d.person_name.charAt(0).toUpperCase()}</div>
                      <div className="grow"><div className="t">{d.person_name}</div><div className="meta">{debtSource(d)}</div></div>
                      <div className="amt">{rp(d.amount)}</div>
                      <button className="chip" style={{ height: 32, color: 'var(--accent)', borderColor: 'var(--accent)' }} onClick={() => setLunasiDebt(d)}>Lunas</button>
                    </div>
                  ))}
                </section>
              )}
            </div>
          </div>

          {/* Row 3: chart + budgets */}
          <div className="wrap">
            <section className="card stack-12" style={{ flex: '3 1 460px', padding: 20 }}>
              <div className="between" style={{ flexWrap: 'wrap' }}>
                <h2 className="h2">Arus kas 6 periode</h2>
                <div className="hstack" style={{ gap: 14, fontSize: 12, color: 'var(--text-2)' }}>
                  <span className="hstack" style={{ gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--income-chart)' }} />Pemasukan</span>
                  <span className="hstack" style={{ gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--accent)' }} />Pengeluaran</span>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '44px repeat(6, minmax(0, 1fr))', gap: 10, alignItems: 'end', height: 190 }}>
                <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-2)' }}><span>{rpShort(chartMax).replace('Rp ', '')}</span><span>{rpShort(chartMax / 2).replace('Rp ', '')}</span><span>0</span></div>
                {chartMonths.map(m => (
                  <div key={m.key} className="hstack" style={{ height: '100%', alignItems: 'flex-end', justifyContent: 'center', gap: 4, borderBottom: '1px solid var(--border)' }}>
                    <div title={`Pemasukan ${rp(m.income)}`} style={{ width: 18, height: `${(m.income / chartMax) * 100}%`, minHeight: 2, background: 'var(--income-chart)', borderRadius: '6px 6px 0 0' }} />
                    <div title={`Pengeluaran ${rp(m.expense)}`} style={{ width: 18, height: `${(m.expense / chartMax) * 100}%`, minHeight: 2, background: 'var(--accent)', borderRadius: '6px 6px 0 0' }} />
                  </div>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '44px repeat(6, minmax(0, 1fr))', gap: 10, textAlign: 'center', fontSize: 12, color: 'var(--text-2)' }}>
                <span />
                {chartMonths.map(m => <span key={m.key} style={m.current ? { color: 'var(--text)', fontWeight: 700 } : undefined}>{m.label}</span>)}
              </div>
            </section>
            <section className="card stack-12" style={{ flex: '2 1 300px', padding: 20 }}>
              <div className="between"><h2 className="h2">Budget periode ini</h2><Link className="link" href="/budgets">Atur</Link></div>
              {webBudgets.length === 0 ? (
                <EmptyState icon={<Calendar className="i" />} title="Belum ada budget periode ini" text="Batasi kategori yang paling boros dulu." actionLabel="Buat budget" onAction={() => router.push('/budgets')} style={{ border: 0, padding: '8px 0' }} />
              ) : webBudgets.map(({ b, spent, pct, over }) => (
                <div className="stack" key={b.id} style={{ gap: 6 }}>
                  <div className="between" style={{ fontSize: 13 }}>
                    <span style={{ fontWeight: 600 }}>{b.category}</span>
                    {over ? <span className="bad" style={{ fontSize: 12, fontWeight: 700 }}>Lewat {Math.round(pct - 100)}% · {rpShort(spent)} / {rpShort(b.amount)}</span> : <span className="lbl">{rpShort(spent)} / {rpShort(b.amount)}</span>}
                  </div>
                  <div className={`bar ${over ? 'over' : ''}`}><div style={{ width: `${Math.min(pct, 100)}%`, ...(over ? {} : pct >= 80 ? { background: '#F59E0B' } : {}) }} /></div>
                </div>
              ))}
            </section>
          </div>

          {/* Row 4: recent transactions + notes + calendar */}
          <div className="wrap" style={{ alignItems: 'flex-start' }}>
            <section className="card" style={{ flex: '3 1 460px', padding: 20 }}>
              <div className="between" style={{ marginBottom: 8 }}>
                <h2 className="h2">Transaksi terakhir</h2>
                <div className="hstack" style={{ gap: 4 }}>
                  <button className="icon-btn ghost" style={{ width: 36, height: 36 }} aria-label="Export ke Excel" title="Export ke Excel" onClick={handleExport}><Download className="i i-s" /></button>
                  <button className="icon-btn ghost" style={{ width: 36, height: 36 }} aria-label="Muat ulang data" title="Muat ulang data" disabled={refreshing} onClick={handleRefresh}><RotateCw className={`i i-s ${refreshing ? 'animate-spin' : ''}`} /></button>
                  <Link className="link" href="/transactions">Lihat semua</Link>
                </div>
              </div>
              {loading ? <SkeletonRows count={4} /> : webTx.length === 0 ? (
                <EmptyState icon={<Receipt className="i" />} title="Catat transaksi pertama" text="Pengeluaran dan pemasukan periode ini muncul di sini." actionLabel="Tambah transaksi" onAction={() => setTxModal({ editing: null, type: 'pengeluaran' })} style={{ border: 0 }} />
              ) : webTx.map(t => {
                const { Icon, cls } = txIcon(t)
                const isSplit = debts.some(d => d.original_transaction_id === t.id)
                return (
                  <div className="row web-row" key={t.id}>
                    <button type="button" className="web-row-main" title="Klik untuk ubah" aria-label={`Ubah ${t.title || t.category}`} onClick={() => setTxModal({ editing: t })}>
                      <div className={`ic ${cls}`}><Icon className="i" /></div>
                      <div className="grow" style={{ minWidth: 0 }}>
                        <div className="hstack" style={{ gap: 6, minWidth: 0 }}>
                          <span className="t">{t.title || t.category}</span>
                          {t.is_piutang && <span className="badge b-neutral">Piutang</span>}
                          {t.is_talangan && <span className="badge b-neutral">Talangan</span>}
                          {isSplit && <span className="badge b-neutral">Split Bill</span>}
                        </div>
                        <div className="meta">{t.category} · {walletName(t.wallet_id)} · {new Date(t.date || t.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</div>
                      </div>
                      <div className={`amt ${t.type === 'pemasukan' ? 'pos' : ''}`} style={t.type === 'topup' ? { color: 'var(--text-2)' } : undefined}>{t.type === 'pemasukan' ? '+' : ''}{rp(t.amount)}</div>
                    </button>
                    <button className="icon-btn ghost del" style={{ width: 36, height: 36, color: 'var(--danger)' }} aria-label={`Hapus ${t.title || t.category}`} title="Hapus" onClick={() => handleWebDelete(t.id)}><Trash2 className="i i-s" /></button>
                  </div>
                )
              })}
            </section>
            <section className="card stack-12" style={{ flex: '2 1 300px', padding: 20 }}>
              <div className="between"><h2 className="h2">Catatan terbaru</h2><Link className="link" href="/notes">Semua</Link></div>
              {recentNotes.length === 0 ? (
                <EmptyState icon={<StickyNote className="i" />} title="Tulis catatan pertama" text="Utang, rencana belanja, atau apa pun soal uang." actionLabel="Tulis catatan" onAction={() => router.push('/notes')} style={{ border: 0, padding: '8px 0' }} />
              ) : recentNotes.map(n => (
                <Link href="/notes" className="tile" key={n.id} style={{ textDecoration: 'none', color: 'var(--text)', display: 'block' }}>
                  <div className="t">{n.title}</div>
                  {n.content && <div className="meta" style={{ whiteSpace: 'pre-line', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{n.content}</div>}
                  <div className="lbl" style={{ marginTop: 6 }}>{new Date(n.updated_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</div>
                </Link>
              ))}
            </section>
            <section style={{ flex: '2 1 300px', minWidth: 0 }}>
              <CalendarCard refreshTrigger={calendarKey} onUpdate={loadAll} />
            </section>
          </div>
        </main>
        {overlays}
      </div>
    )
  }


  return (
    <div className="cd" style={{ minHeight: '100vh', background: 'var(--surface)' }}>
      <div className="scroll" style={{ maxWidth: 720, margin: '0 auto', paddingBottom: 116 }}>
        {/* Header */}
        <div className="top">
          <div className="top-l">
            <div className="avatar">EB</div>
            <div>
              <p className="sub">{today}</p>
              <h1 className="h1" style={{ fontSize: 18 }}>Halo, Eko</h1>
            </div>
          </div>
        </div>

        {/* Period selector */}
        <div className="hstack" style={{ gap: 4 }}>
          <button className="icon-btn ghost" style={{ width: 36, height: 36 }} aria-label="Periode sebelumnya" disabled={filterMode === 'custom'} onClick={prevMonth}><ChevronLeft className="i i-s" /></button>
          <button className="chip" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setShowSettings(s => !s)}><Calendar className="i i-s" />{getPeriodLabel()}</button>
          <button className="icon-btn ghost" style={{ width: 36, height: 36 }} aria-label="Periode berikutnya" disabled={filterMode === 'custom'} onClick={nextMonth}><ChevronRight className="i i-s" /></button>
        </div>

        {/* Hero */}
        <div className="hero stack-12">
          <div className="between" style={{ alignItems: 'flex-start' }}>
            <div>
              <div className="lbl hstack" style={{ gap: 4 }}>Saldo aktif<InfoTip label="saldo aktif">Total sisa saldo dari dompet bertipe Aktif. Uang yang siap digunakan untuk transaksi sehari-hari.</InfoTip></div>
              <div className="num-xl" style={{ marginTop: 4 }}>{showBalance ? rp(activeBalance) : 'Rp ••••••'}</div>
              <div className="lbl" style={{ marginTop: 2 }}>Siap dipakai dari {activeWallets.length} dompet</div>
            </div>
            <button className="icon-btn" aria-label={showBalance ? 'Sembunyikan angka' : 'Tampilkan angka'} aria-pressed={showBalance} onClick={() => setShowBalance(v => !v)}>{showBalance ? <EyeOff className="i" /> : <Eye className="i" />}</button>
          </div>
          <div className="g2">
            <div className="hero-pill">
              <div className="ic-s" style={{ background: '#FFFFFF', color: 'var(--income)' }}><ArrowDownLeft className="i i-s" /></div>
              <div style={{ minWidth: 0 }}><div className="lbl" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 4 }}>Pemasukan<InfoTip label="pemasukan">Semua transaksi masuk pada periode ini. Pembayaran piutang tidak dihitung sebagai pemasukan.</InfoTip>{prevIncome > 0 ? ` · ${incomeChange >= 0 ? 'naik' : 'turun'} ${Math.abs(incomeChange).toFixed(0)}%` : ''}</div><div style={{ fontSize: 15, fontWeight: 700 }}>{showBalance ? rpShort(currentIncome) : '••'}</div></div>
            </div>
            <div className="hero-pill">
              <div className="ic-s" style={{ background: '#FFFFFF', color: 'var(--accent)' }}><ArrowUpRight className="i i-s" /></div>
              <div style={{ minWidth: 0 }}><div className="lbl" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 4 }}>Pengeluaran<InfoTip label="pengeluaran">Semua transaksi keluar pada periode ini. Transaksi talangan tidak dihitung sebagai pengeluaran.</InfoTip>{prevExpense > 0 ? ` · ${expenseChange >= 0 ? 'naik' : 'turun'} ${Math.abs(expenseChange).toFixed(0)}%` : ''}</div><div style={{ fontSize: 15, fontWeight: 700 }}>{showBalance ? rpShort(currentExpense) : '••'}</div></div>
            </div>
          </div>
          <Link href="/wallets?tab=tabungan" className="between" style={{ color: '#FFFFFF', textDecoration: 'none', borderTop: '1px solid rgba(255,255,255,.18)', paddingTop: 12, minHeight: 32 }}>
            <span className="lbl hstack" style={{ gap: 4 }}>Aset tersimpan (tabungan inti)<InfoTip label="aset tersimpan">Total saldo dari semua dompet bertipe Tabungan. Uang yang disimpan dan tidak untuk pengeluaran harian.</InfoTip></span>
            <span className="hstack" style={{ fontSize: 14, fontWeight: 700 }}>{showBalance ? rp(savingsTotal) : 'Rp ••••'} <ChevronRight className="i i-s" /></span>
          </Link>
        </div>

        {/* Cash flow summary */}
        <div className="card stack-12">
          <div className="between">
            <h2 className="h3">Ringkasan arus kas</h2>
            <span className={`badge ${cashStatus.cls}`}>{cashStatus.text}</span>
          </div>
          <div style={{ fontSize: 14 }}>Kamu sudah pakai <b>{usedPct}%</b> dari pemasukan periode ini.</div>
          <div className={`bar thick ${sisa < 0 ? 'over' : ''}`}><div style={{ width: `${usedPct}%` }} /></div>
          <div className="g3">
            <div><div className="lbl">Pemasukan</div><div className="num-m">{rpShort(currentIncome)}</div><div className="lbl">Tanpa piutang</div></div>
            <div><div className="lbl">Dipakai</div><div className="num-m">{rpShort(totalUsed)}</div><div className="lbl">Keluar + transfer</div></div>
            <div><div className="lbl">Sisa</div><div className="num-m" style={{ color: sisa >= 0 ? 'var(--accent)' : 'var(--danger)' }}>{rpShort(sisa)}</div><div className="lbl">Belum terpakai</div></div>
          </div>
        </div>

        {/* Tagihan rutin */}
        {topBills.length > 0 && (
          <div className="stack-12">
            <div className="between"><h2 className="h2">Tagihan rutin</h2><Link className="link" href="/recurring">Kelola</Link></div>
            {urgentBill && (
              <div className="banner warn"><AlertTriangle className="i" />{urgentBill.name} jatuh tempo {Math.max(0, urgentBill.due_date - new Date().getDate())} hari lagi</div>
            )}
            <div className="g3">
              {topBills.map(b => {
                const diff = b.due_date - new Date().getDate()
                const st = diff < 0 ? { cls: 'b-bad', text: 'Terlewat' } : diff <= 3 ? { cls: 'b-warn', text: diff === 0 ? 'Hari ini' : `${diff} hari` } : { cls: 'b-neutral', text: `Tgl ${b.due_date}` }
                return (
                  <div className="tile stack" key={b.id} style={{ gap: 6 }}>
                    <div className="ic-s c-tagihan"><Calendar className="i i-s" /></div>
                    <div className="t" style={{ fontSize: 13 }}>{b.name}</div>
                    <div className="lbl">{rp(b.amount)}</div>
                    <span className={`badge ${st.cls}`}>{st.text}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Piutang aktif */}
        {activeDebts.length > 0 && (
          <section className="card stack" style={{ gap: 4 }} aria-labelledby="pa-title">
            <div className="between" style={{ paddingBottom: 8 }}>
              <div><h2 className="h2" id="pa-title">Piutang aktif</h2><p className="sub">Uang kamu yang masih di orang lain</p></div>
              <div style={{ textAlign: 'right' }}><div className="lbl">Total</div><div className="num-m">{rp(totalPiutang)}</div></div>
            </div>
            {activeDebts.map(d => (
              <div className="row" key={d.id}>
                <div className="avatar" style={{ width: 40, height: 40, fontSize: 13, borderRadius: 12, background: 'var(--income-tint)', color: 'var(--income)' }}>
                  {d.person_name.charAt(0).toUpperCase()}
                </div>
                <div className="grow"><div className="t">{d.person_name}</div><div className="meta">{debtSource(d)}</div></div>
                <div style={{ textAlign: 'right' }}>
                  <div className="amt" style={{ marginBottom: 6 }}>{rp(d.amount)}</div>
                  <button className="chip" style={{ height: 32, color: 'var(--accent)', borderColor: 'var(--accent)' }} onClick={() => setLunasiDebt(d)}>Lunas</button>
                </div>
              </div>
            ))}
          </section>
        )}

        {/* Budget bulan ini */}
        {topBudgets.length > 0 && (
          <div className="card stack-12">
            <div className="between"><h2 className="h3">Budget bulan ini</h2><Link className="link" href="/budgets">Lihat semua</Link></div>
            {topBudgets.map(({ b, spent, pct, over }) => (
              <div className="stack" key={b.id} style={{ gap: 6 }}>
                <div className="between" style={{ fontSize: 13 }}>
                  <span style={{ fontWeight: 600 }}>{b.category}</span>
                  {over ? <span className="bad" style={{ fontSize: 12, fontWeight: 700 }}>Lewat {rpShort(spent - b.amount)}</span> : <span className="lbl">{rpShort(spent)} dari {rpShort(b.amount)}</span>}
                </div>
                <div className={`bar ${over ? 'over' : ''}`}><div style={{ width: `${Math.min(pct, 100)}%`, ...(over ? {} : pct >= 80 ? { background: '#F59E0B' } : {}) }} /></div>
              </div>
            ))}
          </div>
        )}

        {/* Kalender (stays on Beranda, DESIGN-TAMBAHAN §1) */}
        <CalendarCard refreshTrigger={calendarKey} onUpdate={loadAll} />

        {/* Catatan terbaru */}
        {latestNote && (
          <div className="stack-12">
            <div className="between"><h2 className="h2">Catatan terbaru</h2><Link className="link" href="/notes">Semua catatan</Link></div>
            <Link href="/notes" className="card hstack" style={{ gap: 12, alignItems: 'flex-start', textDecoration: 'none', color: 'var(--text)' }}>
              <div className="ic c-lain"><StickyNote className="i" /></div>
              <div className="grow">
                <div className="t">{latestNote.title}</div>
                {latestNote.content && <div className="meta" style={{ whiteSpace: 'normal' }}>{latestNote.content}</div>}
                {noteCount > 1 && <div className="lbl" style={{ marginTop: 4 }}>+{noteCount - 1} catatan lain</div>}
              </div>
            </Link>
          </div>
        )}

        {/* Transaksi terakhir */}
        <div className="stack-12">
          <div className="between">
            <h2 className="h2">Transaksi terakhir</h2>
            <div className="hstack" style={{ gap: 4 }}>
              <button className="icon-btn ghost" style={{ width: 36, height: 36 }} aria-label="Export ke Excel" onClick={handleExport}><Download className="i i-s" /></button>
              <button className="icon-btn ghost" style={{ width: 36, height: 36 }} aria-label="Muat ulang data" disabled={refreshing} onClick={handleRefresh}><RotateCw className={`i i-s ${refreshing ? 'animate-spin' : ''}`} /></button>
              <Link className="link" href="/transactions">Lihat semua</Link>
            </div>
          </div>
          {loading ? (
            <SkeletonRows count={4} />
          ) : recentTx.length === 0 ? (
            <EmptyState
              icon={<Receipt className="i" />}
              title="Catat transaksi pertama"
              text="Pengeluaran dan pemasukan periode ini muncul di sini."
              actionLabel="Tambah transaksi"
              onAction={() => router.push('/transaction')}
            />
          ) : (
            <>
              <span className="lbl" style={{ marginTop: -6 }}>Tap transaksi untuk ubah atau hapus.</span>
              <div className="card-flush">
                {recentTx.map(t => {
                  const { Icon, cls } = txIcon(t)
                  const isSplit = debts.some(d => d.original_transaction_id === t.id)
                  return (
                    <Link className="row rowlink" key={t.id} href={`/transaction?type=${t.type}&edit=${t.id}`} aria-label={`Ubah ${t.title || t.category}`}>
                      <div className={`ic ${cls}`}><Icon className="i" /></div>
                      <div className="grow">
                        <div className="hstack" style={{ gap: 6, minWidth: 0 }}>
                          <span className="t">{t.title || t.category}</span>
                          {t.is_piutang && <span className="badge b-neutral">Piutang</span>}
                          {t.is_talangan && <span className="badge b-neutral">Talangan</span>}
                          {isSplit && <span className="badge b-neutral">Split Bill</span>}
                        </div>
                        <div className="meta">{t.category} · {walletName(t.wallet_id)} · {timeLabel(t)}</div>
                      </div>
                      <div className={`amt ${t.type === 'pemasukan' ? 'pos' : ''}`} style={t.type === 'topup' ? { color: 'var(--text-2)' } : undefined}>{t.type === 'pemasukan' ? '+' : ''}{rp(t.amount)}</div>
                    </Link>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {overlays}
    </div>
  )
}

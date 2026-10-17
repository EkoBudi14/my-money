'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import {
  ChevronLeft, ChevronRight, Calendar, Eye, EyeOff, ArrowDownLeft, ArrowUpRight,
  AlertTriangle, X, TrendingDown, ArrowLeftRight, StickyNote,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import {
  getTransactions, getWallets, getBudgets, getDebts, getLatestNote, getNotesCount,
} from '@/lib/queries'
import { getRecurringBills } from '@/lib/recurring-bills'
import { getCategoryIcon } from '@/lib/categories'
import { getPercentageChange, formatPeriodLabel } from '@/lib/format'
import { Wallet, Transaction, Budget, Debt, Note, RecurringBill, CustomCategoryDef } from '@/types'
import DatePickerNeo from '@/components/DatePickerNeo'

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

export default function HomePage() {
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
  const [showBalance, setShowBalance] = useState(true)

  useEffect(() => {
    const load = async () => {
      const month = new Date().toISOString().slice(0, 7)
      const [txRes, wRes, bRes, dRes, noteRes, noteCountRes, billsData, bpRes, csRes] = await Promise.all([
        getTransactions(), getWallets(), getBudgets(), getDebts(),
        getLatestNote(), getNotesCount(), getRecurringBills(),
        supabase.from('bill_payments').select('bill_id').eq('month', month),
        supabase.from('user_settings').select('custom_categories').eq('id', 1).single(),
      ])
      if (txRes.data) setTransactions(txRes.data as Transaction[])
      if (wRes.data) setWallets(wRes.data as Wallet[])
      if (bRes.data) setBudgets(bRes.data as Budget[])
      if (dRes.data) setDebts(dRes.data as Debt[])
      if (noteRes.data) setLatestNote(noteRes.data as Note)
      if (typeof noteCountRes.count === 'number') setNoteCount(noteCountRes.count)
      setBills(billsData || [])
      const bp: Record<number, boolean> = {}
      bpRes.data?.forEach(p => { bp[p.bill_id] = true })
      setBillPayments(bp)
      if (csRes.data?.custom_categories) setCustomCategories(csRes.data.custom_categories as CustomMap)
      setLoading(false)
    }
    load()
  }, [])

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
              <div className="lbl">Saldo aktif</div>
              <div className="num-xl" style={{ marginTop: 4 }}>{showBalance ? rp(activeBalance) : 'Rp ••••••'}</div>
              <div className="lbl" style={{ marginTop: 2 }}>Siap dipakai dari {activeWallets.length} dompet</div>
            </div>
            <button className="icon-btn" aria-label="Sembunyikan nominal" onClick={() => setShowBalance(v => !v)}>{showBalance ? <Eye className="i" /> : <EyeOff className="i" />}</button>
          </div>
          <div className="g2">
            <div className="hero-pill">
              <div className="ic-s" style={{ background: '#FFFFFF', color: 'var(--income)' }}><ArrowDownLeft className="i i-s" /></div>
              <div><div className="lbl">Pemasukan{prevIncome > 0 ? ` · ${incomeChange >= 0 ? 'naik' : 'turun'} ${Math.abs(incomeChange).toFixed(0)}%` : ''}</div><div style={{ fontSize: 15, fontWeight: 700 }}>{showBalance ? rpShort(currentIncome) : '••'}</div></div>
            </div>
            <div className="hero-pill">
              <div className="ic-s" style={{ background: '#FFFFFF', color: 'var(--accent)' }}><ArrowUpRight className="i i-s" /></div>
              <div><div className="lbl">Pengeluaran{prevExpense > 0 ? ` · ${expenseChange >= 0 ? 'naik' : 'turun'} ${Math.abs(expenseChange).toFixed(0)}%` : ''}</div><div style={{ fontSize: 15, fontWeight: 700 }}>{showBalance ? rpShort(currentExpense) : '••'}</div></div>
            </div>
          </div>
          <Link href="/wallets?tab=tabungan" className="between" style={{ color: '#FFFFFF', textDecoration: 'none', borderTop: '1px solid rgba(255,255,255,.18)', paddingTop: 12, minHeight: 32 }}>
            <span className="lbl">Aset tersimpan (tabungan inti)</span>
            <span className="hstack" style={{ fontSize: 14, fontWeight: 700 }}>{showBalance ? rp(savingsTotal) : 'Rp ••••'} <ChevronRight className="i i-s" /></span>
          </Link>
        </div>

        {/* Quick add */}
        <div className="g3">
          <Link href="/transaction?type=pemasukan" className="btn-2" style={{ flexDirection: 'column', height: 'auto', padding: '12px 4px', gap: 6 }}><ArrowDownLeft className="i" style={{ color: 'var(--income)' }} />Pemasukan</Link>
          <Link href="/transaction?type=pengeluaran" className="btn-2" style={{ flexDirection: 'column', height: 'auto', padding: '12px 4px', gap: 6 }}><TrendingDown className="i" />Pengeluaran</Link>
          <Link href="/transaction?type=topup" className="btn-2" style={{ flexDirection: 'column', height: 'auto', padding: '12px 4px', gap: 6 }}><ArrowLeftRight className="i" style={{ color: 'var(--text-2)' }} />Transfer</Link>
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
          <div className="between"><h2 className="h2">Transaksi terakhir</h2><Link className="link" href="/transactions">Lihat semua</Link></div>
          {loading ? (
            <div className="card-flush">{[0, 1, 2].map(i => <div key={i} className="row"><div className="ic c-lain" style={{ opacity: 0.4 }} /><span className="grow t" style={{ opacity: 0.4 }}>Memuat…</span></div>)}</div>
          ) : recentTx.length === 0 ? (
            <div className="card" style={{ textAlign: 'center' }}>
              <p className="t" style={{ whiteSpace: 'normal' }}>Belum ada transaksi periode ini</p>
              <Link href="/transaction" className="btn btn-block" style={{ marginTop: 12 }}>Tambah transaksi</Link>
            </div>
          ) : (
            <div className="card-flush">
              {recentTx.map(t => {
                const { Icon, cls } = txIcon(t)
                return (
                  <div className="row" key={t.id}>
                    <div className={`ic ${cls}`}><Icon className="i" /></div>
                    <div className="grow"><div className="t">{t.title || t.category}</div><div className="meta">{t.category} · {walletName(t.wallet_id)} · {timeLabel(t)}</div></div>
                    <div className={`amt ${t.type === 'pemasukan' ? 'pos' : ''}`} style={t.type === 'topup' ? { color: 'var(--text-2)' } : undefined}>{t.type === 'pemasukan' ? '+' : ''}{rp(t.amount)}</div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Filter & period sheet */}
      {showSettings && (
        <>
          <div className="scrim" onClick={() => setShowSettings(false)} />
          <div className="sheet">
            <div className="grabber" />
            <div className="between"><h2 className="h2">Filter & periode</h2><button className="icon-btn ghost" aria-label="Tutup" onClick={() => setShowSettings(false)}><X className="i" /></button></div>
            <div className="seg">
              <button className={filterMode === 'monthly' ? 'on' : ''} onClick={() => setFilterMode('monthly')}>Bulanan</button>
              <button className={filterMode === 'custom' ? 'on' : ''} onClick={() => setFilterMode('custom')}>Custom</button>
            </div>
            {filterMode === 'custom' && (
              <div className="stack-12">
                <label className="field">Dari tanggal<DatePickerNeo className="input" value={customRange.start} onChange={(e) => setCustomRange({ ...customRange, start: e.target.value })} /></label>
                <label className="field">Sampai tanggal<DatePickerNeo className="input" value={customRange.end} onChange={(e) => setCustomRange({ ...customRange, end: e.target.value })} /></label>
              </div>
            )}
            <button className="btn-2 btn-block" onClick={() => { setFilterMode('monthly'); setCurrentDate(new Date()); setShowSettings(false) }}>Reset ke periode ini</button>
            <button className="btn btn-block" onClick={() => setShowSettings(false)}>Terapkan</button>
          </div>
        </>
      )}
    </div>
  )
}

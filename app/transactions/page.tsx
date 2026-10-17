'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, Calendar, X, Search, Download, RotateCw, Receipt, Plus, Pencil, Trash2 } from 'lucide-react'
import {
  useTransactions, useWallets, useDebts, useBudgets, useSettings, useFilterHistory, useInvalidate, qk,
} from '@/hooks/useAppData'
import { getCategoryIcon } from '@/lib/categories'
import { deleteTransactionWithRollback } from '@/lib/transactions'
import { exportTransactionsExcel, FilterHistoryEntry } from '@/lib/exportExcel'
import { useToast } from '@/hooks/useToast'
import { useConfirm } from '@/hooks/useConfirm'
import { useSuccessModal } from '@/hooks/useSuccessModal'
import { SkeletonRows } from '@/components/Skeleton'
import EmptyState from '@/components/EmptyState'
import ExportSheet from '@/components/ExportSheet'
import PullToRefresh from '@/components/PullToRefresh'
import SwipeRow from '@/components/SwipeRow'
import NeoSelect from '@/components/NeoSelect'
import TransactionModal from '@/components/TransactionModal'
import { useIsWeb } from '@/hooks/useIsWeb'
import { usePeriodSettings } from '@/hooks/usePeriodSettings'
import PeriodSheet from '@/components/PeriodSheet'
import { formatPeriodLabel } from '@/lib/format'
import { Transaction, Wallet, Debt, Budget, CustomCategoryDef } from '@/types'

type CustomMap = { pengeluaran: (string | CustomCategoryDef)[]; pemasukan: (string | CustomCategoryDef)[] }
type FilterKey = 'semua' | 'pengeluaran' | 'pemasukan' | 'transfer' | 'piutang' | 'talangan'

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'semua', label: 'Semua' },
  { key: 'pengeluaran', label: 'Pengeluaran' },
  { key: 'pemasukan', label: 'Pemasukan' },
  { key: 'transfer', label: 'Transfer' },
  { key: 'piutang', label: 'Piutang' },
  { key: 'talangan', label: 'Talangan' },
]

// Built-in category -> catatduit color class (DESIGN.md section 6).
const CAT_CLASS: Record<string, string> = {
  'Kebutuhan Dapur': 'c-dapur', 'Makan di Luar': 'c-makan', 'Transportasi': 'c-transport',
  'Tempat Tinggal': 'c-rumah', 'Tagihan': 'c-tagihan', 'Belanja': 'c-belanja',
  'Kesehatan': 'c-kesehatan', 'Cicilan & Utang': 'c-cicilan', 'Pribadi & Hiburan': 'c-hiburan',
  'Edukasi & Donasi': 'c-edukasi', 'Gaji': 'c-gaji', 'Bonus & Hadiah': 'c-bonus',
  'Investasi': 'c-investasi', 'Penjualan': 'c-belanja', 'Lainnya': 'c-lain',
}

const PAGE_SIZE = 50
const WEB_PAGE = 20
const rp = (n: number) => `Rp ${n.toLocaleString('id-ID')}`

const dayKey = (t: Transaction) => new Date(t.date || t.created_at).toISOString().slice(0, 10)

const dayLabel = (key: string) => {
  const d = new Date(`${key}T12:00:00`)
  const today = new Date(); today.setHours(12, 0, 0, 0)
  const diff = Math.round((today.getTime() - d.getTime()) / 86400000)
  const weekday = d.toLocaleDateString('id-ID', { weekday: 'short' })
  const date = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
  if (diff === 0) return `Hari ini · ${weekday}, ${date}`
  if (diff === 1) return `Kemarin · ${weekday}, ${date}`
  return `${weekday}, ${date}`
}

const timeLabel = (t: Transaction) =>
  new Date(t.date || t.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace(':', '.')

export default function TransactionsPage() {
  const router = useRouter()
  const { showToast } = useToast()
  const { showConfirm } = useConfirm()
  const { showSuccess } = useSuccessModal()

  const txQuery = useTransactions()
  const walletsQuery = useWallets()
  const debtsQuery = useDebts()
  const budgetsQuery = useBudgets()
  const settingsQuery = useSettings()
  const filterHistoryQuery = useFilterHistory()
  const invalidate = useInvalidate()

  const transactions = useMemo(() => txQuery.data ?? [], [txQuery.data])
  const wallets = useMemo(() => walletsQuery.data ?? [], [walletsQuery.data])
  const debts = useMemo(() => debtsQuery.data ?? [], [debtsQuery.data])
  const budgets = useMemo(() => budgetsQuery.data ?? [], [budgetsQuery.data])
  const filterHistory = useMemo(() => (filterHistoryQuery.data as FilterHistoryEntry[]) ?? [], [filterHistoryQuery.data])
  const loading = txQuery.isLoading
  const [customCategories, setCustomCategories] = useState<CustomMap>({ pengeluaran: [], pemasukan: [] })
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<FilterKey>('semua')
  const [visible, setVisible] = useState(PAGE_SIZE)
  const [refreshing, setRefreshing] = useState(false)
  // Web table state (RiwayatWeb)
  const isWeb = useIsWeb()
  const [catFilter, setCatFilter] = useState('')
  const [walletFilter, setWalletFilter] = useState('')
  const [webPage, setWebPage] = useState(0)
  const [txModal, setTxModal] = useState<{ editing: Transaction | null } | null>(null)
  // Period filter shared with Beranda / Analitik (DESIGN.md 7.14)
  const period = usePeriodSettings()
  const [showPeriod, setShowPeriod] = useState(false)
  const [showExport, setShowExport] = useState(false)
  // Lainnya > Export ke Excel opens /transactions?export=1
  useEffect(() => { if (new URLSearchParams(window.location.search).get('export') === '1') setShowExport(true) }, [])
  const periodLabel = formatPeriodLabel(period.filterMode, period.currentDate, period.customRange)

  // "Lihat transaksi kategori ini" from Budget opens /transactions?category=…
  useEffect(() => {
    const c = new URLSearchParams(window.location.search).get('category')
    if (c) setCatFilter(c)
  }, [])

  const reloadAll = () => invalidate([
    qk.transactions, qk.wallets, qk.debts, qk.budgets, qk.settings, qk.filterHistory,
  ])

  // Seed custom categories from user_settings.
  useEffect(() => {
    const cc = settingsQuery.data?.custom_categories
    if (cc) setCustomCategories(cc as CustomMap)
  }, [settingsQuery.data])

  const handleRefresh = async () => {
    setRefreshing(true)
    await reloadAll()
    setRefreshing(false)
    showToast('success', 'Data diperbarui')
  }

  const walletName = (id: number | null | undefined) => wallets.find(w => w.id === id)?.name || '—'

  const matchesFilter = (t: Transaction) => {
    switch (filter) {
      case 'semua': return true
      case 'transfer': return t.type === 'topup'
      case 'piutang': return !!t.is_piutang
      case 'talangan': return !!t.is_talangan
      case 'pemasukan': return t.type === 'pemasukan'
      case 'pengeluaran': return t.type === 'pengeluaran'
      default: return true
    }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return transactions.filter(t => {
      if (!matchesFilter(t)) return false
      if (!period.inPeriod(new Date(t.date || t.created_at))) return false
      if (catFilter && t.category !== catFilter) return false
      if (!q) return true
      return (t.title || '').toLowerCase().includes(q) || (t.category || '').toLowerCase().includes(q)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactions, query, filter, catFilter, period.filterMode, period.currentDate, period.customRange])

  const summary = useMemo(() => {
    let masuk = 0, keluar = 0
    for (const t of filtered) {
      if (t.type === 'pemasukan') masuk += t.amount
      else if (t.type === 'pengeluaran') keluar += t.amount
    }
    return { masuk, keluar }
  }, [filtered])

  // Group the visible slice by day, preserving the newest-first order.
  const groups = useMemo(() => {
    const slice = filtered.slice(0, visible)
    const map = new Map<string, Transaction[]>()
    for (const t of slice) {
      const k = dayKey(t)
      if (!map.has(k)) map.set(k, [])
      map.get(k)!.push(t)
    }
    return [...map.entries()].map(([key, items]) => {
      const net = items.reduce((acc, t) => acc + (t.type === 'pemasukan' ? t.amount : t.type === 'pengeluaran' ? -t.amount : 0), 0)
      return { key, items, net }
    })
  }, [filtered, visible])

  const handleExport = () => {
    const labelMap: Record<FilterKey, string> = {
      semua: 'Semua transaksi', pengeluaran: 'Pengeluaran', pemasukan: 'Pemasukan',
      transfer: 'Transfer', piutang: 'Piutang', talangan: 'Talangan',
    }
    exportTransactionsExcel({
      periodLabel: filter === 'semua' ? periodLabel : `${labelMap[filter]} · ${periodLabel}`,
      fileNamePeriod: (filter === 'semua' ? periodLabel : `${filter}_${periodLabel}`).replace(/[^\w-]+/g, '_'),
      filteredTransactions: filtered,
      transactions,
      wallets,
      filterHistory,
      showToast,
    })
  }

  const handleDelete = async (id: number) => {
    const res = await deleteTransactionWithRollback(id, {
      confirm: showConfirm,
      toast: showToast,
      success: showSuccess,
    })
    if (res.deleted) await reloadAll()
  }

  const iconFor = (t: Transaction) => {
    const { Icon } = getCategoryIcon(t.category, t.type, customCategories)
    const cls = t.is_piutang ? 'c-piutang' : t.type === 'topup' ? 'c-transfer' : (CAT_CLASS[t.category] || 'c-lain')
    return { Icon, cls }
  }

  // ── Web (>=768px): RiwayatWeb — summary cards, filter bar, table, pagination ──
  const categoryOptions = useMemo(() => {
    const set = new Set(transactions.filter(t => t.type !== 'topup').map(t => t.category).filter(Boolean))
    return [{ label: 'Semua kategori', value: '' }, ...[...set].sort().map(c => ({ label: c, value: c }))]
  }, [transactions])
  const walletOptions = [{ label: 'Semua dompet', value: '' }, ...wallets.map(w => ({ label: w.name, value: String(w.id) }))]
  const webRows = useMemo(() => filtered.filter(t =>
    !walletFilter || String(t.wallet_id) === walletFilter || String(t.source_wallet_id) === walletFilter
  ), [filtered, walletFilter])
  const webSummary = useMemo(() => {
    let masuk = 0, keluar = 0
    for (const t of webRows) {
      if (t.type === 'pemasukan') masuk += t.amount
      else if (t.type === 'pengeluaran') keluar += t.amount
    }
    return { masuk, keluar }
  }, [webRows])
  const pageCount = Math.max(1, Math.ceil(webRows.length / WEB_PAGE))
  const pageSafe = Math.min(webPage, pageCount - 1)
  const pageRows = webRows.slice(pageSafe * WEB_PAGE, pageSafe * WEB_PAGE + WEB_PAGE)
  const resetWebFilters = () => { setQuery(''); setFilter('semua'); setCatFilter(''); setWalletFilter(''); setWebPage(0) }

  if (isWeb) {
    return (
      <div className="cd" style={{ minHeight: '100vh', background: 'var(--bg)' }}>
        <main className="main">
          <div className="ptop">
            <h1 className="ptitle">Riwayat transaksi</h1>
            <div className="hstack" style={{ flexWrap: 'wrap', gap: 8 }}>
              <button className="icon-btn" aria-label="Periode sebelumnya" disabled={period.filterMode === 'custom'} onClick={() => { period.prevMonth(); setWebPage(0) }}><ChevronLeft className="i i-s" /></button>
              <button className="btn-2" onClick={() => setShowPeriod(true)}><Calendar className="i i-s" />{periodLabel}</button>
              <button className="icon-btn" aria-label="Periode berikutnya" disabled={period.filterMode === 'custom'} onClick={() => { period.nextMonth(); setWebPage(0) }}><ChevronRight className="i i-s" /></button>
              <button className="btn-2" aria-label="Muat ulang data" title="Muat ulang data" disabled={refreshing} onClick={handleRefresh}><RotateCw className={`i i-s ${refreshing ? 'animate-spin' : ''}`} /></button>
              <button className="btn-2" onClick={() => setShowExport(true)}><Download className="i i-s" />Export</button>
              <button className="btn" onClick={() => setTxModal({ editing: null })}><Plus className="i i-s" />Tambah transaksi</button>
            </div>
          </div>

          <div className="wrap">
            <div className="card" style={{ flex: '1 1 200px' }}><div className="lbl">Masuk</div><div className="num-l pos">+{rp(webSummary.masuk)}</div></div>
            <div className="card" style={{ flex: '1 1 200px' }}><div className="lbl">Keluar</div><div className="num-l">{rp(webSummary.keluar)}</div></div>
            <div className="card" style={{ flex: '1 1 200px' }}><div className="lbl">Selisih</div><div className="num-l" style={{ color: webSummary.masuk - webSummary.keluar >= 0 ? 'var(--accent)' : 'var(--danger)' }}>{rp(webSummary.masuk - webSummary.keluar)}</div></div>
            <div className="card" style={{ flex: '1 1 200px' }}><div className="lbl">Jumlah transaksi</div><div className="num-l">{webRows.length.toLocaleString('id-ID')}</div></div>
          </div>

          <section className="card" style={{ padding: 0 }}>
            <div style={{ padding: '16px 20px', display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', borderBottom: '1px solid var(--border)' }}>
              <label className="input search" style={{ flex: '1 1 260px', width: 'auto', cursor: 'text' }}>
                <Search className="i i-s" style={{ color: 'var(--text-2)' }} />
                <input
                  type="text"
                  placeholder="Cari transaksi atau catatan"
                  aria-label="Cari transaksi"
                  value={query}
                  onChange={e => { setQuery(e.target.value); setWebPage(0) }}
                  style={{ border: 0, outline: 0, background: 'transparent', color: 'var(--text)', flex: 1, fontSize: 14, height: '100%' }}
                />
              </label>
              <div className="chips">
                {FILTERS.map(f => (
                  <button key={f.key} className={`chip ${filter === f.key ? 'on' : ''}`} onClick={() => { setFilter(f.key); setWebPage(0) }}>{f.label}</button>
                ))}
              </div>
              <div style={{ width: 180 }}><NeoSelect value={catFilter} onChange={v => { setCatFilter(v); setWebPage(0) }} options={categoryOptions} placeholder="Kategori" className="btn-2 sel-btn" /></div>
              <div style={{ width: 180 }}><NeoSelect value={walletFilter} onChange={v => { setWalletFilter(v); setWebPage(0) }} options={walletOptions} placeholder="Dompet" className="btn-2 sel-btn" /></div>
            </div>

            {loading ? (
              <div style={{ padding: 20 }}><SkeletonRows count={8} /></div>
            ) : webRows.length === 0 ? (
              <div style={{ padding: 20 }}>
                {query.trim() || filter !== 'semua' || catFilter || walletFilter ? (
                  <EmptyState icon={<Search className="i" />} title={query.trim() ? `Tidak ada yang cocok dengan “${query.trim()}”` : 'Tidak ada yang cocok'} text="Coba kata lain atau hapus filter." actionLabel="Hapus filter" actionVariant="secondary" onAction={resetWebFilters} style={{ border: 0 }} />
                ) : (
                  <EmptyState icon={<Receipt className="i" />} title="Catat transaksi pertama" text="Pengeluaran dan pemasukan periode ini muncul di sini." actionLabel="Tambah transaksi" onAction={() => setTxModal({ editing: null })} style={{ border: 0 }} />
                )}
              </div>
            ) : (
              <div className="tbl-box">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th style={{ paddingLeft: 20 }}>Tanggal</th><th>Keterangan</th><th>Kategori</th><th>Dompet</th><th className="r">Nominal</th>
                      <th className="r" style={{ paddingRight: 20 }}><span className="sr-only">Aksi</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map(t => {
                      const { Icon, cls } = iconFor(t)
                      const d = new Date(t.date || t.created_at)
                      return (
                        <tr key={t.id} className="tbl-row" onClick={() => setTxModal({ editing: t })} style={{ cursor: 'pointer' }}>
                          <td style={{ paddingLeft: 20 }}><div style={{ fontWeight: 600 }}>{d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: d.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined })}</div><div className="lbl">{timeLabel(t)}</div></td>
                          <td>
                            <div className="hstack" style={{ gap: 10 }}>
                              <div className={`ic-s ${cls}`}><Icon className="i i-s" /></div>
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontWeight: 600 }}>{t.title || t.category}</div>
                                {(t.is_piutang || t.is_talangan || debts.some(x => x.original_transaction_id === t.id)) && (
                                  <div className="hstack" style={{ gap: 4, marginTop: 2 }}>
                                    {t.is_piutang && <span className="badge b-neutral">Piutang</span>}
                                    {t.is_talangan && <span className="badge b-neutral">Talangan</span>}
                                    {debts.some(x => x.original_transaction_id === t.id) && <span className="badge b-neutral">Split Bill</span>}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td>{t.type === 'topup' ? 'Transfer' : t.category}</td>
                          <td>{t.type === 'topup' && t.source_wallet_id ? `${walletName(t.source_wallet_id)} → ${walletName(t.wallet_id)}` : walletName(t.wallet_id)}</td>
                          <td className="r" style={{ fontWeight: 700, whiteSpace: 'nowrap', color: t.type === 'pemasukan' ? 'var(--income)' : t.type === 'topup' ? 'var(--text-2)' : 'var(--text)' }}>{t.type === 'pemasukan' ? '+' : ''}{rp(t.amount)}</td>
                          <td className="r" style={{ paddingRight: 20, whiteSpace: 'nowrap' }} onClick={e => e.stopPropagation()}>
                            <button className="icon-btn ghost" style={{ width: 36, height: 36 }} aria-label={`Ubah ${t.title || t.category}`} title="Ubah" onClick={() => setTxModal({ editing: t })}><Pencil className="i i-s" /></button>
                            <button className="icon-btn ghost" style={{ width: 36, height: 36, color: 'var(--danger)' }} aria-label={`Hapus ${t.title || t.category}`} title="Hapus" onClick={() => handleDelete(t.id)}><Trash2 className="i i-s" /></button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {!loading && webRows.length > 0 && (
              <div className="between" style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', flexWrap: 'wrap', gap: 8 }}>
                <span className="lbl">Menampilkan {(pageSafe * WEB_PAGE + 1).toLocaleString('id-ID')}–{Math.min(webRows.length, (pageSafe + 1) * WEB_PAGE).toLocaleString('id-ID')} dari {webRows.length.toLocaleString('id-ID')} transaksi</span>
                <div className="hstack" style={{ gap: 8 }}>
                  <button className="btn-2" style={{ height: 36 }} disabled={pageSafe === 0} onClick={() => setWebPage(p => Math.max(0, p - 1))}>Sebelumnya</button>
                  <button className="btn-2" style={{ height: 36 }} disabled={pageSafe >= pageCount - 1} onClick={() => setWebPage(p => p + 1)}>Berikutnya</button>
                </div>
              </div>
            )}
          </section>
        </main>
        <ExportSheet isOpen={showExport} onClose={() => setShowExport(false)} periodLabel={periodLabel} rowCount={filtered.length} rangeCount={filterHistory.length} walletCount={wallets.length} onChangePeriod={() => setShowPeriod(true)} onDownload={handleExport} />
        <PeriodSheet
          isOpen={showPeriod}
          onClose={() => setShowPeriod(false)}
          filterMode={period.filterMode}
          setFilterMode={period.setFilterMode}
          currentDate={period.currentDate}
          setCurrentDate={(d) => { period.setCurrentDate(d); setWebPage(0); setVisible(PAGE_SIZE) }}
          customRange={period.customRange}
          setCustomRange={period.setCustomRange}
        />
        {txModal && (
          <TransactionModal
            isOpen
            mode="modal"
            editingTransaction={txModal.editing}
            initialType={txModal.editing ? undefined : 'pengeluaran'}
            wallets={wallets}
            transactions={transactions}
            budgets={budgets}
            customCategories={customCategories}
            onCustomCategoriesChange={(c) => setCustomCategories(c)}
            onClose={() => setTxModal(null)}
            onSaved={() => { setTxModal(null); reloadAll() }}
          />
        )}
      </div>
    )
  }


  return (
    <div className="cd" style={{ minHeight: '100vh', background: 'var(--surface)' }}>
      <div className="scroll" style={{ maxWidth: 560, margin: '0 auto', paddingBottom: 116 }}>
        <PullToRefresh onRefresh={handleRefresh} />

        {/* Header */}
        <div className="top">
          <div className="top-l">
            <button className="icon-btn ghost" aria-label="Kembali" onClick={() => router.back()}>
              <ChevronLeft className="i" />
            </button>
            <h1 className="h1">Riwayat</h1>
          </div>
          <div className="hstack" style={{ gap: 6 }}>
            <button className="icon-btn" aria-label="Muat ulang data" disabled={refreshing} onClick={handleRefresh}><RotateCw className={`i ${refreshing ? 'animate-spin' : ''}`} /></button>
            <button className="icon-btn" aria-label="Export ke Excel" onClick={() => setShowExport(true)}><Download className="i" /></button>
          </div>
        </div>

        {/* Search */}
        <label className="input search" style={{ cursor: 'text' }}>
          <Search className="i i-s" style={{ color: 'var(--text-2)' }} />
          <input
            type="text"
            placeholder="Cari transaksi atau catatan"
            value={query}
            onChange={e => setQuery(e.target.value)}
            style={{ border: 0, outline: 0, background: 'transparent', color: 'var(--text)', flex: 1, fontSize: 14, height: '100%' }}
          />
        </label>

        {/* Period (shared with Beranda / Analitik) */}
        <div className="hstack" style={{ gap: 4 }}>
          <button className="icon-btn ghost" style={{ width: 36, height: 36 }} aria-label="Periode sebelumnya" disabled={period.filterMode === 'custom'} onClick={() => { period.prevMonth(); setVisible(PAGE_SIZE) }}><ChevronLeft className="i i-s" /></button>
          <button className="chip" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setShowPeriod(true)}><Calendar className="i i-s" />{periodLabel}</button>
          <button className="icon-btn ghost" style={{ width: 36, height: 36 }} aria-label="Periode berikutnya" disabled={period.filterMode === 'custom'} onClick={() => { period.nextMonth(); setVisible(PAGE_SIZE) }}><ChevronRight className="i i-s" /></button>
        </div>

        {catFilter && (
          <button className="chip on" style={{ alignSelf: 'flex-start' }} onClick={() => setCatFilter('')} aria-label={`Hapus filter kategori ${catFilter}`}>
            Kategori: {catFilter}<X className="i i-s" />
          </button>
        )}

        {/* Type filters */}
        <div className="chips scrollx">
          {FILTERS.map(f => (
            <button key={f.key} className={`chip ${filter === f.key ? 'on' : ''}`} onClick={() => { setFilter(f.key); setVisible(PAGE_SIZE) }}>
              {f.label}
            </button>
          ))}
        </div>

        {/* Period summary */}
        <div className="card g2" style={{ padding: '14px 16px' }}>
          <div><div className="lbl">Masuk</div><div className="num-m pos">+{rp(summary.masuk)}</div></div>
          <div><div className="lbl">Keluar</div><div className="num-m">{rp(summary.keluar)}</div></div>
        </div>

        {/* List */}
        {loading ? (
          <SkeletonRows count={8} />
        ) : filtered.length === 0 ? (
          query.trim() || filter !== 'semua' || catFilter ? (
            <EmptyState
              icon={<Search className="i" />}
              title={query.trim() ? `Tidak ada yang cocok dengan “${query.trim()}”` : 'Tidak ada yang cocok'}
              text="Coba kata lain atau hapus filter."
              actionLabel="Hapus filter"
              actionVariant="secondary"
              onAction={() => { setQuery(''); setFilter('semua'); setCatFilter(''); setVisible(PAGE_SIZE) }}
            />
          ) : (
            <EmptyState
              icon={<Receipt className="i" />}
              title="Catat transaksi pertama"
              text="Pengeluaran dan pemasukan periode ini muncul di sini."
              actionLabel="Tambah transaksi"
              onAction={() => router.push('/transaction')}
            />
          )
        ) : (
          <>
            {groups.map(group => (
              <div key={group.key}>
                <div className="between date-h">
                  <span>{dayLabel(group.key)}</span>
                  <span>{group.net >= 0 ? '+' : '−'}{rp(Math.abs(group.net))}</span>
                </div>
                <div className="card-flush">
                  {group.items.map(t => {
                    const { Icon, cls } = iconFor(t)
                    return (
                      <SwipeRow
                        key={t.id}
                        label={t.title || t.category}
                        onEdit={() => router.push(`/transaction?type=${t.type}&edit=${t.id}`)}
                        onDelete={() => handleDelete(t.id)}
                      >
                        <div className={`ic ${cls}`}><Icon className="i" /></div>
                        <div className="grow">
                          <div className="t">{t.title || t.category}</div>
                          <div className="meta">{t.category} · {walletName(t.wallet_id)} · {timeLabel(t)}</div>
                        </div>
                        <div
                          className={`amt ${t.type === 'pemasukan' ? 'pos' : ''}`}
                          style={t.type === 'topup' ? { color: 'var(--text-2)' } : undefined}
                        >
                          {t.type === 'pemasukan' ? '+' : ''}{rp(t.amount)}
                        </div>
                      </SwipeRow>
                    )
                  })}
                </div>
              </div>
            ))}

            {visible < filtered.length && (
              <button className="btn-2 btn-block" onClick={() => setVisible(v => v + PAGE_SIZE)}>
                Muat transaksi sebelumnya
              </button>
            )}
          </>
        )}
      </div>
        <ExportSheet isOpen={showExport} onClose={() => setShowExport(false)} periodLabel={periodLabel} rowCount={filtered.length} rangeCount={filterHistory.length} walletCount={wallets.length} onChangePeriod={() => setShowPeriod(true)} onDownload={handleExport} />
        <PeriodSheet
          isOpen={showPeriod}
          onClose={() => setShowPeriod(false)}
          filterMode={period.filterMode}
          setFilterMode={period.setFilterMode}
          currentDate={period.currentDate}
          setCurrentDate={(d) => { period.setCurrentDate(d); setWebPage(0); setVisible(PAGE_SIZE) }}
          customRange={period.customRange}
          setCustomRange={period.setCustomRange}
        />
    </div>
  )
}

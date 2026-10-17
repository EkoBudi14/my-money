'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Search, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { getTransactions, getWallets, getDebts } from '@/lib/queries'
import { getCategoryIcon } from '@/lib/categories'
import { deleteTransactionWithRollback } from '@/lib/transactions'
import { useToast } from '@/hooks/useToast'
import { useConfirm } from '@/hooks/useConfirm'
import { useSuccessModal } from '@/hooks/useSuccessModal'
import { Transaction, Wallet, Debt, CustomCategoryDef } from '@/types'

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

  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [wallets, setWallets] = useState<Wallet[]>([])
  const [debts, setDebts] = useState<Debt[]>([])
  const [customCategories, setCustomCategories] = useState<CustomMap>({ pengeluaran: [], pemasukan: [] })
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<FilterKey>('semua')
  const [visible, setVisible] = useState(PAGE_SIZE)

  const loadAll = async () => {
    const [txRes, wRes, dRes, csRes] = await Promise.all([
      getTransactions(),
      getWallets(),
      getDebts(),
      supabase.from('user_settings').select('custom_categories').eq('id', 1).single(),
    ])
    if (txRes.data) setTransactions(txRes.data as Transaction[])
    if (wRes.data) setWallets(wRes.data as Wallet[])
    if (dRes.data) setDebts(dRes.data as Debt[])
    if (csRes.data?.custom_categories) setCustomCategories(csRes.data.custom_categories as CustomMap)
    setLoading(false)
  }

  useEffect(() => { loadAll() }, [])

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
      if (!q) return true
      return (t.title || '').toLowerCase().includes(q) || (t.category || '').toLowerCase().includes(q)
    })
  }, [transactions, query, filter])

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

  const handleDelete = async (id: number) => {
    const res = await deleteTransactionWithRollback(id, {
      confirm: showConfirm,
      toast: showToast,
      success: showSuccess,
    })
    if (res.deleted) await loadAll()
  }

  const iconFor = (t: Transaction) => {
    const { Icon } = getCategoryIcon(t.category, t.type, customCategories)
    const cls = t.is_piutang ? 'c-piutang' : t.type === 'topup' ? 'c-transfer' : (CAT_CLASS[t.category] || 'c-lain')
    return { Icon, cls }
  }

  return (
    <div className="cd" style={{ minHeight: '100vh', background: 'var(--surface)' }}>
      <div className="scroll" style={{ maxWidth: 560, margin: '0 auto', paddingBottom: 116 }}>
        {/* Header */}
        <div className="top">
          <div className="top-l">
            <button className="icon-btn ghost" aria-label="Kembali" onClick={() => router.back()}>
              <ChevronLeft className="i" />
            </button>
            <h1 className="h1">Riwayat</h1>
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
          <div className="card-flush">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className="row">
                <div className="ic c-lain" style={{ opacity: 0.4 }} />
                <span className="grow t" style={{ opacity: 0.4 }}>Memuat…</span>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="card" style={{ textAlign: 'center' }}>
            <p className="t" style={{ whiteSpace: 'normal' }}>Belum ada transaksi</p>
            <p className="lbl" style={{ marginTop: 4 }}>Transaksi yang cocok dengan pencarian atau filter akan muncul di sini.</p>
            <Link href="/transaction" className="btn btn-block" style={{ marginTop: 12 }}>Tambah transaksi</Link>
          </div>
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
                      <div className="row" key={t.id}>
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
                        <button
                          className="icon-btn ghost"
                          aria-label={`Hapus ${t.title || t.category}`}
                          style={{ color: 'var(--danger)', width: 36, height: 36 }}
                          onClick={() => handleDelete(t.id)}
                        >
                          <Trash2 className="i i-s" />
                        </button>
                      </div>
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
    </div>
  )
}

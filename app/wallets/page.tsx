'use client'

import { useEffect, useMemo, useState } from 'react'
import { Plus, Eye, EyeOff, Info, CreditCard, Wallet as WalletIcon, Banknote, ChevronRight, PiggyBank } from 'lucide-react'
import { useIsWeb } from '@/hooks/useIsWeb'
import { supabase } from '@/lib/supabase'
import { Wallet, Transaction } from '@/types'
import { useToast } from '@/hooks/useToast'
import { useConfirm } from '@/hooks/useConfirm'
import { useSuccessModal } from '@/hooks/useSuccessModal'
import WalletModal from '@/components/WalletModal'
import { SkeletonRows } from '@/components/Skeleton'
import EmptyState from '@/components/EmptyState'

type Tab = 'active' | 'savings'
type WalletType = 'bank' | 'ewallet' | 'cash'

const TYPE_META: Record<WalletType, { label: string; cls: string; Icon: any }> = {
  bank: { label: 'Bank', cls: 'c-bank', Icon: CreditCard },
  ewallet: { label: 'E-wallet', cls: 'c-ewallet', Icon: WalletIcon },
  cash: { label: 'Tunai', cls: 'c-cash', Icon: Banknote },
}
const TYPE_ORDER: WalletType[] = ['bank', 'ewallet', 'cash']
const rp = (n: number) => `Rp ${n.toLocaleString('id-ID')}`

// Last-used label for a wallet, computed from its transactions.
const usedLabel = (ts: number | undefined) => {
  if (!ts) return 'Belum dipakai'
  const d = new Date(ts); d.setHours(12, 0, 0, 0)
  const today = new Date(); today.setHours(12, 0, 0, 0)
  const days = Math.round((today.getTime() - d.getTime()) / 86400000)
  if (days <= 0) return 'Dipakai hari ini'
  if (days === 1) return 'Dipakai kemarin'
  if (days < 7) return `Dipakai ${days} hari lalu`
  if (days < 30) return `Dipakai ${Math.floor(days / 7)} minggu lalu`
  return `Dipakai ${d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}`
}

export default function WalletsPage() {
  const { showToast } = useToast()
  const { showConfirm } = useConfirm()
  const { showSuccess } = useSuccessModal()

  const [wallets, setWallets] = useState<Wallet[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('active')
  const isWeb = useIsWeb()
  const [showBalance, setShowBalance] = useState(false)

  // Open the Tabungan inti tab when arriving from /main-savings?tab=tabungan.
  useEffect(() => {
    if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('tab') === 'tabungan') {
      setTab('savings')
    }
  }, [])

  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)

  const fetchAll = async () => {
    setLoading(true)
    const [wRes, tRes] = await Promise.all([
      supabase.from('wallets').select('*').order('created_at', { ascending: true }),
      supabase.from('transactions').select('wallet_id,source_wallet_id,date,created_at'),
    ])
    if (wRes.error) showToast('error', 'Gagal memuat data dompet')
    else setWallets(wRes.data || [])
    if (tRes.data) setTransactions(tRes.data as Transaction[])
    setLoading(false)
  }

  useEffect(() => { fetchAll() }, [])

  // Map wallet id -> most recent transaction timestamp.
  const lastUsedMap = useMemo(() => {
    const m = new Map<number, number>()
    for (const t of transactions) {
      const ts = new Date(t.date || t.created_at).getTime()
      for (const id of [t.wallet_id, t.source_wallet_id]) {
        if (id == null) continue
        if (!m.has(id) || ts > m.get(id)!) m.set(id, ts)
      }
    }
    return m
  }, [transactions])

  const activeWallets = wallets.filter(w => w.category === 'active')
  const savingsWallets = wallets.filter(w => w.category === 'savings')
  const shown = tab === 'active' ? activeWallets : savingsWallets
  const activeTotal = activeWallets.reduce((a, w) => a + w.balance, 0)
  const savingsTotal = savingsWallets.reduce((a, w) => a + w.balance, 0)
  const total = tab === 'active' ? activeTotal : savingsTotal

  // Group shown wallets by type, preserving TYPE_ORDER.
  const groups = useMemo(() => {
    return TYPE_ORDER
      .map(type => ({ type, items: shown.filter(w => w.type === type) }))
      .filter(g => g.items.length > 0)
  }, [shown])

  const openAdd = () => { setEditingId(null); setModalOpen(true) }
  const openEdit = (w: Wallet) => { setEditingId(w.id); setModalOpen(true) }

  // Active wallet delete: refund topup source + cascade-delete transactions.
  const deleteActive = async (id: number) => {
    const { data: wallet } = await supabase.from('wallets').select('*').eq('id', id).single()
    if (!wallet) return showToast('error', 'Dompet tidak ditemukan.')

    const { count } = await supabase.from('transactions').select('id', { count: 'exact', head: true }).eq('wallet_id', id)
    const txCount = count || 0

    const details = [`${txCount} transaksi dari dompet ini`]
    if (wallet.source_wallet_id && wallet.balance > 0) {
      const { data: src } = await supabase.from('wallets').select('name').eq('id', wallet.source_wallet_id).single()
      if (src) details.push(`Saldo ${rp(wallet.balance)} dikembalikan ke ${src.name}`)
    }

    const ok = await showConfirm({
      title: `Hapus dompet “${wallet.name}”?`,
      message: 'Semua riwayat transaksi dompet ini ikut terhapus. Laporan periode lalu ikut berubah. Kalau cuma tidak dipakai lagi, ubah saldonya jadi Rp 0 saja.',
      details,
      variant: 'B',
      checkLabel: `Saya paham ${txCount} transaksi akan hilang`,
      confirmText: 'Hapus dompet',
      cancelText: 'Batal',
    })
    if (!ok) return

    if (wallet.source_wallet_id && wallet.balance > 0) {
      const { data: src } = await supabase.from('wallets').select('*').eq('id', wallet.source_wallet_id).single()
      if (src) {
        await supabase.from('wallets').update({ balance: src.balance + wallet.balance }).eq('id', src.id)
      }
    }

    const { error: txErr } = await supabase.from('transactions').delete().eq('wallet_id', id)
    if (txErr) return showToast('error', 'Riwayat transaksi gagal dihapus. Coba lagi.')

    const { error } = await supabase.from('wallets').delete().eq('id', id)
    if (error) return showToast('error', 'Dompet gagal dihapus. Coba lagi.')
    await fetchAll()
    showToast('success', `Dompet ${wallet.name} dan ${txCount} transaksi dihapus`)
  }

  // Savings wallet delete: simple removal (keeps old behaviour — transactions stay).
  const deleteSavings = async (id: number) => {
    const { data: wallet } = await supabase.from('wallets').select('*').eq('id', id).single()
    if (!wallet) return showToast('error', 'Aset tidak ditemukan.')
    const ok = await showConfirm({
      title: `Hapus aset “${wallet.name}”?`,
      message: `Nilai ${rp(wallet.balance)} tidak lagi dihitung di aset tersimpan.`,
      confirmText: 'Hapus aset',
      cancelText: 'Batal',
    })
    if (!ok) return
    const { error } = await supabase.from('wallets').delete().eq('id', id)
    if (error) return showToast('error', 'Aset gagal dihapus. Coba lagi.')
    await fetchAll()
    showToast('success', `Aset ${wallet.name} dihapus`)
  }

  const handleDelete = (w: Wallet) => (w.category === 'active' ? deleteActive(w.id) : deleteSavings(w.id))

  const walletModal = (
    <>
      {modalOpen && (
        <WalletModal
          editId={editingId}
          defaultCategory={tab}
          onClose={() => setModalOpen(false)}
          onSaved={() => { setModalOpen(false); fetchAll() }}
          onDelete={() => {
            const w = wallets.find(x => x.id === editingId)
            if (w) { setModalOpen(false); handleDelete(w) }
          }}
          mode="modal"
        />
      )}
    </>
  )

  // ── Web (>=768px): DompetWeb — both groups at once as tile grids ──
  const sortByUsed = (list: Wallet[]) => [...list].sort((a, z) => (lastUsedMap.get(z.id) || 0) - (lastUsedMap.get(a.id) || 0))
  const walletTile = (w: Wallet, foot: string) => {
    const meta = TYPE_META[(w.type as WalletType)] || TYPE_META.bank
    const Icon = meta.Icon
    return (
      <button type="button" className="wtile" key={w.id} aria-label={`Ubah ${w.name}`} onClick={() => openEdit(w)}>
        <div className="between"><div className={`ic ${w.category === 'savings' && w.type !== 'bank' ? 'c-aset' : meta.cls}`}><Icon className="i" /></div><span className="lbl">{meta.label}</span></div>
        <div><div className="t">{w.name}</div><div className="num-m">{showBalance ? rp(w.balance) : 'Rp ••••'}</div></div>
        <div className="lbl">{foot}</div>
      </button>
    )
  }

  if (isWeb) {
    return (
      <div className="cd" style={{ minHeight: '100vh', background: 'var(--bg)' }}>
        <main className="main">
          <div className="ptop">
            <h1 className="ptitle">Dompet &amp; tabungan</h1>
            <div className="hstack" style={{ gap: 8 }}>
              <button className="icon-btn" aria-label={showBalance ? 'Sembunyikan angka' : 'Tampilkan angka'} aria-pressed={showBalance} onClick={() => setShowBalance(v => !v)}>{showBalance ? <EyeOff className="i" /> : <Eye className="i" />}</button>
              <button className="btn" onClick={() => { setTab('active'); openAdd() }}><Plus className="i i-s" />Tambah dompet</button>
            </div>
          </div>

          <div className="wrap">
            <div className="hero stack" style={{ flex: '1 1 240px' }}>
              <span className="lbl">Saldo aktif · {activeWallets.length} dompet</span>
              <span className="num-xl">{showBalance ? rp(activeTotal) : 'Rp ••••••'}</span>
              <span className="lbl">Uang siap pakai sehari-hari</span>
            </div>
            <div className="card stack" style={{ flex: '1 1 240px', padding: 20 }}>
              <span className="lbl">Aset tersimpan · {savingsWallets.length} aset</span>
              <span className="num-xl" style={{ color: 'var(--text)' }}>{showBalance ? rp(savingsTotal) : 'Rp ••••••'}</span>
              <span className="lbl">Tidak dihitung di saldo aktif</span>
            </div>
          </div>

          {loading ? <SkeletonRows count={5} /> : (
            <>
              <section className="stack-12">
                <div className="between"><h2 className="h2">Saldo aktif</h2><span className="lbl">Urut berdasarkan terakhir dipakai</span></div>
                {activeWallets.length === 0 ? (
                  <EmptyState icon={<WalletIcon className="i" />} title="Tambah dompet pertama" text="Bank, e-wallet, atau tunai yang kamu pakai harian." actionLabel="Tambah dompet" onAction={() => { setTab('active'); openAdd() }} />
                ) : (
                  <div className="wg">{sortByUsed(activeWallets).map(w => walletTile(w, usedLabel(lastUsedMap.get(w.id))))}</div>
                )}
              </section>
              <section className="stack-12">
                <div className="between">
                  <h2 className="h2">Tabungan inti</h2>
                  <button className="link" onClick={() => { setTab('savings'); openAdd() }}>+ Tambah aset</button>
                </div>
                {savingsWallets.length === 0 ? (
                  <EmptyState icon={<PiggyBank className="i" />} title="Catat aset pertama" text="Tabungan, emas, reksadana. Tidak dihitung di saldo aktif." actionLabel="Tambah aset" onAction={() => { setTab('savings'); openAdd() }} />
                ) : (
                  <div className="wg">{[...savingsWallets].sort((a, z) => z.balance - a.balance).map(w => walletTile(w, savingsTotal > 0 ? `${Math.round((w.balance / savingsTotal) * 100)}% dari aset` : 'Aset'))}</div>
                )}
              </section>
            </>
          )}
        </main>
        {walletModal}
      </div>
    )
  }


  return (
    <div className="cd" style={{ minHeight: '100vh', background: 'var(--surface)' }}>
      <div className="scroll" style={{ maxWidth: 720, margin: '0 auto', paddingBottom: 116 }}>
        {/* Header */}
        <div className="top">
          <h1 className="h1">Dompet</h1>
          <button className="icon-btn" aria-label="Tambah dompet" onClick={openAdd}><Plus className="i" /></button>
        </div>

        {/* Tabs */}
        <div className="seg" role="tablist">
          <button className={tab === 'active' ? 'on' : ''} onClick={() => setTab('active')}>Saldo aktif</button>
          <button className={tab === 'savings' ? 'on' : ''} onClick={() => setTab('savings')}>Tabungan inti</button>
        </div>

        {/* Hero total */}
        <div className="hero stack">
          <div className="between">
            <span className="lbl">
              {tab === 'active' ? `Total saldo aktif · ${activeWallets.length} dompet` : `Total tabungan inti · ${savingsWallets.length} aset`}
            </span>
            <button className="icon-btn" aria-label={showBalance ? 'Sembunyikan angka' : 'Tampilkan angka'} aria-pressed={showBalance} style={{ width: 40, height: 40 }} onClick={() => setShowBalance(v => !v)}>
              {showBalance ? <EyeOff className="i i-s" /> : <Eye className="i i-s" />}
            </button>
          </div>
          <div className="num-xl">{showBalance ? rp(total) : 'Rp ••••••'}</div>
          <div className="lbl">{tab === 'active' ? 'Uang siap pakai sehari-hari' : 'Simpanan yang tidak dihitung sebagai saldo aktif'}</div>
        </div>

        {/* List */}
        {loading ? (
          <SkeletonRows count={5} />
        ) : shown.length === 0 ? (
          tab === 'active' ? (
            <EmptyState icon={<WalletIcon className="i" />} title="Tambah dompet pertama" text="Bank, e-wallet, atau tunai yang kamu pakai harian." actionLabel="Tambah dompet" onAction={openAdd} />
          ) : (
            <EmptyState icon={<PiggyBank className="i" />} title="Catat aset pertama" text="Tabungan, emas, reksadana. Tidak dihitung di saldo aktif." actionLabel="Tambah aset" onAction={openAdd} />
          )
        ) : (
          groups.map(group => {
            const meta = TYPE_META[group.type]
            return (
              <div key={group.type}>
                <div className="date-h">{meta.label}</div>
                <div className="card-flush">
                  {group.items.map(w => {
                    const Icon = meta.Icon
                    return (
                      <button type="button" className="row rowbtn" key={w.id} aria-label={`Ubah ${w.name}`} onClick={() => openEdit(w)}>
                        <div className={`ic ${meta.cls}`}><Icon className="i" /></div>
                        <div className="grow">
                          <div className="t">{w.name}</div>
                          <div className="meta">{usedLabel(lastUsedMap.get(w.id))}</div>
                        </div>
                        <div className="amt">{showBalance ? rp(w.balance) : 'Rp ••••'}</div>
                        <ChevronRight className="i i-s" style={{ color: 'var(--text-2)', flexShrink: 0 }} />
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })
        )}

        {/* Cross-tab info banner */}
        {!loading && tab === 'active' && savingsTotal > 0 && (
          <div className="banner info">
            <Info className="i" />
            <span>Aset tersimpan {rp(savingsTotal)} ada di tab Tabungan inti dan tidak dihitung sebagai saldo aktif.</span>
          </div>
        )}

        {!loading && shown.length > 0 && (
          <button className="btn-2 btn-block" onClick={openAdd}>
            <Plus className="i i-s" />{tab === 'active' ? 'Tambah dompet' : 'Tambah aset'}
          </button>
        )}
      </div>

      {walletModal}
    </div>
  )
}

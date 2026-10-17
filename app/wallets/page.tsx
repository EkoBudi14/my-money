'use client'

import { useEffect, useMemo, useState } from 'react'
import { Plus, Eye, EyeOff, Info, CreditCard, Wallet as WalletIcon, Banknote, Pencil, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Wallet, Transaction } from '@/types'
import { useToast } from '@/hooks/useToast'
import { useConfirm } from '@/hooks/useConfirm'
import { useSuccessModal } from '@/hooks/useSuccessModal'
import WalletModal from '@/components/WalletModal'

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
  const [showBalance, setShowBalance] = useState(true)

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
            <button className="icon-btn" aria-label="Sembunyikan nominal" style={{ width: 40, height: 40 }} onClick={() => setShowBalance(v => !v)}>
              {showBalance ? <Eye className="i i-s" /> : <EyeOff className="i i-s" />}
            </button>
          </div>
          <div className="num-xl">{showBalance ? rp(total) : 'Rp ••••••'}</div>
          <div className="lbl">{tab === 'active' ? 'Uang siap pakai sehari-hari' : 'Simpanan yang tidak dihitung sebagai saldo aktif'}</div>
        </div>

        {/* List */}
        {loading ? (
          <div className="card-flush">
            {[0, 1, 2].map(i => (
              <div key={i} className="row"><div className="ic c-lain" style={{ opacity: 0.4 }} /><span className="grow t" style={{ opacity: 0.4 }}>Memuat…</span></div>
            ))}
          </div>
        ) : shown.length === 0 ? (
          <div className="card" style={{ textAlign: 'center' }}>
            <p className="t" style={{ whiteSpace: 'normal' }}>{tab === 'active' ? 'Belum ada dompet aktif' : 'Belum ada aset tabungan'}</p>
            <p className="lbl" style={{ marginTop: 4 }}>{tab === 'active' ? 'Tambahkan dompet untuk mulai mencatat saldo harian.' : 'Catat tabungan inti seperti emas, deposito, atau arisan.'}</p>
            <button className="btn btn-block" style={{ marginTop: 12 }} onClick={openAdd}>{tab === 'active' ? 'Tambah dompet' : 'Tambah aset'}</button>
          </div>
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
                      <div className="row" key={w.id}>
                        <div className={`ic ${meta.cls}`}><Icon className="i" /></div>
                        <div className="grow">
                          <div className="t">{w.name}</div>
                          <div className="meta">{usedLabel(lastUsedMap.get(w.id))}</div>
                        </div>
                        <div className="amt">{showBalance ? rp(w.balance) : 'Rp ••••'}</div>
                        <button className="icon-btn ghost" aria-label={`Ubah ${w.name}`} style={{ width: 36, height: 36 }} onClick={() => openEdit(w)}>
                          <Pencil className="i i-s" />
                        </button>
                        <button className="icon-btn ghost" aria-label={`Hapus ${w.name}`} style={{ width: 36, height: 36, color: 'var(--danger)' }} onClick={() => handleDelete(w)}>
                          <Trash2 className="i i-s" />
                        </button>
                      </div>
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
    </div>
  )
}

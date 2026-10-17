'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, Plus, Calendar, TrendingUp, Pencil, Trash2, X, CheckCircle2, Undo2, MoreHorizontal, Wallet as WalletIcon } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { getRecurringBills, deleteRecurringBill } from '@/lib/recurring-bills'
import { RecurringBill, Wallet } from '@/types'
import { useToast } from '@/hooks/useToast'
import { useConfirm } from '@/hooks/useConfirm'
import NeoSelect from '@/components/NeoSelect'
import DatePickerNeo from '@/components/DatePickerNeo'
import AddBillModal from '@/components/AddBillModal'
import { SkeletonRows } from '@/components/Skeleton'
import EmptyState from '@/components/EmptyState'
import { ActionSheet, DropdownMenu, ActionItem } from '@/components/ActionMenu'
import { useIsWeb } from '@/hooks/useIsWeb'

type Tab = 'pengeluaran' | 'pemasukan'
const rp = (n: number) => `Rp ${n.toLocaleString('id-ID')}`

export default function RecurringPage() {
  const { showToast } = useToast()
  const { showConfirm } = useConfirm()

  const [bills, setBills] = useState<RecurringBill[]>([])
  const [wallets, setWallets] = useState<Wallet[]>([])
  const [billPayments, setBillPayments] = useState<Record<number, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('pengeluaran')
  const [deletingId, setDeletingId] = useState<number | null>(null)
  // Action sheet per item (DESIGN-TAMBAHAN §7 / AksiTagihan)
  const [menuBill, setMenuBill] = useState<RecurringBill | null>(null)
  const isWeb = useIsWeb()

  // Add / edit modal
  const [addOpen, setAddOpen] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)

  // Pay sheet
  const [paySheet, setPaySheet] = useState<RecurringBill | null>(null)
  const [payWalletId, setPayWalletId] = useState<number | null>(null)
  const [payAmount, setPayAmount] = useState('')
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0])
  const [paying, setPaying] = useState(false)

  const fetchBills = async () => {
    try { setBills(await getRecurringBills()) } catch (e) { console.error(e) } finally { setLoading(false) }
  }
  const fetchWallets = async () => {
    const { data } = await supabase.from('wallets').select('*')
    setWallets(data || [])
  }
  const checkBillPayments = async () => {
    const currentMonth = new Date().toISOString().slice(0, 7)
    const { data } = await supabase.from('bill_payments').select('bill_id').eq('month', currentMonth)
    const map: Record<number, boolean> = {}
    data?.forEach(p => { map[p.bill_id] = true })
    setBillPayments(map)
  }

  const refreshAll = () => { fetchBills(); fetchWallets(); checkBillPayments() }

  useEffect(() => {
    refreshAll()
    if (typeof window !== 'undefined') {
      const e = new URLSearchParams(window.location.search).get('edit')
      if (e) { setEditId(parseInt(e)); setAddOpen(true) }
    }
  }, [])

  const isPemasukan = (b: RecurringBill) => b.type === 'pemasukan'

  // Status badge for a due day-of-month.
  const getStatus = (dueDate: number) => {
    const today = new Date().getDate()
    const daysLeft = dueDate - today
    if (daysLeft < 0) return { cls: 'b-bad', text: 'Terlewat' }
    if (daysLeft <= 3) return { cls: 'b-warn', text: daysLeft === 0 ? 'Hari ini!' : `${daysLeft} hari lagi` }
    return { cls: 'b-neutral', text: `Tgl ${dueDate}` }
  }

  const handleDelete = async (id: number) => {
    const bill = bills.find(b => b.id === id)
    const isIncome = bill?.type === 'pemasukan'
    const ok = await showConfirm({
      title: `Hapus ${isIncome ? 'pemasukan' : 'tagihan'} rutin “${bill?.name ?? ''}”?`,
      message: `Pengingat bulanan berhenti. Transaksi ${isIncome ? 'pemasukan' : 'pembayaran'} yang sudah tercatat tidak ikut terhapus.`,
      confirmText: 'Hapus',
      cancelText: 'Batal',
    })
    if (!ok) return
    setDeletingId(id)
    try {
      await deleteRecurringBill(id)
      refreshAll()
      showToast('success', `${isIncome ? 'Pemasukan' : 'Tagihan'} rutin dihapus`)
    } catch {
      showToast('error', `${isIncome ? 'Pemasukan' : 'Tagihan'} rutin gagal dihapus. Coba lagi.`)
    } finally { setDeletingId(null) }
  }

  const openPay = (b: RecurringBill) => {
    setPaySheet(b)
    setPayAmount(b.amount.toString())
    setPayDate(new Date().toISOString().split('T')[0])
    setPayWalletId(null)
  }

  // Pay / receive a bill — identical logic to the dashboard widget.
  const confirmPayment = async () => {
    if (!paySheet || !payWalletId || !payAmount || !payDate || paying) return
    const amountNum = parseFloat(payAmount)
    if (isNaN(amountNum) || amountNum <= 0) return showToast('error', 'Jumlah tidak valid')
    const walletInfo = wallets.find(w => w.id === payWalletId)
    if (!walletInfo) return showToast('error', 'Dompet tidak ditemukan')
    const isIncome = isPemasukan(paySheet)

    const { data: fresh, error: fErr } = await supabase.from('wallets').select('balance').eq('id', payWalletId).single()
    if (fErr || !fresh) return showToast('error', 'Gagal memverifikasi saldo dompet')
    if (!isIncome && fresh.balance < amountNum) {
      return showToast('error', `Saldo tidak mencukupi! Saldo ${walletInfo.name}: ${rp(fresh.balance)}`)
    }

    setPaying(true)
    try {
      const safeDate = new Date(`${payDate}T12:00:00`).toISOString()
      const month = safeDate.slice(0, 7)
      const { data: tx, error: txErr } = await supabase.from('transactions').insert({
        title: paySheet.name, amount: amountNum, type: isIncome ? 'pemasukan' : 'pengeluaran',
        category: paySheet.category, wallet_id: payWalletId, date: safeDate, created_at: new Date().toISOString(),
      }).select().single()
      if (txErr) throw txErr

      await supabase.from('wallets').update({ balance: isIncome ? fresh.balance + amountNum : fresh.balance - amountNum }).eq('id', payWalletId)
      await supabase.from('bill_payments').insert({ bill_id: paySheet.id, month, paid_at: new Date().toISOString(), transaction_id: tx.id })

      showToast('success', isIncome ? `Pemasukan ${paySheet.name} dicatat` : `Tagihan ${paySheet.name} dibayar`)
      setPaySheet(null)
      refreshAll()
    } catch (e) {
      console.error(e)
      showToast('error', isIncome ? 'Pemasukan gagal dicatat. Coba lagi.' : 'Tagihan gagal dibayar. Coba lagi.')
    } finally {
      setPaying(false)
    }
  }

  // Cancel this month's payment/receipt: delete the bill_payment + its transaction
  // and reverse the wallet balance (refund for an expense, deduct for income).
  const handleCancelPayment = async (bill: RecurringBill) => {
    const income = isPemasukan(bill)
    const ok = await showConfirm({
      title: income ? `Batalkan penerimaan ${bill.name}?` : `Batalkan pembayaran ${bill.name}?`,
      message: income
        ? `Transaksi pemasukan dihapus dan saldo dompet berkurang. ${bill.name} kembali berstatus belum diterima.`
        : `Transaksi pembayaran dihapus dan saldonya dikembalikan ke dompet. ${bill.name} kembali berstatus belum dibayar.`,
      confirmText: income ? 'Batalkan' : 'Batalkan bayar',
      cancelText: 'Kembali',
      tone: 'warn',
    })
    if (!ok) return
    try {
      const month = new Date().toISOString().slice(0, 7)
      const { data: existing } = await supabase.from('bill_payments').select('*').eq('bill_id', bill.id).eq('month', month).single()
      if (existing?.transaction_id) {
        const { data: tx } = await supabase.from('transactions').select('*').eq('id', existing.transaction_id).single()
        if (tx) {
          const { data: w } = await supabase.from('wallets').select('balance').eq('id', tx.wallet_id).single()
          if (w) {
            const newBal = tx.type === 'pemasukan' ? w.balance - tx.amount : w.balance + tx.amount
            await supabase.from('wallets').update({ balance: newBal }).eq('id', tx.wallet_id)
          }
          await supabase.from('transactions').delete().eq('id', tx.id)
        }
      }
      const { error } = await supabase.from('bill_payments').delete().eq('bill_id', bill.id).eq('month', month)
      if (error) throw error
      showToast('success', income ? `Penerimaan ${bill.name} dibatalkan` : `Pembayaran ${bill.name} dibatalkan`)
      refreshAll()
    } catch (e) {
      console.error(e)
      showToast('error', income ? 'Penerimaan gagal dibatalkan. Coba lagi.' : 'Pembayaran gagal dibatalkan. Coba lagi.')
    }
  }

  const activeBills = bills.filter(b => (b.type ?? 'pengeluaran') === tab)
  const unpaid = activeBills.filter(b => !billPayments[b.id]).sort((a, z) => {
    const today = new Date().getDate()
    // Overdue (Terlewat) first, then the nearest due date (DESIGN.md 7.8).
    const eff = (d: number) => (d < today ? d - 31 : d)
    return eff(a.due_date) - eff(z.due_date)
  })
  const paid = activeBills.filter(b => billPayments[b.id])
  const totalPerMonth = activeBills.reduce((a, b) => a + b.amount, 0)

  const closeAdd = () => { setAddOpen(false); setEditId(null) }

  // Sheets / dialogs shared by the mobile and web layouts.
  const overlays = (
      <>
      {/* Pay / receive sheet */}
      {paySheet && (
        <>
          <div className="scrim" onClick={() => setPaySheet(null)} />
          <div className="sheet">
            <div className="grabber" />
            <div className="between">
              <div><h2 className="h2">{isPemasukan(paySheet) ? 'Terima pemasukan' : 'Bayar tagihan'}</h2><div className="lbl">{paySheet.name}</div></div>
              <button className="icon-btn ghost" aria-label="Tutup" onClick={() => setPaySheet(null)}><X className="i" /></button>
            </div>
            <label className="field">{isPemasukan(paySheet) ? 'Jumlah diterima (Rp)' : 'Jumlah pembayaran (Rp)'}
              <input className="input" inputMode="numeric" placeholder="0" value={payAmount ? parseInt(payAmount.replace(/\D/g, '') || '0').toLocaleString('id-ID') : ''} onChange={e => setPayAmount(e.target.value.replace(/\D/g, ''))} />
            </label>
            <label className="field">Tanggal
              <DatePickerNeo className="input" value={payDate} onChange={e => setPayDate(e.target.value)} />
            </label>
            <div className="field">{isPemasukan(paySheet) ? 'Masuk ke dompet' : 'Bayar dari dompet'}
              <NeoSelect value={payWalletId ? payWalletId.toString() : ''} onChange={v => setPayWalletId(Number(v))} placeholder="Pilih dompet"
                options={wallets.map(w => ({ label: `${w.name} — ${rp(w.balance)}`, value: w.id.toString() }))} />
            </div>
            <div className="g2">
              <button className="btn-2" disabled={paying} onClick={() => setPaySheet(null)}>Batal</button>
              <button className="btn" style={{ height: 44, fontSize: 14 }} disabled={!payWalletId || !payAmount || paying} onClick={confirmPayment}>
                {paying ? 'Menyimpan…' : `${isPemasukan(paySheet) ? 'Terima' : 'Bayar'} ${rp(parseInt(payAmount.replace(/D/g, '') || '0'))}`}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Item action sheet */}
      <ActionSheet
        isOpen={!!menuBill}
        onClose={() => setMenuBill(null)}
        header={menuBill ? { title: menuBill.name, subtitle: `${rp(menuBill.amount)} · tiap tanggal ${menuBill.due_date}` } : undefined}
        items={menuBill ? (billPayments[menuBill.id]
          ? [
            { key: 'cancel', label: isPemasukan(menuBill) ? 'Batalkan penerimaan bulan ini' : 'Batalkan pembayaran bulan ini', icon: <Undo2 className="i i-s" />, onClick: () => handleCancelPayment(menuBill) },
            { key: 'edit', label: isPemasukan(menuBill) ? 'Ubah pemasukan rutin' : 'Ubah tagihan', icon: <Pencil className="i i-s" />, onClick: () => { setEditId(menuBill.id); setAddOpen(true) } },
            { key: 'del', label: isPemasukan(menuBill) ? 'Hapus pemasukan rutin' : 'Hapus tagihan rutin', icon: <Trash2 className="i i-s" />, danger: true, onClick: () => handleDelete(menuBill.id) },
          ]
          : [
            { key: 'pay', label: isPemasukan(menuBill) ? 'Catat diterima' : 'Bayar tagihan', icon: <WalletIcon className="i i-s" />, onClick: () => openPay(menuBill) },
            { key: 'edit', label: 'Ubah', icon: <Pencil className="i i-s" />, onClick: () => { setEditId(menuBill.id); setAddOpen(true) } },
            { key: 'del', label: 'Hapus', icon: <Trash2 className="i i-s" />, danger: true, onClick: () => handleDelete(menuBill.id) },
          ]) : []}
      />

      {/* Add / edit recurring item */}
      {addOpen && (
        <AddBillModal
          isOpen={addOpen}
          mode="modal"
          editId={editId}
          onClose={closeAdd}
          onSuccess={() => { closeAdd(); refreshAll() }}
        />
      )}
      </>
  )

  // ── Web (>=768px): TagihanWeb — summary cards + table; ⋯ opens a dropdown ──
  const countOf = (t: Tab) => bills.filter(b => (b.type ?? 'pengeluaran') === t).length
  const paidTotal = paid.reduce((a, b) => a + b.amount, 0)
  const unpaidTotal = unpaid.reduce((a, b) => a + b.amount, 0)
  const webMenu = (b: RecurringBill): ActionItem[] => billPayments[b.id]
    ? [
      { key: 'cancel', label: isPemasukan(b) ? 'Batalkan penerimaan bulan ini' : 'Batalkan pembayaran bulan ini', icon: <Undo2 className="i i-s" />, onClick: () => handleCancelPayment(b) },
      { key: 'edit', label: 'Ubah', icon: <Pencil className="i i-s" />, onClick: () => { setEditId(b.id); setAddOpen(true) } },
      { key: 'del', label: 'Hapus', icon: <Trash2 className="i i-s" />, danger: true, onClick: () => handleDelete(b.id) },
    ]
    : [
      { key: 'edit', label: 'Ubah', icon: <Pencil className="i i-s" />, onClick: () => { setEditId(b.id); setAddOpen(true) } },
      { key: 'del', label: 'Hapus', icon: <Trash2 className="i i-s" />, danger: true, onClick: () => handleDelete(b.id) },
    ]

  if (isWeb) {
    const rows = [...unpaid, ...paid]
    return (
      <div className="cd" style={{ minHeight: '100vh', background: 'var(--bg)' }}>
        <main className="main">
          <div className="ptop">
            <h1 className="ptitle">Tagihan rutin</h1>
            <div className="hstack" style={{ flexWrap: 'wrap', gap: 8 }}>
              <div className="seg" style={{ minWidth: 280 }}>
                <button className={tab === 'pengeluaran' ? 'on' : ''} onClick={() => setTab('pengeluaran')}>Tagihan · {countOf('pengeluaran')}</button>
                <button className={tab === 'pemasukan' ? 'on' : ''} onClick={() => setTab('pemasukan')}>Pemasukan · {countOf('pemasukan')}</button>
              </div>
              <button className="btn" onClick={() => { setEditId(null); setAddOpen(true) }}><Plus className="i i-s" />{tab === 'pemasukan' ? 'Tambah pemasukan' : 'Tambah tagihan'}</button>
            </div>
          </div>

          <div className="wrap">
            <div className="card" style={{ flex: '1 1 200px', padding: 20 }}><div className="lbl">Total per bulan</div><div className="num-l">{rp(totalPerMonth)}</div></div>
            <div className="card" style={{ flex: '1 1 200px', padding: 20 }}><div className="lbl">{tab === 'pemasukan' ? 'Sudah diterima' : 'Sudah dibayar'}</div><div className="num-l pos">{rp(paidTotal)}</div></div>
            <div className="card" style={{ flex: '1 1 200px', padding: 20 }}><div className="lbl">{tab === 'pemasukan' ? 'Belum diterima' : 'Belum dibayar'}</div><div className={`num-l ${unpaidTotal > 0 && tab === 'pengeluaran' ? 'bad' : ''}`}>{rp(unpaidTotal)}</div></div>
          </div>

          <section className="card" style={{ padding: 0 }}>
            {loading ? (
              <div style={{ padding: 20 }}><SkeletonRows count={3} /></div>
            ) : rows.length === 0 ? (
              <div style={{ padding: 20 }}>
                {tab === 'pemasukan' ? (
                  <EmptyState icon={<TrendingUp className="i" />} title="Belum ada pemasukan rutin" text="Gaji atau uang bulanan yang datang di tanggal sama." actionLabel="Tambah pemasukan" onAction={() => { setEditId(null); setAddOpen(true) }} style={{ border: 0 }} />
                ) : (
                  <EmptyState icon={<Calendar className="i" />} title="Belum ada tagihan rutin" text="Netflix, internet, listrik. Diingatkan tiap bulan." actionLabel="Tambah tagihan" onAction={() => { setEditId(null); setAddOpen(true) }} style={{ border: 0 }} />
                )}
              </div>
            ) : (
              <div className="tbl-box">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th style={{ paddingLeft: 20 }}>{tab === 'pemasukan' ? 'Pemasukan' : 'Tagihan'}</th><th className="r">Nominal</th><th>Jatuh tempo</th><th>Kategori</th><th>Status</th>
                      <th className="r" style={{ paddingRight: 20 }}><span className="sr-only">Aksi</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(b => {
                      const done = !!billPayments[b.id]
                      const income = isPemasukan(b)
                      const st = done ? { cls: 'b-ok', text: income ? 'Sudah diterima' : 'Lunas' } : getStatus(b.due_date)
                      return (
                        <tr key={b.id}>
                          <td style={{ paddingLeft: 20 }}>
                            <div className="hstack" style={{ gap: 10 }}>
                              <div className={`ic-s ${income ? 'c-gaji' : 'c-tagihan'}`}>{income ? <TrendingUp className="i i-s" /> : <Calendar className="i i-s" />}</div>
                              <b style={{ fontWeight: 600 }}>{b.name}</b>
                            </div>
                          </td>
                          <td className="r" style={{ fontWeight: 600, color: income ? 'var(--income)' : 'var(--text)', whiteSpace: 'nowrap' }}>{income ? '+' : ''}{rp(b.amount)}</td>
                          <td>Tiap tgl {b.due_date}</td>
                          <td>{b.category}</td>
                          <td><span className={`badge ${st.cls}`}>{st.text}</span></td>
                          <td className="r" style={{ paddingRight: 20, whiteSpace: 'nowrap' }}>
                            <div className="hstack" style={{ gap: 6, justifyContent: 'flex-end' }}>
                              {!done && <button className="btn" style={{ height: 36, fontSize: 13, padding: '0 14px' }} disabled={deletingId === b.id} onClick={() => openPay(b)}>{income ? 'Terima' : 'Bayar'}</button>}
                              <DropdownMenu ariaLabel={`Opsi ${b.name}`} items={webMenu(b)} />
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {!loading && rows.length > 0 && (
              <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)' }} className="lbl">
                {tab === 'pemasukan' ? 'Terima mencatat pemasukan ke dompet yang dipilih dan menandainya sudah diterima bulan ini.' : 'Bayar mencatat pengeluaran dari dompet yang dipilih dan menandai tagihan lunas bulan ini.'}
              </div>
            )}
          </section>
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
            <Link href="/" className="icon-btn ghost" aria-label="Kembali"><ChevronLeft className="i" /></Link>
            <h1 className="h1">Tagihan rutin</h1>
          </div>
          <button className="icon-btn" aria-label="Tambah item rutin" onClick={() => { setEditId(null); setAddOpen(true) }}><Plus className="i" /></button>
        </div>

        {/* Tabs */}
        <div className="seg" role="tablist">
          <button className={tab === 'pengeluaran' ? 'on' : ''} onClick={() => setTab('pengeluaran')}>Tagihan</button>
          <button className={tab === 'pemasukan' ? 'on' : ''} onClick={() => setTab('pemasukan')}>Pemasukan</button>
        </div>

        {/* Summary */}
        <div className="card g2" style={{ padding: '14px 16px' }}>
          <div><div className="lbl">Total per bulan</div><div className="num-m">{rp(totalPerMonth)}</div></div>
          <div><div className="lbl">{tab === 'pemasukan' ? 'Belum diterima' : 'Belum dibayar'}</div><div className="num-m">{unpaid.length}</div></div>
        </div>

        {loading ? (
          <SkeletonRows count={3} />
        ) : activeBills.length === 0 ? (
          tab === 'pemasukan' ? (
            <EmptyState icon={<TrendingUp className="i" />} title="Belum ada pemasukan rutin" text="Gaji atau uang bulanan yang datang di tanggal sama." actionLabel="Tambah pemasukan" onAction={() => { setEditId(null); setAddOpen(true) }} />
          ) : (
            <EmptyState icon={<Calendar className="i" />} title="Belum ada tagihan rutin" text="Netflix, internet, listrik. Diingatkan tiap bulan." actionLabel="Tambah tagihan" onAction={() => { setEditId(null); setAddOpen(true) }} />
          )
        ) : (
          <>
            {/* Needs action */}
            {unpaid.length > 0 && (
              <div>
                <div className="date-h">{tab === 'pemasukan' ? 'Belum diterima' : 'Perlu dibayar'}</div>
                <div className="stack-12">
                  {unpaid.map(b => {
                    const st = getStatus(b.due_date)
                    const income = isPemasukan(b)
                    return (
                      <div className="card stack" key={b.id}>
                        <div className="hstack" style={{ gap: 12 }}>
                          <div className={`ic ${income ? 'c-gaji' : 'c-tagihan'}`}>{income ? <TrendingUp className="i" /> : <Calendar className="i" />}</div>
                          <div className="grow">
                            <div className="t">{b.name}</div>
                            <div className={`meta ${income ? 'pos' : ''}`}>{income ? '+' : ''}{rp(b.amount)}</div>
                          </div>
                          <span className={`badge ${st.cls}`}>{st.text}</span>
                        </div>
                        <div className="hstack" style={{ gap: 8 }}>
                          <button className="btn" style={{ flex: 1, height: 44, fontSize: 14 }} onClick={() => openPay(b)}>{income ? 'Terima dana' : 'Bayar'}</button>
                          <button className="icon-btn" aria-label={`Opsi ${b.name}`} disabled={deletingId === b.id} onClick={() => setMenuBill(b)}><MoreHorizontal className="i" /></button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Done this month */}
            {paid.length > 0 && (
              <div>
                <div className="date-h">{tab === 'pemasukan' ? 'Sudah diterima bulan ini' : 'Sudah dibayar bulan ini'}</div>
                <div className="card-flush">
                  {paid.map(b => (
                    <button type="button" className="row rowbtn" key={b.id} aria-label={`Opsi ${b.name}`} onClick={() => setMenuBill(b)}>
                      <div className="ic c-investasi"><CheckCircle2 className="i" /></div>
                      <div className="grow"><div className="t">{b.name}</div><div className="meta">{rp(b.amount)}</div></div>
                      <span className="badge b-ok">{isPemasukan(b) ? 'Sudah diterima' : 'Lunas'}</span>
                      <MoreHorizontal className="i i-s" style={{ color: 'var(--text-2)', flexShrink: 0 }} />
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button className="btn-2 btn-block" onClick={() => { setEditId(null); setAddOpen(true) }}>
              <Plus className="i i-s" />Tambah {tab === 'pemasukan' ? 'pemasukan rutin' : 'tagihan'}
            </button>
          </>
        )}
      </div>

      {overlays}
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, Plus, Calendar, TrendingUp, AlertTriangle, Pencil, Trash2, X, CheckCircle2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { getRecurringBills, deleteRecurringBill } from '@/lib/recurring-bills'
import { RecurringBill, Wallet } from '@/types'
import { useToast } from '@/hooks/useToast'
import { useConfirm } from '@/hooks/useConfirm'
import NeoSelect from '@/components/NeoSelect'
import DatePickerNeo from '@/components/DatePickerNeo'
import AddBillModal from '@/components/AddBillModal'

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

      showToast('success', isIncome ? 'Pemasukan berhasil dicatat!' : 'Tagihan berhasil dibayar!')
      setPaySheet(null)
      refreshAll()
    } catch (e) {
      console.error(e)
      showToast('error', isIncome ? 'Gagal mencatat pemasukan' : 'Gagal membayar tagihan')
    } finally {
      setPaying(false)
    }
  }

  const activeBills = bills.filter(b => (b.type ?? 'pengeluaran') === tab)
  const unpaid = activeBills.filter(b => !billPayments[b.id]).sort((a, z) => {
    const today = new Date().getDate()
    const eff = (d: number) => (d < today ? d + 31 : d)
    return eff(a.due_date) - eff(z.due_date)
  })
  const paid = activeBills.filter(b => billPayments[b.id])
  const totalPerMonth = activeBills.reduce((a, b) => a + b.amount, 0)

  const closeAdd = () => { setAddOpen(false); setEditId(null) }

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
          <div className="card-flush">
            {[0, 1, 2].map(i => <div key={i} className="row"><div className="ic c-lain" style={{ opacity: 0.4 }} /><span className="grow t" style={{ opacity: 0.4 }}>Memuat…</span></div>)}
          </div>
        ) : activeBills.length === 0 ? (
          <div className="card" style={{ textAlign: 'center' }}>
            <p className="t" style={{ whiteSpace: 'normal' }}>{tab === 'pemasukan' ? 'Belum ada pemasukan rutin' : 'Belum ada tagihan rutin'}</p>
            <p className="lbl" style={{ marginTop: 4 }}>Tambahkan item yang berulang tiap bulan agar tidak terlewat.</p>
            <button className="btn btn-block" style={{ marginTop: 12 }} onClick={() => { setEditId(null); setAddOpen(true) }}>Tambah {tab === 'pemasukan' ? 'pemasukan rutin' : 'tagihan'}</button>
          </div>
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
                          <button className="btn-2" aria-label={`Ubah ${b.name}`} onClick={() => { setEditId(b.id); setAddOpen(true) }}><Pencil className="i i-s" /></button>
                          <button className="icon-btn ghost" aria-label={`Hapus ${b.name}`} style={{ color: 'var(--danger)' }} disabled={deletingId === b.id} onClick={() => handleDelete(b.id)}><Trash2 className="i i-s" /></button>
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
                    <div className="row" key={b.id} style={{ opacity: 0.7 }}>
                      <div className="ic c-investasi"><CheckCircle2 className="i" /></div>
                      <div className="grow"><div className="t">{b.name}</div></div>
                      <div className="amt">{rp(b.amount)}</div>
                    </div>
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
            <button className="btn btn-block" disabled={!payWalletId || !payAmount || paying} onClick={confirmPayment}>
              {paying ? 'Menyimpan…' : isPemasukan(paySheet) ? 'Terima' : 'Bayar'}
            </button>
          </div>
        </>
      )}

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
    </div>
  )
}

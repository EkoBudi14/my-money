'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { RecurringBill } from '@/types'

const DAYS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']

/**
 * Month calendar of recurring bills with status colours (DESIGN.md 7.8, TagihanWeb).
 * Payment status is only known for the current month (bill_payments of this month).
 */
export default function BillCalendar({ bills, paid }: { bills: RecurringBill[]; paid: Record<number, boolean> }) {
  const today = new Date()
  const [month, setMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1))
  const isThisMonth = month.getFullYear() === today.getFullYear() && month.getMonth() === today.getMonth()
  const daysIn = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
  const lead = month.getDay()

  const statusOf = (day: number) => {
    const due = bills.filter(b => Math.min(b.due_date, daysIn) === day)
    if (due.length === 0) return null
    if (due.some(b => (b.type ?? 'pengeluaran') === 'pemasukan') && due.every(b => (b.type ?? 'pengeluaran') === 'pemasukan')) return { cls: 'bc-income', items: due }
    if (isThisMonth) {
      const unpaid = due.filter(b => !paid[b.id])
      if (unpaid.length === 0) return { cls: 'bc-paid', items: due }
      if (day < today.getDate()) return { cls: 'bc-late', items: due }
    }
    return { cls: 'bc-soon', items: due }
  }

  const cells: (number | null)[] = [...Array(lead).fill(null), ...Array.from({ length: daysIn }, (_, i) => i + 1)]

  return (
    <section className="card stack-12" aria-label="Kalender tagihan">
      <div className="between">
        <h2 className="h3" style={{ textTransform: 'capitalize' }}>{month.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}</h2>
        <div className="hstack" style={{ gap: 4 }}>
          <button className="icon-btn ghost" style={{ width: 36, height: 36 }} aria-label="Bulan sebelumnya" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}><ChevronLeft className="i i-s" /></button>
          <button className="icon-btn ghost" style={{ width: 36, height: 36 }} aria-label="Bulan berikutnya" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}><ChevronRight className="i i-s" /></button>
        </div>
      </div>
      <div className="bc-grid bc-head">{DAYS.map(d => <span key={d}>{d}</span>)}</div>
      <div className="bc-grid">
        {cells.map((d, i) => {
          if (d === null) return <span key={i} />
          const st = statusOf(d)
          const isToday = isThisMonth && d === today.getDate()
          return (
            <span
              key={i}
              className={`bc-day ${st ? st.cls : ''} ${isToday ? 'bc-today' : ''}`}
              title={st ? st.items.map(b => b.name).join(', ') : undefined}
            >
              {d}
            </span>
          )
        })}
      </div>
      <div className="hstack" style={{ gap: 12, fontSize: 11, color: 'var(--text-2)', flexWrap: 'wrap' }}>
        <span className="hstack" style={{ gap: 4 }}><i className="bc-key bc-paid" />Lunas</span>
        <span className="hstack" style={{ gap: 4 }}><i className="bc-key bc-soon" />Akan datang</span>
        <span className="hstack" style={{ gap: 4 }}><i className="bc-key bc-late" />Terlewat</span>
        <span className="hstack" style={{ gap: 4 }}><i className="bc-key bc-income" />Pemasukan</span>
      </div>
    </section>
  )
}

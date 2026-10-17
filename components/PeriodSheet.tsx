'use client'

import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import DatePickerNeo from '@/components/DatePickerNeo'

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

type Range = { start: string; end: string }

/**
 * "Filter dan periode" sheet (DESIGN.md 7.14 / screens/Periode).
 * Bulanan: year stepper + 12-month grid. Custom: from–to dates.
 * Changes apply live to the parent state; "Terapkan" just closes.
 */
export default function PeriodSheet({
  isOpen,
  onClose,
  filterMode,
  setFilterMode,
  currentDate,
  setCurrentDate,
  customRange,
  setCustomRange,
}: {
  isOpen: boolean
  onClose: () => void
  filterMode: 'monthly' | 'custom'
  setFilterMode: (m: 'monthly' | 'custom') => void
  currentDate: Date
  setCurrentDate: (d: Date) => void
  customRange: Range
  setCustomRange: (r: Range) => void
}) {
  if (!isOpen) return null

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const setYear = (y: number) => setCurrentDate(new Date(y, month, 1))

  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div className="sheet" role="dialog" aria-labelledby="period-title">
        <div className="grabber" />
        <div className="between">
          <h2 className="h2" id="period-title">Filter dan periode</h2>
          <button className="icon-btn ghost" aria-label="Tutup" onClick={onClose}><X className="i" /></button>
        </div>

        <div className="seg">
          <button className={filterMode === 'monthly' ? 'on' : ''} onClick={() => setFilterMode('monthly')}>Bulanan</button>
          <button className={filterMode === 'custom' ? 'on' : ''} onClick={() => setFilterMode('custom')}>Custom</button>
        </div>

        {filterMode === 'monthly' ? (
          <div className="stack-12">
            <div className="between">
              <button className="icon-btn" aria-label="Tahun sebelumnya" style={{ width: 40, height: 40 }} onClick={() => setYear(year - 1)}><ChevronLeft className="i i-s" /></button>
              <span className="h3">{year}</span>
              <button className="icon-btn" aria-label="Tahun berikutnya" style={{ width: 40, height: 40 }} onClick={() => setYear(year + 1)}><ChevronRight className="i i-s" /></button>
            </div>
            <div className="g4" style={{ gap: 8 }}>
              {MONTHS_SHORT.map((m, i) => (
                <button key={m} className={`mo ${i === month ? 'on' : ''}`} aria-pressed={i === month} onClick={() => setCurrentDate(new Date(year, i, 1))}>{m}</button>
              ))}
            </div>
            <span className="lbl">Tanggal 1 sampai akhir bulan.</span>
          </div>
        ) : (
          <div className="stack-12">
            <label className="field">Dari tanggal<DatePickerNeo className="input" value={customRange.start} onChange={(e) => setCustomRange({ ...customRange, start: e.target.value })} /></label>
            <label className="field">Sampai tanggal<DatePickerNeo className="input" value={customRange.end} onChange={(e) => setCustomRange({ ...customRange, end: e.target.value })} /></label>
            <span className="lbl">Rentang ini tersimpan dan dipakai lagi saat app dibuka.</span>
          </div>
        )}

        <div className="g2">
          <button className="btn-2" onClick={() => { setFilterMode('monthly'); setCurrentDate(new Date()); onClose() }}>Reset ke bulan ini</button>
          <button className="btn" style={{ height: 44, fontSize: 14 }} onClick={onClose}>Terapkan</button>
        </div>
      </div>
    </>
  )
}

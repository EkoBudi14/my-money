'use client'

import { useEffect } from 'react'
import { X, Calendar, Download } from 'lucide-react'

/**
 * "Export ke Excel" summary before downloading (DESIGN.md 7.14 / screens/Export).
 * The file content itself is unchanged (lib/exportExcel.ts, 4 sheets).
 */
export default function ExportSheet({
  isOpen,
  onClose,
  periodLabel,
  rowCount,
  rangeCount,
  walletCount,
  onChangePeriod,
  onDownload,
}: {
  isOpen: boolean
  onClose: () => void
  periodLabel: string
  rowCount: number
  rangeCount: number
  walletCount: number
  onChangePeriod?: () => void
  onDownload: () => void
}) {
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  if (!isOpen) return null
  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div className="sheet" role="dialog" aria-labelledby="ex-title">
        <div className="grabber" />
        <div className="between">
          <h2 className="h2" id="ex-title" style={{ fontSize: 18 }}>Export ke Excel</h2>
          <button className="icon-btn ghost" aria-label="Tutup" onClick={onClose}><X className="i" /></button>
        </div>
        <div className="field">Periode
          {onChangePeriod ? (
            <button type="button" className="input" style={{ cursor: 'pointer', textAlign: 'left' }} onClick={() => { onClose(); onChangePeriod() }}>
              <Calendar className="i i-s" /><span className="grow" style={{ fontWeight: 600 }}>{periodLabel}</span><span className="link">Ubah</span>
            </button>
          ) : (
            <div className="input"><Calendar className="i i-s" /><span className="grow" style={{ fontWeight: 600 }}>{periodLabel}</span></div>
          )}
        </div>
        <div className="field">Isi file (4 sheet)
          <div className="card-flush" style={{ background: 'var(--surface-2)' }}>
            <div className="row" style={{ padding: '10px 0' }}><span className="grow t" style={{ fontSize: 13 }}>Transaksi</span><span className="lbl">{rowCount.toLocaleString('id-ID')} baris periode ini</span></div>
            <div className="row" style={{ padding: '10px 0' }}><span className="grow t" style={{ fontSize: 13 }}>Per kategori</span><span className="lbl">Pengeluaran periode ini</span></div>
            <div className="row" style={{ padding: '10px 0' }}><span className="grow t" style={{ fontSize: 13 }}>Rekap per rentang</span><span className="lbl">{rangeCount > 0 ? `${rangeCount} rentang custom` : 'Belum ada rentang custom'}</span></div>
            <div className="row" style={{ padding: '10px 0' }}><span className="grow t" style={{ fontSize: 13 }}>Dompet</span><span className="lbl">Saldo saat ini · {walletCount} dompet</span></div>
          </div>
        </div>
        <button className="btn btn-block" disabled={rowCount === 0} onClick={() => { onClose(); onDownload() }}><Download className="i i-s" />Unduh file .xlsx</button>
        {rowCount === 0 && <span className="lbl" style={{ textAlign: 'center' }}>Tidak ada transaksi di periode ini.</span>}
      </div>
    </>
  )
}

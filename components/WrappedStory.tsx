'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { X, RotateCcw } from 'lucide-react'
import CountUp from '@/components/CountUp'
import { WrappedStats, rp, rpShort, txDate } from '@/lib/insights'

interface Props {
  stats: WrappedStats
  mode: 'month' | 'payday' | 'year'
  label: string // "November 2026" / "2026"
  prevLabel: string
  clean: { clean: number; best: number }
  onClose: () => void
}

interface Slide { id: string; dur?: number; render: () => React.ReactNode }

const fmtDay = (key: string) =>
  new Date(`${key}T12:00:00`).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })

/**
 * Story-style recap ("Wrapped"). Tap right/left to move, hold to pause,
 * arrow keys and Esc on desktop. The progress bar is a CSS animation whose
 * animationend advances the slide, so there is no JS timer loop.
 */
export default function WrappedStory({ stats, mode, label, prevLabel, clean, onClose }: Props) {
  const [idx, setIdx] = useState(0)
  const [paused, setPaused] = useState(false)
  const [run, setRun] = useState(0) // bump to replay from the start
  const stageRef = useRef<HTMLDivElement>(null)
  const downAt = useRef(0)

  const slides = useMemo<Slide[]>(() => {
    const s: Slide[] = []
    const net = stats.totalIn - stats.totalOut
    s.push({
      id: 'intro', dur: 4000, render: () => (
        <>
          <span className="wr-pill">{mode === 'year' ? 'Rekap tahunan' : mode === 'payday' ? 'Rekap periode gajian' : 'Rekap bulanan'}</span>
          <p className="wr-big">{label}</p>
          <p className="wr-p">{stats.txCount} transaksi tercatat. Yuk lihat ke mana saja uangmu pergi.</p>
        </>
      ),
    })
    s.push({
      id: 'total', render: () => (
        <>
          <p className="wr-k">Total pengeluaran</p>
          <p className="wr-big"><CountUp value={stats.totalOut} format={rp} duration={1400} /></p>
          {stats.changePct !== null ? (
            <span className="wr-pill">{stats.changePct <= 0 ? '↓' : '↑'} {Math.abs(Math.round(stats.changePct))}% dibanding {prevLabel}</span>
          ) : (
            <span className="wr-pill">Belum ada data {prevLabel} untuk dibandingkan</span>
          )}
          <p className="wr-p">Rata-rata {rp(stats.avgPerDay)} per hari{stats.changePct !== null ? (stats.changePct <= 0 ? '. Lebih irit, mantap!' : '. Sedikit lebih boros dari sebelumnya.') : '.'}</p>
        </>
      ),
    })
    if (stats.categories.length > 0) {
      const top = stats.categories[0]
      s.push({
        id: 'cats', dur: 7000, render: () => (
          <>
            <p className="wr-k">Paling boros di</p>
            <p className="wr-mid">{top.name}</p>
            <p className="wr-p">{rp(top.amount)}, atau {Math.round(top.share * 100)}% dari semua pengeluaran.</p>
            <div className="wr-rows">
              {stats.categories.slice(0, 5).map((c, i) => (
                <div className="wr-row" key={c.name}>
                  <div className="between"><span>{c.name}</span><span>{rpShort(c.amount)}</span></div>
                  <div className="wr-bar"><div style={{ width: `${(c.amount / top.amount) * 100}%`, ['--i' as string]: i }} /></div>
                </div>
              ))}
            </div>
          </>
        ),
      })
    }
    if (stats.busiestDay) {
      const d = stats.busiestDay
      s.push({
        id: 'day', render: () => (
          <>
            <p className="wr-k">Hari paling boros</p>
            <p className="wr-mid">{fmtDay(d.key)}</p>
            <p className="wr-big" style={{ fontSize: 36 }}><CountUp value={d.amount} format={rp} /></p>
            <p className="wr-p">Habis dalam {d.count} transaksi.</p>
            {stats.busiestWeekday && <span className="wr-pill">Biasanya paling boros tiap hari {stats.busiestWeekday.name}</span>}
          </>
        ),
      })
    }
    if (stats.biggest) {
      const b = stats.biggest
      s.push({
        id: 'big', render: () => (
          <>
            <p className="wr-k">Transaksi terbesar</p>
            <p className="wr-big"><CountUp value={b.amount} format={rp} /></p>
            <p className="wr-mid" style={{ fontSize: 22 }}>{b.title || b.category}</p>
            <p className="wr-p">{b.category} · {txDate(b).toLocaleDateString('id-ID', { day: 'numeric', month: 'long' })}</p>
          </>
        ),
      })
    }
    if (mode === 'year' && stats.worstMonth) {
      const max = Math.max(...stats.months.map(m => m.out), 1)
      s.push({
        id: 'months', dur: 7000, render: () => (
          <>
            <p className="wr-k">Bulan paling boros</p>
            <p className="wr-mid">{stats.worstMonth!.label} · {rpShort(stats.worstMonth!.out)}</p>
            <div className="wr-cols" aria-hidden>
              {stats.months.map((m, i) => (
                <div key={m.label}>
                  <b className={m.label === stats.worstMonth!.label ? 'hi' : ''} style={{ height: `${Math.max(2, (m.out / max) * 100)}%`, ['--i' as string]: i }} />
                  <span>{m.label.slice(0, 3)}</span>
                </div>
              ))}
            </div>
            {stats.bestMonth && <p className="wr-p">Paling irit: {stats.bestMonth.label} dengan {rpShort(stats.bestMonth.out)}.</p>}
          </>
        ),
      })
    }
    if (stats.topTag) {
      const t = stats.topTag
      s.push({
        id: 'tag', render: () => (
          <>
            <p className="wr-k">Label paling banyak makan biaya</p>
            {t.tag.emoji && <p className="wr-big" style={{ fontSize: 64 }}>{t.tag.emoji}</p>}
            <p className="wr-mid">{t.tag.name}</p>
            <p className="wr-p">Total {rp(t.amount)} di periode ini.</p>
          </>
        ),
      })
    }
    s.push({
      id: 'hemat', render: () => (
        <>
          <p className="wr-k">Mode Hemat</p>
          <p className="wr-big"><CountUp value={clean.clean} format={n => `${n} hari`} /></p>
          <p className="wr-p">tanpa jajan. Streak terpanjang {clean.best} hari{clean.best >= 7 ? ' 🔥' : ''}.</p>
        </>
      ),
    })
    s.push({
      id: 'outro', render: () => (
        <>
          <p className="wr-k">Ringkasnya</p>
          <div className="wr-rows">
            <div className="between" style={{ fontSize: 16, fontWeight: 600 }}><span>Masuk</span><span>{rp(stats.totalIn)}</span></div>
            <div className="between" style={{ fontSize: 16, fontWeight: 600 }}><span>Keluar</span><span>{rp(stats.totalOut)}</span></div>
          </div>
          <p className="wr-k" style={{ marginTop: 8 }}>{net >= 0 ? 'Sisa' : 'Defisit'}</p>
          <p className="wr-big"><CountUp value={Math.abs(net)} format={rp} /></p>
          <p className="wr-p">{net >= 0 ? 'Masih ada sisa. Pindahkan ke tabungan biar tidak kepakai.' : 'Pengeluaran lebih besar dari pemasukan. Coba pasang budget untuk kategori teratas.'}</p>
          <div className="hstack" style={{ gap: 10, marginTop: 8 }}>
            <button className="wr-btn" onClick={() => { setIdx(0); setRun(r => r + 1) }}><RotateCcw className="i i-s" />Putar ulang</button>
            <button className="wr-btn" style={{ background: 'rgba(255,255,255,.16)', color: '#fff' }} onClick={onClose}>Selesai</button>
          </div>
        </>
      ),
    })
    return s
  }, [stats, mode, label, prevLabel, clean, onClose])

  const last = slides.length - 1
  const next = useCallback(() => setIdx(i => Math.min(last, i + 1)), [last])
  const prev = useCallback(() => setIdx(i => Math.max(0, i - 1)), [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); next() }
      else if (e.key === 'ArrowLeft') prev()
    }
    window.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prevOverflow }
  }, [next, prev, onClose])

  // Tap = navigate (left third back, rest forward). Hold = pause.
  const onDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button')) return
    downAt.current = Date.now()
    setPaused(true)
  }
  const onUp = (e: React.PointerEvent) => {
    if (!downAt.current) return
    const held = Date.now() - downAt.current
    downAt.current = 0
    setPaused(false)
    if (held > 250) return
    const rect = stageRef.current?.getBoundingClientRect()
    if (!rect) return
    if (e.clientX - rect.left < rect.width / 3) prev(); else next()
  }

  const slide = slides[idx]
  return (
    <div className={`cd wr ${paused ? 'paused' : ''}`} role="dialog" aria-modal="true" aria-label={`Rekap ${label}`}>
      <div
        ref={stageRef}
        className="wr-stage"
        onPointerDown={onDown}
        onPointerUp={onUp}
        onPointerCancel={() => { downAt.current = 0; setPaused(false) }}
      >
        <div className={`wr-bg wr-s${idx % 6}`} />
        <div className="wr-prog" aria-hidden>
          {slides.map((s, i) => (
            <span key={s.id} className={i < idx ? 'done' : i === idx ? 'on' : ''}>
              <i
                key={i === idx ? `on-${idx}-${run}` : 'x'}
                style={{ ['--dur' as string]: `${s.dur ?? 5500}ms` }}
                onAnimationEnd={i === idx && idx < last ? next : undefined}
              />
            </span>
          ))}
        </div>
        <div className="wr-top">
          <span>{label} · {idx + 1}/{slides.length}</span>
          <button aria-label="Tutup rekap" onClick={onClose}><X className="i" /></button>
        </div>
        <div className="wr-body wr-in" key={`${slide.id}-${run}`} aria-live="polite">
          {slide.render()}
        </div>
      </div>
    </div>
  )
}

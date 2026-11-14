'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, Play, Sparkles } from 'lucide-react'
import { useTransactions, useTags, useSettings, useFilterHistory } from '@/hooks/useAppData'
import { useNoSpendSettings } from '@/hooks/useNoSpendSettings'
import { useIsWeb } from '@/hooks/useIsWeb'
import { SkeletonCards } from '@/components/Skeleton'
import EmptyState from '@/components/EmptyState'
import CountUp from '@/components/CountUp'
import WrappedStory from '@/components/WrappedStory'
import {
  computeNoSpend, computeWrapped, dayKeyOf, longestCleanRun, monthRange, yearRange, rp, rpShort, Range,
} from '@/lib/insights'

type Mode = 'month' | 'payday' | 'year'
const MODES: { key: Mode; label: string }[] = [
  { key: 'month', label: 'Bulanan' },
  { key: 'payday', label: 'Gajian' },
  { key: 'year', label: 'Tahunan' },
]
const MODE_KEY = 'cd-rekap-mode'

// "YYYY-MM-DD" as local midnight.
const localDay = (s: string) => new Date(`${s.slice(0, 10)}T00:00:00`)
const shortRange = (r: Range) => {
  const last = new Date(r.end); last.setDate(last.getDate() - 1)
  const sameYear = r.start.getFullYear() === last.getFullYear()
  const a = r.start.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: sameYear ? undefined : 'numeric' })
  const b = last.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
  return `${a} – ${b}`
}

export default function RekapPage() {
  const isWeb = useIsWeb()
  const txQuery = useTransactions()
  const tagsQuery = useTags()
  const { settings } = useNoSpendSettings()
  const transactions = useMemo(() => txQuery.data ?? [], [txQuery.data])
  const tags = useMemo(() => tagsQuery.data ?? [], [tagsQuery.data])
  const settingsQ = useSettings()
  const historyQ = useFilterHistory()
  const loading = txQuery.isLoading

  // Payday periods = every custom range saved from Beranda (filter_history)
  // plus the custom range currently set, oldest first, without duplicates.
  const paydays = useMemo<Range[]>(() => {
    const rows = [...((historyQ.data as { start_date: string; end_date: string }[] | undefined) ?? [])]
    const cur = settingsQ.data as { custom_start_date?: string; custom_end_date?: string } | null | undefined
    if (cur?.custom_start_date && cur?.custom_end_date) rows.push({ start_date: cur.custom_start_date, end_date: cur.custom_end_date })
    const seen = new Set<string>()
    const out: Range[] = []
    for (const r of rows) {
      const k = `${r.start_date.slice(0, 10)}|${r.end_date.slice(0, 10)}`
      if (seen.has(k)) continue
      seen.add(k)
      const start = localDay(r.start_date)
      const end = localDay(r.end_date); end.setDate(end.getDate() + 1)
      if (end > start) out.push({ start, end })
    }
    return out.sort((a, b) => a.start.getTime() - b.start.getTime())
  }, [historyQ.data, settingsQ.data])

  const now = new Date()
  const [mode, setMode] = useState<Mode>('month')
  const [payIdx, setPayIdx] = useState(-1) // -1 = newest
  const [cursor, setCursor] = useState(() => new Date(now.getFullYear(), now.getMonth(), 1))
  const [playing, setPlaying] = useState(false)
  // Remember the last chosen recap type in this browser.
  useEffect(() => {
    try {
      const v = localStorage.getItem(MODE_KEY) as Mode | null
      if (v && MODES.some(x => x.key === v)) setMode(v)
    } catch { /* ignore */ }
  }, [])

  const y = cursor.getFullYear(), m = cursor.getMonth()
  const pIdx = payIdx < 0 || payIdx >= paydays.length ? paydays.length - 1 : payIdx
  const pay: Range | undefined = paydays[pIdx]
  // Previous payday period; when none is saved, the same number of days right before it.
  const payPrev: Range | undefined = pay && (paydays[pIdx - 1] ?? {
    start: new Date(pay.start.getTime() - (pay.end.getTime() - pay.start.getTime())),
    end: new Date(pay.start),
  })
  const noPayday = mode === 'payday' && !pay
  const range: Range = mode === 'month' ? monthRange(y, m) : mode === 'year' ? yearRange(y) : (pay ?? monthRange(y, m))
  const prevRange: Range = mode === 'month' ? monthRange(y, m - 1) : mode === 'year' ? yearRange(y - 1) : (payPrev ?? monthRange(y, m - 1))
  const label = mode === 'month'
    ? cursor.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
    : mode === 'year' ? String(y) : pay ? shortRange(pay) : 'Periode gajian'
  const prevBase = mode === 'month'
    ? new Date(y, m - 1, 1).toLocaleDateString('id-ID', { month: 'long' })
    : mode === 'year' ? String(y - 1) : 'periode lalu'
  // Running period: computeWrapped compares the same elapsed days, say so.
  const prevLabel = now >= range.start && now < range.end ? `${prevBase} (hari yang sama)` : prevBase
  const isCurrent = mode === 'month'
    ? (y === now.getFullYear() && m === now.getMonth())
    : mode === 'year' ? y === now.getFullYear() : pIdx >= paydays.length - 1
  const isRunning = now >= range.start && now < range.end
  const rangeKey = `${mode}-${range.start.getTime()}-${range.end.getTime()}-${prevRange.start.getTime()}`

  const stats = useMemo(
    () => computeWrapped(transactions, tags, range, prevRange, mode === 'year' ? 'year' : 'month'),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [transactions, tags, rangeKey],
  )
  const noSpend = useMemo(() => computeNoSpend(transactions, settings), [transactions, settings])
  const clean = useMemo(() => {
    const lastDay = new Date(range.end); lastDay.setDate(lastDay.getDate() - 1)
    return longestCleanRun(noSpend, dayKeyOf(range.start), dayKeyOf(lastDay))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noSpend, rangeKey])

  const step = (dir: -1 | 1) => {
    if (mode === 'payday') { setPayIdx(Math.max(0, Math.min(paydays.length - 1, pIdx + dir))); return }
    setCursor(mode === 'month' ? new Date(y, m + dir, 1) : new Date(y + dir, m, 1))
  }
  const switchMode = (next: Mode) => {
    setMode(next)
    setPayIdx(-1)
    setCursor(new Date(now.getFullYear(), next === 'year' ? 0 : now.getMonth(), 1))
    try { localStorage.setItem(MODE_KEY, next) } catch { /* ignore */ }
  }
  const closeStory = useCallback(() => setPlaying(false), [])
  const empty = stats.txCount === 0
  const net = stats.totalIn - stats.totalOut

  // ── Blocks ─────────────────────────────────────────────────────────────────
  const controls = (
    <div className="stack-12">
      <div className="seg seg-anim" role="tablist" aria-label="Jenis rekap">
        <span className="seg-pill" aria-hidden style={{ transform: `translateX(calc(${MODES.findIndex(x => x.key === mode)} * (100% + 4px)))` }} />
        {MODES.map(x => (
          <button key={x.key} role="tab" aria-selected={mode === x.key} className={mode === x.key ? 'on' : ''} onClick={() => switchMode(x.key)}>{x.label}</button>
        ))}
      </div>
      <div className="between">
        <button className="icon-btn ghost" style={{ width: 36, height: 36 }} aria-label="Periode sebelumnya" disabled={mode === 'payday' && pIdx <= 0} onClick={() => step(-1)}><ChevronLeft className="i i-s" /></button>
        <span className="h3" style={{ textAlign: 'center' }}>{label}{isRunning ? ' · berjalan' : ''}</span>
        <button className="icon-btn ghost" style={{ width: 36, height: 36 }} aria-label="Periode berikutnya" disabled={isCurrent} onClick={() => step(1)}><ChevronRight className="i i-s" /></button>
      </div>
    </div>
  )

  const hero = (
    <div className="wr-hero wr-s0">
      <span className="lbl" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Sparkles className="i i-s" />Rekap {mode === 'year' ? 'tahun' : mode === 'payday' ? 'gajian' : 'bulan'} {label}</span>
      <span className="num-xl" style={{ fontSize: 34 }}><CountUp value={stats.totalOut} format={rp} /></span>
      <span className="lbl">
        total keluar{stats.changePct !== null ? ` · ${stats.changePct <= 0 ? '↓' : '↑'} ${Math.abs(Math.round(stats.changePct))}% vs ${prevLabel}` : ''}
      </span>
      <button className="wr-btn" style={{ alignSelf: 'flex-start', marginTop: 6 }} onClick={() => setPlaying(true)}>
        <Play className="i i-s" />Putar rekap
      </button>
    </div>
  )

  const highlights = (
    <div className="g2">
      <div className="tile ins-pop" style={{ ['--i' as string]: 0 }}><div className="lbl">Pemasukan</div><div className="num-m pos">{rpShort(stats.totalIn)}</div></div>
      <div className="tile ins-pop" style={{ ['--i' as string]: 1 }}><div className="lbl">{net >= 0 ? 'Sisa' : 'Defisit'}</div><div className="num-m" style={{ color: net >= 0 ? 'var(--accent)' : 'var(--danger)' }}>{rpShort(Math.abs(net))}</div></div>
      <div className="tile ins-pop" style={{ ['--i' as string]: 2 }}><div className="lbl">Hari paling boros</div><div className="t">{stats.busiestDay ? new Date(`${stats.busiestDay.key}T12:00:00`).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' }) : '—'}</div><div className="meta">{stats.busiestDay ? rp(stats.busiestDay.amount) : ''}</div></div>
      <div className="tile ins-pop" style={{ ['--i' as string]: 3 }}><div className="lbl">Hari hemat</div><div className="t">{clean.clean} hari</div><div className="meta">Streak terpanjang {clean.best} hari</div></div>
      {stats.busiestWeekday && <div className="tile ins-pop" style={{ ['--i' as string]: 4 }}><div className="lbl">Biasanya boros tiap</div><div className="t">{stats.busiestWeekday.name}</div><div className="meta">± {rpShort(stats.busiestWeekday.avg)} per {stats.busiestWeekday.name}</div></div>}
      {stats.biggest && <div className="tile ins-pop" style={{ ['--i' as string]: 5 }}><div className="lbl">Transaksi terbesar</div><div className="t">{stats.biggest.title || stats.biggest.category}</div><div className="meta">{rp(stats.biggest.amount)}</div></div>}
    </div>
  )

  const categories = stats.categories.length > 0 && (
    <div className="card stack-12">
      <span className="h3">Kategori teratas</span>
      {stats.categories.slice(0, 5).map((c, i) => (
        <div key={c.name} className="stack" style={{ gap: 6 }}>
          <div className="between" style={{ fontSize: 13 }}>
            <span className="hstack" style={{ gap: 8, fontWeight: 600 }}><span className="rank">{i + 1}</span>{c.name}</span>
            <span>{rp(c.amount)} · {Math.round(c.share * 100)}%</span>
          </div>
          <div className="bar"><div style={{ width: `${(c.amount / stats.categories[0].amount) * 100}%` }} /></div>
        </div>
      ))}
    </div>
  )

  const yearChart = mode === 'year' && stats.months.some(x => x.out > 0) && (() => {
    const max = Math.max(...stats.months.map(x => Math.max(x.out, x.in)), 1)
    return (
      <div className="card stack-12">
        <div className="between"><span className="h3">Per bulan</span><span className="lbl">{stats.worstMonth ? `Paling boros: ${stats.worstMonth.label}` : ''}</span></div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 160 }}>
          {stats.months.map((mo, i) => (
            <div key={mo.label} style={{ flex: 1, height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }} title={`${mo.label}: keluar ${rp(mo.out)}, masuk ${rp(mo.in)}`}>
              <div className="colb" style={{ flex: 1, width: '100%', gap: 2 }}>
                <div className="cd-grow-y" style={{ height: `${(mo.in / max) * 100}%`, background: 'var(--income-chart)', width: '40%', ['--cd-b' as string]: i }} />
                <div className="cd-grow-y" style={{ height: `${(mo.out / max) * 100}%`, background: stats.worstMonth?.label === mo.label ? 'var(--danger)' : 'var(--accent)', width: '40%', ['--cd-b' as string]: i }} />
              </div>
              <span className="lbl" style={{ fontSize: 10 }}>{mo.label.slice(0, 3)}</span>
            </div>
          ))}
        </div>
        <div className="hstack" style={{ gap: 12, fontSize: 11, color: 'var(--text-2)' }}>
          <span className="hstack" style={{ gap: 4 }}><span className="bc-key" style={{ background: 'var(--income-chart)' }} />Masuk</span>
          <span className="hstack" style={{ gap: 4 }}><span className="bc-key" style={{ background: 'var(--accent)' }} />Keluar</span>
        </div>
      </div>
    )
  })()

  const tagCard = stats.topTag && (
    <div className="card hstack" style={{ gap: 12 }}>
      <div className="ic c-transfer" style={{ fontSize: 20 }}>{stats.topTag.tag.emoji || '🏷️'}</div>
      <div className="grow"><div className="lbl">Label paling aktif</div><div className="t">{stats.topTag.tag.name}</div></div>
      <div className="amt">{rp(stats.topTag.amount)}</div>
    </div>
  )

  const content = loading ? <SkeletonCards count={3} /> : noPayday ? (
    <EmptyState
      icon={<Sparkles className="i" />}
      title="Belum ada periode gajian"
      text="Atur periode custom di Beranda (misalnya 25 Okt – 24 Nov). Periode yang pernah dipakai otomatis muncul di sini."
      actionLabel="Pakai bulan kalender"
      actionVariant="secondary"
      onAction={() => switchMode('month')}
    />
  ) : empty ? (
    <EmptyState icon={<Sparkles className="i" />} title={`Belum ada transaksi di ${label}`} text="Rekap muncul setelah ada pemasukan atau pengeluaran di periode ini." />
  ) : null

  const story = playing && !empty && (
    <WrappedStory stats={stats} mode={mode} label={label} prevLabel={prevLabel} clean={clean} onClose={closeStory} />
  )

  if (isWeb) {
    return (
      <div className="cd" style={{ minHeight: '100vh', background: 'var(--bg)' }}>
        <main className="main">
          <div className="ptop">
            <div><h1 className="ptitle">Rekap</h1><p className="sub">Ringkasan bulanan dan tahunan ala Wrapped.</p></div>
            <div style={{ width: 320 }}>{controls}</div>
          </div>
          {content ?? (
            <div className="wrap" style={{ alignItems: 'flex-start', gap: 20 }}>
              <div className="stack-12" style={{ flex: '1 1 360px', minWidth: 0, gap: 16 }}>{hero}{highlights}{tagCard}</div>
              <div className="stack-12" style={{ flex: '1 1 360px', minWidth: 0, gap: 16 }}>{yearChart}{categories}</div>
            </div>
          )}
        </main>
        {story}
      </div>
    )
  }

  return (
    <div className="cd" style={{ minHeight: '100vh', background: 'var(--surface)' }}>
      <div className="scroll" style={{ maxWidth: 720, margin: '0 auto', paddingBottom: 116 }}>
        <div className="top">
          <div className="top-l">
            <Link href="/more" className="icon-btn ghost" aria-label="Kembali"><ChevronLeft className="i" /></Link>
            <h1 className="h1">Rekap</h1>
          </div>
        </div>
        {controls}
        {content ?? (<>{hero}{highlights}{yearChart}{categories}{tagCard}</>)}
      </div>
      {story}
    </div>
  )
}

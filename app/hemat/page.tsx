'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, Settings2, X, Check } from 'lucide-react'
import { useTransactions, useSettings } from '@/hooks/useAppData'
import { useNoSpendSettings } from '@/hooks/useNoSpendSettings'
import { useIsWeb } from '@/hooks/useIsWeb'
import { useToast } from '@/hooks/useToast'
import { SkeletonCards } from '@/components/Skeleton'
import CountUp from '@/components/CountUp'
import BadgeBurst from '@/components/BadgeBurst'
import { BADGES, Badge, computeNoSpend, dayKeyOf, rp, rpShort } from '@/lib/insights'
import { CATEGORIES } from '@/lib/categories'
import { CustomCategoryDef } from '@/types'

const SEEN_KEY = 'cd-nospend-badges-seen'
const WEEK_HEAD = ['S', 'S', 'R', 'K', 'J', 'S', 'M'] // Senin first
const TARGETS = [3, 7, 14, 30]

export default function HematPage() {
  const isWeb = useIsWeb()
  const { showToast } = useToast()
  const txQuery = useTransactions()
  const settingsQ = useSettings()
  const { settings, save, ready } = useNoSpendSettings()
  const transactions = useMemo(() => txQuery.data ?? [], [txQuery.data])
  const loading = txQuery.isLoading || !ready

  const stats = useMemo(() => computeNoSpend(transactions, settings), [transactions, settings])
  const earned = useMemo(() => BADGES.filter(b => b.progress(stats, settings.target) >= 1), [stats, settings.target])

  // Celebrate a badge once, the first time this browser sees it earned.
  const [burst, setBurst] = useState<Badge | null>(null)
  useEffect(() => {
    if (loading || txQuery.data == null) return
    let seen: string[] = []
    try { seen = JSON.parse(localStorage.getItem(SEEN_KEY) || '[]') } catch { /* ignore */ }
    const fresh = earned.filter(b => !seen.includes(b.id))
    if (fresh.length === 0) return
    setBurst(fresh[fresh.length - 1]) // the hardest new one
    try { localStorage.setItem(SEEN_KEY, JSON.stringify([...seen, ...fresh.map(b => b.id)])) } catch { /* ignore */ }
  }, [loading, earned, txQuery.data])
  const closeBurst = useCallback(() => setBurst(null), [])

  // ── Calendar month ─────────────────────────────────────────────────────────
  const today = new Date()
  const todayKey = dayKeyOf(today)
  const [view, setView] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1))
  const isCurrentMonth = view.getFullYear() === today.getFullYear() && view.getMonth() === today.getMonth()
  const monthKey = `${view.getFullYear()}-${String(view.getMonth() + 1).padStart(2, '0')}`
  const cells = useMemo(() => {
    const first = new Date(view.getFullYear(), view.getMonth(), 1)
    const lead = (first.getDay() + 6) % 7
    const n = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate()
    const out: ({ key: string; day: number } | null)[] = Array(lead).fill(null)
    for (let d = 1; d <= n; d++) out.push({ key: dayKeyOf(new Date(view.getFullYear(), view.getMonth(), d)), day: d })
    return out
  }, [view])
  const monthClean = useMemo(() => {
    let c = 0
    for (const d of stats.days.values()) if (d.clean && d.key.startsWith(monthKey)) c++
    return c
  }, [stats, monthKey])
  const thisMonthKey = todayKey.slice(0, 7)
  const thisMonthClean = useMemo(() => {
    let c = 0
    for (const d of stats.days.values()) if (d.clean && d.key.startsWith(thisMonthKey)) c++
    return c
  }, [stats, thisMonthKey])
  const level = (spent: number) => {
    const avg = stats.avgJajanDay || spent
    return spent < avg * 0.75 ? 'l1' : spent < avg * 1.5 ? 'l2' : 'l3'
  }

  // ── Settings sheet ─────────────────────────────────────────────────────────
  const [editing, setEditing] = useState<{ categories: string[]; target: number } | null>(null)
  const allCats = useMemo(() => {
    const cc = (settingsQ.data as { custom_categories?: { pengeluaran?: (string | CustomCategoryDef)[] } } | null | undefined)?.custom_categories?.pengeluaran ?? []
    return [...CATEGORIES.pengeluaran.map(c => c.name), ...cc.map(c => (typeof c === 'string' ? c : c.name))]
  }, [settingsQ.data])
  const saveSettings = async () => {
    if (!editing) return
    if (editing.categories.length === 0) { showToast('warning', 'Pilih minimal satu kategori jajan.'); return }
    const ok = await save(editing)
    setEditing(null)
    showToast(ok ? 'success' : 'error', ok ? 'Pengaturan Mode Hemat tersimpan' : 'Pengaturan gagal disimpan. Coba lagi.')
  }

  const pct = Math.min(100, (stats.current / settings.target) * 100)
  const reached = stats.current >= settings.target
  const saved = thisMonthClean * stats.avgJajanDay
  const message = stats.current === 0
    ? (stats.todayClean ? 'Mulai hari ini. Satu hari tanpa jajan sudah dihitung.' : 'Streak putus hari ini. Besok mulai lagi dari 1.')
    : reached ? `Target ${settings.target} hari tercapai. Lanjut cetak rekor baru!`
      : `${settings.target - stats.current} hari lagi menuju target ${settings.target} hari.`

  // ── Blocks ─────────────────────────────────────────────────────────────────
  const hero = (
    <div className="hero stack-12" style={{ ['--cd-i' as string]: 0 }}>
      <div className="hstack" style={{ gap: 14 }}>
        <div className={`ins-flame-wrap ${stats.current === 0 ? 'out' : ''}`}>
          <span className={`ins-flame ${stats.current === 0 ? 'out' : ''}`} aria-hidden>🔥</span>
        </div>
        <div className="grow">
          <span className="lbl">Streak hemat</span>
          <div className="num-xl" style={{ fontSize: 40, lineHeight: 1.1 }}><CountUp value={stats.current} format={n => `${n} hari`} duration={900} /></div>
          <span className="lbl">Rekor: {stats.best} hari</span>
        </div>
      </div>
      <div className="stack" style={{ gap: 6 }}>
        <div className="between"><span className="lbl">Target {settings.target} hari</span><span className="lbl">{Math.round(pct)}%</span></div>
        <div className="bar thick"><div style={{ width: `${pct}%` }} /></div>
        <span style={{ fontSize: 13, fontWeight: 600 }}>{message}</span>
      </div>
    </div>
  )

  const todayCard = (
    <div className={`banner ${stats.todayClean ? 'info' : 'warn'}`} style={{ ['--cd-i' as string]: 1 }}>
      {stats.todayClean ? <Check className="i i-s" /> : <span aria-hidden>🍜</span>}
      {stats.todayClean
        ? 'Hari ini belum ada jajan. Pertahankan sampai tengah malam.'
        : `Hari ini sudah jajan ${rp(stats.todaySpent)}. Streak dihitung lagi mulai besok.`}
    </div>
  )

  const statRow = (
    <div className="g3">
      <div className="tile ins-pop" style={{ ['--i' as string]: 0 }}><div className="lbl">Hemat bulan ini</div><div className="num-m"><CountUp value={thisMonthClean} format={n => `${n} hari`} /></div></div>
      <div className="tile ins-pop" style={{ ['--i' as string]: 1 }}><div className="lbl">Total hari hemat</div><div className="num-m"><CountUp value={stats.totalClean} format={n => `${n} hari`} /></div></div>
      <div className="tile ins-pop" style={{ ['--i' as string]: 2 }} title="Hari hemat bulan ini × rata-rata jajan di hari kamu jajan"><div className="lbl">Perkiraan hemat</div><div className="num-m pos"><CountUp value={saved} format={rpShort} /></div></div>
    </div>
  )

  const calendar = (
    <div className="card stack-12">
      <div className="between">
        <button className="icon-btn ghost" style={{ width: 36, height: 36 }} aria-label="Bulan sebelumnya" onClick={() => setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))}><ChevronLeft className="i i-s" /></button>
        <div style={{ textAlign: 'center' }}>
          <div className="h3">{view.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}</div>
          <div className="lbl">{monthClean} hari hemat</div>
        </div>
        <button className="icon-btn ghost" style={{ width: 36, height: 36 }} aria-label="Bulan berikutnya" disabled={isCurrentMonth} onClick={() => setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))}><ChevronRight className="i i-s" /></button>
      </div>
      <div className="ins-heat" role="grid" aria-label="Kalender hari hemat">
        {WEEK_HEAD.map((h, i) => <div key={`h${i}`} className="bc-head" style={{ textAlign: 'center' }}>{h}</div>)}
        {cells.map((c, i) => {
          if (!c) return <div key={`${monthKey}-b${i}`} className="ins-cell blank" />
          const d = stats.days.get(c.key)
          const future = c.key > todayKey
          const cls = future ? 'future' : !d ? '' : d.clean ? 'clean' : level(d.spent)
          const label = future ? 'belum lewat' : !d ? 'belum tercatat' : d.clean ? 'hemat' : `jajan ${rp(d.spent)}`
          return (
            <div
              key={`${monthKey}-${c.day}`}
              className={`ins-cell ${cls} ${c.key === todayKey ? 'today' : ''}`}
              style={{ ['--i' as string]: Math.min(i, 40) }}
              title={`${c.day}: ${label}`}
              aria-label={`Tanggal ${c.day}, ${label}`}
            >
              {c.day}
            </div>
          )
        })}
      </div>
      <div className="hstack" style={{ gap: 12, flexWrap: 'wrap', fontSize: 11, color: 'var(--text-2)' }}>
        <span className="hstack" style={{ gap: 4 }}><span className="bc-key" style={{ background: 'var(--accent-tint)' }} />Hemat</span>
        <span className="hstack" style={{ gap: 4 }}><span className="bc-key" style={{ background: '#FEE2E2' }} /><span className="bc-key" style={{ background: '#FCA5A5' }} /><span className="bc-key" style={{ background: '#EF4444' }} />Jajan (sedikit → banyak)</span>
      </div>
    </div>
  )

  const badges = (
    <div className="stack-12">
      <div className="between"><span className="h3">Badge</span><span className="lbl">{earned.length}/{BADGES.length} kebuka</span></div>
      <div className="ins-badges">
        {BADGES.map((b, i) => {
          const p = b.progress(stats, settings.target)
          const done = p >= 1
          return (
            <button
              key={b.id}
              type="button"
              className={`ins-badge ins-pop ${done ? '' : 'locked'}`}
              style={{ ['--i' as string]: i }}
              disabled={!done}
              aria-label={`${b.title}: ${b.desc}${done ? ', sudah kebuka' : `, ${Math.round(p * 100)}%`}`}
              onClick={() => done && setBurst(b)}
            >
              <span className="em" aria-hidden>{b.emoji}</span>
              <span className="bt">{b.title}</span>
              <span className="lbl" style={{ fontSize: 11, lineHeight: 1.3 }}>{b.id === 'target' ? `Streak ${settings.target} hari` : b.desc}</span>
              {!done && <div className="bar"><div style={{ width: `${p * 100}%` }} /></div>}
            </button>
          )
        })}
      </div>
    </div>
  )

  const footnote = (
    <p className="lbl" style={{ lineHeight: 1.5 }}>
      Hari hemat = tidak ada pengeluaran di kategori {settings.categories.join(', ')}. Tagihan, cicilan, dan talangan tidak memutus streak.{' '}
      <button type="button" className="link" style={{ fontSize: 12 }} onClick={() => setEditing({ ...settings })}>Ubah</button>
    </p>
  )

  const settingsSheet = editing && (
    <>
      <div className="scrim" onClick={() => setEditing(null)} />
      <div className="sheet" role="dialog" aria-modal="true" aria-label="Pengaturan Mode Hemat">
        <div className="grabber" />
        <div className="between"><h2 className="h2">Pengaturan Mode Hemat</h2><button className="icon-btn ghost" aria-label="Tutup" onClick={() => setEditing(null)}><X className="i" /></button></div>
        <div className="field">Kategori yang dihitung jajan
          <span className="lbl" style={{ fontWeight: 500 }}>Ada pengeluaran di kategori ini = hari itu tidak hemat.</span>
          <div className="chips">
            {allCats.map(c => {
              const on = editing.categories.includes(c)
              return (
                <button key={c} type="button" className={`chip ${on ? 'on' : ''}`} aria-pressed={on} onClick={() => setEditing({ ...editing, categories: on ? editing.categories.filter(x => x !== c) : [...editing.categories, c] })}>
                  {on && <Check className="i i-s" style={{ width: 14, height: 14 }} />}{c}
                </button>
              )
            })}
          </div>
        </div>
        <div className="field">Target streak
          <div className="g4">
            {TARGETS.map(t => (
              <button key={t} type="button" className={`mo ${editing.target === t ? 'on' : ''}`} aria-pressed={editing.target === t} onClick={() => setEditing({ ...editing, target: t })}>{t} hari</button>
            ))}
          </div>
        </div>
        <button className="btn btn-block" onClick={saveSettings}>Simpan</button>
      </div>
    </>
  )

  const settingsBtn = (
    <button className="icon-btn" aria-label="Pengaturan Mode Hemat" onClick={() => setEditing({ ...settings })}><Settings2 className="i" /></button>
  )

  const content = loading ? <SkeletonCards count={3} /> : null

  if (isWeb) {
    return (
      <div className="cd" style={{ minHeight: '100vh', background: 'var(--bg)' }}>
        <main className="main">
          <div className="ptop">
            <div><h1 className="ptitle">Mode Hemat</h1><p className="sub">Kumpulkan hari tanpa jajan dan buka badge-nya.</p></div>
            <button className="btn-2" onClick={() => setEditing({ ...settings })}><Settings2 className="i i-s" />Pengaturan</button>
          </div>
          {content ?? (
            <div className="wrap" style={{ alignItems: 'flex-start', gap: 20 }}>
              <div className="stack-12" style={{ flex: '1 1 380px', minWidth: 0, gap: 16 }}>
                {hero}{todayCard}{statRow}{badges}
              </div>
              <div className="stack-12" style={{ flex: '1 1 340px', minWidth: 0, gap: 16 }}>
                {calendar}{footnote}
              </div>
            </div>
          )}
        </main>
        {settingsSheet}
        {burst && <BadgeBurst badge={burst} onClose={closeBurst} />}
      </div>
    )
  }

  return (
    <div className="cd" style={{ minHeight: '100vh', background: 'var(--surface)' }}>
      <div className="scroll" style={{ maxWidth: 720, margin: '0 auto', paddingBottom: 116 }}>
        <div className="top">
          <div className="top-l">
            <Link href="/more" className="icon-btn ghost" aria-label="Kembali"><ChevronLeft className="i" /></Link>
            <h1 className="h1">Mode Hemat</h1>
          </div>
          {settingsBtn}
        </div>
        {content ?? (<>{hero}{todayCard}{statRow}{calendar}{badges}{footnote}</>)}
      </div>
      {settingsSheet}
      {burst && <BadgeBurst badge={burst} onClose={closeBurst} />}
    </div>
  )
}

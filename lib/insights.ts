import { NoSpendSettings, Tag, Transaction } from '@/types'

// Pure calculations for the Insight pages (Mode Hemat, Rekap, Label).
// Everything is derived from the transactions already in the cache, so these
// pages need no extra tables and cost no extra network requests.

const pad2 = (n: number) => String(n).padStart(2, '0')

/** Local calendar day "YYYY-MM-DD" (not UTC, so late-night spending stays on its day). */
export const dayKeyOf = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`

export const txDate = (t: Transaction) => new Date(t.date || t.created_at)

/** Real spending: expenses that are not a talangan (money fronted for someone). */
export const isExpense = (t: Transaction) => t.type === 'pengeluaran' && !t.is_talangan

/** Real income: income that is not a piutang being paid back. */
export const isIncome = (t: Transaction) => t.type === 'pemasukan' && !t.is_piutang

export const DEFAULT_NOSPEND: NoSpendSettings = {
  categories: ['Makan di Luar', 'Belanja', 'Pribadi & Hiburan'],
  target: 7,
}

// Never walk more than two years of days; keeps the loop cheap on old accounts.
const MAX_DAYS = 730

export interface NoSpendDay {
  key: string
  clean: boolean
  spent: number // jajan amount that day
}

export interface NoSpendStats {
  days: Map<string, NoSpendDay>
  firstKey: string | null
  current: number
  best: number
  totalClean: number
  todayClean: boolean
  todaySpent: number
  /** Average jajan on days that had jajan, used for the "uang terselamatkan" estimate. */
  avgJajanDay: number
  weekendClean: boolean
  bestMonthClean: number
}

/**
 * Walk every day from the first recorded transaction to today and mark it
 * clean (no jajan) or not. Days before the user started recording are not
 * counted, so a new user does not get a free 30-day streak.
 */
export function computeNoSpend(transactions: Transaction[], settings: NoSpendSettings, today = new Date()): NoSpendStats {
  const jajan = new Set(settings.categories)
  const spentByDay = new Map<string, number>()
  let first: Date | null = null
  for (const t of transactions) {
    const d = txDate(t)
    if (!first || d < first) first = d
    if (isExpense(t) && jajan.has(t.category)) {
      const k = dayKeyOf(d)
      spentByDay.set(k, (spentByDay.get(k) ?? 0) + t.amount)
    }
  }

  const days = new Map<string, NoSpendDay>()
  const empty: NoSpendStats = {
    days, firstKey: null, current: 0, best: 0, totalClean: 0, todayClean: true, todaySpent: 0,
    avgJajanDay: 0, weekendClean: false, bestMonthClean: 0,
  }
  if (!first) return empty

  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  let start = new Date(first.getFullYear(), first.getMonth(), first.getDate())
  const minStart = new Date(end); minStart.setDate(minStart.getDate() - MAX_DAYS)
  if (start < minStart) start = minStart
  if (start > end) start = end

  let run = 0, best = 0, totalClean = 0, jajanTotal = 0, jajanDays = 0
  let weekendClean = false
  let satClean = false
  const perMonth = new Map<string, number>()
  for (const d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const key = dayKeyOf(d)
    const spent = spentByDay.get(key) ?? 0
    const clean = spent === 0
    days.set(key, { key, clean, spent })
    if (clean) {
      run++; totalClean++
      if (run > best) best = run
      const mk = key.slice(0, 7)
      perMonth.set(mk, (perMonth.get(mk) ?? 0) + 1)
    } else {
      run = 0; jajanTotal += spent; jajanDays++
    }
    const wd = d.getDay()
    if (wd === 6) satClean = clean
    else if (wd === 0 && clean && satClean && days.has(dayKeyOf(new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1)))) weekendClean = true
  }

  const todayKey = dayKeyOf(end)
  const todaySpent = spentByDay.get(todayKey) ?? 0
  return {
    days,
    firstKey: dayKeyOf(start),
    current: run,
    best,
    totalClean,
    todayClean: todaySpent === 0,
    todaySpent,
    avgJajanDay: jajanDays > 0 ? jajanTotal / jajanDays : 0,
    weekendClean,
    bestMonthClean: Math.max(0, ...perMonth.values()),
  }
}

/** Longest run of clean days inside [from, to] (inclusive day keys). */
export function longestCleanRun(stats: NoSpendStats, from: string, to: string) {
  let run = 0, best = 0, clean = 0
  for (const day of stats.days.values()) {
    if (day.key < from || day.key > to) continue
    if (day.clean) { run++; clean++; if (run > best) best = run } else run = 0
  }
  return { best, clean }
}

// ── Badges ──────────────────────────────────────────────────────────────────

export interface Badge {
  id: string
  emoji: string
  title: string
  desc: string
  /** progress 0..1 */
  progress: (s: NoSpendStats, target: number) => number
}

const ratio = (v: number, goal: number) => Math.max(0, Math.min(1, v / goal))

export const BADGES: Badge[] = [
  { id: 'streak3', emoji: '🌱', title: 'Pemanasan', desc: '3 hari hemat berturut-turut', progress: s => ratio(s.best, 3) },
  { id: 'weekend', emoji: '🛋️', title: 'Weekend hemat', desc: 'Sabtu dan Minggu tanpa jajan', progress: s => (s.weekendClean ? 1 : 0) },
  { id: 'streak7', emoji: '🔥', title: 'Seminggu kuat', desc: '7 hari hemat berturut-turut', progress: s => ratio(s.best, 7) },
  { id: 'target', emoji: '🎯', title: 'Target tercapai', desc: 'Streak sampai target kamu', progress: (s, target) => ratio(s.best, target) },
  { id: 'month10', emoji: '📅', title: 'Sepuluh sebulan', desc: '10 hari hemat dalam satu bulan', progress: s => ratio(s.bestMonthClean, 10) },
  { id: 'streak14', emoji: '⚡', title: 'Dua minggu', desc: '14 hari hemat berturut-turut', progress: s => ratio(s.best, 14) },
  { id: 'total50', emoji: '💎', title: 'Setengah abad', desc: 'Total 50 hari hemat', progress: s => ratio(s.totalClean, 50) },
  { id: 'streak30', emoji: '👑', title: 'Sebulan penuh', desc: '30 hari hemat berturut-turut', progress: s => ratio(s.best, 30) },
]

// ── Rekap (Wrapped) ─────────────────────────────────────────────────────────

export interface Range { start: Date; end: Date } // end is exclusive

export const monthRange = (y: number, m: number): Range => ({ start: new Date(y, m, 1), end: new Date(y, m + 1, 1) })
export const yearRange = (y: number): Range => ({ start: new Date(y, 0, 1), end: new Date(y + 1, 0, 1) })

const inRange = (d: Date, r: Range) => d >= r.start && d < r.end

const WEEKDAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']

export interface WrappedStats {
  totalOut: number
  totalIn: number
  prevOut: number
  changePct: number | null // null when there is nothing to compare with
  txCount: number
  activeDays: number
  avgPerDay: number
  categories: { name: string; amount: number; share: number }[]
  busiestDay: { key: string; amount: number; count: number } | null
  busiestWeekday: { name: string; avg: number } | null
  biggest: Transaction | null
  topTag: { tag: Tag; amount: number } | null
  months: { label: string; out: number; in: number }[] // year mode only
  worstMonth: { label: string; out: number } | null
  bestMonth: { label: string; out: number } | null
}

export function computeWrapped(
  transactions: Transaction[],
  tags: Tag[],
  range: Range,
  prev: Range,
  mode: 'month' | 'year',
): WrappedStats {
  let totalOut = 0, totalIn = 0, prevOut = 0, txCount = 0
  const byCat = new Map<string, number>()
  const byDay = new Map<string, { amount: number; count: number }>()
  const byTag = new Map<number, number>()
  const monthOut = new Array(12).fill(0)
  const monthIn = new Array(12).fill(0)
  let biggest: Transaction | null = null

  // A period still running is compared with the same number of days of the
  // previous one (1–14 Nov vs 1–14 Okt), not with the whole previous period.
  const nowMs = Date.now()
  if (range.end.getTime() > nowMs && nowMs > range.start.getTime()) {
    const elapsed = nowMs - range.start.getTime()
    const cut = new Date(prev.start.getTime() + elapsed)
    if (cut < prev.end) prev = { start: prev.start, end: cut }
  }

  for (const t of transactions) {
    const d = txDate(t)
    if (inRange(d, prev) && isExpense(t)) prevOut += t.amount
    if (!inRange(d, range)) continue
    if (isIncome(t)) {
      totalIn += t.amount
      monthIn[d.getMonth()] += t.amount
      txCount++
    } else if (isExpense(t)) {
      totalOut += t.amount
      monthOut[d.getMonth()] += t.amount
      txCount++
      byCat.set(t.category, (byCat.get(t.category) ?? 0) + t.amount)
      const k = dayKeyOf(d)
      const cur = byDay.get(k) ?? { amount: 0, count: 0 }
      cur.amount += t.amount; cur.count++
      byDay.set(k, cur)
      for (const id of t.tag_ids ?? []) byTag.set(id, (byTag.get(id) ?? 0) + t.amount)
      if (!biggest || t.amount > biggest.amount) biggest = t
    }
  }

  const categories = [...byCat.entries()]
    .map(([name, amount]) => ({ name, amount, share: totalOut > 0 ? amount / totalOut : 0 }))
    .sort((a, b) => b.amount - a.amount)

  let busiestDay: WrappedStats['busiestDay'] = null
  const wdSum = new Array(7).fill(0)
  for (const [key, v] of byDay) {
    if (!busiestDay || v.amount > busiestDay.amount) busiestDay = { key, ...v }
    wdSum[new Date(`${key}T12:00:00`).getDay()] += v.amount
  }

  // Average per weekday over every occurrence of that weekday in the range
  // (up to today), so a weekday that appears 5 times is not favoured.
  const now = new Date()
  const stop = range.end < now ? range.end : new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
  const wdCount = new Array(7).fill(0)
  let daysInRange = 0
  for (const d = new Date(range.start); d < stop; d.setDate(d.getDate() + 1)) { wdCount[d.getDay()]++; daysInRange++ }
  let busiestWeekday: WrappedStats['busiestWeekday'] = null
  for (let i = 0; i < 7; i++) {
    if (!wdCount[i] || !wdSum[i]) continue
    const avg = wdSum[i] / wdCount[i]
    if (!busiestWeekday || avg > busiestWeekday.avg) busiestWeekday = { name: WEEKDAYS[i], avg }
  }

  let topTag: WrappedStats['topTag'] = null
  for (const [id, amount] of byTag) {
    const tag = tags.find(x => x.id === id)
    if (tag && (!topTag || amount > topTag.amount)) topTag = { tag, amount }
  }

  const months = mode === 'year'
    ? monthOut.map((out, i) => ({ label: new Date(2000, i, 1).toLocaleDateString('id-ID', { month: 'short' }), out, in: monthIn[i] }))
    : []
  const withSpend = months.filter(m => m.out > 0)
  const worstMonth = withSpend.length ? withSpend.reduce((a, b) => (b.out > a.out ? b : a)) : null
  const bestMonth = withSpend.length > 1 ? withSpend.reduce((a, b) => (b.out < a.out ? b : a)) : null

  return {
    totalOut, totalIn, prevOut,
    changePct: prevOut > 0 ? ((totalOut - prevOut) / prevOut) * 100 : null,
    txCount,
    activeDays: byDay.size,
    avgPerDay: daysInRange > 0 ? totalOut / daysInRange : 0,
    categories,
    busiestDay,
    busiestWeekday,
    biggest,
    topTag,
    months,
    worstMonth: worstMonth && { label: worstMonth.label, out: worstMonth.out },
    bestMonth: bestMonth && { label: bestMonth.label, out: bestMonth.out },
  }
}

// ── Formatting ──────────────────────────────────────────────────────────────

export const rp = (n: number) => `Rp ${Math.round(n).toLocaleString('id-ID')}`

/** Short rupiah: 1,2jt / 350rb. */
export function rpShort(n: number) {
  const a = Math.abs(n)
  if (a >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toFixed(1).replace('.0', '').replace('.', ',')}M`
  if (a >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(1).replace('.0', '').replace('.', ',')}jt`
  if (a >= 1000) return `Rp ${Math.round(n / 1000)}rb`
  return `Rp ${Math.round(n)}`
}

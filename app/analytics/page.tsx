'use client'
import { useEffect, useState, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Transaction, Wallet } from '@/types'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import PeriodSheet from '@/components/PeriodSheet'
import { getCategoryIcon } from '@/lib/categories'

// Built-in category -> catatduit color class (DESIGN.md section 6).
const CAT_CLASS: Record<string, string> = {
  'Kebutuhan Dapur': 'c-dapur', 'Makan di Luar': 'c-makan', 'Transportasi': 'c-transport',
  'Tempat Tinggal': 'c-rumah', 'Tagihan': 'c-tagihan', 'Belanja': 'c-belanja',
  'Kesehatan': 'c-kesehatan', 'Cicilan & Utang': 'c-cicilan', 'Pribadi & Hiburan': 'c-hiburan',
  'Edukasi & Donasi': 'c-edukasi', 'Gaji': 'c-gaji', 'Bonus & Hadiah': 'c-bonus',
  'Investasi': 'c-investasi', 'Penjualan': 'c-belanja', 'Lainnya': 'c-lain',
}
const EMPTY_CUSTOM = { pengeluaran: [], pemasukan: [] }
const rpFull = (n: number) => `Rp ${n.toLocaleString('id-ID')}`
const rpShort = (n: number) => {
  const a = Math.abs(n)
  if (a >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(a % 1_000_000 ? 1 : 0)}jt`
  if (a >= 1_000) return `Rp ${Math.round(n / 1_000)}rb`
  return `Rp ${n}`
}

export default function AnalyticsPage() {
    const [transactions, setTransactions] = useState<Transaction[]>([])
    const [wallets, setWallets] = useState<Wallet[]>([])
    const [loading, setLoading] = useState(true)

    // State for Filter & Persistence (Synced with Dashboard)
    const [currentDate, setCurrentDate] = useState(new Date())
    const [showSettings, setShowSettings] = useState(false)
    const [expandedWallet, setExpandedWallet] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [showTooltip, setShowTooltip] = useState(false) // Net balance tooltip
    const [showIncomeTooltip, setShowIncomeTooltip] = useState(false)
    const [showExpenseTooltip, setShowExpenseTooltip] = useState(false)
    const [showChangeTooltip, setShowChangeTooltip] = useState(false)

    const [filterMode, setFilterMode] = useState<'monthly' | 'custom'>('monthly')
    const [customRange, setCustomRange] = useState({
        start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
        end: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0]
    })
    const [isInitialized, setIsInitialized] = useState(false)

    // Settings Sync
    useEffect(() => {
        const loadSettings = async () => {
            const { data: settings } = await supabase
                .from('user_settings')
                .select('*')
                .eq('id', 1)
                .single()

            if (settings) {
                if (settings.filter_mode) setFilterMode(settings.filter_mode as 'monthly' | 'custom')
                if (settings.custom_start_date && settings.custom_end_date) {
                    setCustomRange({
                        start: settings.custom_start_date,
                        end: settings.custom_end_date
                    })
                }
            } else {
                await supabase
                    .from('user_settings')
                    .insert({
                        id: 1,
                        filter_mode: 'monthly',
                        custom_start_date: customRange.start,
                        custom_end_date: customRange.end,
                        updated_at: new Date().toISOString()
                    })
            }
            setIsInitialized(true)
        }

        loadSettings()
    }, [])

    // Bug #4 Fix: Sinkron filter saat user kembali ke tab/halaman Analytics
    // Setiap kali window mendapat fokus, re-fetch settings dari Supabase agar filter selalu up-to-date dengan Dashboard
    useEffect(() => {
        const handleFocus = async () => {
            const { data: settings } = await supabase
                .from('user_settings')
                .select('filter_mode, custom_start_date, custom_end_date')
                .eq('id', 1)
                .single()

            if (settings) {
                if (settings.filter_mode) setFilterMode(settings.filter_mode as 'monthly' | 'custom')
                if (settings.custom_start_date && settings.custom_end_date) {
                    setCustomRange({
                        start: settings.custom_start_date,
                        end: settings.custom_end_date
                    })
                }
            }
        }

        window.addEventListener('focus', handleFocus)
        return () => window.removeEventListener('focus', handleFocus)
    }, [])

    useEffect(() => {
        if (!isInitialized) return

        const timeoutId = setTimeout(() => {
            const saveSettings = async () => {
                await supabase
                    .from('user_settings')
                    .update({
                        filter_mode: filterMode,
                        custom_start_date: customRange.start,
                        custom_end_date: customRange.end,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', 1)
            }

            saveSettings()
        }, 500)

        return () => clearTimeout(timeoutId)
    }, [filterMode, customRange, isInitialized])

    const getPeriodLabel = useCallback(() => {
        if (filterMode === 'monthly') {
            return currentDate.toLocaleString('id-ID', { month: 'long', year: 'numeric' })
        } else {
            const s = new Date(customRange.start)
            const e = new Date(customRange.end)
            return `${s.getDate()} ${s.toLocaleString('id-ID', { month: 'short' })} - ${e.getDate()} ${e.toLocaleString('id-ID', { month: 'short' })} ${e.getFullYear()}`
        }
    }, [filterMode, currentDate, customRange])

    useEffect(() => {
        fetchData()
        // Scroll to top when analytics page first loads on mobile
        // Use requestAnimationFrame to ensure DOM is painted before scrolling
        const resetScroll = () => {
            window.scrollTo({ top: 0, behavior: 'instant' })
            document.documentElement.scrollTop = 0
            document.body.scrollTop = 0
        }
        resetScroll()
        requestAnimationFrame(() => {
            resetScroll()
        })
        // Fallback timeout for slow hydration
        const t = setTimeout(resetScroll, 100)
        return () => clearTimeout(t)
    }, [])

    const fetchData = async () => {
        setLoading(true)
        const { data: txs } = await supabase.from('transactions').select('*').order('created_at', { ascending: false })
        const { data: wlls } = await supabase.from('wallets').select('*')

        if (txs) setTransactions(txs as unknown as Transaction[])
        if (wlls) setWallets(wlls)
        setLoading(false)
    }

    const filteredTxs = useMemo(() => {
        return transactions.filter(t => {
            const d = new Date(t.date || t.created_at)
            d.setHours(0, 0, 0, 0)

            if (filterMode === 'monthly') {
                return d.getMonth() === currentDate.getMonth() && d.getFullYear() === currentDate.getFullYear()
            } else {
                const start = new Date(customRange.start)
                start.setHours(0, 0, 0, 0)
                const end = new Date(customRange.end)
                end.setHours(0, 0, 0, 0)
                return d >= start && d <= end
            }
        })
    }, [transactions, filterMode, currentDate, customRange])

    // 1. Income vs Expense (memoized) - piutang tidak dihitung sebagai pemasukan nyata, talangan tidak dihitung sebagai pengeluaran pribadi
    const { income, expense, netBalance, summaryData } = useMemo(() => {
        const inc = filteredTxs.filter(t => t.type === 'pemasukan' && !t.is_piutang).reduce((acc, c) => acc + c.amount, 0)
        const exp = filteredTxs.filter(t => t.type === 'pengeluaran' && !t.is_talangan).reduce((acc, c) => acc + c.amount, 0)
        return {
            income: inc,
            expense: exp,
            netBalance: inc - exp,
            summaryData: [
                { name: 'Pemasukan', value: inc, fill: '#10B981' },
                { name: 'Pengeluaran', value: exp, fill: '#EF4444' }
            ]
        }
    }, [filteredTxs])

    // 2. Expense by Category (memoized)
    const categoryData = useMemo(() => {
        const expenseTxs = filteredTxs.filter(t => t.type === 'pengeluaran' && !t.is_talangan)
        const categoryDataMap = expenseTxs.reduce((acc, curr) => {
            acc[curr.category] = (acc[curr.category] || 0) + curr.amount
            return acc
        }, {} as Record<string, number>)
        return Object.entries(categoryDataMap)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
    }, [filteredTxs])

    // 3. Expense by Wallet (memoized, O(1) wallet lookup)
    const walletData = useMemo(() => {
        const walletMap = new Map(wallets.map(w => [w.id, w.name]))
        const expenseTxs = filteredTxs.filter(t => t.type === 'pengeluaran' && !t.is_talangan)
        const walletDataMap = expenseTxs.reduce((acc, curr) => {
            const wName = (curr.wallet_id != null ? walletMap.get(curr.wallet_id) : undefined) || 'Unknown'
            acc[wName] = (acc[wName] || 0) + curr.amount
            return acc
        }, {} as Record<string, number>)
        return Object.entries(walletDataMap).map(([name, value]) => ({ name, value }))
    }, [filteredTxs, wallets])

    // 4. Wallet Transaction Breakdown (grouped by wallet, all tx types)
    const walletTransactionBreakdown = useMemo(() => {
        const walletMap = new Map(wallets.map(w => [w.id, w.name]))
        const grouped: Record<string, { walletName: string; transactions: Transaction[]; totalIncome: number; totalExpense: number }> = {}

        filteredTxs.forEach(t => {
            if (t.type === 'topup' && t.source_wallet_id != null) {
                const destName = (t.wallet_id != null ? walletMap.get(t.wallet_id) : undefined) || 'Tidak Diketahui'
                const srcName = walletMap.get(t.source_wallet_id) || 'Tidak Diketahui'
                
                if (!grouped[destName]) grouped[destName] = { walletName: destName, transactions: [], totalIncome: 0, totalExpense: 0 }
                if (!grouped[srcName]) grouped[srcName] = { walletName: srcName, transactions: [], totalIncome: 0, totalExpense: 0 }
                
                // Add to destination
                grouped[destName].transactions.push(t)
                // Add to source (avoid duplicates if dest == src, though theoretically shouldn't happen)
                if (destName !== srcName) {
                    grouped[srcName].transactions.push(t)
                }
            } else {
                const wName = (t.wallet_id != null ? walletMap.get(t.wallet_id) : undefined) || 'Tidak Diketahui'
                if (!grouped[wName]) {
                    grouped[wName] = { walletName: wName, transactions: [], totalIncome: 0, totalExpense: 0 }
                }
                grouped[wName].transactions.push(t)
                if (t.type === 'pemasukan') grouped[wName].totalIncome += t.amount
                else if (t.type === 'pengeluaran') grouped[wName].totalExpense += t.amount
            }
        })

        // Sort transactions within each wallet by date descending
        return Object.values(grouped)
            .map(g => ({
                ...g,
                transactions: g.transactions.sort((a, b) => {
                    const timeDiff = new Date(b.date || b.created_at).getTime() - new Date(a.date || a.created_at).getTime()
                    if (timeDiff !== 0) return timeDiff
                    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                })
            }))
            .sort((a, b) => b.totalExpense - a.totalExpense)
    }, [filteredTxs, wallets])

    // 5. Search Results — searches across ALL transactions (not period-filtered)
    const searchResults = useMemo(() => {
        const q = searchQuery.trim().toLowerCase()
        if (!q) return []
        const walletMap = new Map(wallets.map(w => [w.id, w.name]))
        return transactions
            .filter(t => {
                const walletName = (t.wallet_id != null ? walletMap.get(t.wallet_id) : undefined) || ''
                return (
                    t.title.toLowerCase().includes(q) ||
                    t.category.toLowerCase().includes(q) ||
                    walletName.toLowerCase().includes(q)
                )
            })
            .sort((a, b) => {
                const timeDiff = new Date(b.date || b.created_at).getTime() - new Date(a.date || a.created_at).getTime()
                if (timeDiff !== 0) return timeDiff
                return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            })
            .slice(0, 50) // cap at 50 results for performance
    }, [searchQuery, transactions, wallets])

    // 6. Top Expenses & Recent Activity for this period
    const { topExpenses, recentActivity } = useMemo(() => {
        const expenses = filteredTxs
            .filter(t => t.type === 'pengeluaran' && !t.is_talangan)
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 5)

        const recent = [...filteredTxs]
            .sort((a, b) => {
                const timeDiff = new Date(b.date || b.created_at).getTime() - new Date(a.date || a.created_at).getTime()
                if (timeDiff !== 0) return timeDiff
                return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            })
            .slice(0, 5)

        return { topExpenses: expenses, recentActivity: recent }
    }, [filteredTxs])

    // Colors
    const COLORS = useMemo(() => ['var(--primary)', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658'], [])

    const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
    const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))

    // 4b. Previous period transactions (for Spending Insights comparison)
    const prevPeriodTxs = useMemo(() => {
        if (filterMode === 'monthly') {
            const prev = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
            return transactions.filter(t => {
                const d = new Date(t.date || t.created_at)
                return d.getMonth() === prev.getMonth() && d.getFullYear() === prev.getFullYear()
            })
        } else {
            // Same duration, shifted back
            const start = new Date(customRange.start)
            const end = new Date(customRange.end)
            const duration = end.getTime() - start.getTime()
            const prevEnd = new Date(start.getTime() - 1)
            const prevStart = new Date(prevEnd.getTime() - duration)
            return transactions.filter(t => {
                const d = new Date(t.date || t.created_at)
                d.setHours(12, 0, 0, 0)
                return d >= prevStart && d <= prevEnd
            })
        }
    }, [transactions, filterMode, currentDate, customRange])

    // 4c. Spending Insights
    const insights = useMemo(() => {
        type Insight = { type: 'positive' | 'negative' | 'warning' | 'info'; emoji: string; title: string; desc: string }
        const result: Insight[] = []
        if (!income && !expense) return result

        const prevIncome = prevPeriodTxs.filter(t => t.type === 'pemasukan' && !t.is_piutang).reduce((a, c) => a + c.amount, 0)
        const prevExpense = prevPeriodTxs.filter(t => t.type === 'pengeluaran' && !t.is_talangan).reduce((a, c) => a + c.amount, 0)

        // --- Saving rate ---
        const savingRate = income > 0 ? ((income - expense) / income) * 100 : 0
        const prevSavingRate = prevIncome > 0 ? ((prevIncome - prevExpense) / prevIncome) * 100 : 0
        const savingDiff = savingRate - prevSavingRate
        if (income > 0) {
            if (savingRate >= 20) {
                result.push({ type: 'positive', emoji: '🎉', title: `Saving rate ${savingRate.toFixed(1)}%`, desc: savingDiff > 0 && prevIncome > 0 ? `Naik ${savingDiff.toFixed(1)}% dari periode lalu. Pertahankan!` : 'Kondisi keuangan kamu sehat!' })
            } else if (savingRate > 0) {
                result.push({ type: 'warning', emoji: '⚠️', title: `Saving rate hanya ${savingRate.toFixed(1)}%`, desc: 'Coba kurangi pengeluaran agar bisa menabung lebih banyak.' })
            } else {
                result.push({ type: 'negative', emoji: '🚨', title: 'Pengeluaran melebihi pemasukan!', desc: `Kamu minus Rp ${Math.abs(netBalance).toLocaleString('id-ID')} periode ini. Tinjau kembali pengeluaranmu.` })
            }
        }

        // --- Top category ---
        if (categoryData.length > 0) {
            const top = categoryData[0]
            const pct = expense > 0 ? (top.value / expense * 100).toFixed(0) : '0'
            result.push({ type: 'info', emoji: '📊', title: `Terbesar: ${top.name}`, desc: `Menyumbang ${pct}% dari total pengeluaran (Rp ${top.value.toLocaleString('id-ID')}).` })
        }

        // --- Category comparison ---
        if (prevPeriodTxs.length > 0) {
            const prevCatMap: Record<string, number> = {}
            prevPeriodTxs.filter(t => t.type === 'pengeluaran' && !t.is_talangan).forEach(t => {
                prevCatMap[t.category] = (prevCatMap[t.category] || 0) + t.amount
            })
            let biggestRise: { cat: string; pct: number; amount: number } | null = null
            let biggestDrop: { cat: string; pct: number; amount: number } | null = null

            const allInsightCats = new Set([...categoryData.map(c => c.name), ...Object.keys(prevCatMap)])
            allInsightCats.forEach(name => {
                const curr = categoryData.find(c => c.name === name)?.value || 0
                const prev = prevCatMap[name] || 0
                if (prev > 0) {
                    const pct = ((curr - prev) / prev) * 100
                    if (pct > 10 && (!biggestRise || pct > biggestRise.pct))
                        biggestRise = { cat: name, pct, amount: curr - prev }
                    if (pct < -10 && (!biggestDrop || pct < biggestDrop.pct))
                        biggestDrop = { cat: name, pct, amount: prev - curr }
                }
            })

            if (biggestRise) {
                const r = biggestRise as { cat: string; pct: number; amount: number }
                const multiplier = (r.pct / 100) + 1
                const titleText = multiplier >= 2
                    ? `${r.cat} naik ${multiplier.toLocaleString('id-ID', { maximumFractionDigits: 1 })}x lipat`
                    : `${r.cat} naik ${r.pct.toFixed(0)}%`
                result.push({ type: 'negative', emoji: '📈', title: titleText, desc: `Pengeluaran ${r.cat} bertambah Rp ${r.amount.toLocaleString('id-ID')} dibanding periode lalu.` })
            }
            if (biggestDrop) {
                const d = biggestDrop as { cat: string; pct: number; amount: number }
                const absPct = Math.abs(d.pct)
                const titleText = absPct >= 99.5
                    ? `Pengeluaran ${d.cat} bersih (turun 100%)`
                    : `${d.cat} turun ${absPct.toFixed(0)}%`

                result.push({ type: 'positive', emoji: '📉', title: titleText, desc: `Kamu hemat Rp ${d.amount.toLocaleString('id-ID')} di ${d.cat} dibanding periode lalu. Bagus!` })
            }

            // --- Income comparison ---
            if (prevIncome > 0 && income > 0) {
                const incDiff = ((income - prevIncome) / prevIncome) * 100
                if (Math.abs(incDiff) >= 5) {
                    if (incDiff > 0) {
                        const multiplier = (incDiff / 100) + 1
                        const titleText = multiplier >= 2
                            ? `Pemasukan naik ${multiplier.toLocaleString('id-ID', { maximumFractionDigits: 1 })}x lipat`
                            : `Pemasukan naik ${incDiff.toFixed(0)}%`
                        result.push({ type: 'positive', emoji: '💰', title: titleText, desc: `Bertambah Rp ${(income - prevIncome).toLocaleString('id-ID')} dari periode sebelumnya.` })
                    } else {
                        result.push({ type: 'warning', emoji: '💸', title: `Pemasukan turun ${Math.abs(incDiff).toFixed(0)}%`, desc: `Berkurang Rp ${(prevIncome - income).toLocaleString('id-ID')} dari periode sebelumnya.` })
                    }
                }
            }
        } else if (income > 0 || expense > 0) {
            result.push({ type: 'info', emoji: '🆕', title: 'Belum ada data pembanding', desc: 'Insights perbandingan akan muncul setelah ada data dari periode sebelumnya.' })
        }

        return result
    }, [income, expense, netBalance, categoryData, prevPeriodTxs])

    // 4d. Period Comparison (side-by-side current vs previous)
    const periodComparison = useMemo(() => {
        // --- Labels ---
        const fmtDate = (d: Date) =>
            `${d.getDate()} ${d.toLocaleString('id-ID', { month: 'short' })} ${d.getFullYear()}`
        let currentLabel: string
        let prevLabel: string

        if (filterMode === 'monthly') {
            const prev = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
            currentLabel = currentDate.toLocaleString('id-ID', { month: 'long', year: 'numeric' })
            prevLabel = prev.toLocaleString('id-ID', { month: 'long', year: 'numeric' })
        } else {
            const start = new Date(customRange.start)
            const end = new Date(customRange.end)
            const duration = end.getTime() - start.getTime()
            const prevEnd = new Date(start.getTime() - 1)
            const prevStart = new Date(prevEnd.getTime() - duration)
            currentLabel = `${fmtDate(start)} – ${fmtDate(end)}`
            prevLabel = `${fmtDate(prevStart)} – ${fmtDate(prevEnd)}`
        }

        // --- Current stats ---
        const currIncome = income
        const currExpense = expense
        const currNet = netBalance
        const currSavingRate = currIncome > 0 ? ((currIncome - currExpense) / currIncome) * 100 : 0

        // --- Previous stats ---
        const prevIncome = prevPeriodTxs.filter(t => t.type === 'pemasukan' && !t.is_piutang).reduce((a, c) => a + c.amount, 0)
        const prevExpense = prevPeriodTxs.filter(t => t.type === 'pengeluaran' && !t.is_talangan).reduce((a, c) => a + c.amount, 0)
        const prevNet = prevIncome - prevExpense
        const prevSavingRate = prevIncome > 0 ? ((prevIncome - prevExpense) / prevIncome) * 100 : 0

        // --- Category rows ---
        const prevCatMap: Record<string, number> = {}
        prevPeriodTxs.filter(t => t.type === 'pengeluaran' && !t.is_talangan).forEach(t => {
            prevCatMap[t.category] = (prevCatMap[t.category] || 0) + t.amount
        })
        const allCats = new Set([...categoryData.map(c => c.name), ...Object.keys(prevCatMap)])
        const categoryRows = Array.from(allCats).map(cat => {
            const curr = categoryData.find(c => c.name === cat)?.value || 0
            const prev = prevCatMap[cat] || 0
            const diff = curr - prev
            const pct = prev > 0 ? (diff / prev) * 100 : null
            return { name: cat, curr, prev, diff, pct }
        }).sort((a, b) => b.curr - a.curr)

        const hasPrevData = prevPeriodTxs.length > 0

        const pctDiff = (curr: number, prev: number) =>
            prev > 0 ? ((curr - prev) / prev) * 100 : null

        return {
            currentLabel, prevLabel,
            currIncome, currExpense, currNet, currSavingRate,
            prevIncome, prevExpense, prevNet, prevSavingRate,
            categoryRows, hasPrevData, pctDiff
        }
    }, [filterMode, currentDate, customRange, income, expense, netBalance, categoryData, prevPeriodTxs])

    // 4. Comparison Data — respects active filter
    const comparisonData = useMemo(() => {
        if (filterMode === 'custom') {
            // Break down by month within the custom range — each row shows the actual date sub-range
            const rangeStart = new Date(customRange.start)
            rangeStart.setHours(0, 0, 0, 0)
            const rangeEnd = new Date(customRange.end)
            rangeEnd.setHours(23, 59, 59, 999)

            const result = []
            let cursor = new Date(rangeStart)

            while (cursor <= rangeEnd) {
                const sliceStart = new Date(cursor)
                // End of this month slice: last day of cursor's month, or rangeEnd — whichever is earlier
                const endOfMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0)
                endOfMonth.setHours(23, 59, 59, 999)
                const sliceEnd = endOfMonth < rangeEnd ? endOfMonth : new Date(rangeEnd)

                const days = Math.round((sliceEnd.getTime() - sliceStart.getTime()) / (1000 * 60 * 60 * 24)) + 1
                const isPartial = sliceStart.getDate() !== 1 || sliceEnd.getDate() !== endOfMonth.getDate()

                const txsInSlice = transactions.filter(t => {
                    const td = new Date(t.date || t.created_at)
                    td.setHours(12, 0, 0, 0) // normalise to noon to avoid TZ edge
                    return td >= sliceStart && td <= sliceEnd
                })

                const sliceIncome = txsInSlice.filter(t => t.type === 'pemasukan' && !t.is_piutang).reduce((acc, c) => acc + c.amount, 0)
                const sliceExpense = txsInSlice.filter(t => t.type === 'pengeluaran' && !t.is_talangan).reduce((acc, c) => acc + c.amount, 0)

                const fmt = (d: Date) => `${d.getDate()} ${d.toLocaleString('id-ID', { month: 'short' })}`
                const monthLabel = sliceStart.toLocaleString('id-ID', { month: 'long', year: 'numeric' })
                const rangeLabel = isPartial
                    ? `${fmt(sliceStart)} – ${fmt(sliceEnd)} ${sliceEnd.getFullYear()}`
                    : monthLabel

                result.push({
                    label: rangeLabel,
                    fullLabel: rangeLabel,
                    monthLabel,
                    days,
                    isPartial,
                    income: sliceIncome,
                    expense: sliceExpense,
                    net: sliceIncome - sliceExpense,
                    month: cursor.getMonth(),
                    year: cursor.getFullYear(),
                    isCustom: true
                })

                // Move cursor to 1st of next month
                cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)
            }

            return result
        }

        // Monthly mode: per-bulan untuk tahun yang dipilih
        const result = []
        const now = new Date()
        const selectedYear = currentDate.getFullYear()
        const maxMonth = selectedYear === now.getFullYear() ? now.getMonth() : 11

        for (let m = 0; m <= maxMonth; m++) {
            const d = new Date(selectedYear, m, 1)
            const month = d.getMonth()
            const year = d.getFullYear()

            const txsInMonth = transactions.filter(t => {
                const td = new Date(t.date || t.created_at)
                return td.getMonth() === month && td.getFullYear() === year
            })

            const monthIncome = txsInMonth.filter(t => t.type === 'pemasukan' && !t.is_piutang).reduce((acc, c) => acc + c.amount, 0)
            const monthExpense = txsInMonth.filter(t => t.type === 'pengeluaran' && !t.is_talangan).reduce((acc, c) => acc + c.amount, 0)

            result.push({
                label: d.toLocaleString('id-ID', { month: 'short', year: '2-digit' }),
                fullLabel: d.toLocaleString('id-ID', { month: 'long', year: 'numeric' }),
                income: monthIncome,
                expense: monthExpense,
                net: monthIncome - monthExpense,
                month,
                year,
                isCustom: false
            })
        }
        return result
    }, [transactions, filterMode, currentDate, customRange])

    // ── Derived view data ───────────────────────────────────────────────────
    const savingRate = income > 0 ? ((income - expense) / income) * 100 : 0
    const maxCat = categoryData[0]?.value || 1
    const catPct: Record<string, number | null> = {}
    periodComparison.categoryRows.forEach(r => { catPct[r.name] = r.pct })
    const chartData = comparisonData.slice(-6)
    const chartMax = Math.max(1, ...chartData.map(d => Math.max(d.income, d.expense)))

    return (
        <div className="cd" style={{ minHeight: '100vh', background: 'var(--surface)' }}>
            <div className="scroll" style={{ maxWidth: 900, margin: '0 auto', paddingBottom: 116 }}>
                {/* Header */}
                <div className="top">
                    <div className="top-l">
                        <Link href="/" className="icon-btn ghost" aria-label="Kembali"><ChevronLeft className="i" /></Link>
                        <h1 className="h1">Analitik</h1>
                    </div>
                </div>

                {/* Period selector */}
                <div className="hstack" style={{ gap: 4 }}>
                    <button className="icon-btn ghost" style={{ width: 36, height: 36 }} aria-label="Periode sebelumnya" disabled={filterMode === 'custom'} onClick={prevMonth}><ChevronLeft className="i i-s" /></button>
                    <button className="chip" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setShowSettings(s => !s)}><Calendar className="i i-s" />{getPeriodLabel()}</button>
                    <button className="icon-btn ghost" style={{ width: 36, height: 36 }} aria-label="Periode berikutnya" disabled={filterMode === 'custom'} onClick={nextMonth}><ChevronRight className="i i-s" /></button>
                </div>
                {periodComparison.hasPrevData && <div className="lbl">Dibanding {periodComparison.prevLabel}</div>}

                {/* Summary */}
                <div className="card stack-12">
                    <div className="g3">
                        <div><div className="lbl">Pemasukan</div><div className="num-m pos">+{rpShort(income)}</div></div>
                        <div><div className="lbl">Pengeluaran</div><div className="num-m">{rpShort(expense)}</div></div>
                        <div><div className="lbl">Sisa</div><div className="num-m" style={{ color: netBalance >= 0 ? 'var(--accent)' : 'var(--danger)' }}>{rpShort(netBalance)}</div></div>
                    </div>
                    <div className="between" style={{ borderTop: '1px solid var(--divider)', paddingTop: 10 }}>
                        <span className="lbl">Saving rate</span>
                        <span className="num-m" style={{ color: savingRate >= 20 ? 'var(--income)' : savingRate > 0 ? 'var(--warn)' : 'var(--danger)' }}>{savingRate.toFixed(1)}%</span>
                    </div>
                </div>

                {/* Insights */}
                {insights.length > 0 && (
                    <div className="stack">
                        <span className="lbl" style={{ fontWeight: 700 }}>Insight</span>
                        {insights.slice(0, 3).map((ins, i) => {
                            const color = ins.type === 'positive' ? 'var(--income)' : ins.type === 'negative' ? 'var(--danger)' : ins.type === 'warning' ? 'var(--warn)' : 'var(--accent-hover)'
                            return (
                                <div className="card stack" key={i} style={{ gap: 4 }}>
                                    <div className="t" style={{ whiteSpace: 'normal', color }}>{ins.title}</div>
                                    <div className="meta" style={{ whiteSpace: 'normal' }}>{ins.desc}</div>
                                </div>
                            )
                        })}
                    </div>
                )}

                {/* Expense by category */}
                {categoryData.length > 0 && (
                    <div className="card stack-12">
                        <h2 className="h3">Pengeluaran per kategori</h2>
                        {categoryData.slice(0, 8).map(c => {
                            const { Icon } = getCategoryIcon(c.name, 'pengeluaran', EMPTY_CUSTOM)
                            const cls = CAT_CLASS[c.name] || 'c-lain'
                            const pct = catPct[c.name]
                            return (
                                <div className="stack" key={c.name} style={{ gap: 6 }}>
                                    <div className="hstack" style={{ gap: 10 }}>
                                        <div className={`ic-s ${cls}`}><Icon className="i i-s" /></div>
                                        <span className="grow t">{c.name}</span>
                                        {pct != null && <span className="lbl" style={{ color: pct > 0 ? 'var(--danger)' : 'var(--income)' }}>{pct > 0 ? '+' : ''}{pct.toFixed(0)}%</span>}
                                        <span className="amt">{rpFull(c.value)}</span>
                                    </div>
                                    <div className="bar"><div style={{ width: `${(c.value / maxCat) * 100}%` }} /></div>
                                </div>
                            )
                        })}
                    </div>
                )}

                {/* Cash flow chart */}
                {chartData.length > 0 && (
                    <div className="card stack-12">
                        <h2 className="h3">Arus kas</h2>
                        <div className="hstack" style={{ alignItems: 'flex-end', gap: 10, height: 140, justifyContent: 'space-between' }}>
                            {chartData.map((d, i) => (
                                <div key={i} className="stack" style={{ flex: 1, alignItems: 'center', gap: 6, minWidth: 0 }}>
                                    <div className="hstack" style={{ alignItems: 'flex-end', gap: 3, height: 100 }}>
                                        <div style={{ width: 10, height: `${(d.income / chartMax) * 100}%`, minHeight: 2, background: 'var(--income-chart)', borderRadius: 3 }} title={`Masuk ${rpShort(d.income)}`} />
                                        <div style={{ width: 10, height: `${(d.expense / chartMax) * 100}%`, minHeight: 2, background: 'var(--accent)', borderRadius: 3 }} title={`Keluar ${rpShort(d.expense)}`} />
                                    </div>
                                    <span className="lbl" style={{ fontSize: 10, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>{d.label}</span>
                                </div>
                            ))}
                        </div>
                        <div className="hstack" style={{ gap: 16, justifyContent: 'center' }}>
                            <span className="hstack" style={{ gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--income-chart)' }} /><span className="lbl">Masuk</span></span>
                            <span className="hstack" style={{ gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--accent)' }} /><span className="lbl">Keluar</span></span>
                        </div>
                    </div>
                )}

                {/* Period comparison table */}
                {periodComparison.hasPrevData && (
                    <div className="card stack-12">
                        <h2 className="h3">Perbandingan periode</h2>
                        <div className="tbl-box">
                            <table className="tbl" style={{ minWidth: 0 }}>
                                <thead>
                                    <tr><th></th><th className="r">Sekarang</th><th className="r">Sebelumnya</th></tr>
                                </thead>
                                <tbody>
                                    <tr><td>Pemasukan</td><td className="r">{rpShort(periodComparison.currIncome)}</td><td className="r">{rpShort(periodComparison.prevIncome)}</td></tr>
                                    <tr><td>Pengeluaran</td><td className="r">{rpShort(periodComparison.currExpense)}</td><td className="r">{rpShort(periodComparison.prevExpense)}</td></tr>
                                    <tr><td>Sisa</td><td className="r">{rpShort(periodComparison.currNet)}</td><td className="r">{rpShort(periodComparison.prevNet)}</td></tr>
                                    <tr><td>Saving rate</td><td className="r">{periodComparison.currSavingRate.toFixed(0)}%</td><td className="r">{periodComparison.prevSavingRate.toFixed(0)}%</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Top expenses */}
                {topExpenses.length > 0 && (
                    <div className="stack">
                        <span className="lbl" style={{ fontWeight: 700 }}>5 pengeluaran terbesar</span>
                        <div className="card-flush">
                            {topExpenses.map(t => {
                                const { Icon } = getCategoryIcon(t.category, 'pengeluaran', EMPTY_CUSTOM)
                                const cls = CAT_CLASS[t.category] || 'c-lain'
                                return (
                                    <div className="row" key={t.id}>
                                        <div className={`ic ${cls}`}><Icon className="i" /></div>
                                        <div className="grow"><div className="t">{t.title || t.category}</div><div className="meta">{t.category}</div></div>
                                        <div className="amt">{rpFull(t.amount)}</div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}

                {/* Per wallet */}
                {walletTransactionBreakdown.length > 0 && (
                    <div className="stack">
                        <span className="lbl" style={{ fontWeight: 700 }}>Transaksi per dompet</span>
                        {walletTransactionBreakdown.map(w => (
                            <div className="card stack" key={w.walletName} style={{ gap: 8 }}>
                                <div className="between"><span className="t">{w.walletName}</span><span className="lbl">{w.transactions.length} transaksi</span></div>
                                <div className="g2">
                                    <div><div className="lbl">Masuk</div><div className="num-m pos">+{rpShort(w.totalIncome)}</div></div>
                                    <div><div className="lbl">Keluar</div><div className="num-m">{rpShort(w.totalExpense)}</div></div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {!loading && income === 0 && expense === 0 && (
                    <div className="card" style={{ textAlign: 'center' }}>
                        <p className="t" style={{ whiteSpace: 'normal' }}>Belum ada data periode ini</p>
                        <p className="lbl" style={{ marginTop: 4 }}>Catat transaksi dulu untuk melihat analitik.</p>
                    </div>
                )}
            </div>

            {/* Filter & period sheet */}
            <PeriodSheet
                isOpen={showSettings}
                onClose={() => setShowSettings(false)}
                filterMode={filterMode}
                setFilterMode={setFilterMode}
                currentDate={currentDate}
                setCurrentDate={setCurrentDate}
                customRange={customRange}
                setCustomRange={setCustomRange}
            />
        </div>
    )
}



'use client'
import { useEffect, useState, useMemo, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Transaction, Wallet } from '@/types'
import {
    PieChart,
    Pie,
    Cell,
    Tooltip,
    Legend,
    ResponsiveContainer,
    BarChart, 
    Bar, 
    XAxis, 
    YAxis, 
    CartesianGrid,
    LabelList
} from 'recharts'
import { Calendar, ChevronLeft, ChevronRight, Settings, X, TrendingUp, TrendingDown, Wallet as WalletIcon, ArrowUpRight, ArrowDownRight, Zap, SmilePlus, AlertTriangle, Info, ChevronDown, Search } from 'lucide-react'

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
            const wName = (t.wallet_id != null ? walletMap.get(t.wallet_id) : undefined) || 'Tidak Diketahui'
            if (!grouped[wName]) {
                grouped[wName] = { walletName: wName, transactions: [], totalIncome: 0, totalExpense: 0 }
            }
            grouped[wName].transactions.push(t)
            if (t.type === 'pemasukan') grouped[wName].totalIncome += t.amount
            // Fix BUG #6: Topup tidak dihitung sebagai pengeluaran di breakdown per dompet
            else if (t.type === 'pengeluaran') grouped[wName].totalExpense += t.amount
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
    const COLORS = useMemo(() => ['#165DFF', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658'], [])
    
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


    return (
        <main className="flex-1 bg-[#F9FAFB] min-h-screen overflow-x-hidden transition-all duration-300">
             <header className="sticky top-0 z-30 flex items-center justify-between w-full h-[70px] md:h-[90px] shrink-0 border-b border-[#F3F4F3] bg-white px-5 md:px-8">
                <div>
                     <h2 className="font-bold text-2xl text-[#080C1A]">Analitik</h2>
                </div>
                 <div className="hidden md:flex items-center gap-3 pl-3 border-l border-[#F3F4F3] ml-auto">
                    <div className="text-right">
                        <p className="font-semibold text-[#080C1A] text-sm">Eko Budi</p>
                        {/* <p className="text-[#6A7686] text-xs">Premium User</p> */}
                    </div>
                    <div className="w-11 h-11 bg-slate-200 rounded-full flex items-center justify-center text-slate-500 font-bold border-2 border-white shadow-sm">
                        EB
                    </div>
                </div>
            </header>

            <div className="p-4 pb-28 md:p-8 md:pb-8 space-y-6 md:space-y-8">
                {/* Control Bar */}
                <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-2xl border border-[#F3F4F3] shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-xl">
                            {filterMode === 'monthly' && (
                                <button
                                    onClick={prevMonth}
                                    className="p-2 hover:bg-white hover:shadow-sm rounded-lg text-slate-400 hover:text-[#165DFF] transition-all"
                                >
                                    <ChevronLeft className="w-5 h-5" />
                                </button>
                            )}
                            <div className="flex items-center gap-2 px-4 py-1.5">
                                <Calendar className="w-4 h-4 text-[#165DFF]" />
                                <span className="font-bold text-[#080C1A] whitespace-nowrap min-w-[140px] text-center">
                                    {getPeriodLabel()}
                                </span>
                            </div>
                             {filterMode === 'monthly' && (
                                <button
                                    onClick={nextMonth}
                                    className="p-2 hover:bg-white hover:shadow-sm rounded-lg text-slate-400 hover:text-[#165DFF] transition-all"
                                >
                                    <ChevronRight className="w-5 h-5" />
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowSettings(!showSettings)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold transition-all ${showSettings ? 'bg-[#165DFF] text-white shadow-lg shadow-blue-500/30' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
                        >
                            <Settings className="w-4 h-4" />
                            <span>Filter</span>
                        </button>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="relative">
                    <div className="flex items-center gap-3 bg-white border border-[#F3F4F3] rounded-2xl px-4 py-3 shadow-sm">
                        <Search className="w-4 h-4 text-[#6A7686] shrink-0" />
                        <input
                            type="text"
                            data-no-ring=""
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Cari transaksi berdasarkan nama, kategori, atau dompet..."
                            className="flex-1 bg-white text-[16px] md:text-sm text-[#080C1A] placeholder-slate-400 outline-none font-medium"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    {/* Search Results Panel */}
                    {searchQuery.trim() && (
                        <div className="mt-2 bg-white rounded-2xl border border-[#F3F4F3] shadow-lg overflow-hidden">
                            <div className="px-4 py-3 border-b border-[#F3F4F3] flex items-center justify-between">
                                <span className="text-xs font-bold text-[#6A7686] uppercase tracking-wider">
                                    {searchResults.length > 0 ? `${searchResults.length} hasil ditemukan` : 'Tidak ada hasil'}
                                </span>
                                {searchResults.length === 50 && (
                                    <span className="text-xs text-slate-400">Menampilkan 50 teratas</span>
                                )}
                            </div>

                            {searchResults.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-10 gap-2 text-slate-400">
                                    <Search className="w-8 h-8 opacity-20" />
                                    <p className="text-sm font-medium">Transaksi tidak ditemukan</p>
                                    <p className="text-xs">Coba kata kunci lain</p>
                                </div>
                            ) : (
                                <div className="max-h-[400px] overflow-y-auto overflow-x-hidden divide-y divide-[#F3F4F3]">
                                    {(() => {
                                        const walletMap = new Map(wallets.map(w => [w.id, w.name]))
                                        return searchResults.map(tx => {
                                        const walletName = (tx.wallet_id != null ? walletMap.get(tx.wallet_id) : undefined) || 'Tidak Diketahui'
                                        const txDate = new Date(tx.date || tx.created_at)
                                        const txTime = new Date(tx.created_at)
                                        const dateStr = `${txDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })} • ${txTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`
                                        const isIncome = tx.type === 'pemasukan'
                                        const isTopup = tx.type === 'topup'
                                        return (
                                            <div key={tx.id} className="flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 transition-colors w-full min-w-0">
                                                {/* Type icon */}
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                                                    isTopup ? 'bg-blue-50' : isIncome ? 'bg-emerald-50' : 'bg-rose-50'
                                                }`}>
                                                    {isTopup
                                                        ? <Zap className="w-4 h-4 text-blue-500" />
                                                        : isIncome
                                                        ? <ArrowUpRight className="w-4 h-4 text-emerald-500" />
                                                        : <ArrowDownRight className="w-4 h-4 text-rose-500" />
                                                    }
                                                </div>

                                                {/* Info */}
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-semibold text-[#080C1A] truncate">
                                                         {isTopup && tx.source_wallet_id 
                                                            ? `${tx.title} (${walletMap.get(tx.source_wallet_id) || '?'} → ${walletName})`
                                                            : tx.title}
                                                    </p>
                                                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                                        <span className="text-xs text-[#6A7686]">{dateStr}</span>
                                                        <span className="text-xs text-[#6A7686] flex items-center gap-1">
                                                            <WalletIcon className="w-3 h-3" />
                                                            {walletName}
                                                        </span>
                                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                                                            {tx.category}
                                                        </span>
                                                        {tx.is_talangan && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-600">Talangan</span>}
                                                        {tx.is_piutang && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-100 text-violet-600">Piutang</span>}
                                                    </div>
                                                </div>

                                                {/* Amount */}
                                                <p className={`text-sm font-bold shrink-0 ${
                                                    isTopup ? 'text-blue-600' : isIncome ? 'text-emerald-600' : 'text-rose-500'
                                                }`}>
                                                    {isIncome || isTopup ? '+' : '-'}Rp {tx.amount.toLocaleString('id-ID')}
                                                </p>
                                            </div>
                                        )
                                    })
                                    })()} 
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Settings Panel */}
                {showSettings && (
                    <>
                        <div
                            className="fixed inset-0 z-10"
                            onClick={() => setShowSettings(false)}
                        />
                        <div className="relative z-20 w-full md:max-w-sm md:ml-auto lg:fixed lg:right-8 lg:top-32 lg:z-50 bg-white rounded-2xl shadow-xl border border-[#F3F4F3] p-5 animate-in fade-in zoom-in-95 duration-200">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="font-bold text-[#080C1A]">Pengaturan Filter</h3>
                                <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-slate-600">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="space-y-5">
                                <div className="space-y-3">
                                    <label className="text-xs font-bold text-[#6A7686] uppercase tracking-wider">Mode Tampilan</label>
                                    <div className="grid grid-cols-2 gap-2 bg-slate-50 p-1.5 rounded-xl">
                                        <button
                                            onClick={() => setFilterMode('monthly')}
                                            className={`px-3 py-2.5 rounded-lg text-sm font-bold transition-all ${filterMode === 'monthly' ? 'bg-white shadow-sm text-[#165DFF]' : 'text-slate-400 hover:text-slate-600'}`}
                                        >
                                            Bulanan
                                        </button>
                                        <button
                                            onClick={() => setFilterMode('custom')}
                                            className={`px-3 py-2.5 rounded-lg text-sm font-bold transition-all ${filterMode === 'custom' ? 'bg-white shadow-sm text-[#165DFF]' : 'text-slate-400 hover:text-slate-600'}`}
                                        >
                                            Custom
                                        </button>
                                    </div>
                                </div>

                                {filterMode === 'custom' && (
                                    <div className="space-y-4 pt-2 border-t border-[#F3F4F3]">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-[#6A7686]">Dari Tanggal</label>
                                            <input
                                                type="date"
                                                value={customRange.start}
                                                onChange={(e) => setCustomRange(prev => ({ ...prev, start: e.target.value }))}
                                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#165DFF] transition-all font-bold text-[#080C1A]"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-[#6A7686]">Sampai Tanggal</label>
                                            <input
                                                type="date"
                                                value={customRange.end}
                                                onChange={(e) => setCustomRange(prev => ({ ...prev, end: e.target.value }))}
                                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#165DFF] transition-all font-bold text-[#080C1A]"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                )}

                {loading ? (
                    <div className="text-center py-20 text-slate-400 animate-pulse">Memuat analitik...</div>
                ) : (
                    <>
                        {/* Summary Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-white p-6 rounded-2xl border border-[#F3F4F3] hover:shadow-sm transition-all duration-300 group">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600 group-hover:bg-emerald-100 transition-colors">
                                            <TrendingUp className="w-6 h-6" />
                                        </div>
                                        <h3 className="text-[#6A7686] font-medium">Total Pemasukan</h3>
                                    </div>
                                    <div className="relative">
                                        <button 
                                            onClick={() => setShowIncomeTooltip(!showIncomeTooltip)}
                                            className="p-1 text-slate-400 hover:text-emerald-500 transition-colors rounded-full hover:bg-slate-50 relative z-20"
                                        >
                                            <Info className="w-4 h-4" />
                                        </button>
                                        
                                        {/* Invisible overlay */}
                                        {showIncomeTooltip && (
                                            <div 
                                                className="fixed inset-0 z-10" 
                                                onClick={() => setShowIncomeTooltip(false)}
                                            />
                                        )}

                                        <div className={`absolute right-0 -mr-2 top-full mt-3 w-64 p-3 bg-slate-800 text-white text-xs rounded-xl shadow-xl transition-all z-20 font-medium leading-relaxed ${
                                            showIncomeTooltip ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible -translate-y-1'
                                        }`}>
                                            <p>Semua <span className="text-emerald-400 font-bold">transaksi masuk</span> pada rentang tanggal yang dipilih.</p>
                                            <div className="mt-2 pt-2 border-t border-slate-700/50">
                                                <p className="text-slate-300">Catatan: <span className="font-bold">Pembayaran Piutang</span> (uang yang dikembalikan orang lain ke kamu) tidak dihitung sebagai pemasukan.</p>
                                            </div>
                                            {/* Arrow up */}
                                            <div className="absolute -top-1.5 right-4 w-3 h-3 bg-slate-800 rotate-45"></div>
                                        </div>
                                    </div>
                                </div>
                                <p className="text-2xl font-bold text-[#080C1A]">Rp {income.toLocaleString('id-ID')}</p>
                            </div>

                            <div className="bg-white p-6 rounded-2xl border border-[#F3F4F3] hover:shadow-sm transition-all duration-300 group">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-rose-50 rounded-xl text-rose-600 group-hover:bg-rose-100 transition-colors">
                                            <TrendingDown className="w-6 h-6" />
                                        </div>
                                        <h3 className="text-[#6A7686] font-medium">Total Pengeluaran</h3>
                                    </div>
                                    <div className="relative">
                                        <button 
                                            onClick={() => setShowExpenseTooltip(!showExpenseTooltip)}
                                            className="p-1 text-slate-400 hover:text-rose-500 transition-colors rounded-full hover:bg-slate-50 relative z-20"
                                        >
                                            <Info className="w-4 h-4" />
                                        </button>
                                        
                                        {/* Invisible overlay */}
                                        {showExpenseTooltip && (
                                            <div 
                                                className="fixed inset-0 z-10" 
                                                onClick={() => setShowExpenseTooltip(false)}
                                            />
                                        )}

                                        <div className={`absolute right-0 -mr-2 top-full mt-3 w-64 p-3 bg-slate-800 text-white text-xs rounded-xl shadow-xl transition-all z-20 font-medium leading-relaxed ${
                                            showExpenseTooltip ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible -translate-y-1'
                                        }`}>
                                            <p>Semua <span className="text-rose-400 font-bold">transaksi keluar</span> pada rentang tanggal yang dipilih.</p>
                                            <div className="mt-2 pt-2 border-t border-slate-700/50">
                                                <p className="text-slate-300">Catatan: Transaksi <span className="font-bold text-amber-300">Talangan</span> (membayarin orang terlebih dahulu) tidak dihitung sebagai pengeluaran.</p>
                                            </div>
                                            {/* Arrow up */}
                                            <div className="absolute -top-1.5 right-4 w-3 h-3 bg-slate-800 rotate-45"></div>
                                        </div>
                                    </div>
                                </div>
                                <p className="text-2xl font-bold text-[#080C1A]">Rp {expense.toLocaleString('id-ID')}</p>
                            </div>

                            <div className="bg-white p-6 rounded-2xl border border-[#F3F4F3] hover:shadow-sm transition-all duration-300 group">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-blue-50 rounded-xl text-[#165DFF] group-hover:bg-blue-100 transition-colors">
                                            <WalletIcon className="w-6 h-6" />
                                        </div>
                                        <h3 className="text-[#6A7686] font-medium">Sisa Saldo Periode Ini</h3>
                                    </div>
                                    <div className="relative">
                                        <button 
                                            onClick={() => setShowTooltip(!showTooltip)}
                                            className="p-1 text-slate-400 hover:text-[#165DFF] transition-colors rounded-full hover:bg-slate-50 relative z-20"
                                        >
                                            <Info className="w-4 h-4" />
                                        </button>
                                        
                                        {/* Invisible overlay to close tooltip when clicking outside */}
                                        {showTooltip && (
                                            <div 
                                                className="fixed inset-0 z-10" 
                                                onClick={() => setShowTooltip(false)}
                                            />
                                        )}

                                        <div className={`absolute right-0 -mr-2 top-full mt-3 w-64 p-3 bg-slate-800 text-white text-xs rounded-xl shadow-xl transition-all z-20 font-medium leading-relaxed ${
                                            showTooltip ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible -translate-y-1'
                                        }`}>
                                            <p>Selisih antara <span className="text-emerald-400 font-bold">Pemasukan</span> dan <span className="text-rose-400 font-bold">Pengeluaran</span> murni pada periode ini.</p>
                                            <div className="mt-2 pt-2 border-t border-slate-700/50">
                                                <p className="text-slate-300">Catatan: Tidak menghitung transaksi Piutang atau Talangan.</p>
                                            </div>
                                            {/* Arrow up */}
                                            <div className="absolute -top-1.5 right-4 w-3 h-3 bg-slate-800 rotate-45"></div>
                                        </div>
                                    </div>
                                </div>
                                <p className={`text-2xl font-bold ${netBalance >= 0 ? 'text-[#080C1A]' : 'text-rose-600'}`}>
                                    Rp {netBalance.toLocaleString('id-ID')}
                                </p>
                            </div>
                        </div>

                        {/* Quick Insights Row (Top Expenses & Recent Activity) */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Top Expenses */}
                            <div className="bg-white p-6 rounded-2xl border border-[#F3F4F3] hover:shadow-sm transition-all duration-300">
                                <div className="flex items-center gap-3 mb-5">
                                    <div className="p-2 bg-rose-50 rounded-lg text-rose-500">
                                        <TrendingDown className="w-5 h-5" />
                                    </div>
                                    <h3 className="font-bold text-[#080C1A]">Pengeluaran Terbesar</h3>
                                </div>
                                {topExpenses.length > 0 ? (
                                    <div className="space-y-4">
                                        {topExpenses.map((tx, idx) => (
                                            <div key={tx.id} className="flex justify-between items-center group">
                                                <div className="flex items-center gap-3 min-w-0 pr-4">
                                                    <span className="text-xs font-black text-slate-300 w-4">{idx + 1}.</span>
                                                    <div className="min-w-0">
                                                        <p className="font-bold text-sm text-[#080C1A] truncate">{tx.title}</p>
                                                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mt-1 items-start">
                                                            <span className="text-[10px] font-bold text-slate-400">
                                                                {new Date(tx.date || tx.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })} • {new Date(tx.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                                            </span>
                                                            <span className="text-[10px] font-bold bg-slate-100 px-2 py-0.5 rounded-md text-slate-500 inline-block uppercase tracking-wider">{tx.category}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <p className="font-bold text-sm text-rose-600 shrink-0">-Rp {tx.amount.toLocaleString('id-ID')}</p>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-6 text-slate-400">
                                        <p className="text-sm font-medium">Belum ada pengeluaran</p>
                                    </div>
                                )}
                            </div>

                            {/* Recent Activity */}
                            <div className="bg-white p-6 rounded-2xl border border-[#F3F4F3] hover:shadow-sm transition-all duration-300">
                                <div className="flex items-center gap-3 mb-5">
                                    <div className="p-2 bg-[#165DFF]/10 rounded-lg text-[#165DFF]">
                                        <Zap className="w-5 h-5" />
                                    </div>
                                    <h3 className="font-bold text-[#080C1A]">Aktivitas Terakhir</h3>
                                </div>
                                {recentActivity.length > 0 ? (
                                    <div className="space-y-4">
                                        {recentActivity.map(tx => {
                                            const isIncome = tx.type === 'pemasukan' || tx.type === 'topup'
                                            return (
                                                <div key={tx.id} className="flex justify-between items-center group">
                                                    <div className="min-w-0 pr-4">
                                                        <p className="font-bold text-sm text-[#080C1A] truncate">{tx.title}</p>
                                                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mt-1 items-start">
                                                            <span className="text-[10px] font-bold text-slate-400">
                                                                {new Date(tx.date || tx.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })} • {new Date(tx.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                                            </span>
                                                            <span className="text-[10px] font-bold bg-slate-100 px-2 py-0.5 rounded-md text-slate-500 inline-block uppercase tracking-wider">{tx.category}</span>
                                                        </div>
                                                    </div>
                                                    <p className={`font-bold text-sm shrink-0 ${
                                                        isIncome ? 'text-emerald-600' : 'text-rose-600'
                                                    }`}>
                                                        {isIncome ? '+' : '-'}Rp {tx.amount.toLocaleString('id-ID')}
                                                    </p>
                                                </div>
                                            )
                                        })}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-6 text-slate-400">
                                        <p className="text-sm font-medium">Belum ada aktivitas</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Spending Insights */}
                        {insights.length > 0 && (
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <Zap className="w-4 h-4 text-[#165DFF]" />
                                    <h3 className="font-bold text-[#080C1A]">Spending Insights</h3>
                                    <span className="text-xs text-[#6A7686] font-medium">— analisis otomatis periode ini</span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {insights.map((ins, i) => (
                                        <div
                                            key={i}
                                            className={`p-4 rounded-2xl border flex items-start gap-3 transition-all hover:shadow-sm ${
                                                ins.type === 'positive' ? 'bg-emerald-50 border-emerald-100' :
                                                ins.type === 'negative' ? 'bg-rose-50 border-rose-100' :
                                                ins.type === 'warning' ? 'bg-amber-50 border-amber-100' :
                                                'bg-blue-50 border-blue-100'
                                            }`}
                                        >
                                            <span className="text-xl mt-0.5 shrink-0">{ins.emoji}</span>
                                            <div className="min-w-0">
                                                <p className={`font-bold text-sm ${
                                                    ins.type === 'positive' ? 'text-emerald-700' :
                                                    ins.type === 'negative' ? 'text-rose-700' :
                                                    ins.type === 'warning' ? 'text-amber-700' :
                                                    'text-blue-700'
                                                }`}>{ins.title}</p>
                                                <p className={`text-xs mt-1 leading-relaxed ${
                                                    ins.type === 'positive' ? 'text-emerald-600' :
                                                    ins.type === 'negative' ? 'text-rose-600' :
                                                    ins.type === 'warning' ? 'text-amber-600' :
                                                    'text-blue-600'
                                                }`}>{ins.desc}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Period Comparison Table */}
                        <div className="bg-white rounded-2xl border border-[#F3F4F3] overflow-hidden max-w-[calc(100vw-2rem)] md:max-w-full">
                            <div className="p-5 border-b border-[#F3F4F3] flex items-center gap-2">
                                <ArrowUpRight className="w-4 h-4 text-[#165DFF]" />
                                <h3 className="font-bold text-[#080C1A]">Perbandingan Periode</h3>
                                <span className="text-xs text-[#6A7686] font-medium ml-1">— otomatis vs periode sebelumnya</span>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-sm min-w-[600px]">
                                    <thead>
                                        <tr className="bg-slate-50">
                                            <th className="text-left px-5 py-3 text-xs font-bold text-[#6A7686] uppercase tracking-wider w-36">Item</th>
                                            <th className="text-right px-5 py-3 text-xs font-bold text-[#080C1A] uppercase tracking-wider">
                                                <div>Periode Ini</div>
                                                <div className="text-[10px] font-medium text-[#165DFF] normal-case mt-0.5">{periodComparison.currentLabel}</div>
                                            </th>
                                            <th className="text-right px-5 py-3 text-xs font-bold text-[#6A7686] uppercase tracking-wider">
                                                <div>Periode Lalu</div>
                                                <div className="text-[10px] font-medium text-slate-400 normal-case mt-0.5">{periodComparison.prevLabel}</div>
                                            </th>
                                            <th className="text-right px-5 py-3 text-xs font-bold text-[#6A7686] uppercase tracking-wider">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    Perubahan
                                                    <div className="relative inline-flex">
                                                        <button 
                                                            onClick={() => setShowChangeTooltip(!showChangeTooltip)}
                                                            className="text-slate-400 hover:text-[#165DFF] transition-colors rounded-full"
                                                        >
                                                            <Info className="w-3.5 h-3.5" />
                                                        </button>
                                                        
                                                        {showChangeTooltip && (
                                                            <div 
                                                                className="fixed inset-0 z-10" 
                                                                onClick={() => setShowChangeTooltip(false)}
                                                            />
                                                        )}

                                                        <div className={`absolute right-0 top-full mt-2 w-64 p-3 bg-slate-800 text-white text-xs rounded-xl shadow-xl transition-all z-20 font-medium leading-relaxed normal-case text-left ${
                                                            showChangeTooltip ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible -translate-y-1'
                                                        }`}>
                                                            <p>Persentase selisih lompatan nilai dari periode lalu.</p>
                                                            <div className="mt-2 pt-2 border-t border-slate-700/50">
                                                                <p className="text-slate-300">💡 <span className="font-bold text-emerald-400">Catatan:</span> Persentase kenaikan <b>bisa melebihi 100%</b> jika lonjakan terjadi cukup besar. (Misal: nominal awal 100rb menjadi 500rb adalah naik 400%).</p>
                                                            </div>
                                                            <div className="absolute -top-1.5 right-1 w-3 h-3 bg-slate-800 rotate-45"></div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#F3F4F3]">
                                        {/* Summary rows */}
                                        {([
                                            { label: 'Pemasukan', curr: periodComparison.currIncome, prev: periodComparison.prevIncome, color: 'text-emerald-600', positive: true },
                                            { label: 'Pengeluaran', curr: periodComparison.currExpense, prev: periodComparison.prevExpense, color: 'text-rose-500', positive: false },
                                            { label: 'Selisih', curr: periodComparison.currNet, prev: periodComparison.prevNet, color: periodComparison.currNet >= 0 ? 'text-[#080C1A]' : 'text-rose-600', positive: true },
                                        ] as const).map(row => {
                                            const pct = periodComparison.pctDiff(row.curr, row.prev)
                                            const isGood = row.positive ? (pct !== null && pct > 0) : (pct !== null && pct < 0)
                                            return (
                                                <tr key={row.label} className="hover:bg-slate-50/60 transition-colors">
                                                    <td className="px-5 py-3.5 font-semibold text-[#080C1A]">{row.label}</td>
                                                    <td className={`px-5 py-3.5 text-right font-bold ${row.color}`}>
                                                        {row.curr >= 0 ? '+' : ''}Rp {row.curr.toLocaleString('id-ID')}
                                                    </td>
                                                    <td className="px-5 py-3.5 text-right text-[#6A7686] font-medium">
                                                        {periodComparison.hasPrevData ? (
                                                            <>Rp {row.prev.toLocaleString('id-ID')}</>
                                                        ) : <span className="text-slate-300">—</span>}
                                                    </td>
                                                    <td className="px-5 py-3.5 text-right">
                                                        {pct !== null && periodComparison.hasPrevData ? (
                                                            <div className="flex flex-col items-end gap-1">
                                                                <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${
                                                                    isGood ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-500'
                                                                }`}>
                                                                    {pct > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                                                                    {Math.abs(pct).toFixed(1)}%
                                                                </span>
                                                                {pct > 100 && (
                                                                    <span className="text-[10px] text-slate-400 font-medium">
                                                                        (naik {((pct / 100) + 1).toLocaleString('id-ID', { maximumFractionDigits: 1 })}x)
                                                                    </span>
                                                                )}
                                                            </div>
                                                        ) : <span className="text-slate-300 text-xs">—</span>}
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                        {/* Saving Rate row */}
                                        <tr className="hover:bg-slate-50/60 transition-colors">
                                            <td className="px-5 py-3.5 font-semibold text-[#080C1A]">Saving Rate</td>
                                            <td className={`px-5 py-3.5 text-right font-bold ${
                                                periodComparison.currSavingRate >= 20 ? 'text-emerald-600' :
                                                periodComparison.currSavingRate >= 0 ? 'text-amber-500' : 'text-rose-600'
                                            }`}>{periodComparison.currSavingRate.toFixed(1)}%</td>
                                            <td className="px-5 py-3.5 text-right text-[#6A7686] font-medium">
                                                {periodComparison.hasPrevData ? `${periodComparison.prevSavingRate.toFixed(1)}%` : <span className="text-slate-300">—</span>}
                                            </td>
                                            <td className="px-5 py-3.5 text-right">
                                                {periodComparison.hasPrevData ? (() => {
                                                    const diff = periodComparison.currSavingRate - periodComparison.prevSavingRate
                                                    return (
                                                        <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${
                                                            diff >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-500'
                                                        }`}>
                                                            {diff >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                                                            {Math.abs(diff).toFixed(1)}%
                                                        </span>
                                                    )
                                                })() : <span className="text-slate-300 text-xs">—</span>}
                                            </td>
                                        </tr>

                                        {/* Category rows separator */}
                                        {periodComparison.categoryRows.length > 0 && (
                                            <tr>
                                                <td colSpan={4} className="px-5 pt-4 pb-1">
                                                    <p className="text-[10px] font-bold text-[#6A7686] uppercase tracking-widest">Per Kategori (Pengeluaran)</p>
                                                </td>
                                            </tr>
                                        )}
                                        {periodComparison.categoryRows.map(row => {
                                            const pct = row.pct
                                            const isGood = pct !== null && pct < 0  // spending down = good
                                            return (
                                                <tr key={row.name} className="hover:bg-slate-50/60 transition-colors">
                                                    <td className="px-5 py-3 text-[#080C1A] font-medium">{row.name}</td>
                                                    <td className="px-5 py-3 text-right font-semibold text-rose-500">
                                                        Rp {row.curr.toLocaleString('id-ID')}
                                                    </td>
                                                    <td className="px-5 py-3 text-right text-[#6A7686] font-medium">
                                                        {periodComparison.hasPrevData && row.prev > 0
                                                            ? `Rp ${row.prev.toLocaleString('id-ID')}`
                                                            : <span className="text-slate-300">—</span>}
                                                    </td>
                                                    <td className="px-5 py-3 text-right">
                                                        {pct !== null && periodComparison.hasPrevData ? (
                                                            <div className="flex flex-col items-end gap-1">
                                                                <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${
                                                                    isGood ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-500'
                                                                }`}>
                                                                    {pct > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                                                                    {Math.abs(pct).toFixed(0)}%
                                                                </span>
                                                                {pct > 100 && (
                                                                    <span className="text-[10px] text-slate-400 font-medium">
                                                                        (naik {((pct / 100) + 1).toLocaleString('id-ID', { maximumFractionDigits: 1 })}x)
                                                                    </span>
                                                                )}
                                                            </div>
                                                        ) : <span className="text-slate-300 text-xs">—</span>}
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                                {!periodComparison.hasPrevData && (
                                    <div className="text-center py-4 text-xs text-slate-400 border-t border-[#F3F4F3]">
                                        Belum ada data dari periode sebelumnya ({periodComparison.prevLabel})
                                    </div>
                                )}
                            </div>
                        </div>


                        {/* Charts Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Summary Pie Chart */}
                            <div className="bg-white p-6 rounded-2xl border border-[#F3F4F3] hover:shadow-sm transition-all duration-300">
                                <h3 className="font-bold text-lg text-[#080C1A] mb-6">Ringkasan Arus Kas</h3>
                                <div className="w-full h-[300px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={summaryData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={100}
                                                paddingAngle={5}
                                                dataKey="value"
                                                stroke="none"
                                            >
                                                {summaryData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.fill} />
                                                ))}
                                            </Pie>
                                            <Tooltip 
                                                formatter={(value: any) => `Rp ${(value || 0).toLocaleString('id-ID')}`}
                                                contentStyle={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #F3F4F3', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                            />
                                            <Legend verticalAlign="bottom" height={36} iconType="circle" />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Category Bar Chart */}
                            <div className="bg-white p-6 rounded-2xl border border-[#F3F4F3] hover:shadow-sm transition-all duration-300">
                                <h3 className="font-bold text-lg text-[#080C1A] mb-6">Pengeluaran per Kategori</h3>
                                <div className="w-full h-[300px]">
                                    {categoryData.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={categoryData.slice(0, 5)} layout="vertical" margin={{ top: 5, right: 5, left: 40, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#F3F4F3" />
                                                <XAxis type="number" hide />
                                                <YAxis 
                                                    dataKey="name" 
                                                    type="category" 
                                                    tick={{ fill: '#6A7686', fontSize: 12, fontWeight: 500 }} 
                                                    width={100}
                                                    axisLine={false}
                                                    tickLine={false}
                                                />
                                                <Tooltip 
                                                    formatter={(value: any) => `Rp ${(value || 0).toLocaleString('id-ID')}`}
                                                    cursor={{ fill: '#F9FAFB' }}
                                                    contentStyle={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #F3F4F3', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                                />
                                                <Bar dataKey="value" fill="#165DFF" radius={[0, 4, 4, 0]} barSize={28}>
                                                    <LabelList 
                                                        dataKey="value" 
                                                        position="insideEnd" 
                                                        formatter={(val: any) => `Rp ${(val || 0).toLocaleString('id-ID')}`}
                                                        style={{ fontSize: '11px', fill: '#ffffff', fontWeight: 700 }}
                                                    />
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2">
                                            <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center">
                                                <TrendingDown className="w-5 h-5 opacity-20" />
                                            </div>
                                            <span className="text-sm font-medium">Belum ada data pengeluaran</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                             {/* Wallet Distribution */}
                            <div className="bg-white p-6 rounded-2xl border border-[#F3F4F3] hover:shadow-sm transition-all duration-300 lg:col-span-2">
                                <h3 className="font-bold text-lg text-[#080C1A] mb-6">Pengeluaran Berdasarkan Sumber Dana</h3>
                                <div className="w-full h-[300px]">
                                    {walletData.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={walletData}
                                                    cx="50%"
                                                    cy="50%"
                                                    outerRadius={80}
                                                    dataKey="value"
                                                    label={({ name, percent }: any) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                                                    labelLine={{ stroke: '#CBD5E1' }}
                                                    stroke="none"
                                                >
                                                    {walletData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip 
                                                    formatter={(value: any) => `Rp ${(value || 0).toLocaleString('id-ID')}`}
                                                    contentStyle={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #F3F4F3', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                                />
                                                <Legend />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2">
                                            <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center">
                                                <WalletIcon className="w-5 h-5 opacity-20" />
                                            </div>
                                            <span className="text-sm font-medium">Belum ada data wallet</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Wallet Transaction Breakdown */}
                        <div className="bg-white rounded-2xl border border-[#F3F4F3] overflow-hidden">
                            <div className="p-5 border-b border-[#F3F4F3] flex items-center gap-2">
                                <WalletIcon className="w-4 h-4 text-[#165DFF]" />
                                <h3 className="font-bold text-[#080C1A]">Transaksi Per Dompet</h3>
                                <span className="text-xs text-[#6A7686] font-medium ml-1">— rincian per sumber dana</span>
                            </div>

                            {walletTransactionBreakdown.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-2">
                                    <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center">
                                        <WalletIcon className="w-5 h-5 opacity-20" />
                                    </div>
                                    <span className="text-sm font-medium">Belum ada transaksi di periode ini</span>
                                </div>
                            ) : (
                                <div className="divide-y divide-[#F3F4F3]">
                                    {walletTransactionBreakdown.map((walletGroup) => {
                                        const isExpanded = expandedWallet === walletGroup.walletName
                                        return (
                                            <div key={walletGroup.walletName}>
                                                {/* Wallet Header — clickable accordion toggle */}
                                                <button
                                                    onClick={() => setExpandedWallet(isExpanded ? null : walletGroup.walletName)}
                                                    className="w-full flex items-center gap-3 px-5 py-4 hover:bg-slate-50/70 transition-colors text-left group"
                                                >
                                                    <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                                                        <WalletIcon className="w-4 h-4 text-[#165DFF]" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-bold text-[#080C1A] text-sm">{walletGroup.walletName}</p>
                                                        <div className="flex items-center gap-3 mt-0.5">
                                                            <span className="text-xs text-emerald-600 font-medium">+Rp {walletGroup.totalIncome.toLocaleString('id-ID')}</span>
                                                            <span className="text-xs text-rose-500 font-medium">-Rp {walletGroup.totalExpense.toLocaleString('id-ID')}</span>
                                                            <span className="text-xs text-[#6A7686]">{walletGroup.transactions.length} transaksi</span>
                                                        </div>
                                                    </div>
                                                    <ChevronDown
                                                        className={`w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 ${
                                                            isExpanded ? 'rotate-180' : ''
                                                        }`}
                                                    />
                                                </button>

                                                {/* Transaction List */}
                                                {isExpanded && (
                                                    <div className="bg-slate-50/50 border-t border-[#F3F4F3] overflow-x-hidden">
                                                        {walletGroup.transactions.map((tx, idx) => {
                                                            const txDate = new Date(tx.date || tx.created_at)
                                                            const txTime = new Date(tx.created_at)
                                                            const dateStr = `${txDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })} • ${txTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`
                                                            const isIncome = tx.type === 'pemasukan'
                                                            return (
                                                                <div
                                                                    key={tx.id}
                                                                    className={`flex items-center gap-3 px-5 py-3.5 w-full min-w-0 ${
                                                                        idx !== walletGroup.transactions.length - 1
                                                                            ? 'border-b border-[#F3F4F3]'
                                                                            : ''
                                                                    } hover:bg-white transition-colors`}
                                                                >
                                                                    {/* Type indicator */}
                                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                                                                        isIncome ? 'bg-emerald-50' : 'bg-rose-50'
                                                                    }`}>
                                                                        {isIncome
                                                                            ? <ArrowUpRight className="w-4 h-4 text-emerald-500" />
                                                                            : <ArrowDownRight className="w-4 h-4 text-rose-500" />
                                                                        }
                                                                    </div>

                                                                    {/* Info */}
                                                                    <div className="flex-1 min-w-0">
                                                                        <p className="text-sm font-semibold text-[#080C1A] truncate">{tx.title}</p>
                                                                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                                                            <span className="text-xs text-[#6A7686]">{dateStr}</span>
                                                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                                                                                {tx.category}
                                                                            </span>
                                                                            {tx.is_talangan && (
                                                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-600">Talangan</span>
                                                                            )}
                                                                            {tx.is_piutang && (
                                                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-100 text-violet-600">Piutang</span>
                                                                            )}
                                                                        </div>
                                                                    </div>

                                                                    {/* Amount */}
                                                                    <p className={`text-sm font-bold shrink-0 ${
                                                                        isIncome ? 'text-emerald-600' : 'text-rose-500'
                                                                    }`}>
                                                                        {isIncome ? '+' : '-'}Rp {tx.amount.toLocaleString('id-ID')}
                                                                    </p>
                                                                </div>
                                                            )
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>

                    </>
                )}
            </div>
        </main>
    )
}

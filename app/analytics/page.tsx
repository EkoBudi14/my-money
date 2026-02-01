'use client'
import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { Transaction, Wallet } from '@/types'
import {
    PieChart,
    Pie,
    Cell,
    Tooltip,
    Legend,
    ResponsiveContainer
} from 'recharts'
import { Calendar, ChevronLeft, ChevronRight, Settings, X } from 'lucide-react'

export default function AnalyticsPage() {
    const [transactions, setTransactions] = useState<Transaction[]>([])
    const [wallets, setWallets] = useState<Wallet[]>([])
    const [loading, setLoading] = useState(true)

    // State for Filter & Persistence (Synced with Dashboard)
    const [currentDate, setCurrentDate] = useState(new Date())
    const [showSettings, setShowSettings] = useState(false)

    const [filterMode, setFilterMode] = useState<'monthly' | 'custom'>('monthly')
    const [customRange, setCustomRange] = useState({
        start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
        end: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0]
    })
    const [isInitialized, setIsInitialized] = useState(false)

    // Settings Sync - Simplified (No Auth Required) - Same as Dashboard
    useEffect(() => {
        // Load settings from Supabase on mount
        const loadSettings = async () => {
            const { data: settings } = await supabase
                .from('user_settings')
                .select('*')
                .eq('id', 1) // Use single row with id=1 for single-user app
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
                // Create initial settings row if doesn't exist
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

    // Save to Supabase when settings change (debounced to prevent excessive writes)
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
        }, 500) // Debounce 500ms to batch rapid changes

        return () => clearTimeout(timeoutId)
    }, [filterMode, customRange, isInitialized])



    // Helper: Get Period Date Range String
    const getPeriodLabel = () => {
        if (filterMode === 'monthly') {
            return currentDate.toLocaleString('id-ID', { month: 'long', year: 'numeric' })
        } else {
            const s = new Date(customRange.start)
            const e = new Date(customRange.end)
            return `${s.getDate()} ${s.toLocaleString('id-ID', { month: 'short' })} - ${e.getDate()} ${e.toLocaleString('id-ID', { month: 'short' })} ${e.getFullYear()}`
        }
    }

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        setLoading(true)
        const { data: txs } = await supabase.from('transactions').select('*')
        const { data: wlls } = await supabase.from('wallets').select('*')

        if (txs) setTransactions(txs as unknown as Transaction[])
        if (wlls) setWallets(wlls)
        setLoading(false)
    }

    // Filter Logic (Memoized)
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

    // 1. Income vs Expense
    const income = filteredTxs.filter(t => t.type === 'pemasukan').reduce((acc, c) => acc + c.amount, 0)
    const expense = filteredTxs.filter(t => t.type === 'pengeluaran').reduce((acc, c) => acc + c.amount, 0)
    const summaryData = [
        { name: 'Pemasukan', value: income },
        { name: 'Pengeluaran', value: expense }
    ]

    // 2. Expense by Category
    const expenseTxs = filteredTxs.filter(t => t.type === 'pengeluaran')
    const categoryDataMap = expenseTxs.reduce((acc, curr) => {
        acc[curr.category] = (acc[curr.category] || 0) + curr.amount
        return acc
    }, {} as Record<string, number>)

    const categoryData = Object.entries(categoryDataMap).map(([name, value]) => ({ name, value }))

    // 3. Expense by Wallet
    const walletDataMap = expenseTxs.reduce((acc, curr) => {
        const wName = wallets.find(w => w.id === curr.wallet_id)?.name || 'Unknown'
        acc[wName] = (acc[wName] || 0) + curr.amount
        return acc
    }, {} as Record<string, number>)

    const walletData = Object.entries(walletDataMap).map(([name, value]) => ({ name, value }))

    // Colors
    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658']
    const SUMMARY_COLORS = ['#22c55e', '#ef4444']

    const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
    const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))

    return (
        <main className="min-h-screen bg-transparent font-sans text-slate-900 pb-24 md:pb-6 ml-0 md:ml-72 p-6 transition-all duration-300">
            {/* 1. Header Section */}
            <header className="flex flex-row justify-between items-center gap-2 mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800">Analitik Keuangan</h1>
                    <p className="text-slate-500">Laporan detail keuangan anda</p>
                </div>

                {/* Unified Control Bar */}
                <div className="relative">
                    <div className="flex items-center gap-1 bg-white/80 backdrop-blur-xl p-1.5 rounded-2xl shadow-sm border border-slate-200/60 shrink-0">
                        {/* Date Navigator (Only in Monthly Mode) */}
                        {filterMode === 'monthly' && (
                            <button
                                onClick={prevMonth}
                                className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-blue-600 transition-all active:scale-95"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                        )}

                        {/* Date Label */}
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50/50 rounded-xl border border-slate-100/50">
                            <Calendar className="w-4 h-4 text-blue-500" />
                            <div className="flex flex-col items-center">
                                <span className="text-sm font-bold text-slate-700 whitespace-nowrap">
                                    {getPeriodLabel()}
                                </span>
                                {filterMode === 'custom' && (
                                    <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Mode Custom</span>
                                )}
                            </div>
                        </div>

                        {/* Date Navigator (Only in Monthly Mode) */}
                        {filterMode === 'monthly' && (
                            <button
                                onClick={nextMonth}
                                className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-blue-600 transition-all active:scale-95"
                            >
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        )}

                        {/* Settings Toggle */}
                        <div className="w-px h-6 bg-slate-200 mx-1" />
                        <button
                            onClick={() => setShowSettings(!showSettings)}
                            className={`p-2 rounded-xl transition-all active:scale-95 ${showSettings ? 'bg-blue-100 text-blue-600 rotate-90' : 'hover:bg-slate-100 text-slate-400 hover:text-slate-600'}`}
                        >
                            <Settings className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Settings Popover */}
                    {showSettings && (
                        <>
                            <div
                                className="fixed inset-0 z-10"
                                onClick={() => setShowSettings(false)}
                            />
                            <div className="absolute top-full right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-100 p-4 z-20 animate-in fade-in slide-in-from-top-2 duration-200">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="font-bold text-slate-700">Pengaturan Tampilan</h3>
                                    <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-slate-600">
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    {/* Filter Mode */}
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-400 uppercase">Mode Filter</label>
                                        <div className="grid grid-cols-2 gap-2 bg-slate-50 p-1 rounded-xl">
                                            <button
                                                onClick={() => setFilterMode('monthly')}
                                                className={`px-3 py-2 rounded-lg text-sm font-bold transition-all ${filterMode === 'monthly' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                                            >
                                                Bulanan
                                            </button>
                                            <button
                                                onClick={() => setFilterMode('custom')}
                                                className={`px-3 py-2 rounded-lg text-sm font-bold transition-all ${filterMode === 'custom' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                                            >
                                                Custom
                                            </button>
                                        </div>
                                    </div>

                                    {/* Custom Range Inputs */}
                                    {filterMode === 'custom' && (
                                        <div className="space-y-3 animate-in slide-in-from-top-2">
                                            <div className="space-y-1">
                                                <label className="text-xs font-medium text-slate-500">Dari Tanggal</label>
                                                <input
                                                    type="date"
                                                    value={customRange.start}
                                                    onChange={(e) => setCustomRange(prev => ({ ...prev, start: e.target.value }))}
                                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-bold text-slate-600"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs font-medium text-slate-500">Sampai Tanggal</label>
                                                <input
                                                    type="date"
                                                    value={customRange.end}
                                                    onChange={(e) => setCustomRange(prev => ({ ...prev, end: e.target.value }))}
                                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-bold text-slate-600"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </header>

            {loading ? (
                <div className="text-center py-20 text-slate-400">Loading charts...</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                    {/* Summary Chart */}
                    <div className="glass shadow-premium-lg p-6 rounded-3xl border border-white/20 flex flex-col items-center backdrop-blur-xl card-hover">
                        <h3 className="font-bold text-lg mb-4 text-slate-700 w-full text-left">Ringkasan</h3>
                        <div className="w-full h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={summaryData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={2}
                                        minAngle={3}
                                        dataKey="value"
                                    >
                                        {summaryData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={SUMMARY_COLORS[index]} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(value: any) => `Rp ${(value || 0).toLocaleString('id-ID')}`} />
                                    <Legend verticalAlign="bottom" height={36} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Category Chart */}
                    <div className="glass shadow-premium-lg p-6 rounded-3xl border border-white/20 flex flex-col items-center backdrop-blur-xl card-hover">
                        <h3 className="font-bold text-lg mb-4 text-slate-700 w-full text-left">Pengeluaran per Kategori</h3>
                        <div className="w-full h-64">
                            {categoryData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={categoryData}
                                            cx="50%"
                                            cy="50%"
                                            outerRadius={80}
                                            dataKey="value"
                                            label={({ percent }: any) => `${((percent || 0) * 100).toFixed(0)}%`}
                                        >
                                            {categoryData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip formatter={(value: any) => `Rp ${(value || 0).toLocaleString('id-ID')}`} />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex items-center justify-center text-slate-400">No Data</div>
                            )}
                        </div>
                    </div>

                    {/* Wallet Chart */}
                    <div className="glass shadow-premium-lg p-6 rounded-3xl border border-white/20 flex flex-col items-center backdrop-blur-xl card-hover">
                        <h3 className="font-bold text-lg mb-4 text-slate-700 w-full text-left">Pengeluaran per Sumber Dana</h3>
                        <div className="w-full h-64">
                            {walletData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={walletData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={40}
                                            outerRadius={80}
                                            dataKey="value"
                                        >
                                            {walletData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip formatter={(value: any) => `Rp ${(value || 0).toLocaleString('id-ID')}`} />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex items-center justify-center text-slate-400">No Data</div>
                            )}
                        </div>
                    </div>

                </div>
            )}
        </main>
    )
}

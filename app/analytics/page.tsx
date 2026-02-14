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
    ResponsiveContainer,
    BarChart, 
    Bar, 
    XAxis, 
    YAxis, 
    CartesianGrid
} from 'recharts'
import { Calendar, ChevronLeft, ChevronRight, Settings, X, TrendingUp, TrendingDown, Wallet as WalletIcon } from 'lucide-react'

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
    const netBalance = income - expense
    
    const summaryData = [
        { name: 'Pemasukan', value: income, fill: '#10B981' }, // Emerald-500
        { name: 'Pengeluaran', value: expense, fill: '#EF4444' } // Red-500
    ]

    // 2. Expense by Category
    const expenseTxs = filteredTxs.filter(t => t.type === 'pengeluaran')
    const categoryDataMap = expenseTxs.reduce((acc, curr) => {
        acc[curr.category] = (acc[curr.category] || 0) + curr.amount
        return acc
    }, {} as Record<string, number>)

    const categoryData = Object.entries(categoryDataMap)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)

    // 3. Expense by Wallet
    const walletDataMap = expenseTxs.reduce((acc, curr) => {
        const wName = wallets.find(w => w.id === curr.wallet_id)?.name || 'Unknown'
        acc[wName] = (acc[wName] || 0) + curr.amount
        return acc
    }, {} as Record<string, number>)

    const walletData = Object.entries(walletDataMap).map(([name, value]) => ({ name, value }))

    // Colors
    const COLORS = ['#165DFF', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658']
    
    const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
    const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))

    return (
        <main className="flex-1 bg-[#F9FAFB] min-h-screen overflow-x-hidden transition-all duration-300">
             <header className="flex items-center justify-between w-full h-[90px] shrink-0 border-b border-[#F3F4F3] bg-white px-5 md:px-8">
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

            <div className="p-5 md:p-8 space-y-8">
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
                                <div className="flex items-center gap-4 mb-2">
                                    <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600 group-hover:bg-emerald-100 transition-colors">
                                        <TrendingUp className="w-6 h-6" />
                                    </div>
                                    <h3 className="text-[#6A7686] font-medium">Total Pemasukan</h3>
                                </div>
                                <p className="text-2xl font-bold text-[#080C1A]">Rp {income.toLocaleString('id-ID')}</p>
                            </div>

                            <div className="bg-white p-6 rounded-2xl border border-[#F3F4F3] hover:shadow-sm transition-all duration-300 group">
                                <div className="flex items-center gap-4 mb-2">
                                    <div className="p-3 bg-rose-50 rounded-xl text-rose-600 group-hover:bg-rose-100 transition-colors">
                                        <TrendingDown className="w-6 h-6" />
                                    </div>
                                    <h3 className="text-[#6A7686] font-medium">Total Pengeluaran</h3>
                                </div>
                                <p className="text-2xl font-bold text-[#080C1A]">Rp {expense.toLocaleString('id-ID')}</p>
                            </div>

                             <div className="bg-white p-6 rounded-2xl border border-[#F3F4F3] hover:shadow-sm transition-all duration-300 group">
                                <div className="flex items-center gap-4 mb-2">
                                    <div className="p-3 bg-blue-50 rounded-xl text-[#165DFF] group-hover:bg-blue-100 transition-colors">
                                        <WalletIcon className="w-6 h-6" />
                                    </div>
                                    <h3 className="text-[#6A7686] font-medium">Sisa Saldo Periode Ini</h3>
                                </div>
                                <p className={`text-2xl font-bold ${netBalance >= 0 ? 'text-[#080C1A]' : 'text-rose-600'}`}>
                                    Rp {netBalance.toLocaleString('id-ID')}
                                </p>
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
                                            <BarChart data={categoryData.slice(0, 5)} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
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
                                                <Bar dataKey="value" fill="#165DFF" radius={[0, 4, 4, 0]} barSize={24} />
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
                    </>
                )}
            </div>
        </main>
    )
}

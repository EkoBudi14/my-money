'use client'
import { useEffect, useState } from 'react'
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

export default function AnalyticsPage() {
    const [transactions, setTransactions] = useState<Transaction[]>([])
    const [wallets, setWallets] = useState<Wallet[]>([])
    const [loading, setLoading] = useState(true)
    const [dateFilter, setDateFilter] = useState(new Date())

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

    // Filter Logic
    const filteredTxs = transactions.filter(t => {
        const d = new Date(t.date || t.created_at)
        return d.getMonth() === dateFilter.getMonth() && d.getFullYear() === dateFilter.getFullYear()
    })

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

    const nextMonth = () => setDateFilter(new Date(dateFilter.getFullYear(), dateFilter.getMonth() + 1, 1))
    const prevMonth = () => setDateFilter(new Date(dateFilter.getFullYear(), dateFilter.getMonth() - 1, 1))

    return (
        <main className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-24 md:pb-6 ml-0 md:ml-64 p-6">
            <header className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800">Analitik Keuangan</h1>
                    <p className="text-slate-500">Laporan detail keuangan anda</p>
                </div>
                <div className="flex items-center gap-4 bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-100">
                    <button onClick={prevMonth} className="text-slate-500 hover:text-blue-600 font-bold text-xl">{'<'}</button>
                    <span className="font-bold text-slate-700 w-32 text-center">
                        {dateFilter.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
                    </span>
                    <button onClick={nextMonth} className="text-slate-500 hover:text-blue-600 font-bold text-xl">{'>'}</button>
                </div>
            </header>

            {loading ? (
                <div className="text-center py-20 text-slate-400">Loading charts...</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                    {/* Summary Chart */}
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center">
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
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center">
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
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center">
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

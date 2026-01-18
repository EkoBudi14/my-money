'use client'
import { useEffect, useState } from 'react'
import {
    PieChart,
    Pie,
    Cell,
    Tooltip,
    Legend,
    ResponsiveContainer
} from 'recharts'

interface FinancialChartProps {
    income: number
    expense: number
}

const FinancialChart = ({ income, expense }: FinancialChartProps) => {
    const [isMounted, setIsMounted] = useState(false)

    useEffect(() => {
        setIsMounted(true)
    }, [])

    const data = [
        { name: 'Pemasukan', value: income },
        { name: 'Pengeluaran', value: expense },
    ]

    const COLORS = ['#22c55e', '#ef4444']

    if (!isMounted) return <div className="h-64 w-full bg-slate-50 rounded-xl animate-pulse" />

    // Calculate total for percentage if needed, but simple values are fine for now
    // If both are 0, we might want to show an empty state or handle it gracefully
    const hasData = income > 0 || expense > 0

    return (
        <div className="w-full bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-lg font-bold text-slate-800">Analisis Keuangan</h3>
                    <p className="text-sm text-slate-500">Ringkasan Pemasukan & Pengeluaran</p>
                </div>
            </div>
            <div className="w-full h-80">
                {hasData ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={data}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                fill="#8884d8"
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip formatter={(value: any) => `Rp ${(value || 0).toLocaleString('id-ID')}`} />
                            <Legend verticalAlign="bottom" height={36} />
                        </PieChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="h-full flex items-center justify-center text-slate-400">
                        Belum ada data transaksi
                    </div>
                )}
            </div>
        </div>
    )
}

export default FinancialChart

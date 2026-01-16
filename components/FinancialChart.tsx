'use client'
import { useEffect, useState } from 'react'
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
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
        {
            name: 'Ringkasan',
            Pemasukan: income,
            Pengeluaran: expense,
        },
    ]

    if (!isMounted) return <div className="h-64 w-full bg-slate-50 rounded-xl animate-pulse" />

    return (
        <div className="w-full bg-white p-4 rounded-xl shadow-md">
            <h3 className="text-lg font-bold text-gray-700 mb-4">Grafik Keuangan</h3>
            <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={data}
                        margin={{
                            top: 5,
                            right: 30,
                            left: 20,
                            bottom: 5,
                        }}
                    >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip formatter={(value: any) => `Rp ${(value || 0).toLocaleString('id-ID')}`} />
                        <Legend />
                        <Bar dataKey="Pemasukan" fill="#22c55e" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Pengeluaran" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    )
}

export default FinancialChart

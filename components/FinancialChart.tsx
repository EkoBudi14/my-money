'use client'
import { useEffect, useState } from 'react'
import {
    ComposedChart,
    Line,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    AreaChart
} from 'recharts'

interface MonthlyData {
    name: string
    income: number
    expense: number
}

interface FinancialChartProps {
    data: MonthlyData[]
}

const FinancialChart = ({ data }: FinancialChartProps) => {
    const [isMounted, setIsMounted] = useState(false)
    const [viewMode, setViewMode] = useState<'monthly' | 'quarterly'>('monthly')

    useEffect(() => {
        setIsMounted(true)
    }, [])

    if (!isMounted) return <div className="h-80 w-full bg-slate-50 rounded-xl animate-pulse" />

    // Custom Tooltip
    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white p-4 border border-slate-100 shadow-xl rounded-2xl">
                    <p className="font-bold text-slate-800 mb-2">{label}</p>
                    <div className="space-y-1">
                        <p className="text-sm font-medium text-[#165DFF]">
                            Pemasukan: <span className="font-bold">Rp {payload.find((p: any) => p.dataKey === 'income')?.value.toLocaleString('id-ID')}</span>
                        </p>
                        <p className="text-sm font-medium text-slate-400">
                            Pengeluaran: <span className="font-bold">Rp {payload.find((p: any) => p.dataKey === 'expense')?.value.toLocaleString('id-ID')}</span>
                        </p>
                    </div>
                </div>
            )
        }
        return null
    }

    // Calculate totals
    const totalIncome = data.reduce((acc, curr) => acc + curr.income, 0)
    const totalExpense = data.reduce((acc, curr) => acc + curr.expense, 0)

    // Format large numbers
    const formatShort = (val: number) => {
        if (val >= 1000000000) return `${(val / 1000000000).toFixed(1)}M`
        if (val >= 1000000) return `${(val / 1000000).toFixed(1)}jt`
        if (val >= 1000) return `${(val / 1000).toFixed(0)}rb`
        return val.toLocaleString('id-ID')
    }

    // Custom Legend (unused now, kept for reference)
    const renderLegend = (props: any) => {
        const { payload } = props;
        const formatShort = (val: number) => {
            if (val >= 1000000000) return `${(val / 1000000000).toFixed(1)}M`
            if (val >= 1000000) return `${(val / 1000000).toFixed(1)}jt`
            if (val >= 1000) return `${(val / 1000).toFixed(0)}rb`
            return val.toLocaleString('id-ID')
        }
        return (
            <div className="flex flex-wrap justify-end gap-x-6">
                {payload.map((entry: any, index: number) => {
                    const isIncome = entry.value === 'Pemasukan'
                    const total = isIncome ? totalIncome : totalExpense
                    
                    return (
                        <div key={`item-${index}`} className="flex items-center gap-2">
                            <div 
                                className={`w-3 h-3 rounded-full border-2 ${isIncome ? 'border-[#165DFF]' : 'border-slate-400'}`}
                                style={{ backgroundColor: 'transparent' }}
                            />
                            <span className="text-sm font-medium text-slate-600 whitespace-nowrap">
                                {entry.value} <span className="text-slate-900 font-bold ml-1">Rp {formatShort(total)}</span>
                            </span>
                        </div>
                    )
                })}
            </div>
        );
    }

    return (
        <div className="w-full h-[350px] flex flex-col">
            <div className="flex flex-wrap justify-end gap-x-6 mb-4 shrink-0">
                {[{ name: 'Pemasukan', total: totalIncome, color: 'border-[#165DFF]' }, { name: 'Pengeluaran', total: totalExpense, color: 'border-[#F43F5E]' }].map((item, index) => (
                    <div key={index} className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full border-2 ${item.color}`} style={{ backgroundColor: 'transparent' }} />
                        <span className="text-sm font-medium text-slate-600 whitespace-nowrap">
                            {item.name} <span className="text-slate-900 font-bold ml-1">Rp {formatShort(item.total)}</span>
                        </span>
                    </div>
                ))}
            </div>
            
            <div className="flex-1 min-h-0 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                        data={data}
                        margin={{
                            top: 5,
                            right: 0,
                            bottom: 0,
                            left: -20, // Adjusted left margin to prevent Y-axis label clipping if needed, or stick to 0
                        }}
                    >
                        <defs>
                            <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#165DFF" stopOpacity={0.2}/>
                                <stop offset="95%" stopColor="#165DFF" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid vertical={false} stroke="#F3F4F3" strokeDasharray="3 3" />
                        <XAxis 
                            dataKey="name" 
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#64748B', fontSize: 12, fontWeight: 500 }}
                            dy={10}
                        />
                        <YAxis 
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#64748B', fontSize: 11 }}
                            tickFormatter={(value) => {
                                if (value >= 1000000000) return `${(value / 1000000000).toFixed(1)}M`
                                if (value >= 1000000) return `${(value / 1000000).toFixed(1)}jt`
                                if (value >= 1000) return `${(value / 1000).toFixed(0)}rb`
                                return value
                            }}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        
                        <Area 
                            type="monotone" 
                            dataKey="income" 
                            name="Pemasukan"
                            stroke="#165DFF" 
                            strokeWidth={3}
                            fillOpacity={1} 
                            fill="url(#colorIncome)" 
                        />

                        <Line 
                            type="monotone" 
                            dataKey="expense" 
                            name="Pengeluaran"
                            stroke="#F43F5E" 
                            strokeWidth={2}
                            dot={false}
                            activeDot={{ r: 6, fill: '#F43F5E', stroke: 'white', strokeWidth: 2 }}
                        />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </div>
    )
}

export default FinancialChart

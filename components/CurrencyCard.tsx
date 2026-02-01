'use client'
import { useEffect, useState } from 'react'
import { Banknote, RefreshCw, ArrowRightLeft, AlertCircle } from 'lucide-react'

export default function CurrencyCard() {
    const [rate, setRate] = useState<number | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(false)
    const [lastUpdate, setLastUpdate] = useState<string>('')

    const fetchRate = async () => {
        setLoading(true)
        setError(false)
        try {
            // Using Frankfurter API - more reliable and has CORS support
            const res = await fetch('https://api.frankfurter.app/latest?from=USD&to=IDR')
            if (!res.ok) throw new Error('API Error')

            const data = await res.json()
            // data format: { amount: 1, base: "USD", date: "2024-01-01", rates: { IDR: 16000 } }

            if (data.rates && data.rates.IDR) {
                setRate(data.rates.IDR)
                const now = new Date()
                const datePart = now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).toLowerCase()
                const timePart = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
                setLastUpdate(`${datePart}, pukul ${timePart}`)
            } else {
                throw new Error('Data format error')
            }
        } catch (err) {
            console.error('Failed to fetch currency:', err)
            setError(true)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchRate()
    }, [])

    return (
        <div className="glass shadow-premium-lg p-6 rounded-3xl border border-white/20 relative overflow-hidden flex flex-col justify-between group card-hover h-full backdrop-blur-xl">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-400/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

            <div className="flex justify-between items-start z-10 relative mb-4">
                <div className="flex items-center gap-3">
                    <div className="bg-emerald-50 p-2.5 rounded-xl text-emerald-600 ring-4 ring-emerald-50/50">
                        <Banknote className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Mata Uang</p>
                        <p className="text-slate-800 font-bold">Kurs USD</p>
                    </div>
                </div>
                <button
                    onClick={fetchRate}
                    disabled={loading}
                    className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 hover:text-blue-600 transition-colors disabled:opacity-50"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            <div className="z-10 relative flex-1 flex flex-col justify-end">
                {loading ? (
                    <div className="space-y-2">
                        <div className="h-4 w-12 bg-slate-100 rounded animate-pulse" />
                        <div className="h-8 w-32 bg-slate-100 rounded animate-pulse" />
                    </div>
                ) : error ? (
                    <div className="flex items-center gap-2 text-red-500 text-sm bg-red-50 p-3 rounded-xl border border-red-100">
                        <AlertCircle className="w-4 h-4" />
                        <span>Gagal memuat</span>
                    </div>
                ) : (
                    <div>
                        <div className="flex items-center gap-2 text-slate-500 font-medium text-xs mb-2">
                            <span className="bg-slate-100 px-2 py-1 rounded-md text-slate-600 font-bold">1 USD</span>
                            <ArrowRightLeft className="w-3 h-3 text-slate-300" />
                            <span className="bg-emerald-50 px-2 py-1 rounded-md text-emerald-700 font-bold">IDR</span>
                        </div>
                        <p className="text-3xl font-extrabold text-slate-800 tracking-tight">
                            Rp {rate && rate > 0 ? rate.toLocaleString('id-ID') : '-'}
                        </p>
                    </div>
                )}
            </div>

            <div className="mt-4 pt-3 flex justify-between items-center z-10 relative">
                <span className="text-[10px] text-slate-400 font-medium bg-slate-50 px-2 py-1 rounded-full">Update: {lastUpdate}</span>
                <span className="text-[10px] text-slate-400 font-medium">Frankfurter API</span>
            </div>
        </div>
    )
}

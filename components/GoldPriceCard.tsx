'use client'
import { useEffect, useState } from 'react'
import { TrendingUp, AlertCircle, RefreshCw, ArrowDownLeft, ArrowUpRight } from 'lucide-react'

export default function GoldPriceCard() {
    const [buyPrice, setBuyPrice] = useState<number | null>(null)
    const [sellPrice, setSellPrice] = useState<number | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(false)
    const [lastUpdate, setLastUpdate] = useState<string>('')

    const fetchGoldPrice = async () => {
        setLoading(true)
        setError(false)
        try {
            const res = await fetch('/api/gold-price')
            if (!res.ok) throw new Error('API Error')

            const data = await res.json()

            if (data.success) {
                setBuyPrice(data.buyPrice)
                setSellPrice(data.sellPrice)
                const now = new Date()
                const datePart = now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).toLowerCase()
                const timePart = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
                setLastUpdate(`${datePart}, pukul ${timePart}`)
            } else {
                throw new Error('Data format error')
            }
        } catch (err) {
            console.error('Failed to fetch gold price:', err)
            setError(true)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchGoldPrice()
    }, [])

    return (
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 relative overflow-hidden flex flex-col justify-between group hover:shadow-md transition-all h-full">
            <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-400/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

            <div className="flex justify-between items-start z-10 relative mb-4">
                <div className="flex items-center gap-3">
                    <div className="bg-yellow-50 p-2.5 rounded-xl text-yellow-600 ring-4 ring-yellow-50/50">
                        <TrendingUp className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Investasi</p>
                        <p className="text-slate-800 font-bold">Harga Emas</p>
                    </div>
                </div>
                <button
                    onClick={fetchGoldPrice}
                    disabled={loading}
                    className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 hover:text-blue-600 transition-colors disabled:opacity-50"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            <div className="z-10 relative flex-1 flex flex-col justify-end space-y-4">
                {loading ? (
                    <div className="space-y-3">
                        <div className="h-6 w-3/4 bg-slate-100 rounded animate-pulse" />
                        <div className="h-6 w-1/2 bg-slate-100 rounded animate-pulse" />
                    </div>
                ) : error ? (
                    <div className="flex items-center gap-2 text-red-500 text-sm bg-red-50 p-3 rounded-xl border border-red-100">
                        <AlertCircle className="w-4 h-4" />
                        <span>Gagal memuat data</span>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* Harga Beli */}
                        <div className="flex justify-between items-end border-b border-slate-50 pb-3">
                            <div className="flex items-center gap-2 text-slate-500 mb-1">
                                <span className="p-1 bg-green-50 rounded text-green-600"><ArrowDownLeft className="w-3 h-3" /></span>
                                <span className="text-xs font-medium">Beli</span>
                            </div>
                            <p className="text-xl font-bold text-slate-800 tracking-tight">
                                Rp {buyPrice?.toLocaleString('id-ID')}
                            </p>
                        </div>

                        {/* Harga Jual */}
                        <div className="flex justify-between items-end">
                            <div className="flex items-center gap-2 text-slate-500 mb-1">
                                <span className="p-1 bg-red-50 rounded text-red-600"><ArrowUpRight className="w-3 h-3" /></span>
                                <span className="text-xs font-medium">Jual</span>
                            </div>
                            <p className="text-lg font-bold text-slate-600 tracking-tight">
                                Rp {sellPrice?.toLocaleString('id-ID')}
                            </p>
                        </div>
                    </div>
                )}
            </div>

            <div className="mt-4 pt-3 flex justify-between items-center z-10 relative">
                <span className="text-[10px] text-slate-400 font-medium bg-slate-50 px-2 py-1 rounded-full">Update: {lastUpdate}</span>
                <span className="text-[10px] text-slate-400 font-medium">Antam</span>
            </div>
        </div>
    )
}

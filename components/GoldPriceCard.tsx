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
                setLastUpdate(new Date().toLocaleDateString('id-ID', { hour: '2-digit', minute: '2-digit' }))
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
        <div className="bg-gradient-to-br from-yellow-50 to-amber-50 p-6 rounded-3xl shadow-sm border border-yellow-100 relative overflow-hidden flex flex-col justify-between">
            <div className="flex justify-between items-start z-10 relative mb-4">
                <div className="flex items-center gap-2">
                    <div className="bg-yellow-100 p-2 rounded-lg text-yellow-600">
                        <TrendingUp className="w-5 h-5" />
                    </div>
                    <p className="text-yellow-800 font-bold">Harga Emas Antam</p>
                </div>
                <button
                    onClick={fetchGoldPrice}
                    disabled={loading}
                    className="p-1.5 hover:bg-yellow-200 rounded-full text-yellow-600 transition-colors disabled:opacity-50"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            <div className="z-10 relative flex-1 flex flex-col justify-center">
                {loading ? (
                    <div className="space-y-3">
                        <div className="h-6 w-3/4 bg-yellow-200/50 rounded animate-pulse" />
                        <div className="h-6 w-1/2 bg-yellow-200/50 rounded animate-pulse" />
                    </div>
                ) : error ? (
                    <div className="flex items-center gap-2 text-red-500 text-sm bg-red-50 p-2 rounded-lg">
                        <AlertCircle className="w-4 h-4" />
                        <span>Gagal memuat data</span>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* Harga Beli */}
                        <div>
                            <p className="text-xs font-semibold text-yellow-600/70 mb-1 flex items-center gap-1">
                                <ArrowDownLeft className="w-3 h-3" /> Harga Beli (Kita Beli)
                            </p>
                            <p className="text-2xl font-extrabold text-yellow-700 tracking-tight">
                                Rp {buyPrice?.toLocaleString('id-ID')}
                            </p>
                        </div>

                        {/* Harga Jual */}
                        <div>
                            <p className="text-xs font-semibold text-yellow-600/70 mb-1 flex items-center gap-1">
                                <ArrowUpRight className="w-3 h-3" /> Harga Jual (Kita Jual)
                            </p>
                            <p className="text-xl font-bold text-yellow-600/90 tracking-tight">
                                Rp {sellPrice?.toLocaleString('id-ID')}
                            </p>
                        </div>
                    </div>
                )}
            </div>

            <div className="mt-4 pt-3 border-t border-yellow-200/40 flex justify-between items-center z-10 relative">
                <span className="text-[10px] text-yellow-600/60 font-medium">Update: {lastUpdate}</span>
                <span className="text-[10px] text-yellow-600/60 font-medium">Lakuemas.com</span>
            </div>

            {/* Decorative Icon */}
            <div className="absolute -bottom-6 -right-6 text-yellow-100 opacity-50 z-0">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-40 h-40">
                    <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM12.75 6a.75.75 0 00-1.5 0v.816a3.836 3.836 0 00-1.72.756c-.712.566-1.112 1.35-1.112 2.178 0 .829.4 1.612 1.113 2.178.502.4 1.102.647 1.719.756v2.978a2.536 2.536 0 01-1.927-.286 5.919 5.919 0 01-1.131-1.042.75.75 0 00-1.173.908c.47.607 1.056 1.053 1.721 1.317V18a.75.75 0 001.5 0v-.816a3.836 3.836 0 001.72-.756c.712-.566 1.112-1.35 1.112-2.178 0-.829-.4-1.612-1.113-2.178a3.22 3.22 0 00-1.719-.756v-2.978a2.536 2.536 0 011.927.286c.411.216.792.566 1.131 1.042a.75.75 0 001.173-.908c-.47-.607-1.056-1.053-1.721-1.317V6z" clipRule="evenodd" />
                </svg>
            </div>
        </div>
    )
}

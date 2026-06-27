'use client'
import { useEffect, useState } from 'react'
import { TrendingUp, AlertCircle, RefreshCw, ArrowDownLeft, ArrowUpRight } from 'lucide-react'

export default function GoldPriceCard() {
    const [buyPrice, setBuyPrice] = useState<number | null>(null)
    const [sellPrice, setSellPrice] = useState<number | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(false)
    const [lastUpdate, setLastUpdate] = useState<string>('')

    const CACHE_KEY = 'gold_price_cache'
    const CACHE_DURATION = 4 * 60 * 60 * 1000 // 4 hours

    const fetchGoldPrice = async (force = false) => {
        setLoading(true)
        setError(false)

        // 1. Try Load from Cache
        if (!force) {
            const cached = localStorage.getItem(CACHE_KEY)
            if (cached) {
                const { buyPrice, sellPrice, lastUpdate, timestamp } = JSON.parse(cached)
                const age = Date.now() - timestamp

                if (age < CACHE_DURATION) {
                    setBuyPrice(buyPrice)
                    setSellPrice(sellPrice)
                    setLastUpdate(lastUpdate)
                    setLoading(false)
                    return // EXIT NO FETCH
                }
            }
        }

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
                const newLastUpdate = `${datePart}, pukul ${timePart}`

                setLastUpdate(newLastUpdate)

                // Save to Cache
                localStorage.setItem(CACHE_KEY, JSON.stringify({
                    buyPrice: data.buyPrice,
                    sellPrice: data.sellPrice,
                    lastUpdate: newLastUpdate,
                    timestamp: Date.now()
                }))
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
        <div className="brutal-card p-6 bg-[var(--bg-card)] relative overflow-hidden flex flex-col justify-between group h-full">
            <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-400/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

            <div className="flex justify-between items-start z-10 relative mb-4">
                <div className="flex items-center gap-3">
                    <div className="bg-[var(--neo-yellow-vivid)] border-[2.5px] border-[var(--neo-ink)] shadow-[2px_2px_0_var(--neo-ink)] p-2.5 rounded-[10px] text-[var(--neo-ink)]">
                        <TrendingUp className="w-5 h-5 stroke-[2.5px]" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-[var(--text-primary)] uppercase tracking-widest opacity-80">Investasi</p>
                        <p className="text-[var(--text-primary)] font-black text-lg leading-tight mt-0.5">Harga Emas</p>
                    </div>
                </div>
                <button
                    onClick={() => fetchGoldPrice(true)}
                    disabled={loading}
                    className="p-2 brutal-btn bg-white text-[var(--neo-ink)] disabled:opacity-50"
                >
                    <RefreshCw className={`w-4 h-4 stroke-[3px] ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            <div className="z-10 relative flex-1 flex flex-col justify-end space-y-4">
                {loading ? (
                    <div className="space-y-3">
                        <div className="h-6 w-3/4 bg-slate-100 dark:bg-[var(--bg-hover)] rounded animate-pulse" />
                        <div className="h-6 w-1/2 bg-slate-100 dark:bg-[var(--bg-hover)] rounded animate-pulse" />
                    </div>
                ) : error ? (
                    <div className="flex items-center gap-2 text-red-500 text-sm bg-red-50 dark:bg-red-950/30 p-3 rounded-xl border border-red-100">
                        <AlertCircle className="w-4 h-4" />
                        <span>Gagal memuat data</span>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* Harga Beli */}
                        <div className="flex justify-between items-end border-b border-slate-50 pb-3">
                            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-1">
                                <span className="p-1 bg-emerald-300 border-2 border-[var(--neo-ink)] rounded-[6px] text-[var(--neo-ink)]"><ArrowDownLeft className="w-3 h-3 stroke-[3px]" /></span>
                                <span className="text-xs font-black text-[var(--text-primary)]">Beli</span>
                            </div>
                            <p className="text-xl font-black text-[var(--text-primary)] tracking-tight">
                                Rp {buyPrice && buyPrice > 0 ? buyPrice.toLocaleString('id-ID') : '-'}
                            </p>
                        </div>

                        {/* Harga Jual */}
                        <div className="flex justify-between items-end">
                            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-1">
                                <span className="p-1 bg-rose-300 border-2 border-[var(--neo-ink)] rounded-[6px] text-[var(--neo-ink)]"><ArrowUpRight className="w-3 h-3 stroke-[3px]" /></span>
                                <span className="text-xs font-black text-[var(--text-primary)]">Jual</span>
                            </div>
                            <p className="text-lg font-black text-[var(--text-primary)] tracking-tight opacity-70">
                                Rp {sellPrice && sellPrice > 0 ? sellPrice.toLocaleString('id-ID') : '-'}
                            </p>
                        </div>
                    </div>
                )}
            </div>

            <div className="mt-4 pt-3 flex justify-between items-center z-10 relative">
                <span className="text-[10px] text-[var(--text-primary)] font-black uppercase tracking-wider border-2 border-dashed border-[var(--neo-ink)] px-2 py-1 rounded-[6px]">Update: {lastUpdate}</span>
                <span className="text-[10px] text-[var(--text-primary)] font-black uppercase tracking-wider">Antam</span>
            </div>
        </div>
    )
}

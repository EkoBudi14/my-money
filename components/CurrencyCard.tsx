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
        <div className="brutal-card p-6 bg-[var(--bg-card)] relative overflow-hidden flex flex-col justify-between group h-full">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-400/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

            <div className="flex justify-between items-start z-10 relative mb-4">
                <div className="flex items-center gap-3">
                    <div className="bg-[var(--neo-yellow-vivid)] border-[2.5px] border-[var(--neo-ink)] shadow-[2px_2px_0_var(--neo-ink)] p-2.5 rounded-[10px] text-[var(--neo-ink)]">
                        <Banknote className="w-5 h-5 stroke-[2.5px]" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-[var(--text-primary)] uppercase tracking-widest opacity-80">Mata Uang</p>
                        <p className="text-[var(--text-primary)] font-black text-lg leading-tight mt-0.5">Kurs USD</p>
                    </div>
                </div>
                <button
                    onClick={fetchRate}
                    disabled={loading}
                    className="p-2 brutal-btn bg-white text-[var(--neo-ink)] disabled:opacity-50"
                >
                    <RefreshCw className={`w-4 h-4 stroke-[3px] ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            <div className="z-10 relative flex-1 flex flex-col justify-end">
                {loading ? (
                    <div className="space-y-2">
                        <div className="h-4 w-12 bg-slate-100 dark:bg-[var(--bg-hover)] rounded animate-pulse" />
                        <div className="h-8 w-32 bg-slate-100 dark:bg-[var(--bg-hover)] rounded animate-pulse" />
                    </div>
                ) : error ? (
                    <div className="flex items-center gap-2 text-[var(--neo-ink)] text-sm font-black bg-rose-300 p-3 rounded-[10px] border-2 border-[var(--neo-ink)]">
                        <AlertCircle className="w-5 h-5 stroke-[2.5px]" />
                        <span>Gagal memuat</span>
                    </div>
                ) : (
                    <div>
                        <div className="flex items-center gap-2 text-[var(--text-primary)] font-black text-xs mb-2">
                            <span className="bg-white px-2 py-1 rounded-[6px] border-2 border-[var(--neo-ink)]">1 USD</span>
                            <ArrowRightLeft className="w-3 h-3 text-[var(--text-primary)] stroke-[3px]" />
                            <span className="bg-emerald-300 px-2 py-1 rounded-[6px] border-2 border-[var(--neo-ink)] text-[var(--neo-ink)]">IDR</span>
                        </div>
                        <p className="text-3xl font-black text-[var(--text-primary)] tracking-tight">
                            Rp {rate && rate > 0 ? rate.toLocaleString('id-ID') : '-'}
                        </p>
                    </div>
                )}
            </div>

            <div className="mt-4 pt-3 flex justify-between items-center z-10 relative">
                <span className="text-[10px] text-[var(--text-primary)] font-black uppercase tracking-wider border-2 border-dashed border-[var(--neo-ink)] px-2 py-1 rounded-[6px]">Update: {lastUpdate}</span>
                <span className="text-[10px] text-[var(--text-primary)] font-black uppercase tracking-wider">Frankfurter API</span>
            </div>
        </div>
    )
}

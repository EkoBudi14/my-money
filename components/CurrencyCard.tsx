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
            const res = await fetch('https://api.frankfurter.app/latest?from=USD&to=IDR')
            if (!res.ok) throw new Error('API Error')

            const data = await res.json()
            // data format: { amount: 1, base: 'USD', date: '...', rates: { IDR: 16000 } }

            if (data.rates && data.rates.IDR) {
                setRate(data.rates.IDR)
                setLastUpdate(new Date().toLocaleDateString('id-ID', { hour: '2-digit', minute: '2-digit' }))
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
        <div className="bg-gradient-to-br from-emerald-50 to-green-50 p-6 rounded-3xl shadow-sm border border-emerald-100 relative overflow-hidden flex flex-col justify-between">
            <div className="flex justify-between items-start z-10 relative mb-4">
                <div className="flex items-center gap-2">
                    <div className="bg-emerald-100 p-2 rounded-lg text-emerald-600">
                        <Banknote className="w-5 h-5" />
                    </div>
                    <p className="text-emerald-800 font-bold">Kurs USD ke IDR</p>
                </div>
                <button
                    onClick={fetchRate}
                    disabled={loading}
                    className="p-1.5 hover:bg-emerald-200 rounded-full text-emerald-600 transition-colors disabled:opacity-50"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            <div className="z-10 relative flex-1 flex flex-col justify-center">
                {loading ? (
                    <div className="space-y-2">
                        <div className="h-4 w-12 bg-emerald-200/50 rounded animate-pulse" />
                        <div className="h-8 w-32 bg-emerald-200/50 rounded animate-pulse" />
                    </div>
                ) : error ? (
                    <div className="flex items-center gap-2 text-red-500 text-sm bg-red-50 p-2 rounded-lg">
                        <AlertCircle className="w-4 h-4" />
                        <span>Gagal memuat</span>
                    </div>
                ) : (
                    <div>
                        <div className="flex items-center gap-2 text-emerald-600/70 font-semibold text-sm mb-1">
                            <span>1 USD</span>
                            <ArrowRightLeft className="w-3 h-3" />
                            <span>IDR (Rupiah)</span>
                        </div>
                        <p className="text-3xl font-extrabold text-emerald-700 tracking-tight">
                            Rp {rate?.toLocaleString('id-ID')}
                        </p>
                    </div>
                )}
            </div>

            <div className="mt-4 pt-3 border-t border-emerald-200/40 flex justify-between items-center z-10 relative">
                <span className="text-[10px] text-emerald-600/60 font-medium">Update: {lastUpdate}</span>
                <span className="text-[10px] text-emerald-600/60 font-medium">Frankfurter API</span>
            </div>

            {/* Decorative Icon */}
            <div className="absolute -bottom-6 -right-6 text-emerald-100 opacity-50 z-0">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-40 h-40">
                    <path d="M10.464 8.746c.227-.18.497-.311.786-.394v2.795a2.252 2.252 0 01-.786-.393c-.394-.313-.546-.681-.546-1.004 0-.324.152-.691.546-1.004zM12.75 15.662v-2.824c.347.085.664.228.921.421.427.326.579.687.579.991 0 .305-.152.665-.579.991a2.534 2.534 0 01-.921.42z" />
                    <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM12.75 6a.75.75 0 00-1.5 0v.816a3.836 3.836 0 00-1.72.756c-.712.566-1.112 1.35-1.112 2.178 0 .829.4 1.612 1.113 2.178.502.4 1.102.647 1.719.756v2.978a2.536 2.536 0 01-1.927-.286 5.919 5.919 0 01-1.131-1.042.75.75 0 00-1.173.908c.47.607 1.056 1.053 1.721 1.317V18a.75.75 0 001.5 0v-.816a3.836 3.836 0 001.72-.756c.712-.566 1.112-1.35 1.112-2.178 0-.829-.4-1.612-1.113-2.178a3.22 3.22 0 00-1.719-.756v-2.978a2.536 2.536 0 011.927.286c.411.216.792.566 1.131 1.042a.75.75 0 001.173-.908c-.47-.607-1.056-1.053-1.721-1.317V6z" clipRule="evenodd" />
                </svg>
            </div>
        </div>
    )
}

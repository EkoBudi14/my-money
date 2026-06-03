'use client'

import { useEffect, useState } from 'react'
import { PackageCheck } from 'lucide-react'

export default function SplashScreen() {
    const [show, setShow] = useState(true)
    const [isFading, setIsFading] = useState(false)

    useEffect(() => {
        // Wait for 1.5s, then start fading out
        const fadeTimer = setTimeout(() => {
            setIsFading(true)
        }, 1500)

        // After 500ms fade animation, remove completely
        const hideTimer = setTimeout(() => {
            setShow(false)
        }, 2000)

        return () => {
            clearTimeout(fadeTimer)
            clearTimeout(hideTimer)
        }
    }, [])

    if (!show) return null

    return (
        <div
            className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[var(--bg-card)] transition-opacity duration-500 ease-in-out ${isFading ? 'opacity-0' : 'opacity-100'}`}
        >
            <div className="flex flex-col items-center justify-center animate-in zoom-in-90 fade-in duration-700">
                <div className="w-20 h-20 bg-[var(--primary)] rounded-3xl flex items-center justify-center shadow-2xl shadow-[var(--primary)]/30 mb-6">
                    <PackageCheck className="w-10 h-10 text-white" strokeWidth={2.5} />
                </div>
                <h1 className="font-bold text-3xl text-[var(--text-primary)] tracking-tight">CatatDuit</h1>
                <p className="text-[var(--text-secondary)] font-medium mt-2 animate-pulse">Menyiapkan data...</p>
            </div>
        </div>
    )
}

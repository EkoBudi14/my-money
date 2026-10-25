'use client'

import { useEffect, useRef, useState } from 'react'
import Lottie, { type LottieRefCurrentProps } from 'lottie-react'
import { Banknote } from 'lucide-react'
import animationData from '@/img/money-stack.json'

// Durasi splash tampil sebelum mulai fade-out (ms)
const DISPLAY_MS = 2400
// Durasi animasi fade-out (ms) — harus sama dengan duration-500 di className
const FADE_MS = 500

export default function SplashScreen() {
    // show di-set true agar splash langsung menutup layar pada paint pertama
    // (hindari flash konten aplikasi sebelum splash muncul / FOUC).
    const [show, setShow] = useState(true)
    const [isFading, setIsFading] = useState(false)
    // Lottie butuh window — render hanya setelah mount di client.
    const [mounted, setMounted] = useState(false)
    // Fallback icon tampil sampai Lottie selesai load (onDOMLoaded).
    const [lottieReady, setLottieReady] = useState(false)
    const lottieRef = useRef<LottieRefCurrentProps>(null)

    useEffect(() => {
        setMounted(true)

        // Jika splash sudah tampil di sesi ini, langsung skip tanpa animasi.
        if (sessionStorage.getItem('splashShown')) {
            setShow(false)
            return
        }
        sessionStorage.setItem('splashShown', '1')

        const fadeTimer = setTimeout(() => setIsFading(true), DISPLAY_MS)
        const hideTimer = setTimeout(() => setShow(false), DISPLAY_MS + FADE_MS)

        return () => {
            clearTimeout(fadeTimer)
            clearTimeout(hideTimer)
        }
    }, [])

    if (!show) return null

    return (
        <div
            className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[var(--bg-page)] transition-opacity ease-in-out ${isFading ? 'opacity-0' : 'opacity-100'}`}
            style={{ transitionDuration: `${FADE_MS}ms` }}
        >
            <div className="flex flex-col items-center justify-center px-8 animate-in fade-in zoom-in-95 duration-700">
                <div className="relative w-48 h-48 flex items-center justify-center">
                    {/* Fallback: tampil sebelum Lottie mount / jika Lottie gagal render */}
                    {!lottieReady && (
                        <Banknote
                            className="absolute w-20 h-20 text-[var(--primary)] animate-pulse"
                            strokeWidth={1.75}
                        />
                    )}
                    {mounted && (
                        <Lottie
                            lottieRef={lottieRef}
                            animationData={animationData}
                            loop
                            autoplay
                            onDOMLoaded={() => setLottieReady(true)}
                            // Loop hanya segmen saat uang tampil (frame 12–58).
                            // Di luar itu uang jatuh dari atas / keluar bawah = frame kosong.
                            initialSegment={[12, 58]}
                            className="relative w-full h-full"
                            rendererSettings={{ preserveAspectRatio: 'xMidYMid meet' }}
                        />
                    )}
                </div>

                <h1 className="font-bold text-3xl text-[var(--text-primary)] tracking-tight mt-2">
                    CatatDuit
                </h1>
                <p className="text-[var(--text-secondary)] font-medium mt-2 text-sm">
                    Kelola keuangan jadi gampang
                </p>

                {/* Indikator loading bertitik */}
                <div className="flex items-center gap-1.5 mt-6" aria-hidden>
                    <span className="w-2 h-2 rounded-full bg-[var(--primary)] animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-2 h-2 rounded-full bg-[var(--primary)] animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-2 h-2 rounded-full bg-[var(--primary)] animate-bounce" />
                </div>
            </div>
        </div>
    )
}

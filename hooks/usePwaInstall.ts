'use client'
import { useState, useEffect } from 'react'

export function usePwaInstall() {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
    const [isIOS, setIsIOS] = useState(false)
    const [isStandalone, setIsStandalone] = useState(false)
    const [isMobile, setIsMobile] = useState(false)

    useEffect(() => {
        // Detect if already installed
        const stnd = window.matchMedia('(display-mode: standalone)').matches || 
            // @ts-ignore
            window.navigator.standalone === true
        setIsStandalone(stnd)

        // Detect mobile
        const userAgent = window.navigator.userAgent.toLowerCase()
        const mobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent)
        setIsMobile(mobile)

        // Detect iOS (Apple doesn't support beforeinstallprompt)
        const ios = /iphone|ipad|ipod/.test(userAgent)
        setIsIOS(ios)

        // Handle install prompt for Android/Desktop
        const handleBeforeInstallPrompt = (e: any) => {
            e.preventDefault()
            setDeferredPrompt(e)
        }

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
        }
    }, [])

    const installPwa = async () => {
        if (!deferredPrompt) return

        deferredPrompt.prompt()
        const { outcome } = await deferredPrompt.userChoice
        
        if (outcome === 'accepted') {
            setDeferredPrompt(null)
        }
    }

    return {
        isPwaInstallable: !isStandalone && isMobile && (!!deferredPrompt || isIOS),
        isIOS,
        installPwa
    }
}

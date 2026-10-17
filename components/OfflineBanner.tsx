'use client'

import { useEffect, useState } from 'react'
import { WifiOff } from 'lucide-react'

/** Sticky banner while the device is offline (DESIGN-TAMBAHAN §10, PolaState §3). */
export default function OfflineBanner() {
  const [offline, setOffline] = useState(false)
  const [since, setSince] = useState<string>('')

  useEffect(() => {
    const update = () => {
      const off = !navigator.onLine
      setOffline(off)
      if (off) setSince(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace(':', '.'))
    }
    update()
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update) }
  }, [])

  if (!offline) return null
  return (
    <div className="cd offline-bar" role="status" aria-live="polite">
      <WifiOff className="i i-s" />
      <span><b>Kamu sedang offline.</b> Data terakhir diperbarui {since}. Perubahan belum bisa disimpan.</span>
    </div>
  )
}

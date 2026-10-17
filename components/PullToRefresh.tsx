'use client'

import { useEffect, useRef, useState } from 'react'
import { RotateCw } from 'lucide-react'

const THRESHOLD = 70
const MAX = 110

/**
 * Pull-to-refresh for the HP layout (DESIGN.md 0.5: "tarik-untuk-refresh (HP)").
 * Starts only when the page is scrolled to the top; touch-only, so the web layout is unaffected.
 */
export default function PullToRefresh({ onRefresh, disabled = false }: { onRefresh: () => Promise<void> | void; disabled?: boolean }) {
  const [pull, setPull] = useState(0)
  const [busy, setBusy] = useState(false)
  const startY = useRef<number | null>(null)
  const pullRef = useRef(0)
  const busyRef = useRef(false)
  const refreshRef = useRef(onRefresh)
  refreshRef.current = onRefresh

  useEffect(() => {
    if (disabled) return
    const onStart = (e: TouchEvent) => {
      if (busyRef.current || window.scrollY > 0 || e.touches.length !== 1) { startY.current = null; return }
      // Ignore pulls that begin inside an open sheet / modal.
      if ((e.target as HTMLElement | null)?.closest?.('.sheet, [role="dialog"]')) { startY.current = null; return }
      startY.current = e.touches[0].clientY
    }
    const onMove = (e: TouchEvent) => {
      if (startY.current === null) return
      const dy = e.touches[0].clientY - startY.current
      if (dy <= 0 || window.scrollY > 0) { pullRef.current = 0; setPull(0); return }
      const v = Math.min(MAX, dy * 0.5)
      pullRef.current = v
      setPull(v)
    }
    const onEnd = async () => {
      if (startY.current === null) return
      startY.current = null
      const v = pullRef.current
      pullRef.current = 0
      if (v >= THRESHOLD) {
        busyRef.current = true
        setBusy(true)
        setPull(THRESHOLD * 0.7)
        try { await refreshRef.current() } finally {
          busyRef.current = false
          setBusy(false)
          setPull(0)
        }
      } else {
        setPull(0)
      }
    }
    window.addEventListener('touchstart', onStart, { passive: true })
    window.addEventListener('touchmove', onMove, { passive: true })
    window.addEventListener('touchend', onEnd)
    return () => {
      window.removeEventListener('touchstart', onStart)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onEnd)
    }
  }, [disabled])

  if (pull === 0 && !busy) return null
  const ready = pull >= THRESHOLD || busy
  return (
    <div className="ptr" style={{ height: pull }} aria-live="polite">
      <div className="ptr-dot" style={{ transform: `rotate(${pull * 3}deg)`, opacity: Math.min(1, pull / THRESHOLD) }}>
        <RotateCw className={`i i-s ${busy ? 'animate-spin' : ''}`} />
      </div>
      <span className="lbl">{busy ? 'Memuat ulang…' : ready ? 'Lepas untuk muat ulang' : 'Tarik untuk muat ulang'}</span>
    </div>
  )
}

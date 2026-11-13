'use client'

import { useEffect, useRef, useState } from 'react'

// Rolls a number from its last shown value to the new one (first mount: from 0).
// Respects prefers-reduced-motion by jumping straight to the value.
export default function CountUp({
  value,
  format,
  duration = 1100,
  round = true,
}: {
  value: number
  format: (n: number) => string
  duration?: number
  /** false = pass the raw in-between value to format (e.g. for "12.5%") */
  round?: boolean
}) {
  const [shown, setShown] = useState(0)
  const fromRef = useRef(0)

  useEffect(() => {
    const from = fromRef.current
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce || from === value) {
      fromRef.current = value
      setShown(value)
      return
    }
    let raf = 0
    // Clock starts on the first painted frame, so mount work can't eat the start.
    let start = -1
    const tick = (now: number) => {
      if (start < 0) start = now
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 4) // easeOutQuart
      const cur = t >= 1 ? value : from + (value - from) * eased
      fromRef.current = cur
      setShown(cur)
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value, duration])

  return <span style={{ fontVariantNumeric: 'tabular-nums' }}>{format(round ? Math.round(shown) : shown)}</span>
}

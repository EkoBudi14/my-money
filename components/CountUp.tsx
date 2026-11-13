'use client'

import { useEffect, useRef, useState } from 'react'

// Rolls a number from its last shown value to the new one (first mount: from 0).
// Respects prefers-reduced-motion by jumping straight to the value.
export default function CountUp({
  value,
  format,
  duration = 1100,
}: {
  value: number
  format: (n: number) => string
  duration?: number
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
    const start = performance.now()
    const tick = (now: number) => {
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

  return <span style={{ fontVariantNumeric: 'tabular-nums' }}>{format(Math.round(shown))}</span>
}

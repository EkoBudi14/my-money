'use client'
import { useEffect, useState } from 'react'

/** true when the viewport is >= minWidth (default 768px = web layout, DESIGN.md 3). */
export function useIsWeb(minWidth = 768) {
  const [isWeb, setIsWeb] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${minWidth}px)`)
    const update = () => setIsWeb(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [minWidth])
  return isWeb
}

'use client'

import { useEffect } from 'react'
import { Badge } from '@/lib/insights'

const SPARK_COLORS = ['#F59E0B', '#14B8A6', '#EC4899', '#84CC16', '#8B5CF6', '#F97316']

/**
 * "Badge kebuka" celebration. Pure CSS (a bouncing emoji plus 12 sparks that
 * fly out with transform/opacity), so it adds no library and no JS animation
 * loop. Closes on tap, Esc, or after 4 seconds.
 */
export default function BadgeBurst({ badge, onClose }: { badge: Badge; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000)
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => { clearTimeout(t); window.removeEventListener('keydown', onKey) }
  }, [onClose])

  return (
    <div className="cd ins-burst" role="dialog" aria-modal="true" aria-label={`Badge ${badge.title} kebuka`} onClick={onClose}>
      <div className="ins-burst-card">
        <div style={{ position: 'relative' }}>
          {Array.from({ length: 12 }, (_, i) => (
            <span
              key={i}
              className="ins-spark"
              aria-hidden
              style={{ ['--a' as string]: `${i * 30}deg`, background: SPARK_COLORS[i % SPARK_COLORS.length] }}
            />
          ))}
          <div className="ins-burst-em" aria-hidden>{badge.emoji}</div>
        </div>
        <span className="lbl" style={{ fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase' }}>Badge baru kebuka</span>
        <h2 className="h2" style={{ fontSize: 20 }}>{badge.title}</h2>
        <p className="sub">{badge.desc}</p>
        <button className="btn btn-block" style={{ marginTop: 6 }} onClick={onClose}>Mantap</button>
      </div>
    </div>
  )
}

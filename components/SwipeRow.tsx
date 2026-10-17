'use client'

import { useRef, useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'

const ACTIONS_W = 144

/**
 * Transaction row for the HP Riwayat list (DESIGN.md 7.3).
 * Tap = open edit. Swipe left = reveal Ubah / Hapus.
 */
export default function SwipeRow({
  children,
  label,
  onEdit,
  onDelete,
}: {
  children: React.ReactNode
  label: string
  onEdit: () => void
  onDelete: () => void
}) {
  const [offset, setOffset] = useState(0)
  const [dragging, setDragging] = useState(false)
  const start = useRef<{ x: number; y: number; base: number } | null>(null)
  const moved = useRef(false)
  const horizontal = useRef<boolean | null>(null)

  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0]
    start.current = { x: t.clientX, y: t.clientY, base: offset }
    moved.current = false
    horizontal.current = null
    setDragging(true)
  }

  const onTouchMove = (e: React.TouchEvent) => {
    if (!start.current) return
    const t = e.touches[0]
    const dx = t.clientX - start.current.x
    const dy = t.clientY - start.current.y
    if (horizontal.current === null && (Math.abs(dx) > 6 || Math.abs(dy) > 6)) {
      horizontal.current = Math.abs(dx) > Math.abs(dy)
    }
    if (!horizontal.current) return
    moved.current = true
    setOffset(Math.max(-ACTIONS_W, Math.min(0, start.current.base + dx)))
  }

  const onTouchEnd = () => {
    setDragging(false)
    if (moved.current) setOffset(o => (o < -ACTIONS_W / 2 ? -ACTIONS_W : 0))
    start.current = null
  }

  const handleClick = () => {
    if (moved.current) { moved.current = false; return }
    if (offset !== 0) { setOffset(0); return }
    onEdit()
  }

  return (
    <div className="swipe">
      <div className="swipe-actions" aria-hidden={offset === 0} style={{ visibility: offset === 0 && !dragging ? 'hidden' : 'visible' }}>
        <button type="button" className="swipe-edit" tabIndex={offset === 0 ? -1 : 0} onClick={() => { setOffset(0); onEdit() }}><Pencil className="i i-s" />Ubah</button>
        <button type="button" className="swipe-del" tabIndex={offset === 0 ? -1 : 0} onClick={() => { setOffset(0); onDelete() }}><Trash2 className="i i-s" />Hapus</button>
      </div>
      <button
        type="button"
        className="row rowbtn swipe-front"
        aria-label={`Ubah ${label}`}
        style={{ transform: `translateX(${offset}px)`, transition: dragging ? 'none' : 'transform 180ms cubic-bezier(.2,.8,.2,1)' }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onClick={handleClick}
      >
        {children}
      </button>
    </div>
  )
}

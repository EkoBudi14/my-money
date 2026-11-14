'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useQueryClient } from '@tanstack/react-query'
import { Plus, Check, Settings2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { qk } from '@/hooks/useAppData'
import { useToast } from '@/hooks/useToast'
import { TAG_COLOR_KEYS, tagClass } from '@/lib/tags'
import { Tag } from '@/types'

/**
 * Label chips for the transaction form. Tap to toggle; "Label baru" creates a
 * label inline (random color, editable later on /tags) and selects it.
 */
export default function TagPicker({
  tags,
  value,
  onChange,
}: {
  tags: Tag[]
  value: number[]
  onChange: (ids: number[]) => void
}) {
  const qc = useQueryClient()
  const { showToast } = useToast()
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)

  const toggle = (id: number) => onChange(value.includes(id) ? value.filter(x => x !== id) : [...value, id])

  const create = async () => {
    const n = name.trim()
    if (!n || busy) return
    const existing = tags.find(t => t.name.toLowerCase() === n.toLowerCase())
    if (existing) {
      if (!value.includes(existing.id)) onChange([...value, existing.id])
      setName(''); setAdding(false)
      return
    }
    setBusy(true)
    const color = TAG_COLOR_KEYS[tags.length % TAG_COLOR_KEYS.length]
    const { data, error } = await supabase.from('tags').insert({ name: n, color }).select().single()
    setBusy(false)
    if (error || !data) { showToast('error', 'Label gagal dibuat. Coba lagi.'); return }
    qc.setQueryData<Tag[] | null>(qk.tags, prev => [...(prev ?? []), data as Tag])
    onChange([...value, (data as Tag).id])
    setName(''); setAdding(false)
  }

  return (
    <div className="field">
      <div className="between"><span>Label</span><span className="lbl" style={{ fontWeight: 500 }}>Opsional, bisa lebih dari satu</span></div>
      <div className="chips">
        {tags.map(t => {
          const on = value.includes(t.id)
          return (
            <button
              key={t.id}
              type="button"
              className={`tagc ${on ? `on ${tagClass(t)}` : 'off'}`}
              aria-pressed={on}
              onClick={() => toggle(t.id)}
            >
              {on ? <Check className="i i-s" style={{ width: 14, height: 14 }} /> : t.emoji ? <span aria-hidden>{t.emoji}</span> : null}
              {t.name}
            </button>
          )
        })}
        {adding ? (
          <div className="hstack" style={{ gap: 6, flex: '1 1 200px' }}>
            <input
              className="input"
              style={{ height: 36 }}
              autoFocus
              placeholder="Liburan Bali"
              value={name}
              maxLength={40}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') { e.preventDefault(); create() }
                if (e.key === 'Escape') { e.stopPropagation(); setAdding(false); setName('') }
              }}
            />
            <button type="button" className="btn" style={{ height: 36, fontSize: 13, padding: '0 12px' }} disabled={!name.trim() || busy} onClick={create}>Tambah</button>
          </div>
        ) : (
          <button type="button" className="tagc off" style={{ borderStyle: 'dashed' }} onClick={() => setAdding(true)}>
            <Plus className="i i-s" style={{ width: 14, height: 14 }} />Label baru
          </button>
        )}
        {tags.length > 0 && !adding && (
          <Link href="/tags" className="tagc off" style={{ textDecoration: 'none' }} aria-label="Kelola label">
            <Settings2 className="i i-s" style={{ width: 14, height: 14 }} />
          </Link>
        )}
      </div>
    </div>
  )
}

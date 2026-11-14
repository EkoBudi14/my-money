'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, Plus, Tag as TagIcon, X, Pencil, Trash2, ArrowRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useTags, useTransactions, useInvalidate, qk } from '@/hooks/useAppData'
import { useToast } from '@/hooks/useToast'
import { useConfirm } from '@/hooks/useConfirm'
import { useIsWeb } from '@/hooks/useIsWeb'
import { SkeletonCards } from '@/components/Skeleton'
import EmptyState from '@/components/EmptyState'
import FieldError from '@/components/FieldError'
import CountUp from '@/components/CountUp'
import { TAG_COLORS, TAG_COLOR_KEYS, TAG_EMOJI_PRESETS, tagClass } from '@/lib/tags'
import { isExpense, isIncome, txDate, rp } from '@/lib/insights'
import { Tag, Transaction } from '@/types'

interface TagStats {
  out: number
  in: number
  count: number
  first: Date | null
  last: Date | null
  cats: { name: string; amount: number }[]
  recent: Transaction[]
}

const shortDate = (d: Date) => d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })

export default function TagsPage() {
  const router = useRouter()
  const isWeb = useIsWeb()
  const qc = useQueryClient()
  const invalidate = useInvalidate()
  const { showToast } = useToast()
  const { showConfirm } = useConfirm()
  const tagsQuery = useTags()
  const txQuery = useTransactions()
  const tags = tagsQuery.data
  const supported = tags !== null
  const transactions = useMemo(() => txQuery.data ?? [], [txQuery.data])
  const loading = tagsQuery.isLoading || txQuery.isLoading

  // Form sheet state
  const [form, setForm] = useState<{ id: number | null; name: string; emoji: string; color: string } | null>(null)
  const [formErr, setFormErr] = useState('')
  const [saving, setSaving] = useState(false)
  const [detailId, setDetailId] = useState<number | null>(null)

  // One pass over all transactions builds the stats for every label.
  const stats = useMemo(() => {
    const map = new Map<number, TagStats & { catMap: Map<string, number> }>()
    for (const t of transactions) {
      if (!t.tag_ids?.length) continue
      for (const id of t.tag_ids) {
        let s = map.get(id)
        if (!s) { s = { out: 0, in: 0, count: 0, first: null, last: null, cats: [], recent: [], catMap: new Map() }; map.set(id, s) }
        const d = txDate(t)
        s.count++
        if (!s.first || d < s.first) s.first = d
        if (!s.last || d > s.last) s.last = d
        if (isExpense(t)) { s.out += t.amount; s.catMap.set(t.category, (s.catMap.get(t.category) ?? 0) + t.amount) }
        else if (isIncome(t)) s.in += t.amount
        s.recent.push(t)
      }
    }
    for (const s of map.values()) {
      s.cats = [...s.catMap.entries()].map(([name, amount]) => ({ name, amount })).sort((a, b) => b.amount - a.amount)
      s.recent.sort((a, b) => txDate(b).getTime() - txDate(a).getTime())
    }
    return map
  }, [transactions])

  const emptyStats: TagStats = { out: 0, in: 0, count: 0, first: null, last: null, cats: [], recent: [] }
  const statsOf = (id: number): TagStats => stats.get(id) ?? emptyStats
  const list = useMemo(() => tags ?? [], [tags])
  const sorted = useMemo(() => [...list].sort((a, b) => (stats.get(b.id)?.last?.getTime() ?? 0) - (stats.get(a.id)?.last?.getTime() ?? 0)), [list, stats])
  const detail = detailId != null ? list.find(t => t.id === detailId) : undefined

  const openCreate = () => { setFormErr(''); setForm({ id: null, name: '', emoji: '', color: TAG_COLOR_KEYS[list.length % TAG_COLOR_KEYS.length] }) }
  const openEdit = (t: Tag) => { setFormErr(''); setDetailId(null); setForm({ id: t.id, name: t.name, emoji: t.emoji ?? '', color: t.color }) }

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form || saving) return
    const name = form.name.trim()
    if (!name) { setFormErr('Isi nama label.'); return }
    if (list.some(t => t.id !== form.id && t.name.toLowerCase() === name.toLowerCase())) { setFormErr('Nama label ini sudah dipakai.'); return }
    setSaving(true)
    const payload = { name, emoji: form.emoji.trim() || null, color: form.color }
    const { error } = form.id
      ? await supabase.from('tags').update(payload).eq('id', form.id)
      : await supabase.from('tags').insert(payload)
    setSaving(false)
    if (error) { showToast('error', 'Label gagal disimpan. Coba lagi.'); return }
    showToast('success', form.id ? 'Perubahan tersimpan' : 'Label dibuat')
    setForm(null)
    invalidate([qk.tags])
  }

  const remove = async (t: Tag) => {
    const s = statsOf(t.id)
    const ok = await showConfirm({
      title: `Hapus label “${t.name}”?`,
      message: s.count > 0
        ? `Label dilepas dari ${s.count} transaksi. Transaksinya tetap ada.`
        : 'Label ini belum dipakai transaksi mana pun.',
      confirmText: 'Hapus label',
      cancelText: 'Batal',
    })
    if (!ok) return
    setDetailId(null)
    // Detach the label from every transaction that carries it, then drop it.
    const holders = transactions.filter(x => x.tag_ids?.includes(t.id))
    for (const x of holders) {
      await supabase.from('transactions').update({ tag_ids: (x.tag_ids ?? []).filter(id => id !== t.id) }).eq('id', x.id)
    }
    const { error } = await supabase.from('tags').delete().eq('id', t.id)
    if (error) { showToast('error', 'Label gagal dihapus. Coba lagi.'); invalidate([qk.transactions]); return }
    qc.setQueryData<Tag[] | null>(qk.tags, prev => (prev ?? []).filter(x => x.id !== t.id))
    showToast('success', 'Label dihapus')
    invalidate([qk.tags, qk.transactions])
  }

  // ── Pieces shared by mobile and web ─────────────────────────────────────────
  const tagCard = (t: Tag, i: number) => {
    const s = statsOf(t.id)
    return (
      <button key={t.id} type="button" className="card stack-12 ins-pop note-card" style={{ ['--i' as string]: Math.min(i, 10) }} onClick={() => setDetailId(t.id)}>
        <div className="hstack" style={{ gap: 12 }}>
          <div className={`ic ${tagClass(t)}`} style={{ fontSize: 20 }}>{t.emoji || <TagIcon className="i" />}</div>
          <div className="grow">
            <div className="t">{t.name}</div>
            <div className="meta">
              {s.count === 0 ? 'Belum dipakai' : `${s.count} transaksi · ${s.first && s.last && shortDate(s.first) !== shortDate(s.last) ? `${shortDate(s.first)} – ${shortDate(s.last)}` : shortDate(s.last!)}`}
            </div>
          </div>
        </div>
        <div className="between">
          <div><div className="lbl">Total keluar</div><div className="num-m">{rp(s.out)}</div></div>
          {s.in > 0 && <div style={{ textAlign: 'right' }}><div className="lbl">Masuk</div><div className="num-m pos">+{rp(s.in)}</div></div>}
        </div>
        {s.cats.length > 0 && (
          <div className="stack" style={{ gap: 4 }}>
            <div className="bar" style={{ display: 'flex', gap: 2, background: 'var(--divider)' }}>
              {s.cats.slice(0, 4).map((c, ci) => (
                <div key={c.name} style={{ width: `${(c.amount / s.out) * 100}%`, opacity: 1 - ci * 0.22, borderRadius: 0 }} />
              ))}
            </div>
            <span className="lbl">Paling banyak: {s.cats[0].name}</span>
          </div>
        )}
      </button>
    )
  }

  const unsupported = (
    <EmptyState
      icon={<TagIcon className="i" />}
      title="Label belum aktif"
      text="Jalankan file supabase/migrations/20261114_tags_nospend.sql sekali di Supabase SQL editor, lalu buka halaman ini lagi."
    />
  )

  const body = loading ? <SkeletonCards count={3} /> : !supported ? unsupported : list.length === 0 ? (
    <EmptyState
      icon={<TagIcon className="i" />}
      title="Bikin label pertama"
      text="Label mengelompokkan transaksi lintas kategori. Contoh: Liburan Bali, Nikahan Andi, Renovasi."
      actionLabel="Buat label"
      onAction={openCreate}
    />
  ) : (
    <div className={isWeb ? 'gg' : 'stack-12'}>
      {sorted.map((t, i) => tagCard(t, i))}
    </div>
  )

  const overlays = (
    <>
      {form && (
        <>
          <div className="scrim" onClick={() => setForm(null)} />
          <div className="sheet" role="dialog" aria-modal="true" aria-label={form.id ? 'Ubah label' : 'Label baru'}>
            <div className="grabber" />
            <div className="between"><h2 className="h2">{form.id ? 'Ubah label' : 'Label baru'}</h2><button className="icon-btn ghost" aria-label="Tutup" onClick={() => setForm(null)}><X className="i" /></button></div>
            <form onSubmit={save} className="stack-12">
              <div className="hstack" style={{ gap: 12 }}>
                <div className={`ic-l ${TAG_COLORS[form.color]?.cls ?? 'c-lain'}`} style={{ fontSize: 24, transition: 'transform 200ms ease' }}>{form.emoji || <TagIcon className="i" />}</div>
                <label className="field grow">Nama label
                  <input className={`input ${formErr ? 'bad' : ''}`} autoFocus maxLength={40} placeholder="Liburan Bali" value={form.name} onChange={e => { setForm({ ...form, name: e.target.value }); setFormErr('') }} />
                </label>
              </div>
              <FieldError>{formErr}</FieldError>
              <div className="field">Emoji (opsional)
                <div className="chips">
                  {TAG_EMOJI_PRESETS.map(em => (
                    <button key={em} type="button" className={`chip ${form.emoji === em ? 'on' : ''}`} style={{ width: 40, padding: 0, justifyContent: 'center', fontSize: 18 }} aria-label={`Emoji ${em}`} aria-pressed={form.emoji === em} onClick={() => setForm({ ...form, emoji: form.emoji === em ? '' : em })}>{em}</button>
                  ))}
                  <input className="input" style={{ width: 72, height: 36, textAlign: 'center' }} maxLength={4} placeholder="Lain" aria-label="Emoji lain" value={TAG_EMOJI_PRESETS.includes(form.emoji) ? '' : form.emoji} onChange={e => setForm({ ...form, emoji: e.target.value })} />
                </div>
              </div>
              <div className="field">Warna
                <div className="chips">
                  {TAG_COLOR_KEYS.map(k => (
                    <button key={k} type="button" className={`swc ${TAG_COLORS[k].cls} ${form.color === k ? 'on' : ''}`} aria-label={TAG_COLORS[k].label} aria-pressed={form.color === k} onClick={() => setForm({ ...form, color: k })} />
                  ))}
                </div>
              </div>
              <button type="submit" className="btn btn-block" disabled={saving}>{saving ? 'Menyimpan…' : form.id ? 'Simpan perubahan' : 'Buat label'}</button>
            </form>
          </div>
        </>
      )}

      {detail && (() => {
        const s = statsOf(detail.id)
        return (
          <>
            <div className="scrim" onClick={() => setDetailId(null)} />
            <div className="sheet" role="dialog" aria-modal="true" aria-label={detail.name}>
              <div className="grabber" />
              <div className="between">
                <div className="hstack" style={{ gap: 12, minWidth: 0 }}>
                  <div className={`ic ${tagClass(detail)}`} style={{ fontSize: 20 }}>{detail.emoji || <TagIcon className="i" />}</div>
                  <div style={{ minWidth: 0 }}><h2 className="h2">{detail.name}</h2><div className="lbl">{s.count} transaksi{s.first ? ` · sejak ${shortDate(s.first)}` : ''}</div></div>
                </div>
                <button className="icon-btn ghost" aria-label="Tutup" onClick={() => setDetailId(null)}><X className="i" /></button>
              </div>
              <div className="hero stack" style={{ gap: 4 }}>
                <span className="lbl">Total keluar untuk label ini</span>
                <span className="num-xl"><CountUp value={s.out} format={rp} duration={900} /></span>
                {s.in > 0 && <span className="lbl">Masuk +{rp(s.in)} · bersih {rp(s.in - s.out)}</span>}
              </div>
              {s.cats.length > 0 && (
                <div className="stack-12">
                  <span className="h3">Per kategori</span>
                  {s.cats.slice(0, 6).map(c => (
                    <div key={c.name} className="stack" style={{ gap: 6 }}>
                      <div className="between" style={{ fontSize: 13 }}><span style={{ fontWeight: 600 }}>{c.name}</span><span>{rp(c.amount)} · {Math.round((c.amount / s.out) * 100)}%</span></div>
                      <div className="bar"><div style={{ width: `${(c.amount / s.out) * 100}%` }} /></div>
                    </div>
                  ))}
                </div>
              )}
              {s.recent.length > 0 && (
                <div className="stack">
                  <span className="h3">Transaksi terbaru</span>
                  <div className="card-flush">
                    {s.recent.slice(0, 5).map(t => (
                      <div key={t.id} className="row">
                        <div className="grow"><div className="t">{t.title || t.category}</div><div className="meta">{t.category} · {shortDate(txDate(t))}</div></div>
                        <div className={`amt ${t.type === 'pemasukan' ? 'pos' : ''}`}>{t.type === 'pemasukan' ? '+' : ''}{rp(t.amount)}</div>
                      </div>
                    ))}
                  </div>
                  {s.count > 0 && (
                    <button type="button" className="link" style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 4 }} onClick={() => router.push(`/transactions?tag=${detail.id}`)}>
                      Lihat semua di riwayat<ArrowRight className="i i-s" />
                    </button>
                  )}
                </div>
              )}
              <div className="g2">
                <button className="btn-2" onClick={() => openEdit(detail)}><Pencil className="i i-s" />Ubah</button>
                <button className="btn-2" style={{ color: 'var(--danger)' }} onClick={() => remove(detail)}><Trash2 className="i i-s" />Hapus</button>
              </div>
            </div>
          </>
        )
      })()}
    </>
  )

  if (isWeb) {
    return (
      <div className="cd" style={{ minHeight: '100vh', background: 'var(--bg)' }}>
        <main className="main">
          <div className="ptop">
            <div><h1 className="ptitle">Label</h1><p className="sub">Kelompokkan transaksi per acara atau proyek, lintas kategori.</p></div>
            {supported && <button className="btn" onClick={openCreate}><Plus className="i i-s" />Label baru</button>}
          </div>
          {body}
        </main>
        {overlays}
      </div>
    )
  }

  return (
    <div className="cd" style={{ minHeight: '100vh', background: 'var(--surface)' }}>
      <div className="scroll" style={{ maxWidth: 720, margin: '0 auto', paddingBottom: 116 }}>
        <div className="top">
          <div className="top-l">
            <Link href="/more" className="icon-btn ghost" aria-label="Kembali"><ChevronLeft className="i" /></Link>
            <h1 className="h1">Label</h1>
          </div>
          {supported && <button className="icon-btn" aria-label="Label baru" onClick={openCreate}><Plus className="i" /></button>}
        </div>
        <p className="sub">Kelompokkan transaksi per acara atau proyek, lintas kategori.</p>
        {body}
      </div>
      {overlays}
    </div>
  )
}

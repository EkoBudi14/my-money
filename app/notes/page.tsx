'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, Plus, Pencil, Trash2, X, Search, StickyNote } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/useToast'
import { useConfirm } from '@/hooks/useConfirm'
import { useSuccessModal } from '@/hooks/useSuccessModal'
import CalendarCard from '@/components/CalendarCard'

interface Note {
  id: number
  title: string
  content: string
  created_at: string
  updated_at: string
}

const formatDate = (s: string) =>
  new Date(s).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

export default function NotesPage() {
  const { showToast } = useToast()
  const { showConfirm } = useConfirm()
  const { showSuccess } = useSuccessModal()

  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingNote, setEditingNote] = useState<Note | null>(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')

  const fetchNotes = async () => {
    setLoading(true)
    const { data, error } = await supabase.from('notes').select('*').order('updated_at', { ascending: false })
    if (error) console.error('Error fetching notes:', error)
    else setNotes(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchNotes() }, [])

  const resetForm = () => { setTitle(''); setContent(''); setEditingNote(null); setIsModalOpen(false) }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() && !content.trim()) { showToast('warning', 'Catatan tidak boleh kosong'); return }
    const now = new Date().toISOString()

    if (editingNote) {
      const { error } = await supabase.from('notes').update({ title, content, updated_at: now }).eq('id', editingNote.id)
      if (error) { showToast('error', 'Catatan gagal disimpan. Coba lagi.'); console.error(error) }
      else showToast('success', 'Perubahan tersimpan')
    } else {
      const { error } = await supabase.from('notes').insert([{ title: title || 'Catatan Baru', content, created_at: now, updated_at: now }])
      if (error) { showToast('error', 'Catatan gagal disimpan. Coba lagi.'); console.error(error) }
      else showToast('success', 'Catatan tersimpan')
    }
    fetchNotes()
    resetForm()
  }

  const handleDelete = async (id: number) => {
    const note = notes.find(n => n.id === id)
    const confirmed = await showConfirm({
      title: `Hapus catatan “${note?.title || 'Catatan Baru'}”?`,
      message: 'Catatan dihapus permanen.',
      confirmText: 'Hapus catatan',
      cancelText: 'Batal',
    })
    if (!confirmed) return
    const { error } = await supabase.from('notes').delete().eq('id', id)
    if (error) { showToast('error', 'Catatan gagal dihapus. Coba lagi.'); console.error(error) }
    else { showToast('success', 'Catatan dihapus'); fetchNotes() }
  }

  const handleEdit = (note: Note) => {
    setEditingNote(note); setTitle(note.title); setContent(note.content); setIsModalOpen(true)
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return notes
    return notes.filter(n => (n.title || '').toLowerCase().includes(q) || (n.content || '').toLowerCase().includes(q))
  }, [notes, query])

  return (
    <div className="cd" style={{ minHeight: '100vh', background: 'var(--surface)' }}>
      <div className="scroll" style={{ maxWidth: 720, margin: '0 auto', paddingBottom: 116 }}>
        {/* Header */}
        <div className="top">
          <div className="top-l">
            <Link href="/" className="icon-btn ghost" aria-label="Kembali"><ChevronLeft className="i" /></Link>
            <h1 className="h1">Catatan</h1>
          </div>
          <button className="icon-btn" aria-label="Tambah catatan" onClick={() => { resetForm(); setIsModalOpen(true) }}><Plus className="i" /></button>
        </div>

        {/* Calendar (KalenderTanggal) */}
        <CalendarCard />

        {/* Search */}
        <label className="input search" style={{ cursor: 'text' }}>
          <Search className="i i-s" style={{ color: 'var(--text-2)' }} />
          <input type="text" placeholder="Cari catatan" value={query} onChange={e => setQuery(e.target.value)}
            style={{ border: 0, outline: 0, background: 'transparent', color: 'var(--text)', flex: 1, fontSize: 14, height: '100%' }} />
        </label>

        {/* List */}
        {loading ? (
          <div className="stack-12">{[0, 1].map(i => <div key={i} className="card"><div className="t" style={{ opacity: 0.4 }}>Memuat…</div></div>)}</div>
        ) : filtered.length === 0 ? (
          <div className="card" style={{ textAlign: 'center' }}>
            <div className="ic c-lain" style={{ margin: '0 auto 8px' }}><StickyNote className="i" /></div>
            <p className="t" style={{ whiteSpace: 'normal' }}>{query ? 'Tidak ada catatan yang cocok' : 'Belum ada catatan'}</p>
            <p className="lbl" style={{ marginTop: 4 }}>Catat pengingat tagihan, rencana belanja, atau tips keuangan.</p>
            {!query && <button className="btn btn-block" style={{ marginTop: 12 }} onClick={() => { resetForm(); setIsModalOpen(true) }}>Tulis catatan</button>}
          </div>
        ) : (
          filtered.map(note => (
            <div className="card stack" key={note.id}>
              <div className="between">
                <div className="t" style={{ flex: 1 }}>{note.title}</div>
                <div className="hstack" style={{ gap: 4 }}>
                  <button className="icon-btn ghost" aria-label={`Ubah ${note.title}`} style={{ width: 36, height: 36 }} onClick={() => handleEdit(note)}><Pencil className="i i-s" /></button>
                  <button className="icon-btn ghost" aria-label={`Hapus ${note.title}`} style={{ width: 36, height: 36, color: 'var(--danger)' }} onClick={() => handleDelete(note.id)}><Trash2 className="i i-s" /></button>
                </div>
              </div>
              {note.content && <p className="sub" style={{ whiteSpace: 'pre-line', margin: 0 }}>{note.content}</p>}
              <div className="lbl">{formatDate(note.updated_at)}</div>
            </div>
          ))
        )}
      </div>

      {/* Create / edit sheet */}
      {isModalOpen && (
        <>
          <div className="scrim" onClick={resetForm} />
          <div className="sheet">
            <div className="grabber" />
            <div className="between">
              <h2 className="h2">{editingNote ? 'Ubah catatan' : 'Tulis catatan'}</h2>
              <button className="icon-btn ghost" aria-label="Tutup" onClick={resetForm}><X className="i" /></button>
            </div>
            <form onSubmit={handleSave} className="stack-12">
              <label className="field">Judul
                <input className="input" type="text" placeholder="Judul catatan" value={title} onChange={e => setTitle(e.target.value)} autoFocus />
              </label>
              <label className="field">Isi
                <textarea className="input" style={{ minHeight: 160 }} placeholder="Ketik catatanmu di sini…" value={content} onChange={e => setContent(e.target.value)} />
              </label>
              <div className="between">
                <span className="lbl">{content.length} karakter</span>
                <button type="submit" className="btn" style={{ minWidth: 140 }}>{editingNote ? 'Simpan perubahan' : 'Simpan catatan'}</button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  )
}

'use client'
import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, X, StickyNote, Calendar, Save } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/useToast'
import { useConfirm } from '@/hooks/useConfirm'
import { useSuccessModal } from '@/hooks/useSuccessModal'

interface Note {
    id: number
    title: string
    content: string
    created_at: string
    updated_at: string
}

export default function NotesPage() {
    const { showToast } = useToast()
    const { showConfirm } = useConfirm()
    const { showSuccess } = useSuccessModal()
    const [notes, setNotes] = useState<Note[]>([])
    const [loading, setLoading] = useState(true)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingNote, setEditingNote] = useState<Note | null>(null)

    // Form state
    const [title, setTitle] = useState('')
    const [content, setContent] = useState('')

    useEffect(() => {
        fetchNotes()
    }, [])

    const fetchNotes = async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from('notes')
            .select('*')
            .order('updated_at', { ascending: false })

        if (error) {
            console.error('Error fetching notes:', error)
        } else {
            setNotes(data || [])
        }
        setLoading(false)
    }

    const resetForm = () => {
        setTitle('')
        setContent('')
        setEditingNote(null)
        setIsModalOpen(false)
    }

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!title.trim() && !content.trim()) {
            showToast('warning', 'Catatan tidak boleh kosong')
            return
        }

        const now = new Date().toISOString()

        if (editingNote) {
            // Update
            const { error } = await supabase
                .from('notes')
                .update({
                    title,
                    content,
                    updated_at: now
                })
                .eq('id', editingNote.id)

            if (error) {
                showToast('error', 'Gagal mengupdate catatan')
                console.error(error)
            } else {
                showSuccess({
                    type: 'edit',
                    message: 'Catatan berhasil diperbarui!'
                })
            }
        } else {
            // Insert
            const { error } = await supabase
                .from('notes')
                .insert([{
                    title: title || 'Catatan Baru',
                    content,
                    created_at: now,
                    updated_at: now
                }])

            if (error) {
                showToast('error', 'Gagal menyimpan catatan')
                console.error(error)
            } else {
                showSuccess({
                    type: 'create',
                    message: 'Catatan baru berhasil disimpan!'
                })
            }
        }

        fetchNotes()
        resetForm()
    }

    const handleDelete = async (id: number) => {
        const confirmed = await showConfirm({
            title: 'Hapus Catatan?',
            message: 'Tindakan ini tidak dapat dibatalkan.',
            confirmText: 'Ya, Hapus',
            cancelText: 'Batal'
        })

        if (confirmed) {
            const { error } = await supabase
                .from('notes')
                .delete()
                .eq('id', id)

            if (error) {
                showToast('error', 'Gagal menghapus catatan')
                console.error(error)
            } else {
                showSuccess({
                    type: 'delete',
                    message: 'Catatan berhasil dihapus.'
                })
                fetchNotes()
            }
        }
    }

    const handleEdit = (note: Note) => {
        setEditingNote(note)
        setTitle(note.title)
        setContent(note.content)
        setIsModalOpen(true)
    }

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    // Neobrutalism sticky note colors — cycling
    const NOTE_COLORS = [
        'var(--neo-yellow)',
        'var(--neo-mint)',
        'var(--neo-sky)',
        'var(--neo-peach)',
        'var(--neo-lav)',
        'var(--neo-pink)',
    ]

    return (
        <main className="flex-1 bg-[var(--bg-page)] min-h-screen overflow-x-hidden transition-all duration-300">
            {/* ── Header ── */}
            <header className="sticky top-0 z-30 flex items-center justify-between w-full h-[70px] md:h-[90px] shrink-0 bg-[var(--bg-card)] px-5 md:px-8"
                style={{ borderBottom: 'var(--neo-border)' }}>
                <h2 className="font-black text-2xl tracking-tight text-[var(--text-primary)]">Catatan Keuangan</h2>
                <div className="hidden md:flex items-center gap-3 pl-3 ml-auto" style={{ borderLeft: '2px solid var(--border-default)' }}>
                    <p className="font-bold text-[var(--text-primary)] text-sm">Eko Budi</p>
                    <div className="w-10 h-10 rounded-[14px] flex items-center justify-center font-black text-sm"
                        style={{ background: 'var(--neo-yellow-vivid)', border: 'var(--neo-border)', boxShadow: 'var(--neo-shadow-xs)' }}>
                        EB
                    </div>
                </div>
            </header>

            {/* Floating Action Button - Desktop only */}
            <button
                onClick={() => setIsModalOpen(true)}
                className="hidden md:flex fixed bottom-10 right-10 z-40 brutal-btn group items-center justify-center w-14 h-14 p-0 rounded-full"
                style={{ borderRadius: '50%' }}
            >
                <Plus className="w-7 h-7 group-hover:rotate-90 transition-transform duration-300" />
            </button>

            {/* ===== MOBILE VIEW ===== */}
            <div className="md:hidden pb-[80px]">
                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <div className="w-6 h-6 border-2 border-[var(--neo-ink)] border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : (
                    <div className="px-4 pt-4 space-y-3">
                        {notes.length === 0 ? (
                            <div className="brutal-card-sm p-10 text-center">
                                <StickyNote className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-2" />
                                <p className="text-sm font-semibold text-[var(--text-muted)]">Belum ada catatan</p>
                            </div>
                        ) : (
                            notes.map((note, idx) => (
                                <div key={note.id}
                                    className="brutal-card-sm p-4"
                                    style={{ background: NOTE_COLORS[idx % NOTE_COLORS.length] }}>
                                    {/* Top Row: Title + date */}
                                    <div className="flex items-start justify-between mb-2">
                                        <h3 className="font-black text-[var(--text-primary)] text-sm flex-1 mr-2 line-clamp-1">{note.title}</h3>
                                        <span className="text-[10px] font-semibold text-[var(--text-muted)] shrink-0 flex items-center gap-1">
                                            <Calendar className="w-3 h-3" />
                                            {formatDate(note.updated_at)}
                                        </span>
                                    </div>

                                    {/* Content preview */}
                                    <p className="text-[var(--text-secondary)] text-xs leading-relaxed line-clamp-3 mb-3 whitespace-pre-wrap">
                                        {note.content || <span className="italic text-[var(--text-muted)]">Tidak ada isi catatan</span>}
                                    </p>

                                    {/* Action Buttons */}
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            onClick={() => handleEdit(note)}
                                            className="py-2 flex items-center justify-center gap-1.5 font-bold rounded-[12px] text-xs active:scale-95 transition-all"
                                            style={{ background: 'var(--bg-elevated)', border: '2px solid var(--neo-ink)', boxShadow: 'var(--neo-shadow-xs)', color: 'var(--text-primary)' }}
                                        >
                                            <Pencil className="w-3.5 h-3.5" />
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => handleDelete(note.id)}
                                            className="py-2 flex items-center justify-center gap-1.5 font-bold rounded-[12px] text-xs active:scale-95 transition-all"
                                            style={{ background: 'var(--neo-peach)', border: '2px solid var(--neo-ink)', boxShadow: 'var(--neo-shadow-xs)', color: 'var(--error)' }}
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                            Hapus
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}

                        {/* Add New */}
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="w-full rounded-[20px] p-4 flex items-center justify-center gap-3 font-bold text-sm transition-all active:scale-[0.98]"
                            style={{ border: '2.5px dashed var(--neo-ink)', color: 'var(--text-muted)', background: 'transparent' }}
                        >
                            <div className="w-8 h-8 rounded-full flex items-center justify-center"
                                style={{ background: 'var(--neo-yellow)', border: '2px solid var(--neo-ink)' }}>
                                <Plus className="w-4 h-4 text-[var(--neo-ink)]" />
                            </div>
                            <span className="font-black">Tambah Catatan Baru</span>
                        </button>
                    </div>
                )}
            </div>

            {/* ===== DESKTOP VIEW ===== */}
            <div className="hidden md:block p-5 md:p-8 relative min-h-[calc(100vh-90px)]">
                {loading ? (
                    <div className="text-center py-20 text-[var(--text-muted)] font-semibold animate-pulse">Memuat catatan...</div>
                ) : notes.length === 0 ? (
                    <div className="brutal-card flex flex-col items-center justify-center py-20 text-center h-[400px]"
                        style={{ background: 'var(--neo-yellow)' }}>
                        <div className="w-20 h-20 rounded-[20px] flex items-center justify-center mb-6"
                            style={{ background: 'var(--bg-elevated)', border: 'var(--neo-border)', boxShadow: 'var(--neo-shadow-sm)' }}>
                            <StickyNote className="w-10 h-10 text-[var(--text-primary)]" />
                        </div>
                        <h3 className="text-xl font-black text-[var(--text-primary)] mb-2">Belum ada catatan</h3>
                        <p className="text-[var(--text-secondary)] max-w-sm mb-8 font-semibold">
                            Buat catatan untuk mengingatkan tagihan, rencana belanja, atau tips keuangan.
                        </p>
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="brutal-btn px-6 py-3"
                        >
                            Buat Catatan Pertama
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {notes.map((note, idx) => (
                            <div key={note.id}
                                onClick={() => handleEdit(note)}
                                className="brutal-card card-hover flex flex-col min-h-[300px] cursor-pointer relative overflow-hidden p-6 pb-8"
                                style={{ background: NOTE_COLORS[idx % NOTE_COLORS.length] }}>
                                <div className="flex justify-between items-start mb-4 relative z-10">
                                    <h3 className="text-lg font-black text-[var(--text-primary)] line-clamp-1 flex-1">
                                        {note.title}
                                    </h3>
                                    <div className="flex gap-1 ml-2">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleEdit(note); }}
                                            className="p-2.5 rounded-[12px] transition-all active:scale-95 active:translate-x-[2px] active:translate-y-[2px]"
                                            style={{ background: 'var(--bg-elevated)', border: '2px solid var(--neo-ink)', boxShadow: 'var(--neo-shadow-xs)', color: 'var(--text-primary)' }}
                                        >
                                            <Pencil className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDelete(note.id); }}
                                            className="p-2.5 rounded-[12px] transition-all active:scale-95 active:translate-x-[2px] active:translate-y-[2px]"
                                            style={{ background: 'var(--neo-peach)', border: '2px solid var(--neo-ink)', boxShadow: 'var(--neo-shadow-xs)', color: 'var(--error)' }}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                <div className="flex-1 overflow-hidden relative mb-4 z-10">
                                    <p className="text-[var(--text-secondary)] whitespace-pre-wrap break-all text-sm leading-relaxed font-medium">
                                        {note.content}
                                    </p>
                                    <div className="absolute bottom-0 left-0 right-0 h-14 pointer-events-none"
                                        style={{ background: `linear-gradient(to top, ${NOTE_COLORS[idx % NOTE_COLORS.length]}, transparent)` }} />
                                </div>

                                <div className="pt-4 flex items-center gap-2 text-xs font-semibold text-[var(--text-muted)] z-10"
                                    style={{ borderTop: '2px dashed rgba(20,20,20,0.18)' }}>
                                    <Calendar className="w-3.5 h-3.5" />
                                    <span>{formatDate(note.updated_at)}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-[var(--neo-ink)]/60 backdrop-blur-sm transition-opacity" onClick={resetForm} />
                    <div className="w-full max-w-2xl z-50 relative animate-in zoom-in-95 duration-200 overflow-hidden flex flex-col brutal-card"
                        style={{ height: '600px', maxHeight: '90vh', background: 'var(--bg-card)' }}>
                        {/* Modal Header */}
                        <div className="px-6 py-4 flex justify-between items-center shrink-0"
                            style={{ borderBottom: 'var(--neo-border)' }}>
                            <h3 className="text-lg font-black text-[var(--text-primary)] tracking-tight">
                                {editingNote ? 'Edit Catatan' : 'Catatan Baru'}
                            </h3>
                            <button onClick={resetForm}
                                className="p-2 rounded-[12px] transition-colors"
                                style={{ background: 'var(--bg-elevated)', border: '2px solid var(--neo-ink)', color: 'var(--text-muted)' }}>
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <form onSubmit={handleSave} className="flex-1 flex flex-col overflow-hidden">
                            <div className="p-6 space-y-4 flex-1 overflow-y-auto">
                                <input
                                    type="text"
                                    placeholder="Judul Catatan..."
                                    className="w-full text-2xl font-black bg-transparent border-none outline-none placeholder:text-[var(--text-muted)] text-[var(--text-primary)] tracking-tight"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    autoFocus
                                />
                                <div className="h-px w-full" style={{ background: 'var(--neo-ink)', opacity: 0.2 }} />
                                <textarea
                                    placeholder="Ketik catatanmu di sini..."
                                    className="w-full h-full min-h-[300px] resize-none bg-transparent border-none outline-none text-[var(--text-secondary)] text-base leading-relaxed placeholder:text-[var(--text-muted)] font-medium"
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                />
                            </div>

                            {/* Modal Footer */}
                            <div className="p-4 flex justify-between items-center shrink-0"
                                style={{ borderTop: 'var(--neo-border)' }}>
                                <span className="neo-pill text-xs">
                                    {content.length} karakter
                                </span>
                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={resetForm}
                                        className="px-5 py-2.5 rounded-[12px] font-bold text-sm"
                                        style={{ background: 'var(--bg-elevated)', border: '2px solid var(--neo-ink)', color: 'var(--text-muted)' }}
                                    >
                                        Batal
                                    </button>
                                    <button
                                        type="submit"
                                        className="brutal-btn px-6 py-2.5 flex items-center gap-2 text-sm"
                                    >
                                        <Save className="w-4 h-4" />
                                        Simpan
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </main>
    )
}

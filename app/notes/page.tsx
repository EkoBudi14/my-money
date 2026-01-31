'use client'
import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, X, StickyNote, Calendar, Save } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/useToast'
import { useConfirm } from '@/hooks/useConfirm'

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
                showToast('success', 'Catatan berhasil diupdate')
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
                showToast('success', 'Catatan berhasil disimpan')
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
                showToast('success', 'Catatan berhasil dihapus')
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

    return (
        <main className="min-h-screen bg-transparent font-sans text-slate-900 pb-24 md:pb-6 ml-0 md:ml-72 p-6 transition-all duration-300">
            <header className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800">Catatan Keuangan</h1>
                    <p className="text-slate-500">Simpan ide dan detail pengeluaran Anda</p>
                </div>
            </header>

            {/* Floating Action Button */}
            <button
                onClick={() => setIsModalOpen(true)}
                className="fixed bottom-10 right-6 md:bottom-10 md:right-10 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white p-4 rounded-full shadow-premium-lg hover:shadow-purple-500/50 transition-all active:scale-90 hover:scale-110 z-40"
            >
                <Plus className="w-8 h-8" />
            </button>

            {loading ? (
                <div className="text-center py-20 text-slate-400 animate-pulse">Memuat catatan...</div>
            ) : notes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50">
                    <div className="bg-purple-100 p-4 rounded-full mb-4">
                        <StickyNote className="w-8 h-8 text-purple-600" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-700 mb-1">Belum ada catatan</h3>
                    <p className="text-slate-400 max-w-sm">
                        Buat catatan untuk mengingatkan tagihan, rencana belanja, atau tips keuangan.
                    </p>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="mt-6 px-6 py-2 bg-white text-purple-600 font-bold rounded-xl border border-purple-200 hover:bg-purple-50 transition-colors"
                    >
                        Buat Catatan Pertama
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {notes.map((note) => (
                        <div key={note.id} onClick={() => handleEdit(note)} className="group relative glass shadow-premium bg-white/60 p-6 rounded-3xl border border-white/40 hover:border-purple-200 transition-all hover:shadow-premium-lg flex flex-col h-[280px] cursor-pointer active:scale-[0.98]">
                            <div className="flex justify-between items-start mb-3">
                                <h3 className="text-xl font-bold text-slate-800 line-clamp-1 group-hover:text-purple-700 transition-colors">
                                    {note.title}
                                </h3>
                                <div className="flex gap-1">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleEdit(note); }}
                                        className="p-1.5 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded-lg transition-colors"
                                    >
                                        <Pencil className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleDelete(note.id); }}
                                        className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            <div className="flex-1 overflow-hidden relative mb-3">
                                <p className="text-slate-600 whitespace-pre-wrap break-all text-sm leading-relaxed">
                                    {note.content}
                                </p>
                                <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-white/90 to-transparent pointer-events-none" />
                            </div>

                            <div className="pt-4 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-400 font-medium">
                                <Calendar className="w-3 h-3" />
                                <span>{formatDate(note.updated_at)}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={resetForm}></div>
                    <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl z-50 p-0 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
                        {/* Modal Header */}
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <h3 className="text-lg font-bold text-slate-800">
                                {editingNote ? 'Edit Catatan' : 'Catatan Baru'}
                            </h3>
                            <button onClick={resetForm} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <form onSubmit={handleSave} className="flex-1 flex flex-col overflow-hidden">
                            <div className="p-6 space-y-4 flex-1 overflow-y-auto">
                                <input
                                    type="text"
                                    placeholder="Judul Catatan..."
                                    className="w-full text-2xl font-bold bg-transparent border-none outline-none placeholder:text-slate-300 text-slate-800"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    autoFocus
                                />
                                <div className="h-px bg-slate-100 w-full" />
                                <textarea
                                    placeholder="Ketik catatanmu di sini..."
                                    className="w-full h-full min-h-[300px] resize-none bg-transparent border-none outline-none text-slate-600 text-lg leading-relaxed placeholder:text-slate-300"
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                ></textarea>
                            </div>

                            {/* Modal Footer */}
                            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
                                <div className="text-xs text-slate-400 font-medium px-2">
                                    {content.length} karakter
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={resetForm}
                                        className="px-5 py-2.5 rounded-xl font-bold text-slate-500 hover:bg-slate-200 transition-colors"
                                    >
                                        Batal
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-6 py-2.5 rounded-xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg hover:shadow-purple-500/30 hover:scale-105 transition-all !text-white flex items-center gap-2"
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

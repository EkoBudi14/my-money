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
        <main className="flex-1 bg-[#F9FAFB] min-h-screen overflow-x-hidden transition-all duration-300">
             <header className="flex items-center justify-between w-full h-[90px] shrink-0 border-b border-[#F3F4F3] bg-white px-5 md:px-8">
                <div>
                     <h2 className="font-bold text-2xl text-[#080C1A]">Catatan Keuangan</h2>
                </div>
                 <div className="hidden md:flex items-center gap-3 pl-3 border-l border-[#F3F4F3] ml-auto">
                    <div className="text-right">
                        <p className="font-semibold text-[#080C1A] text-sm">Eko Budi</p>
                        {/* <p className="text-[#6A7686] text-xs">Premium User</p> */}
                    </div>
                    <div className="w-11 h-11 bg-slate-200 rounded-full flex items-center justify-center text-slate-500 font-bold border-2 border-white shadow-sm">
                        EB
                    </div>
                </div>
            </header>

            {/* Floating Action Button - Positioned consistently */}
            <button
                onClick={() => setIsModalOpen(true)}
                className="fixed bottom-10 right-10 bg-[#165DFF] hover:bg-[#1455E5] text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all active:scale-95 z-40 group"
            >
                <Plus className="w-7 h-7 group-hover:rotate-90 transition-transform duration-300" />
            </button>

            <div className="p-5 md:p-8 relative min-h-[calc(100vh-90px)]">
                {loading ? (
                    <div className="text-center py-20 text-slate-400 animate-pulse">Memuat catatan...</div>
                ) : notes.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-[#F3F4F3] rounded-3xl bg-white h-[400px]">
                        <div className="bg-blue-50 p-6 rounded-full mb-6">
                            <StickyNote className="w-10 h-10 text-[#165DFF]" />
                        </div>
                        <h3 className="text-xl font-bold text-[#080C1A] mb-2">Belum ada catatan</h3>
                        <p className="text-[#6A7686] max-w-sm mb-8">
                            Buat catatan untuk mengingatkan tagihan, rencana belanja, atau tips keuangan.
                        </p>
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="px-6 py-3 bg-[#165DFF] text-white font-bold rounded-xl hover:bg-[#1455E5] transition-colors shadow-sm hover:shadow-md"
                        >
                            Buat Catatan Pertama
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {notes.map((note) => (
                            <div key={note.id} onClick={() => handleEdit(note)} className="bg-white p-6 pb-8 rounded-3xl border border-[#F3F4F3] hover:shadow-lg transition-all duration-300 group flex flex-col min-h-[300px] cursor-pointer card-hover relative overflow-hidden">
                                <div className="flex justify-between items-start mb-4 relative z-10">
                                    <h3 className="text-lg font-bold text-[#080C1A] line-clamp-1 group-hover:text-[#165DFF] transition-colors">
                                        {note.title}
                                    </h3>
                                    <div className="flex gap-1">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleEdit(note); }}
                                            className="p-3 bg-white/80 backdrop-blur-sm border border-slate-100 rounded-xl text-blue-600 hover:bg-blue-50 transition-all shadow-sm hover:shadow-md active:scale-95"
                                        >
                                            <Pencil className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDelete(note.id); }}
                                            className="p-3 bg-white/80 backdrop-blur-sm border border-slate-100 rounded-xl text-rose-500 hover:bg-rose-50 transition-all shadow-sm hover:shadow-md active:scale-95"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>

                                <div className="flex-1 overflow-hidden relative mb-4 z-10">
                                    <p className="text-[#6A7686] whitespace-pre-wrap break-all text-sm leading-relaxed">
                                        {note.content}
                                    </p>
                                    <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white via-white/80 to-transparent pointer-events-none" />
                                </div>

                                <div className="pt-4 border-t border-[#F3F4F3] flex items-center gap-2 text-xs text-[#6A7686] font-medium z-10">
                                    <Calendar className="w-3.5 h-3.5" />
                                    <span>{formatDate(note.updated_at)}</span>
                                </div>
                                
                                {/* Decorative elements */}
                                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-slate-50 to-transparent rounded-bl-full -z-0 opacity-50 group-hover:opacity-100 transition-opacity"></div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={resetForm}></div>
                    <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl z-50 p-0 overflow-hidden flex flex-col h-[600px] max-h-[90vh] animate-in zoom-in-95 duration-200">
                        {/* Modal Header */}
                        <div className="px-6 py-4 border-b border-[#F3F4F3] flex justify-between items-center bg-white sticky top-0 z-10">
                            <h3 className="text-lg font-bold text-[#080C1A]">
                                {editingNote ? 'Edit Catatan' : 'Catatan Baru'}
                            </h3>
                            <button onClick={resetForm} className="p-2 hover:bg-slate-50 rounded-full text-slate-400 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <form onSubmit={handleSave} className="flex-1 flex flex-col overflow-hidden bg-white">
                            <div className="p-6 space-y-4 flex-1 overflow-y-auto custom-scrollbar">
                                <input
                                    type="text"
                                    placeholder="Judul Catatan..."
                                    className="w-full text-2xl font-bold bg-transparent border-none outline-none placeholder:text-slate-300 text-[#080C1A]"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    autoFocus
                                />
                                <div className="h-px bg-[#F3F4F3] w-full" />
                                <textarea
                                    placeholder="Ketik catatanmu di sini..."
                                    className="w-full h-full min-h-[300px] resize-none bg-transparent border-none outline-none text-slate-600 text-base leading-relaxed placeholder:text-slate-300"
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                ></textarea>
                            </div>

                            {/* Modal Footer */}
                            <div className="p-4 border-t border-[#F3F4F3] bg-white flex justify-between items-center">
                                <div className="text-xs text-[#6A7686] font-medium px-2 bg-slate-50 py-1 rounded-md">
                                    {content.length} karakter
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={resetForm}
                                        className="px-5 py-2.5 rounded-xl font-bold text-slate-500 hover:bg-slate-50 transition-colors text-sm"
                                    >
                                        Batal
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-6 py-2.5 rounded-xl font-bold bg-[#165DFF] hover:bg-[#1455E5] text-white shadow-lg hover:shadow-xl transition-all active:scale-95 flex items-center gap-2 text-sm"
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

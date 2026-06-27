'use client'

import { useState, useEffect } from 'react'
import { X, Check, type LucideIcon, StickyNote, Bell } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/useToast'
import { CalendarEvent } from '@/types'

interface AddEventModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
    selectedDate: Date
    initialData?: CalendarEvent | null
}

const COLORS = [
    { name: 'blue', class: 'bg-blue-300' },
    { name: 'green', class: 'bg-emerald-300' },
    { name: 'yellow', class: 'bg-amber-300' },
    { name: 'red', class: 'bg-rose-300' },
    { name: 'purple', class: 'bg-purple-300' },
]

export default function AddEventModal({ isOpen, onClose, onSuccess, selectedDate, initialData }: AddEventModalProps) {
    const [title, setTitle] = useState('')
    const [type, setType] = useState<'note' | 'reminder'>('note')
    const [color, setColor] = useState<string>('blue')
    const [loading, setLoading] = useState(false)
    const { showToast } = useToast()

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setTitle(initialData.title)
                setType(initialData.type)
                setColor(initialData.color)
            } else {
                setTitle('')
                setType('note')
                setColor('blue')
            }
        }
    }, [isOpen, initialData])

    if (!isOpen) return null

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        
        if (!title.trim()) {
            showToast('warning', 'Judul catatan tidak boleh kosong')
            return
        }

        setLoading(true)

        // Format date to YYYY-MM-DD (Supabase date type)
        // Adjust for timezone offset to ensure correct date is saved
        const offset = selectedDate.getTimezoneOffset()
        const date = new Date(selectedDate.getTime() - (offset*60*1000))
        const dateStr = date.toISOString().split('T')[0]

        try {
            if (initialData) {
                // Update existing event
                const { error } = await supabase
                    .from('calendar_events')
                    .update({
                        title,
                        type,
                        color,
                        // date: dateStr, 
                        // updated_at: new Date().toISOString()
                    })
                    .eq('id', initialData.id)

                if (error) throw error
                showToast('success', 'Catatan berhasil diperbarui!')
            } else {
                // Insert new event
                const { error } = await supabase
                    .from('calendar_events')
                    .insert({
                        title,
                        type,
                        color,
                        date: dateStr,
                        created_at: new Date().toISOString()
                    })

                if (error) throw error
                showToast('success', 'Catatan berhasil ditambahkan!')
            }

            onSuccess()
            onClose()
        } catch (error) {
            console.error('Error saving event:', error)
            showToast('error', 'Gagal menyimpan catatan')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[var(--bg-card)] border-[3px] border-[var(--neo-ink)] shadow-[8px_8px_0_var(--neo-ink)] rounded-[16px] w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b-[3px] border-[var(--neo-ink)] bg-[var(--neo-yellow-vivid)] flex justify-between items-center">
                    <div>
                        <h3 className="text-xl font-black text-[var(--neo-ink)]">
                            {initialData ? 'Edit Catatan' : 'Tambah Catatan'}
                        </h3>
                        <p className="text-sm font-bold text-[var(--neo-ink)] opacity-80 mt-1">
                            {selectedDate.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Input Title */}
                    <div className="space-y-2">
                        <label className="text-sm font-black text-[var(--text-primary)]">Isi Catatan</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Contoh: Meeting jam 2, Bayar listrik..."
                            className="w-full px-4 py-3 bg-[var(--bg-elevated)] border-[3px] border-[var(--neo-ink)] shadow-[4px_4px_0_var(--neo-ink)] rounded-[10px] text-[var(--text-primary)] font-bold focus:outline-none focus:translate-y-[-2px] focus:shadow-[6px_6px_0_var(--neo-ink)] transition-all placeholder:text-[var(--text-primary)] placeholder:opacity-50"
                            autoFocus
                        />
                    </div>

                    {/* Type Selection */}
                    <div className="space-y-2">
                        <label className="text-sm font-black text-[var(--text-primary)]">Tipe</label>
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => setType('note')}
                                className={`flex-1 flex items-center justify-center gap-2 p-3 brutal-btn transition-all ${
                                    type === 'note' 
                                        ? 'bg-blue-300 text-[var(--neo-ink)]' 
                                        : 'bg-white text-[var(--neo-ink)] opacity-80 hover:opacity-100'
                                }`}
                            >
                                <StickyNote size={18} className="stroke-[3px]" />
                                <span className="font-black">Catatan</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setType('reminder')}
                                className={`flex-1 flex items-center justify-center gap-2 p-3 brutal-btn transition-all ${
                                    type === 'reminder' 
                                        ? 'bg-amber-300 text-[var(--neo-ink)]' 
                                        : 'bg-white text-[var(--neo-ink)] opacity-80 hover:opacity-100'
                                }`}
                            >
                                <Bell size={18} className="stroke-[3px]" />
                                <span className="font-black">Pengingat</span>
                            </button>
                        </div>
                    </div>

                    {/* Color Selection */}
                    <div className="space-y-2">
                        <label className="text-sm font-black text-[var(--text-primary)]">Warna Label</label>
                        <div className="flex gap-3">
                            {COLORS.map((c) => (
                                <button
                                    key={c.name}
                                    type="button"
                                    onClick={() => setColor(c.name)}
                                    className={`w-10 h-10 rounded-[10px] border-[3px] border-[var(--neo-ink)] flex items-center justify-center transition-all ${c.class} ${
                                        color === c.name ? 'shadow-[4px_4px_0_var(--neo-ink)] translate-y-[-2px]' : 'hover:shadow-[2px_2px_0_var(--neo-ink)] hover:translate-y-[-1px]'
                                    }`}
                                >
                                    {color === c.name && <Check size={20} className="stroke-[4px] text-[var(--neo-ink)]" />}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-3 px-4 brutal-btn bg-white text-[var(--neo-ink)] opacity-80 hover:opacity-100"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !title.trim()}
                            className="flex-1 py-3 px-4 brutal-btn bg-[var(--neo-yellow-vivid)] text-[var(--neo-ink)] disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-4 border-[var(--neo-ink)] border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <>
                                    <span className="font-black">Simpan</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

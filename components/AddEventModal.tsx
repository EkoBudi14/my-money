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
    { name: 'blue', class: 'bg-blue-100 text-blue-600 ring-blue-500' },
    { name: 'green', class: 'bg-emerald-100 text-emerald-600 ring-emerald-500' },
    { name: 'yellow', class: 'bg-amber-100 text-amber-600 ring-amber-500' },
    { name: 'red', class: 'bg-rose-100 text-rose-600 ring-rose-500' },
    { name: 'purple', class: 'bg-purple-100 text-purple-600 ring-purple-500' },
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                    <div>
                        <h3 className="text-xl font-bold text-gray-800">
                            {initialData ? 'Edit Catatan' : 'Tambah Catatan'}
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">
                            {selectedDate.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Input Title */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Isi Catatan</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Contoh: Meeting jam 2, Bayar listrik..."
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-gray-400"
                            autoFocus
                        />
                    </div>

                    {/* Type Selection */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Tipe</label>
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => setType('note')}
                                className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border transition-all ${
                                    type === 'note' 
                                        ? 'bg-blue-50 border-blue-200 text-blue-700 ring-2 ring-blue-500/20' 
                                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                                }`}
                            >
                                <StickyNote size={18} />
                                <span className="font-medium">Catatan</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setType('reminder')}
                                className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border transition-all ${
                                    type === 'reminder' 
                                        ? 'bg-amber-50 border-amber-200 text-amber-700 ring-2 ring-amber-500/20' 
                                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                                }`}
                            >
                                <Bell size={18} />
                                <span className="font-medium">Pengingat</span>
                            </button>
                        </div>
                    </div>

                    {/* Color Selection */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Warna Label</label>
                        <div className="flex gap-3">
                            {COLORS.map((c) => (
                                <button
                                    key={c.name}
                                    type="button"
                                    onClick={() => setColor(c.name)}
                                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${c.class} ${
                                        color === c.name ? 'ring-2 ring-offset-2' : ''
                                    }`}
                                >
                                    {color === c.name && <Check size={16} />}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-3 px-4 rounded-xl font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !title.trim()}
                            className="flex-1 py-3 px-4 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <span>Simpan</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

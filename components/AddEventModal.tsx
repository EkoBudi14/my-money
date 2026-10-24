'use client'

import { useState, useEffect } from 'react'
import { X, StickyNote, Bell } from 'lucide-react'
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
    { name: 'blue', hex: '#93C5FD' },
    { name: 'green', hex: '#6EE7B7' },
    { name: 'yellow', hex: '#FCD34D' },
    { name: 'red', hex: '#FDA4AF' },
    { name: 'purple', hex: '#D8B4FE' },
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
        <div className="cd">
            <div className="scrim" onClick={onClose} />
            <div className="sheet" role="dialog" aria-labelledby="ev-title">
                <div className="grabber" />
                <div className="between">
                    <div>
                        <h2 className="h2" id="ev-title">{initialData ? 'Edit catatan' : 'Tambah catatan'}</h2>
                        <p className="sub" style={{ textTransform: 'capitalize' }}>
                            {selectedDate.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                    </div>
                    <button type="button" className="icon-btn ghost" aria-label="Tutup" onClick={onClose}><X className="i" /></button>
                </div>

                <form onSubmit={handleSubmit} className="stack-12">
                    <label className="field">Isi catatan
                        <input
                            type="text"
                            className="input"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Contoh: Meeting jam 2, Bayar listrik…"
                            autoFocus
                        />
                    </label>

                    <div className="field">Tipe
                        <div className="seg">
                            <button type="button" className={type === 'note' ? 'on' : ''} onClick={() => setType('note')}><StickyNote className="i i-s" />Catatan</button>
                            <button type="button" className={type === 'reminder' ? 'on' : ''} onClick={() => setType('reminder')}><Bell className="i i-s" />Pengingat</button>
                        </div>
                    </div>

                    <div className="field">Warna label
                        <div className="hstack" style={{ gap: 10 }}>
                            {COLORS.map((c) => (
                                <button
                                    key={c.name}
                                    type="button"
                                    onClick={() => setColor(c.name)}
                                    className={`swc ${color === c.name ? 'on' : ''}`}
                                    style={{ background: c.hex }}
                                    aria-label={`Warna ${c.name}`}
                                    aria-pressed={color === c.name}
                                />
                            ))}
                        </div>
                    </div>

                    <div className="stack" style={{ marginTop: 4 }}>
                        <button type="submit" disabled={loading || !title.trim()} className="btn btn-block">
                            {loading ? 'Menyimpan…' : 'Simpan catatan'}
                        </button>
                        <button type="button" onClick={onClose} className="link" style={{ alignSelf: 'center', padding: '8px 0' }}>Batal</button>
                    </div>
                </form>
            </div>
        </div>
    )
}

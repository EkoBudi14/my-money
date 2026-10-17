'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { restoreRow } from '@/lib/undo'
import Link from 'next/link'
import { Goal } from '@/types'
import { Plus, Target, Trash2, Pencil, X, ChevronLeft } from 'lucide-react'
import DatePickerNeo from '@/components/DatePickerNeo'
import { useToast } from '@/hooks/useToast'
import { useConfirm } from '@/hooks/useConfirm'
import { useSuccessModal } from '@/hooks/useSuccessModal'
import { SkeletonCards } from '@/components/Skeleton'
import EmptyState from '@/components/EmptyState'
import { useIsWeb } from '@/hooks/useIsWeb'
import FieldError from '@/components/FieldError'

export default function GoalsPage() {
    const [goals, setGoals] = useState<Goal[]>([])
    const [loading, setLoading] = useState(true)
    const [isModalOpen, setIsModalOpen] = useState(false)

    const { showToast } = useToast()
    const { showConfirm } = useConfirm()
    const { showSuccess } = useSuccessModal()
    const isWeb = useIsWeb()

    // Form State
    const [name, setName] = useState('')
    const [targetAmount, setTargetAmount] = useState('')
    const [currentAmount, setCurrentAmount] = useState('')
    const [deadline, setDeadline] = useState('')
    const [editingId, setEditingId] = useState<number | null>(null)

    // Quick Add State
    const [quickAddId, setQuickAddId] = useState<number | null>(null)
    const [quickAddAmountValue, setQuickAddAmountValue] = useState('')
    const [isQuickAddModalOpen, setIsQuickAddModalOpen] = useState(false)

    // Inline validation (DESIGN-TAMBAHAN.md §5)
    const [errors, setErrors] = useState<Record<string, string>>({})
    const [qaError, setQaError] = useState('')
    const clearErr = (k: string) => setErrors(prev => { const n = { ...prev }; delete n[k]; return n })

    useEffect(() => {
        fetchGoals()
    }, [])

    const fetchGoals = async () => {
        setLoading(true)
        const { data, error } = await supabase.from('goals').select('*').order('created_at', { ascending: false })
        if (data) setGoals(data)
        if (error) showToast('error', 'Gagal memuat goals')
        setLoading(false)
    }

    const resetForm = () => {
        setName('')
        setTargetAmount('')
        setCurrentAmount('')
        setDeadline('')
        setEditingId(null)
        setErrors({})
        setIsModalOpen(false)
    }

    const resetQuickAddForm = () => {
        setQuickAddId(null)
        setQuickAddAmountValue('')
        setQaError('')
        setIsQuickAddModalOpen(false)
    }

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        const err: Record<string, string> = {}
        if (!name.trim()) err.name = 'Isi nama goal.'
        if (!targetAmount || parseFloat(targetAmount) <= 0) err.target = 'Isi target lebih dari Rp 0.'
        setErrors(err)
        if (Object.keys(err).length > 0) return

        const payload = {
            name,
            target_amount: parseFloat(targetAmount),
            current_amount: parseFloat(currentAmount || '0'),
            deadline: deadline || null,
        }

        let error

        if (editingId) {
            const { error: err } = await supabase.from('goals').update(payload).eq('id', editingId)
            error = err
        } else {
            const { error: err } = await supabase.from('goals').insert([payload])
            error = err
        }

        if (!error) {
            fetchGoals()
            resetForm()
            showToast('success', editingId ? 'Perubahan tersimpan' : 'Goal ditambahkan')
        } else {
            showToast('error', 'Goal gagal disimpan. Coba lagi.')
        }
    }

    const handleQuickAddSave = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!quickAddAmountValue || parseFloat(quickAddAmountValue) <= 0) { setQaError('Isi jumlah lebih dari Rp 0.'); return }
        if (!quickAddId) return

        const goalToUpdate = goals.find(g => g.id === quickAddId)
        if (!goalToUpdate) return

        const newAmount = goalToUpdate.current_amount + parseFloat(quickAddAmountValue)

        const { error } = await supabase
            .from('goals')
            .update({ current_amount: newAmount })
            .eq('id', quickAddId)

        if (!error) {
            fetchGoals()
            resetQuickAddForm()
            showToast('success', `Rp ${parseFloat(quickAddAmountValue).toLocaleString('id-ID')} masuk ke ${goalToUpdate.name}`)
        } else {
            showToast('error', 'Saldo goal gagal diperbarui. Coba lagi.')
        }
    }

    const handleDelete = async (id: number) => {
        const goal = goals.find(g => g.id === id)
        const confirm = await showConfirm({
            title: `Hapus goal “${goal?.name ?? ''}”?`,
            message: `Catatan terkumpul Rp ${(goal?.current_amount ?? 0).toLocaleString('id-ID')} ikut hilang. Saldo dompet tidak berubah.`,
            confirmText: 'Hapus goal',
            cancelText: 'Batal',
        })
        if (!confirm) return

        // 1. Simpan state sebelumnya untuk rollback
        const previousGoals = [...goals]

        // 2. Optimistic update: langsung hapus dari state lokal
        setGoals(prev => prev.filter(g => g.id !== id))

        // 3. Request ke database
        const { error } = await supabase.from('goals').delete().eq('id', id)
        
        if (!error) {
            // Fetch di background untuk memastikan sync
            fetchGoals()
            showToast('success', 'Goal dihapus', 6000, {
                action: {
                    label: 'Urungkan',
                    onClick: async () => {
                        if (goal && await restoreRow('goals', { ...goal })) { showToast('success', 'Goal dikembalikan'); fetchGoals() }
                        else showToast('error', 'Goal gagal dikembalikan.')
                    },
                },
            })
        } else {
            // 4. Rollback jika gagal
            setGoals(previousGoals)
            showToast('error', 'Goal gagal dihapus. Coba lagi.')
        }
    }

    const handleEdit = (g: Goal) => {
        setEditingId(g.id)
        setName(g.name)
        setTargetAmount(g.target_amount.toString())
        setCurrentAmount(g.current_amount.toString())
        setDeadline(g.deadline ? new Date(g.deadline).toISOString().split('T')[0] : '')
        setIsModalOpen(true)
    }

    const openQuickAdd = (g: Goal) => {
        setQuickAddId(g.id)
        setQuickAddAmountValue('')
        setIsQuickAddModalOpen(true)
    }

    // Cycling category color classes per goal card.
    const GOAL_CLASSES = ['c-bonus', 'c-kesehatan', 'c-gaji', 'c-investasi', 'c-piutang']
    const rp = (n: number) => `Rp ${n.toLocaleString('id-ID')}`

    const deadlineLabel = (d: string | null | undefined) => {
        if (!d) return 'Tanpa tenggat'
        const date = new Date(d)
        const now = new Date()
        const mLabel = date.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })
        if (date < now) return `Target ${mLabel}`
        const months = (date.getFullYear() - now.getFullYear()) * 12 + (date.getMonth() - now.getMonth())
        if (months >= 1) return `Target ${mLabel} · ${months} bulan lagi`
        const days = Math.max(0, Math.ceil((date.getTime() - now.getTime()) / 86400000))
        return `Target ${mLabel} · ${days} hari lagi`
    }

    const totalTarget = goals.reduce((a, g) => a + g.target_amount, 0)
    const totalTerkumpul = goals.reduce((a, g) => a + g.current_amount, 0)
    const overallPct = totalTarget > 0 ? Math.min(100, (totalTerkumpul / totalTarget) * 100) : 0
    const quickGoal = goals.find(g => g.id === quickAddId)
    const quickAddNum = parseInt((quickAddAmountValue || '0').replace(/\D/g, '')) || 0

    // Sheets / dialogs shared by the mobile and web layouts.
    const overlays = (
        <>
            {/* Create / edit goal sheet */}
            {isModalOpen && (
                <>
                    <div className="scrim" onClick={resetForm} />
                    <div className="sheet">
                        <div className="grabber" />
                        <div className="between"><h2 className="h2">{editingId ? 'Ubah goal' : 'Tambah goal'}</h2><button className="icon-btn ghost" aria-label="Tutup" onClick={resetForm}><X className="i" /></button></div>
                        <form onSubmit={handleSave} className="stack-12">
                            <label className="field">Nama goal
                                <input className={`input ${errors.name ? 'bad' : ''}`} type="text" placeholder="Dana darurat" value={name} onChange={(e) => { setName(e.target.value); clearErr('name') }} />
                                <FieldError>{errors.name}</FieldError>
                            </label>
                            <label className="field">Target dana (Rp)
                                <input className={`input ${errors.target ? 'bad' : ''}`} inputMode="numeric" placeholder="0" value={targetAmount ? parseInt(targetAmount.replace(/\D/g, '') || '0').toLocaleString('id-ID') : ''} onChange={(e) => { setTargetAmount(e.target.value.replace(/\D/g, '')); clearErr('target') }} />
                                <FieldError>{errors.target}</FieldError>
                            </label>
                            <label className="field">Sudah terkumpul (Rp)
                                <input className="input" inputMode="numeric" placeholder="0" value={currentAmount ? parseInt(currentAmount.replace(/\D/g, '') || '0').toLocaleString('id-ID') : ''} onChange={(e) => setCurrentAmount(e.target.value.replace(/\D/g, ''))} />
                            </label>
                            <label className="field">Batas waktu (opsional)
                                <DatePickerNeo className="input" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
                            </label>
                            {editingId && (
                                <button type="button" className="btn-danger btn-block" onClick={() => { const id = editingId; resetForm(); handleDelete(id) }}><Trash2 className="i i-s" />Hapus goal</button>
                            )}
                            <button type="submit" className="btn btn-block">{editingId ? 'Simpan perubahan' : 'Simpan goal'}</button>
                        </form>
                    </div>
                </>
            )}

            {/* Nabung sheet */}
            {isQuickAddModalOpen && quickGoal && (
                <>
                    <div className="scrim" onClick={resetQuickAddForm} />
                    <div className="sheet">
                        <div className="grabber" />
                        <div className="between"><div><h2 className="h2">Nabung</h2><div className="lbl">{quickGoal.name}</div></div><button className="icon-btn ghost" aria-label="Tutup" onClick={resetQuickAddForm}><X className="i" /></button></div>
                        <form onSubmit={handleQuickAddSave} className="stack-12">
                            <label className="field">Jumlah (Rp)
                                <input className={`input ${qaError ? 'bad' : ''}`} inputMode="numeric" autoFocus placeholder="0" value={quickAddAmountValue ? parseInt(quickAddAmountValue.replace(/\D/g, '') || '0').toLocaleString('id-ID') : ''} onChange={(e) => { setQuickAddAmountValue(e.target.value.replace(/\D/g, '')); setQaError('') }} />
                                <FieldError>{qaError}</FieldError>
                            </label>
                            <div className="chips">
                                {[50000, 100000, 250000, 500000].map(v => (
                                    <button key={v} type="button" className="chip" onClick={() => setQuickAddAmountValue(String((parseInt(quickAddAmountValue.replace(/\D/g, '') || '0')) + v))}>+{v >= 1000000 ? `${v / 1000000}jt` : `${v / 1000}rb`}</button>
                                ))}
                                <button type="button" className="chip" style={{ color: 'var(--text-2)' }} onClick={() => setQuickAddAmountValue('')}>Reset</button>
                            </div>
                            <div className="tile">
                                <div className="lbl">Setelah nabung</div>
                                <div className="t">{rp(quickGoal.current_amount + quickAddNum)} · {quickGoal.target_amount > 0 ? Math.min(100, Math.round(((quickGoal.current_amount + quickAddNum) / quickGoal.target_amount) * 100)) : 0}%</div>
                            </div>
                            <button type="submit" className="btn btn-block">Simpan</button>
                        </form>
                    </div>
                </>
            )}
        </>
    )

    // ── Web (>=768px): GoalsWeb — hero strip + card grid; forms open as modals ──
    if (isWeb) {
        return (
            <div className="cd" style={{ minHeight: '100vh', background: 'var(--bg)' }}>
                <main className="main">
                    <div className="ptop">
                        <h1 className="ptitle">Goals</h1>
                        <button className="btn" onClick={() => { resetForm(); setIsModalOpen(true) }}><Plus className="i i-s" />Tambah goal</button>
                    </div>

                    <div className="hero wrap" style={{ alignItems: 'center', gap: 24 }}>
                        <div className="stack" style={{ flex: '1 1 260px', gap: 4 }}>
                            <span className="lbl">Total terkumpul · {goals.length} goal</span>
                            <span className="num-xl" style={{ fontSize: 34 }}>{rp(totalTerkumpul)}</span>
                        </div>
                        <div className="stack" style={{ flex: '2 1 320px' }}>
                            <div className="bar thick"><div style={{ width: `${overallPct}%` }} /></div>
                            <span className="lbl">{overallPct.toFixed(0)}% dari total target {rp(totalTarget)}</span>
                        </div>
                    </div>

                    {loading ? (
                        <SkeletonCards count={2} />
                    ) : goals.length === 0 ? (
                        <EmptyState icon={<Target className="i" />} title="Mulai goal pertama" text="Contoh: dana darurat, laptop baru, liburan." actionLabel="Tambah goal" onAction={() => { resetForm(); setIsModalOpen(true) }} />
                    ) : (
                        <div className="gg">
                            {goals.map((g, idx) => {
                                const pct = g.target_amount > 0 ? Math.min(100, (g.current_amount / g.target_amount) * 100) : 0
                                const done = g.current_amount >= g.target_amount && g.target_amount > 0
                                const cls = GOAL_CLASSES[idx % GOAL_CLASSES.length]
                                return (
                                    <div className="card stack-12" key={g.id} style={{ padding: 20 }}>
                                        <div className="hstack" style={{ gap: 12 }}>
                                            <div className={`ic ${cls}`}><Target className="i" /></div>
                                            <div className="grow" style={{ minWidth: 0 }}><div className="t">{g.name}</div><div className="meta">{deadlineLabel(g.deadline)}</div></div>
                                            {done ? <span className="badge b-ok">Tercapai</span> : <span className="num-m">{pct.toFixed(0)}%</span>}
                                        </div>
                                        <div className="bar thick"><div style={{ width: `${pct}%`, ...(done ? { background: 'var(--income)' } : {}) }} /></div>
                                        <div style={{ fontSize: 13 }}><b>{rp(g.current_amount)}</b> <span className="lbl">/ {rp(g.target_amount)}</span></div>
                                        <div className="g2" style={{ marginTop: 'auto' }}>
                                            <button className="btn" style={{ height: 44, fontSize: 14 }} onClick={() => openQuickAdd(g)}>Nabung</button>
                                            <button className="btn-2" onClick={() => handleEdit(g)}><Pencil className="i i-s" />Ubah</button>
                                        </div>
                                    </div>
                                )
                            })}
                            <button type="button" className="card" onClick={() => { resetForm(); setIsModalOpen(true) }} style={{ borderStyle: 'dashed', minHeight: 200, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'var(--text-2)', fontFamily: 'inherit', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                                <Plus className="i" />Tambah goal
                            </button>
                        </div>
                    )}
                </main>
                {overlays}
            </div>
        )
    }


    return (
        <div className="cd" style={{ minHeight: '100vh', background: 'var(--surface)' }}>
            <div className="scroll" style={{ maxWidth: 720, margin: '0 auto', paddingBottom: 116 }}>
                {/* Header */}
                <div className="top">
                    <div className="top-l">
                        <Link href="/" className="icon-btn ghost" aria-label="Kembali"><ChevronLeft className="i" /></Link>
                        <h1 className="h1">Goals</h1>
                    </div>
                    <button className="icon-btn" aria-label="Tambah goal" onClick={() => { resetForm(); setIsModalOpen(true) }}><Plus className="i" /></button>
                </div>

                {/* Hero total */}
                <div className="hero stack">
                    <span className="lbl">Total terkumpul · {goals.length} goal</span>
                    <span className="num-xl">{rp(totalTerkumpul)}</span>
                    <div className="bar thick"><div style={{ width: `${overallPct}%` }} /></div>
                    <span className="lbl">dari total target {rp(totalTarget)}</span>
                </div>

                {/* Goal list */}
                {loading ? (
                    <SkeletonCards count={2} />
                ) : goals.length === 0 ? (
                    <EmptyState icon={<Target className="i" />} title="Mulai goal pertama" text="Contoh: dana darurat, laptop baru, liburan." actionLabel="Tambah goal" onAction={() => { resetForm(); setIsModalOpen(true) }} />
                ) : (
                    goals.map((g, idx) => {
                        const pct = g.target_amount > 0 ? Math.min(100, (g.current_amount / g.target_amount) * 100) : 0
                        const done = g.current_amount >= g.target_amount && g.target_amount > 0
                        const cls = GOAL_CLASSES[idx % GOAL_CLASSES.length]
                        return (
                            <div className="card stack-12" key={g.id}>
                                <div className="hstack" style={{ gap: 12 }}>
                                    <div className={`ic ${cls}`}><Target className="i" /></div>
                                    <div className="grow">
                                        <div className="t">{g.name}</div>
                                        <div className="meta">{deadlineLabel(g.deadline)}</div>
                                    </div>
                                    {done ? <span className="badge b-ok">Tercapai</span> : <span className="num-m">{pct.toFixed(0)}%</span>}
                                </div>
                                <div className="bar thick"><div style={{ width: `${pct}%`, ...(done ? { background: 'var(--income)' } : {}) }} /></div>
                                <div className="between" style={{ fontSize: 13 }}><span><b>{rp(g.current_amount)}</b> <span className="lbl">/ {rp(g.target_amount)}</span></span></div>
                                <div className="g2">
                                    <button className="btn" style={{ height: 44, fontSize: 14 }} onClick={() => openQuickAdd(g)}>Nabung</button>
                                    <button className="btn-2" onClick={() => handleEdit(g)}><Pencil className="i i-s" />Ubah</button>
                                </div>
                            </div>
                        )
                    })
                )}
            </div>

            {overlays}
        </div>
    )
}


'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Goal } from '@/types'
import {
    Plus,
    Target,
    Trash2,
    Pencil,
    TrendingUp,
    CheckCircle2,
    X
} from 'lucide-react'
import MoneyInput from '@/components/MoneyInput'
import { useToast } from '@/hooks/useToast'
import { useConfirm } from '@/hooks/useConfirm'
import { useSuccessModal } from '@/hooks/useSuccessModal'

export default function GoalsPage() {
    const [goals, setGoals] = useState<Goal[]>([])
    const [loading, setLoading] = useState(true)
    const [isModalOpen, setIsModalOpen] = useState(false)

    const { showToast } = useToast()
    const { showConfirm } = useConfirm()
    const { showSuccess } = useSuccessModal()

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
        setIsModalOpen(false)
    }

    const resetQuickAddForm = () => {
        setQuickAddId(null)
        setQuickAddAmountValue('')
        setIsQuickAddModalOpen(false)
    }

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!name || !targetAmount) return showToast('error', "Mohon lengkapi nama dan target!")

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
            showSuccess({
                type: editingId ? 'edit' : 'create',
                message: editingId ? 'Target tabungan berhasil diperbarui!' : 'Target tabungan baru berhasil ditambahkan!'
            })
        } else {
            showToast('error', "Gagal menyimpan target")
        }
    }

    const handleQuickAddSave = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!quickAddId || !quickAddAmountValue) return showToast('error', "Mohon masukkan jumlah!")

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
            showSuccess({
                type: 'edit',
                title: 'Tabungan Bertambah!',
                message: `Dana berhasil ditambahkan ke tabungan kamu 🎉`
            })
        } else {
            showToast('error', "Gagal mengupdate saldo")
        }
    }

    const handleDelete = async (id: number) => {
        const confirm = await showConfirm({
            title: 'Hapus Target?',
            message: 'Yakin ingin menghapus target ini?'
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
            showSuccess({
                type: 'delete',
                message: 'Target tabungan berhasil dihapus.'
            })
        } else {
            // 4. Rollback jika gagal
            setGoals(previousGoals)
            showToast('error', 'Gagal menghapus target')
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

    // Neobrutalism card colors — cycling per goal
    const CARD_COLORS = [
        'var(--neo-lav)',
        'var(--neo-sky)',
        'var(--neo-mint)',
        'var(--neo-yellow)',
        'var(--neo-peach)',
    ]

    return (
        <main className="flex-1 bg-[var(--bg-page)] min-h-screen overflow-x-hidden transition-all duration-300">
            {/* ── Header ── */}
            <header className="sticky top-0 z-30 flex items-center justify-between w-full h-[70px] md:h-[90px] shrink-0 bg-[var(--bg-card)] px-5 md:px-8"
                style={{ borderBottom: 'var(--neo-border)' }}>
                <h2 className="font-black text-2xl tracking-tight text-[var(--text-primary)]">Target Tabungan</h2>
                <div className="hidden md:flex items-center gap-3 pl-3 ml-auto" style={{ borderLeft: '2px solid var(--border-default)' }}>
                    <p className="font-bold text-[var(--text-primary)] text-sm">Eko Budi</p>
                    <div className="w-10 h-10 rounded-[14px] flex items-center justify-center font-black text-sm"
                        style={{ background: 'var(--neo-yellow-vivid)', border: 'var(--neo-border)', boxShadow: 'var(--neo-shadow-xs)' }}>
                        EB
                    </div>
                </div>
            </header>

            {/* ===== MOBILE VIEW ===== */}
            <div className="md:hidden pb-[80px]">
                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <div className="w-6 h-6 border-2 border-[var(--neo-ink)] border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : (() => {
                    const totalTarget = goals.reduce((acc, g) => acc + g.target_amount, 0)
                    const totalTerkumpul = goals.reduce((acc, g) => acc + g.current_amount, 0)
                    const totalSisa = Math.max(totalTarget - totalTerkumpul, 0)
                    const overallProgress = totalTarget > 0 ? Math.min((totalTerkumpul / totalTarget) * 100, 100) : 0

                    return (
                        <div className="px-4 pt-4 space-y-3">
                            {/* Summary Card — Neobrutalism lav */}
                            <div className="brutal-card-md brutal-card-lav p-5">
                                <p className="neo-label mb-1">Target Tabungan</p>
                                <p className="neo-amount mt-1">Rp {totalTerkumpul.toLocaleString('id-ID')}</p>
                                <p className="text-xs font-semibold text-[var(--text-muted)] mt-0.5">dari Rp {totalTarget.toLocaleString('id-ID')}</p>
                                <div className="flex items-end justify-between mt-3">
                                    <div>
                                        <p className="text-[11px] font-bold text-[var(--text-muted)]">Kurang</p>
                                        <p className="font-black text-base text-[var(--text-primary)]">Rp {totalSisa.toLocaleString('id-ID')}</p>
                                    </div>
                                    <span className="text-xs font-black text-[var(--text-primary)]">{overallProgress.toFixed(0)}%</span>
                                </div>
                                {/* Progress bar */}
                                <div className="w-full rounded-full h-2 mt-2 overflow-hidden" style={{ background: 'rgba(20,20,20,0.12)' }}>
                                    <div
                                        className="h-full rounded-full transition-all duration-500"
                                        style={{ width: `${overallProgress}%`, background: 'var(--neo-ink)' }}
                                    />
                                </div>
                            </div>

                            {/* Goal List */}
                            {goals.length === 0 ? (
                                <div className="brutal-card-sm p-10 text-center">
                                    <Target className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-2" />
                                    <p className="text-sm font-semibold text-[var(--text-muted)]">Belum ada target tabungan</p>
                                </div>
                            ) : (
                                goals.map((goal, idx) => {
                                    const progress = Math.min((goal.current_amount / goal.target_amount) * 100, 100)
                                    const isCompleted = progress >= 100
                                    return (
                                        <div key={goal.id} className="brutal-card-sm p-4"
                                            style={{ background: CARD_COLORS[idx % CARD_COLORS.length] }}>
                                            {/* Top Row */}
                                            <div className="flex items-start justify-between mb-3">
                                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                                    <div className="w-9 h-9 rounded-[12px] flex items-center justify-center shrink-0"
                                                        style={{ background: 'var(--bg-elevated)', border: '2px solid var(--neo-ink)' }}>
                                                        {isCompleted
                                                            ? <CheckCircle2 className="w-5 h-5 text-[var(--success)]" />
                                                            : <Target className="w-5 h-5 text-[var(--text-primary)]" />
                                                        }
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="font-black text-[var(--text-primary)] text-sm truncate">{goal.name}</p>
                                                        {goal.deadline && (
                                                            <p className="text-[10px] font-semibold text-[var(--text-muted)] mt-0.5">
                                                                🗓 {new Date(goal.deadline).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                                <span className="text-xs font-black shrink-0 ml-2 text-[var(--text-primary)]">
                                                    {progress.toFixed(0)}%
                                                </span>
                                            </div>

                                            {/* Progress Bar */}
                                            <div className="w-full rounded-full h-1.5 mb-3 overflow-hidden" style={{ background: 'rgba(20,20,20,0.12)' }}>
                                                <div
                                                    className="h-full rounded-full transition-all duration-500"
                                                    style={{ width: `${progress}%`, background: isCompleted ? 'var(--success)' : 'var(--neo-ink)' }}
                                                />
                                            </div>

                                            {/* Amount Row */}
                                            <div className="flex justify-between items-center mb-3">
                                                <span className="text-xs font-black text-[var(--text-primary)]">Rp {goal.current_amount.toLocaleString('id-ID')}</span>
                                                <span className="text-xs font-semibold text-[var(--text-muted)]">/ Rp {goal.target_amount.toLocaleString('id-ID')}</span>
                                            </div>

                                            {/* Action Buttons */}
                                            <div className="grid grid-cols-3 gap-2">
                                                <button
                                                    onClick={() => handleEdit(goal)}
                                                    className="py-2 flex items-center justify-center gap-1.5 font-bold rounded-[12px] text-xs active:scale-95 transition-all"
                                                    style={{ background: 'var(--bg-elevated)', border: '2px solid var(--neo-ink)', boxShadow: 'var(--neo-shadow-xs)', color: 'var(--text-primary)' }}
                                                >
                                                    <Pencil className="w-3.5 h-3.5" />
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => openQuickAdd(goal)}
                                                    className="py-2 flex items-center justify-center gap-1.5 font-black rounded-[12px] text-xs active:scale-95 transition-all"
                                                    style={{ background: 'var(--neo-yellow-vivid)', border: '2px solid var(--neo-ink)', boxShadow: 'var(--neo-shadow-xs)', color: 'var(--neo-ink)' }}
                                                >
                                                    <TrendingUp className="w-3.5 h-3.5" />
                                                    Nabung
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(goal.id)}
                                                    className="py-2 flex items-center justify-center gap-1.5 font-bold rounded-[12px] text-xs active:scale-95 transition-all"
                                                    style={{ background: 'var(--neo-peach)', border: '2px solid var(--neo-ink)', boxShadow: 'var(--neo-shadow-xs)', color: 'var(--error)' }}
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                    Hapus
                                                </button>
                                            </div>
                                        </div>
                                    )
                                })
                            )}

                            {/* Add New */}
                            <button
                                onClick={() => { resetForm(); setIsModalOpen(true); }}
                                className="w-full rounded-[20px] p-5 flex items-center justify-center gap-3 font-bold text-sm transition-all active:scale-[0.98]"
                                style={{ border: '2.5px dashed var(--neo-ink)', color: 'var(--text-muted)', background: 'transparent' }}
                            >
                                <div className="w-8 h-8 rounded-full flex items-center justify-center"
                                    style={{ background: 'var(--neo-lav)', border: '2px solid var(--neo-ink)' }}>
                                    <Plus className="w-4 h-4 text-[var(--neo-ink)]" />
                                </div>
                                <span className="font-black">Tambah Target Baru</span>
                            </button>
                        </div>
                    )
                })()}
            </div>

            {/* ===== DESKTOP VIEW ===== */}
            <div className="hidden md:block p-5 md:p-8 relative min-h-[calc(100vh-90px)]">
                {loading ? (
                    <div className="text-center py-20 text-[var(--text-muted)] font-semibold animate-pulse">Memuat target...</div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {goals.map((goal, idx) => {
                            const progress = Math.min((goal.current_amount / goal.target_amount) * 100, 100)
                            const isCompleted = progress >= 100
                            return (
                                <div key={goal.id}
                                    className="brutal-card card-hover flex flex-col justify-between min-h-[320px] p-6 pb-8"
                                    style={{ background: CARD_COLORS[idx % CARD_COLORS.length] }}>
                                    <div>
                                        <div className="flex justify-between items-start mb-5">
                                            <div className="w-12 h-12 rounded-[14px] flex items-center justify-center"
                                                style={{ background: 'var(--bg-elevated)', border: 'var(--neo-border)', boxShadow: 'var(--neo-shadow-xs)' }}>
                                                {isCompleted
                                                    ? <CheckCircle2 className="w-6 h-6 text-[var(--success)]" />
                                                    : <Target className="w-6 h-6 text-[var(--text-primary)]" />
                                                }
                                            </div>
                                            <button onClick={() => handleDelete(goal.id)}
                                                className="p-2.5 rounded-[12px] transition-all active:scale-95 active:translate-x-[2px] active:translate-y-[2px]"
                                                style={{ background: 'var(--neo-peach)', border: '2px solid var(--neo-ink)', boxShadow: 'var(--neo-shadow-xs)', color: 'var(--error)' }}>
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                        <h3 className="font-black text-lg text-[var(--text-primary)] mb-1 tracking-tight">{goal.name}</h3>

                                        {goal.deadline && (
                                            <span className="neo-pill text-[10px] mb-4 inline-flex">
                                                🗓 Target: {new Date(goal.deadline).toLocaleDateString('id-ID')}
                                            </span>
                                        )}

                                        <div className="mt-4 mb-2 flex justify-between items-center">
                                            <span className="neo-label">Tercapai</span>
                                            <span className="text-lg font-black text-[var(--text-primary)]">{progress.toFixed(0)}%</span>
                                        </div>
                                        <div className="w-full rounded-full h-2.5 mb-4 overflow-hidden" style={{ background: 'rgba(20,20,20,0.12)' }}>
                                            <div className="h-full rounded-full transition-all duration-500"
                                                style={{ width: `${progress}%`, background: isCompleted ? 'var(--success)' : 'var(--neo-ink)' }} />
                                        </div>
                                        <div className="flex justify-between p-3 rounded-[14px]"
                                            style={{ background: 'rgba(20,20,20,0.06)', border: '1.5px solid rgba(20,20,20,0.12)' }}>
                                            <span className="font-black text-sm text-[var(--text-primary)]">Rp {goal.current_amount.toLocaleString('id-ID')}</span>
                                            <span className="font-semibold text-sm text-[var(--text-muted)]">/ Rp {goal.target_amount.toLocaleString('id-ID')}</span>
                                        </div>
                                    </div>
                                    <div className="mt-5 grid grid-cols-2 gap-3 pt-4" style={{ borderTop: '2px dashed rgba(20,20,20,0.18)' }}>
                                        <button
                                            onClick={() => handleEdit(goal)}
                                            className="py-3 font-bold rounded-[14px] transition-all active:scale-95 flex justify-center items-center gap-2 text-sm"
                                            style={{ background: 'var(--bg-elevated)', border: '2px solid var(--neo-ink)', boxShadow: 'var(--neo-shadow-xs)', color: 'var(--text-primary)' }}
                                        >
                                            <Pencil className="w-4 h-4" /> Edit
                                        </button>
                                        <button
                                            onClick={() => openQuickAdd(goal)}
                                            className="py-3 font-black rounded-[14px] transition-all active:scale-95 flex justify-center items-center gap-2 text-sm"
                                            style={{ background: 'var(--neo-yellow-vivid)', border: '2px solid var(--neo-ink)', boxShadow: 'var(--neo-shadow-sm)', color: 'var(--neo-ink)' }}
                                        >
                                            <TrendingUp className="w-4 h-4" /> Nabung
                                        </button>
                                    </div>
                                </div>
                            )
                        })}

                        {/* Add New Card */}
                        <button
                            onClick={() => { resetForm(); setIsModalOpen(true); }}
                            className="rounded-[24px] p-6 flex flex-col items-center justify-center gap-4 font-bold text-sm transition-all min-h-[300px] group active:scale-[0.98]"
                            style={{ border: '2.5px dashed var(--neo-ink)', color: 'var(--text-muted)', background: 'transparent' }}
                        >
                            <div className="w-12 h-12 rounded-full flex items-center justify-center transition-all group-hover:scale-110"
                                style={{ background: 'var(--neo-lav)', border: '2px solid var(--neo-ink)', boxShadow: 'var(--neo-shadow-xs)' }}>
                                <Plus className="w-6 h-6 text-[var(--neo-ink)]" />
                            </div>
                            <span className="font-black">Tambah Target Baru</span>
                        </button>
                    </div>
                )}
            </div>

            {/* Main Modal (Add/Edit Goal) */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-[var(--neo-ink)]/60 backdrop-blur-sm transition-opacity" onClick={resetForm} />
                    <div className="w-full max-w-md z-50 relative animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto brutal-card p-6"
                        style={{ background: 'var(--bg-card)' }}>
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-black text-[var(--text-primary)] tracking-tight">{editingId ? 'Edit Target' : 'Target Baru'}</h3>
                            <button onClick={resetForm}
                                className="p-2 rounded-[12px] transition-colors"
                                style={{ background: 'var(--bg-elevated)', border: '2px solid var(--neo-ink)', color: 'var(--text-muted)' }}>
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleSave} className="space-y-5">
                            <div>
                                <label className="neo-label block mb-2">Nama Target</label>
                                <input
                                    type="text"
                                    className="w-full p-3.5 rounded-[14px] font-semibold text-sm text-[var(--text-primary)] outline-none"
                                    style={{ background: 'var(--bg-elevated)', border: '2px solid var(--neo-ink)' }}
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    placeholder="Contoh: Beli Laptop"
                                />
                            </div>
                            <div>
                                <label className="neo-label block mb-2">Target Dana (Rp)</label>
                                <MoneyInput value={targetAmount} onChange={setTargetAmount} />
                            </div>
                            <div>
                                <label className="neo-label block mb-2">Terkumpul Saat Ini (Rp)</label>
                                <MoneyInput value={currentAmount} onChange={setCurrentAmount} />
                            </div>
                            <div>
                                <label className="neo-label block mb-2">Batas Waktu</label>
                                <input
                                    type="date"
                                    className="w-full p-3.5 rounded-[14px] font-semibold text-sm text-[var(--text-primary)] outline-none"
                                    style={{ background: 'var(--bg-elevated)', border: '2px solid var(--neo-ink)' }}
                                    value={deadline}
                                    onChange={e => setDeadline(e.target.value)}
                                />
                            </div>
                            <button type="submit"
                                className="brutal-btn w-full py-3.5 text-sm">
                                Simpan Target
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Quick Add Savings Modal */}
            {isQuickAddModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-[var(--neo-ink)]/60 backdrop-blur-sm transition-opacity" onClick={resetQuickAddForm} />
                    <div className="w-full max-w-sm z-50 relative animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto brutal-card p-6"
                        style={{ background: 'var(--bg-card)' }}>
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-black text-[var(--text-primary)] tracking-tight">Menabung 🐷</h3>
                            <button onClick={resetQuickAddForm}
                                className="p-2 rounded-[12px] transition-colors"
                                style={{ background: 'var(--bg-elevated)', border: '2px solid var(--neo-ink)', color: 'var(--text-muted)' }}>
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleQuickAddSave} className="space-y-5">
                            <div>
                                <label className="neo-label block mb-2">Jumlah yang ditabung (Rp)</label>
                                <MoneyInput
                                    value={quickAddAmountValue}
                                    onChange={setQuickAddAmountValue}
                                    autoFocus
                                    className="focus:ring-[var(--primary)]"
                                />
                                <p className="text-xs font-semibold text-[var(--text-muted)] mt-2">Saldo akan ditambahkan ke total terkumpul.</p>
                            </div>
                            <button type="submit"
                                className="brutal-btn w-full py-3.5 text-sm">
                                + Masukkan Tabungan
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </main>
    )
}

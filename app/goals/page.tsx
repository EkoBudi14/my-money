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

        const { error } = await supabase.from('goals').delete().eq('id', id)
        if (!error) {
            fetchGoals()
            showSuccess({
                type: 'delete',
                message: 'Target tabungan berhasil dihapus.'
            })
        } else {
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

    return (
        <main className="flex-1 bg-[#F9FAFB] min-h-screen overflow-x-hidden transition-all duration-300">
            <header className="sticky top-0 z-30 flex items-center justify-between w-full h-[70px] md:h-[90px] shrink-0 border-b border-[#F3F4F3] bg-white px-5 md:px-8">
                <div>
                     <h2 className="font-bold text-2xl text-[#080C1A]">Target Tabungan</h2>
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

            {/* ===== MOBILE VIEW ===== */}
            <div className="md:hidden pb-[80px]">
                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <div className="w-6 h-6 border-2 border-[#165DFF] border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : (() => {
                    const totalTarget = goals.reduce((acc, g) => acc + g.target_amount, 0)
                    const totalTerkumpul = goals.reduce((acc, g) => acc + g.current_amount, 0)
                    const totalSisa = Math.max(totalTarget - totalTerkumpul, 0)
                    const overallProgress = totalTarget > 0 ? Math.min((totalTerkumpul / totalTarget) * 100, 100) : 0

                    return (
                        <div className="px-4 pt-4 space-y-3">
                            {/* Summary Card */}
                            <div className="relative overflow-hidden rounded-2xl p-5" style={{ background: 'linear-gradient(135deg, #165DFF 0%, #0E3FCC 100%)' }}>
                                <div className="absolute -top-6 -right-6 w-28 h-28 bg-white/5 rounded-full" />
                                <div className="absolute -bottom-8 -left-4 w-36 h-36 bg-white/5 rounded-full" />
                                <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest mb-1 relative z-10">
                                    Target Tabungan
                                </p>
                                <div className="flex items-end justify-between mb-3 relative z-10">
                                    <div>
                                        <p className="text-white text-2xl font-black">Rp {totalTerkumpul.toLocaleString('id-ID')}</p>
                                        <p className="text-white/60 text-xs font-semibold mt-0.5">dari Rp {totalTarget.toLocaleString('id-ID')}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-white/80 text-xs font-semibold">Kurang</p>
                                        <p className="text-white font-black text-lg">Rp {totalSisa.toLocaleString('id-ID')}</p>
                                    </div>
                                </div>
                                <div className="relative z-10">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-white/60 text-[10px] font-bold">Overall Progress</span>
                                        <span className="text-white text-[10px] font-black">{overallProgress.toFixed(0)}%</span>
                                    </div>
                                    <div className="w-full bg-white/20 rounded-full h-1.5 overflow-hidden">
                                        <div
                                            className="h-full rounded-full transition-all duration-500"
                                            style={{
                                                width: `${overallProgress}%`,
                                                background: overallProgress >= 100 ? '#10b981' : overallProgress >= 75 ? '#f59e0b' : '#ffffff'
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Goal List */}
                            {goals.length === 0 ? (
                                <div className="bg-white rounded-2xl border border-[#F3F4F3] p-10 text-center">
                                    <Target className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                                    <p className="text-slate-400 text-sm">Belum ada target tabungan</p>
                                </div>
                            ) : (
                                goals.map((goal) => {
                                    const progress = Math.min((goal.current_amount / goal.target_amount) * 100, 100)
                                    const isCompleted = progress >= 100
                                    const progressColor = isCompleted ? '#10b981' : progress >= 75 ? '#f59e0b' : '#165DFF'
                                    return (
                                        <div key={goal.id} className="bg-white rounded-2xl border border-[#F3F4F3] p-4 shadow-sm">
                                            {/* Top Row */}
                                            <div className="flex items-start justify-between mb-3">
                                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${progressColor}15` }}>
                                                        {isCompleted
                                                            ? <CheckCircle2 className="w-5 h-5" style={{ color: progressColor }} />
                                                            : <Target className="w-5 h-5" style={{ color: progressColor }} />
                                                        }
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="font-bold text-[#080C1A] text-sm truncate">{goal.name}</p>
                                                        {goal.deadline && (
                                                            <p className="text-[10px] text-[#6A7686] font-medium mt-0.5">
                                                                🗓 {new Date(goal.deadline).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                                <span className="text-xs font-black shrink-0 ml-2" style={{ color: progressColor }}>
                                                    {progress.toFixed(0)}%
                                                </span>
                                            </div>

                                            {/* Progress Bar */}
                                            <div className="w-full bg-[#F3F4F3] rounded-full h-1.5 mb-3 overflow-hidden">
                                                <div
                                                    className="h-full rounded-full transition-all duration-500"
                                                    style={{ width: `${progress}%`, backgroundColor: progressColor }}
                                                />
                                            </div>

                                            {/* Amount Row */}
                                            <div className="flex justify-between items-center mb-3">
                                                <span className="text-xs font-bold text-[#080C1A]">Rp {goal.current_amount.toLocaleString('id-ID')}</span>
                                                <span className="text-xs text-[#6A7686] font-medium">/ Rp {goal.target_amount.toLocaleString('id-ID')}</span>
                                            </div>

                                            {/* Action Buttons */}
                                            <div className="grid grid-cols-3 gap-2">
                                                <button
                                                    onClick={() => handleEdit(goal)}
                                                    className="py-2 flex items-center justify-center gap-1.5 bg-slate-50 text-slate-600 font-bold rounded-xl text-xs hover:bg-slate-100 active:scale-95 transition-all"
                                                >
                                                    <Pencil className="w-3.5 h-3.5" />
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => openQuickAdd(goal)}
                                                    className="py-2 flex items-center justify-center gap-1.5 bg-[#165DFF] text-white font-bold rounded-xl text-xs hover:bg-[#1455E5] active:scale-95 transition-all shadow-sm"
                                                >
                                                    <TrendingUp className="w-3.5 h-3.5" />
                                                    Nabung
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(goal.id)}
                                                    className="py-2 flex items-center justify-center gap-1.5 bg-rose-50 text-rose-600 font-bold rounded-xl text-xs hover:bg-rose-100 active:scale-95 transition-all"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                    Hapus
                                                </button>
                                            </div>
                                        </div>
                                    )
                                })
                            )}

                            {/* Add New - Dashed Card */}
                            <button
                                onClick={() => { resetForm(); setIsModalOpen(true); }}
                                className="w-full border-2 border-dashed border-[#E2E8F0] rounded-2xl p-5 flex items-center justify-center gap-3 text-slate-400 hover:text-[#165DFF] hover:border-[#165DFF] hover:bg-blue-50/30 transition-all active:scale-[0.98]"
                            >
                                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                                    <Plus className="w-4 h-4" />
                                </div>
                                <span className="font-bold text-sm">Tambah Target Baru</span>
                            </button>
                        </div>
                    )
                })()}
            </div>

            {/* ===== DESKTOP VIEW ===== */}
            <div className="hidden md:block p-5 md:p-8 relative min-h-[calc(100vh-90px)]">
                {loading ? (
                    <div className="text-center py-20 text-slate-400">Loading...</div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {goals.map((goal) => {
                            const progress = Math.min((goal.current_amount / goal.target_amount) * 100, 100)
                            return (
                                <div key={goal.id} className="bg-white p-6 pb-8 rounded-3xl border border-[#F3F4F3] hover:shadow-lg transition-all duration-300 group flex flex-col justify-between min-h-[320px] card-hover">
                                    <div>
                                        <div className="flex justify-between items-start mb-6">
                                            <div className="bg-blue-50 p-3 rounded-2xl text-[#165DFF]">
                                                <Target className="w-6 h-6" />
                                            </div>
                                            <button onClick={() => handleDelete(goal.id)} className="p-3 bg-white/80 backdrop-blur-sm border border-slate-100 rounded-xl text-rose-500 hover:bg-rose-50 transition-all shadow-sm hover:shadow-md active:scale-95" title="Hapus">
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </div>
                                        <h3 className="font-bold text-lg text-[#080C1A] mb-1">{goal.name}</h3>
                                        
                                        <div className="flex items-center gap-2 mb-4">
                                             {goal.deadline && (
                                                <span className="text-xs font-medium text-[#6A7686] bg-[#F7F9FC] px-2 py-1 rounded-md">
                                                    Target: {new Date(goal.deadline).toLocaleDateString('id-ID')}
                                                </span>
                                            )}
                                        </div>

                                        <div className="mb-2 flex justify-between items-end">
                                            <span className="text-xs font-semibold text-[#6A7686] uppercase tracking-wider">Tercapai</span>
                                            <span className="text-lg font-bold text-[#165DFF]">{progress.toFixed(0)}%</span>
                                        </div>
                                        <div className="w-full bg-[#F3F4F3] rounded-full h-2.5 mb-5 overflow-hidden">
                                            <div className="bg-[#165DFF] h-full rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
                                        </div>
                                        <div className="flex justify-between text-sm bg-[#F7F9FC] p-3 rounded-xl">
                                            <span className="text-[#080C1A] font-bold">Rp {goal.current_amount.toLocaleString('id-ID')}</span>
                                            <span className="text-[#6A7686] font-medium">/ Rp {goal.target_amount.toLocaleString('id-ID')}</span>
                                        </div>
                                    </div>
                                    <div className="mt-6 grid grid-cols-2 gap-3 pt-4 border-t border-[#F3F4F3]">
                                        <button
                                            onClick={() => handleEdit(goal)}
                                            className="py-3.5 bg-slate-50 text-slate-700 font-bold rounded-xl hover:bg-slate-100 transition-all shadow-sm hover:shadow-md active:scale-95 flex justify-center items-center gap-2 text-sm"
                                        >
                                            <Pencil className="w-5 h-5" /> Edit
                                        </button>
                                        <button
                                            onClick={() => openQuickAdd(goal)}
                                            className="py-3.5 bg-[#165DFF] !text-white font-bold rounded-xl hover:bg-[#1455E5] transition-all text-sm shadow-md hover:shadow-lg active:scale-95"
                                        >
                                            + Nabung
                                        </button>
                                    </div>
                                </div>
                            )
                        })}

                        {/* Add New Card */}
                        <button
                            onClick={() => { resetForm(); setIsModalOpen(true); }}
                            className="border-2 border-dashed border-[#E2E8F0] rounded-2xl p-6 flex flex-col items-center justify-center gap-4 text-slate-400 hover:text-[#165DFF] hover:border-[#165DFF] hover:bg-blue-50/30 transition-all min-h-[300px] group"
                        >
                            <div className="bg-[#F3F4F3] group-hover:bg-[#165DFF] p-4 rounded-full transition-colors">
                                <Plus className="w-8 h-8 text-slate-500 group-hover:text-white transition-colors" />
                            </div>
                            <span className="font-bold text-sm">Tambah Target Baru</span>
                        </button>
                    </div>
                )}
            </div>

            {/* Main Modal (Add/Edit Goal) */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={resetForm}></div>
                    <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl z-50 relative animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-[#080C1A]">{editingId ? 'Edit Target' : 'Target Baru'}</h3>
                            <button onClick={resetForm} className="p-2 bg-slate-50 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleSave} className="space-y-5">
                            <div>
                                <label className="block text-sm font-semibold text-[#080C1A] mb-2">Nama Target</label>
                                <input 
                                    type="text" 
                                    className="w-full p-3.5 bg-slate-50 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#165DFF] focus:border-transparent outline-none text-sm font-medium text-[#080C1A] placeholder:text-slate-400" 
                                    value={name} 
                                    onChange={e => setName(e.target.value)} 
                                    placeholder="Contoh: Beli Laptop" 
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-[#080C1A] mb-2">Target Dana (Rp)</label>
                                <MoneyInput value={targetAmount} onChange={setTargetAmount} />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-[#080C1A] mb-2">Terkumpul Saat Ini (Rp)</label>
                                <MoneyInput value={currentAmount} onChange={setCurrentAmount} />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-[#080C1A] mb-2">Batas Waktu</label>
                                <input 
                                    type="date" 
                                    className="w-full p-3.5 bg-slate-50 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#165DFF] focus:border-transparent outline-none text-sm font-medium text-[#080C1A]" 
                                    value={deadline} 
                                    onChange={e => setDeadline(e.target.value)} 
                                />
                            </div>
                            <button type="submit" className="w-full bg-[#165DFF] hover:bg-[#1455E5] text-white font-bold py-3.5 rounded-xl shadow-lg hover:shadow-xl transition-all active:scale-95 text-sm">
                                Simpan Target
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Quick Add Savings Modal */}
            {isQuickAddModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={resetQuickAddForm}></div>
                    <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl z-50 relative animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-[#080C1A]">Menabung</h3>
                            <button onClick={resetQuickAddForm} className="p-2 bg-slate-50 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleQuickAddSave} className="space-y-5">
                            <div>
                                <label className="block text-sm font-semibold text-[#080C1A] mb-2">Jumlah yang ditabung (Rp)</label>
                                <MoneyInput
                                    value={quickAddAmountValue}
                                    onChange={setQuickAddAmountValue}
                                    autoFocus
                                    className="focus:ring-[#165DFF]"
                                />
                                <p className="text-xs text-slate-500 mt-2">Saldo akan ditambahkan ke total terkumpul.</p>
                            </div>
                            <button type="submit" className="w-full bg-[#165DFF] hover:bg-[#1455E5] text-white font-bold py-3.5 rounded-xl transition-all shadow-lg hover:shadow-xl active:scale-95 text-sm">
                                + Masukkan Tabungan
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </main>
    )
}

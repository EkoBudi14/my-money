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

export default function GoalsPage() {
    const [goals, setGoals] = useState<Goal[]>([])
    const [loading, setLoading] = useState(true)
    const [isModalOpen, setIsModalOpen] = useState(false)

    const { showToast } = useToast()
    const { showConfirm } = useConfirm()

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
            showToast('success', 'Target berhasil disimpan')
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
            showToast('success', 'Tabungan berhasil ditambahkan!')
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
            showToast('success', 'Target dihapus')
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
            <header className="flex items-center justify-between w-full h-[90px] shrink-0 border-b border-[#F3F4F3] bg-white px-5 md:px-8">
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

            <div className="p-5 md:p-8 relative min-h-[calc(100vh-90px)]">
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

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

export default function GoalsPage() {
    const [goals, setGoals] = useState<Goal[]>([])
    const [loading, setLoading] = useState(true)
    const [isModalOpen, setIsModalOpen] = useState(false)

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
        if (!name || !targetAmount) return alert("Mohon lengkapi nama dan target!")

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
        } else {
            alert("Gagal menyimpan target")
        }
    }

    const handleQuickAddSave = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!quickAddId || !quickAddAmountValue) return alert("Mohon masukkan jumlah!")

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
        } else {
            alert("Gagal mengupdate saldo")
        }
    }

    const handleDelete = async (id: number) => {
        if (!confirm("Hapus target ini?")) return
        await supabase.from('goals').delete().eq('id', id)
        fetchGoals()
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
        <main className="min-h-screen bg-transparent font-sans text-slate-900 pb-24 md:pb-6 ml-0 md:ml-72 p-6 transition-all duration-300">
            <header className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800">Target Tabungan</h1>
                    <p className="text-slate-500">Wujudkan impian finansial anda</p>
                </div>
            </header>

            {loading ? (
                <div className="text-center py-20 text-slate-400">Loading...</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {goals.map((goal) => {
                        const progress = Math.min((goal.current_amount / goal.target_amount) * 100, 100)
                        return (
                            <div key={goal.id} className="glass shadow-premium-lg p-6 rounded-3xl border border-white/20 flex flex-col justify-between group card-hover backdrop-blur-xl">
                                <div>
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="bg-blue-100 p-3 rounded-2xl text-blue-600">
                                            <Target className="w-6 h-6" />
                                        </div>
                                        <button onClick={() => handleDelete(goal.id)} className="p-2 bg-rose-50 rounded-lg text-rose-500 hover:bg-rose-100 transition-colors" title="Hapus">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <h3 className="font-bold text-lg text-slate-800 mb-1">{goal.name}</h3>
                                    {goal.deadline && (
                                        <p className="text-xs text-slate-500 mb-4">Target: {new Date(goal.deadline).toLocaleDateString('id-ID')}</p>
                                    )}
                                    <div className="mb-2 flex justify-between items-end">
                                        <span className="text-sm font-semibold text-slate-500">Tercapai</span>
                                        <span className="text-lg font-bold text-blue-600">{progress.toFixed(0)}%</span>
                                    </div>
                                    <div className="w-full bg-slate-100 rounded-full h-3 mb-4 overflow-hidden">
                                        <div className="bg-blue-600 h-full rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-600 font-medium">Rp {goal.current_amount.toLocaleString('id-ID')}</span>
                                        <span className="text-slate-400">/ Rp {goal.target_amount.toLocaleString('id-ID')}</span>
                                    </div>
                                </div>
                                <div className="mt-6 grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => handleEdit(goal)}
                                        className="py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors flex justify-center items-center gap-2 text-sm"
                                    >
                                        <Pencil className="w-4 h-4" /> Edit
                                    </button>
                                    <button
                                        onClick={() => openQuickAdd(goal)}
                                        className="py-3 bg-blue-50 text-blue-600 font-bold rounded-xl hover:bg-blue-100 transition-colors text-sm"
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
                        className="glass border-2 border-dashed border-white/30 rounded-3xl p-6 flex flex-col items-center justify-center gap-4 text-slate-600 hover:text-purple-600 hover:border-purple-400 hover:bg-purple-50/30 transition-all min-h-[300px] backdrop-blur-xl shadow-premium"
                    >
                        <div className="bg-white p-4 rounded-full shadow-sm">
                            <Plus className="w-8 h-8" />
                        </div>
                        <span className="font-bold">Tambah Target Baru</span>
                    </button>
                </div>
            )}

            {/* Main Modal (Add/Edit Goal) */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
                    <div className="glass backdrop-blur-2xl w-full max-w-md rounded-3xl p-6 shadow-premium-lg border border-white/20 relative">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-slate-800">{editingId ? 'Edit Target' : 'Target Baru'}</h3>
                            <button onClick={resetForm}><X className="w-6 h-6 text-slate-400" /></button>
                        </div>
                        <form onSubmit={handleSave} className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Nama Target</label>
                                <input type="text" className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200" value={name} onChange={e => setName(e.target.value)} placeholder="Contoh: Beli Laptop" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Target Dana (Rp)</label>
                                <MoneyInput value={targetAmount} onChange={setTargetAmount} />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Terkumpul Saat Ini (Rp)</label>
                                <MoneyInput value={currentAmount} onChange={setCurrentAmount} />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Batas Waktu</label>
                                <input type="date" className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200" value={deadline} onChange={e => setDeadline(e.target.value)} />
                            </div>
                            <button type="submit" className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 !text-white font-bold py-3 rounded-xl hover:shadow-purple-500/50 transition-colors shadow-premium-lg">Simpan Target</button>
                        </form>
                    </div>
                </div>
            )}

            {/* Quick Add Savings Modal */}
            {isQuickAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
                    <div className="glass backdrop-blur-2xl w-full max-w-sm rounded-3xl p-6 shadow-premium-lg border border-white/20 relative animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-slate-800">Menabung</h3>
                            <button onClick={resetQuickAddForm}><X className="w-6 h-6 text-slate-400" /></button>
                        </div>
                        <form onSubmit={handleQuickAddSave} className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Jumlah yang ditabung (Rp)</label>
                                <MoneyInput
                                    value={quickAddAmountValue}
                                    onChange={setQuickAddAmountValue}
                                    autoFocus
                                />
                                <p className="text-xs text-slate-400 mt-2">Saldo akan ditambahkan ke total terkumpul.</p>
                            </div>
                            <button type="submit" className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 !text-white font-bold py-3 rounded-xl hover:shadow-purple-500/50 transition-colors shadow-lg shadow-emerald-500/30">
                                + Masukkan Tabungan
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </main>
    )
}

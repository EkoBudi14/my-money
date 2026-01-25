'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Wallet } from '@/types' // Reuse Wallet type
import {
    Plus,
    Landmark,
    Trash2,
    Pencil,
    X,
    Wallet as WalletIcon,
    CreditCard,
    Banknote
} from 'lucide-react'
import MoneyInput from '@/components/MoneyInput'

export default function MainSavingsPage() {
    const [savingsWallets, setSavingsWallets] = useState<Wallet[]>([])
    const [loading, setLoading] = useState(true)
    const [isModalOpen, setIsModalOpen] = useState(false)

    // Form State
    const [name, setName] = useState('')
    const [balance, setBalance] = useState('')
    const [type, setType] = useState<'bank' | 'ewallet' | 'cash'>('bank')
    const [editingId, setEditingId] = useState<number | null>(null)

    useEffect(() => {
        fetchSavings()
    }, [])

    const fetchSavings = async () => {
        setLoading(true)
        // Fetch wallets only with category 'savings'
        const { data, error } = await supabase
            .from('wallets')
            .select('*')
            .eq('category', 'savings')
            .order('created_at', { ascending: false })

        if (data) setSavingsWallets(data)
        setLoading(false)
    }

    const resetForm = () => {
        setName('')
        setBalance('')
        setType('bank')
        setEditingId(null)
        setIsModalOpen(false)
    }

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!name) return alert("Mohon lengkapi nama tabungan!")

        const payload = {
            name,
            balance: parseFloat(balance || '0'),
            type,
            category: 'savings' // Force category to savings
        }

        let error

        if (editingId) {
            const { error: err } = await supabase.from('wallets').update(payload).eq('id', editingId)
            error = err
        } else {
            const { error: err } = await supabase.from('wallets').insert([payload])
            error = err
        }

        if (!error) {
            fetchSavings()
            resetForm()
        } else {
            console.error(error)
            alert("Gagal menyimpan tabungan")
        }
    }

    const handleDelete = async (id: number) => {
        if (!confirm("Hapus tabungan ini?")) return
        await supabase.from('wallets').delete().eq('id', id)
        fetchSavings()
    }

    const handleEdit = (w: Wallet) => {
        setEditingId(w.id)
        setName(w.name)
        setBalance(w.balance.toString())
        setType(w.type)
        setIsModalOpen(true)
    }

    const totalSavings = savingsWallets.reduce((acc, curr) => acc + curr.balance, 0)

    const getIcon = (type: string) => {
        switch (type) {
            case 'bank': return <CreditCard className="w-6 h-6" />
            case 'ewallet': return <WalletIcon className="w-6 h-6" />
            case 'cash': return <Banknote className="w-6 h-6" />
            default: return <WalletIcon className="w-6 h-6" />
        }
    }

    return (
        <main className="min-h-screen bg-transparent font-sans text-slate-900 pb-24 md:pb-6 ml-0 md:ml-72 p-6 transition-all duration-300">
            <header className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800">Tabungan Inti</h1>
                    <p className="text-slate-500">Aset & Simpanan jangka panjang</p>
                </div>
                <div className="glass shadow-premium-lg px-6 py-4 rounded-2xl backdrop-blur-xl border border-emerald-100 flex items-center gap-4 bg-white">
                    <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600">
                        <Landmark className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wide">Total Aset</p>
                        <p className="text-2xl font-bold text-slate-800">Rp {totalSavings.toLocaleString('id-ID')}</p>
                    </div>
                </div>
            </header>

            {loading ? (
                <div className="text-center py-20 text-slate-400">Loading...</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {savingsWallets.map((wallet) => (
                        <div key={wallet.id} className="glass shadow-premium-lg p-6 rounded-3xl border border-white/20 flex flex-col justify-between group card-hover backdrop-blur-xl">
                            <div>
                                <div className="flex justify-between items-start mb-4">
                                    <div className="bg-emerald-100 p-3 rounded-2xl text-emerald-600">
                                        {getIcon(wallet.type)}
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => handleEdit(wallet)} className="p-2 bg-slate-50 rounded-lg text-blue-500 hover:bg-blue-50 transition-colors">
                                            <Pencil className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => handleDelete(wallet.id)} className="p-2 bg-rose-50 rounded-lg text-rose-500 hover:bg-rose-100 transition-colors">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                                <h3 className="font-bold text-lg text-slate-800 mb-1">{wallet.name}</h3>
                                <p className="text-xs text-slate-400 uppercase tracking-wider mb-3">{wallet.type}</p>
                                <p className="text-2xl font-bold text-emerald-600">Rp {wallet.balance.toLocaleString('id-ID')}</p>
                            </div>
                        </div>
                    ))}

                    {/* Add New Card */}
                    <button
                        onClick={() => { resetForm(); setIsModalOpen(true); }}
                        className="glass border-2 border-dashed border-white/30 rounded-3xl p-6 flex flex-col items-center justify-center gap-4 text-slate-600 hover:text-emerald-600 hover:border-emerald-400 hover:bg-emerald-50/30 transition-all min-h-[200px] backdrop-blur-xl shadow-premium"
                    >
                        <div className="bg-white p-4 rounded-full shadow-sm">
                            <Plus className="w-8 h-8" />
                        </div>
                        <span className="font-bold">Tambah Aset Baru</span>
                    </button>
                </div>
            )}

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
                    <div className="glass backdrop-blur-2xl w-full max-w-md rounded-3xl p-6 shadow-premium-lg border border-white/20 relative animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-slate-800">{editingId ? 'Edit Aset' : 'Aset Baru'}</h3>
                            <button onClick={resetForm}><X className="w-6 h-6 text-slate-400" /></button>
                        </div>
                        <form onSubmit={handleSave} className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Nama Aset / Tabungan</label>
                                <input type="text" className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none" value={name} onChange={e => setName(e.target.value)} placeholder="Contoh: Emas, Deposito, Tabungan Nikah" autoFocus />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Tipe</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {['bank', 'ewallet', 'cash'].map((t) => (
                                        <button
                                            key={t}
                                            type="button"
                                            onClick={() => setType(t as any)}
                                            className={`py-2 px-3 rounded-xl text-sm font-bold border transition-all ${type === t ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                        >
                                            {t.toUpperCase()}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Saldo Saat Ini (Rp)</label>
                                <MoneyInput
                                    value={balance}
                                    onChange={setBalance}
                                    placeholder="0"
                                />
                            </div>
                            <button type="submit" className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 !text-white font-bold py-3 rounded-xl hover:shadow-purple-500/50 transition-colors shadow-premium-lg">Simpan</button>
                        </form>
                    </div>
                </div>
            )}
        </main>
    )
}

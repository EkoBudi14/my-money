'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Wallet } from '@/types'
import { Plus, Wallet as WalletIcon, CreditCard, Banknote, Trash2, Pencil, X } from 'lucide-react'
import MoneyInput from '@/components/MoneyInput'

export default function WalletsPage() {
    const [wallets, setWallets] = useState<Wallet[]>([])
    const [loading, setLoading] = useState(true)
    const [isModalOpen, setIsModalOpen] = useState(false)

    // Form State
    const [editingId, setEditingId] = useState<number | null>(null)
    const [name, setName] = useState('')
    const [type, setType] = useState<'bank' | 'ewallet' | 'cash'>('bank')
    const [category, setCategory] = useState<'active' | 'savings'>('active')
    const [balance, setBalance] = useState('')

    useEffect(() => {
        fetchWallets()
    }, [])

    const fetchWallets = async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from('wallets')
            .select('*')
            .order('created_at', { ascending: true })

        if (error) {
            console.error('Error fetching wallets:', error)
        } else {
            setWallets(data || [])
        }
        setLoading(false)
    }

    const resetForm = () => {
        setName('')
        setType('bank')
        setCategory('active')
        setBalance('')
        setEditingId(null)
        setIsModalOpen(false)
    }

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!name || balance === '') return alert('Mohon lengkapi data')

        const payload = {
            name,
            type,
            category,
            balance: parseFloat(balance)
        }

        let error
        if (editingId) {
            const res = await supabase.from('wallets').update(payload).eq('id', editingId)
            error = res.error
        } else {
            const res = await supabase.from('wallets').insert([payload])
            error = res.error
        }

        if (error) {
            console.error(error)
            alert('Gagal menyimpan dompet')
        } else {
            fetchWallets()
            resetForm()
        }
    }

    const handleDelete = async (id: number) => {
        if (!confirm('Hapus dompet ini? SEMUA RIWAYAT TRANSAKSI terkait dompet ini akan ikut TERHAPUS PERMANEN.')) return

        // 1. Delete associated transactions first
        const { error: txError } = await supabase.from('transactions').delete().eq('wallet_id', id)

        if (txError) {
            console.error(txError)
            return alert('Gagal menghapus riwayat transaksi terkait')
        }

        // 2. Delete the wallet
        const { error } = await supabase.from('wallets').delete().eq('id', id)

        if (error) {
            alert('Gagal menghapus dompet')
        } else {
            fetchWallets()
        }
    }

    const handleEdit = (w: Wallet) => {
        setEditingId(w.id)
        setName(w.name)
        setType(w.type)
        setCategory(w.category || 'active')
        setBalance(w.balance.toString())
        setIsModalOpen(true)
    }

    const getIcon = (type: string) => {
        switch (type) {
            case 'bank': return <CreditCard className="w-6 h-6" />
            case 'ewallet': return <WalletIcon className="w-6 h-6" />
            case 'cash': return <Banknote className="w-6 h-6" />
            default: return <WalletIcon className="w-6 h-6" />
        }
    }

    const getColor = (type: string) => {
        switch (type) {
            case 'bank': return 'bg-blue-600'
            case 'ewallet': return 'bg-purple-600'
            case 'cash': return 'bg-emerald-600'
            default: return 'bg-slate-600'
        }
    }

    return (
        <main className="min-h-screen bg-transparent font-sans text-slate-900 pb-24 md:pb-6 ml-0 md:ml-72 p-6 transition-all duration-300">
            <header className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800">Dompet Saya</h1>
                    <p className="text-slate-500">Kelola sumber dana anda</p>
                </div>
            </header>

            {/* Floating Action Button */}
            <button
                onClick={() => setIsModalOpen(true)}
                className="fixed bottom-10 right-6 md:bottom-10 md:right-10 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 !text-white p-4 rounded-full shadow-premium-lg hover:shadow-purple-500/50 transition-all active:scale-90 hover:scale-110 z-40"
            >
                <Plus className="w-8 h-8 !text-white" />
            </button>

            {loading ? (
                <div className="text-center py-12 text-slate-400">Loading...</div>
            ) : wallets.length === 0 ? (
                <div className="text-center py-12 text-slate-400 border-2 border-dashed border-slate-200 rounded-3xl">
                    <p>Belum ada dompet. Tambahkan sekarang!</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {wallets.map((wallet) => (
                        <div key={wallet.id} className="glass shadow-premium-lg p-6 rounded-3xl border border-white/20 flex flex-col justify-between group card-hover backdrop-blur-xl">
                            <div>
                                <div className="flex justify-between items-start mb-4">
                                    <div className={`p-3 rounded-2xl text-white ${getColor(wallet.type)}`}>
                                        {getIcon(wallet.type)}
                                    </div>
                                    <div className="flex gap-1">
                                        <button onClick={() => handleEdit(wallet)} className="p-2 bg-slate-50 rounded-lg text-blue-500 hover:bg-blue-100 transition-colors">
                                            <Pencil className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => handleDelete(wallet.id)} className="p-2 bg-rose-50 rounded-lg text-rose-500 hover:bg-rose-100 transition-colors">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                                <h3 className="font-bold text-lg text-slate-800">{wallet.name}</h3>
                                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">{wallet.type}</p>
                            </div>
                            <div>
                                <p className="text-sm text-slate-500 mb-1">Saldo Saat Ini</p>
                                <p className="text-2xl font-extrabold text-slate-800">Rp {wallet.balance.toLocaleString('id-ID')}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={resetForm}></div>
                    <div className="glass backdrop-blur-2xl w-full max-w-md rounded-3xl shadow-premium-lg border border-white/20 z-50 p-6 relative animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-slate-800">{editingId ? 'Edit Dompet' : 'Tambah Dompet'}</h3>
                            <button onClick={resetForm} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleSave} className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Nama Dompet</label>
                                <input
                                    type="text"
                                    placeholder="Contoh: BCA Utama"
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Tipe</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {['bank', 'ewallet', 'cash'].map((t) => (
                                        <button
                                            key={t}
                                            type="button"
                                            onClick={() => setType(t as any)}
                                            className={`py-2 px-3 rounded-xl text-sm font-bold border transition-all ${type === t ? 'bg-blue-50 border-blue-500 text-blue-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                        >
                                            {t.toUpperCase()}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Kategori Dompet</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setCategory('active')}
                                        className={`py-2 px-3 rounded-xl text-sm font-bold border transition-all ${category === 'active' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                    >
                                        SALDO AKTIF
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setCategory('savings')}
                                        className={`py-2 px-3 rounded-xl text-sm font-bold border transition-all ${category === 'savings' ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                    >
                                        TABUNGAN
                                    </button>
                                </div>
                                <p className="text-xs text-slate-400 mt-2">
                                    {category === 'active' ? 'Dihitung sebagai saldo aktif di dashboard.' : 'Tidak dihitung di saldo aktif utama.'}
                                </p>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Saldo Awal (Rp)</label>
                                <MoneyInput
                                    value={balance}
                                    onChange={setBalance}
                                />
                            </div>
                            <button type="submit" className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 !text-white font-bold py-3 rounded-xl shadow-premium-lg hover:shadow-purple-500/50 transition-all active:scale-95">
                                Simpan
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </main>
    )
}

'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Budget, Transaction, CATEGORIES, Wallet, CustomCategoryDef } from '@/types'
import { Plus, Trash2, Pencil, X, ChevronLeft, ChevronRight, Calendar, AlertTriangle, MoreHorizontal } from 'lucide-react'
import { useIsWeb } from '@/hooks/useIsWeb'
import EmptyState from '@/components/EmptyState'
import Link from 'next/link'
import { useToast } from '@/hooks/useToast'
import { useConfirm } from '@/hooks/useConfirm'
import { useSuccessModal } from '@/hooks/useSuccessModal'
import NeoSelect from '@/components/NeoSelect'
import DatePickerNeo from '@/components/DatePickerNeo'
import PeriodSheet from '@/components/PeriodSheet'
import { getCategoryIcon } from '@/lib/categories'
import { SkeletonCards } from '@/components/Skeleton'
import FieldError from '@/components/FieldError'

// Built-in category -> catatduit color class (DESIGN.md section 6).
const CAT_CLASS: Record<string, string> = {
  'Kebutuhan Dapur': 'c-dapur', 'Makan di Luar': 'c-makan', 'Transportasi': 'c-transport',
  'Tempat Tinggal': 'c-rumah', 'Tagihan': 'c-tagihan', 'Belanja': 'c-belanja',
  'Kesehatan': 'c-kesehatan', 'Cicilan & Utang': 'c-cicilan', 'Pribadi & Hiburan': 'c-hiburan',
  'Edukasi & Donasi': 'c-edukasi', 'Lainnya': 'c-lain',
}
const getName = (c: string | CustomCategoryDef) => (typeof c === 'string' ? c : c.name)
const rp = (n: number) => `Rp ${n.toLocaleString('id-ID')}`
const shortRp = (n: number) => {
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(n % 1_000_000 ? 1 : 0)}jt`
  if (n >= 1_000) return `Rp ${Math.round(n / 1_000)}rb`
  return `Rp ${n}`
}

export default function BudgetsPage() {
    const [budgets, setBudgets] = useState<Budget[]>([])
    const [customCategories, setCustomCategories] = useState<{ pengeluaran: (string | CustomCategoryDef)[], pemasukan: (string | CustomCategoryDef)[] }>({ pengeluaran: [], pemasukan: [] })
    const [transactions, setTransactions] = useState<Transaction[]>([])
    const [wallets, setWallets] = useState<Wallet[]>([])
    const [loading, setLoading] = useState(true)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [currentDate, setCurrentDate] = useState(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('budget_currentDate')
            if (saved) return new Date(saved)
        }
        return new Date()
    })
    const [filterMode, setFilterMode] = useState<'monthly' | 'custom'>(() => {
        if (typeof window !== 'undefined') {
            return (localStorage.getItem('budget_filterMode') as 'monthly' | 'custom') || 'monthly'
        }
        return 'monthly'
    })
    const [customRange, setCustomRange] = useState(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('budget_customRange')
            if (saved) return JSON.parse(saved)
        }
        return {
            start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
            end: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0]
        }
    })
    const [showSettings, setShowSettings] = useState(false)
    const isWeb = useIsWeb()
    // Budget action sheet (DESIGN-TAMBAHAN §7 / AksiBudget)
    const [actionBudget, setActionBudget] = useState<{ b: Budget; spent: number; pct: number; over: boolean; near: boolean } | null>(null)

    const { showToast } = useToast()
    const { showConfirm } = useConfirm()
    const { showSuccess } = useSuccessModal()

    // Form State
    const [editingId, setEditingId] = useState<number | null>(null)
    const [category, setCategory] = useState('')
    const [amount, setAmount] = useState('')
    const [budgetStartDate, setBudgetStartDate] = useState(() => {
        return new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
    })
    const [budgetEndDate, setBudgetEndDate] = useState(() => {
        return new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0]
    })

    // Quick Expense State
    const [isQuickExpModalOpen, setIsQuickExpModalOpen] = useState(false)
    const [quickExpCategory, setQuickExpCategory] = useState('')
    const [quickExpAmount, setQuickExpAmount] = useState('')
    const [quickExpWalletId, setQuickExpWalletId] = useState('')

    // Inline validation errors (DESIGN-TAMBAHAN.md §5)
    const [errors, setErrors] = useState<Record<string, string>>({})
    const [qErrors, setQErrors] = useState<Record<string, string>>({})
    const clearErr = (k: string) => setErrors(prev => { const n = { ...prev }; delete n[k]; return n })
    const clearQErr = (k: string) => setQErrors(prev => { const n = { ...prev }; delete n[k]; return n })

    // Persist filter settings to localStorage whenever they change
    useEffect(() => {
        localStorage.setItem('budget_filterMode', filterMode)
    }, [filterMode])

    useEffect(() => {
        localStorage.setItem('budget_customRange', JSON.stringify(customRange))
    }, [customRange])

    useEffect(() => {
        localStorage.setItem('budget_currentDate', currentDate.toISOString())
    }, [currentDate])

    useEffect(() => {
        fetchAllData()
    }, [currentDate, filterMode, customRange])

    const fetchAllData = async () => {
        setLoading(true)

        let targetDate = currentDate
        let startIso: string
        let endIso: string

        if (filterMode === 'monthly') {
            startIso = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString()
            endIso = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59).toISOString()
        } else {
            const sd = new Date(customRange.start)
            sd.setHours(0, 0, 0, 0)
            startIso = sd.toISOString()

            const ed = new Date(customRange.end)
            ed.setHours(23, 59, 59, 999)
            endIso = ed.toISOString()
            targetDate = new Date(customRange.end)
        }

        const targetStartDateStr = startIso.split('T')[0]
        const targetEndDateStr = endIso.split('T')[0]

        const [settingsRes, walletsRes, budgetsRes, transactionsRes] = await Promise.all([
            supabase.from('user_settings').select('*').eq('id', 1).single(),
            supabase.from('wallets').select('*'),
            supabase.from('budgets').select('*').lte('start_date', targetEndDateStr).gte('end_date', targetStartDateStr),
            supabase.from('transactions').select('*').gte('date', startIso).lte('date', endIso).eq('type', 'pengeluaran')
        ])

        if (settingsRes.data && settingsRes.data.custom_categories) {
            try {
                setCustomCategories(settingsRes.data.custom_categories as { pengeluaran: (string | CustomCategoryDef)[], pemasukan: (string | CustomCategoryDef)[] })
            } catch (e) { }
        }

        if (walletsRes.data) setWallets(walletsRes.data)
        
        if (budgetsRes.error) showToast('error', 'Gagal memuat budget')
        if (budgetsRes.data) setBudgets(budgetsRes.data)
        
        if (transactionsRes.data) setTransactions(transactionsRes.data as unknown as Transaction[])

        setLoading(false)
    }

    const resetForm = () => {
        setCategory('')
        setAmount('')
        setEditingId(null)

        let startD, endD
        if (filterMode === 'monthly') {
            startD = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString().split('T')[0]
            endD = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).toISOString().split('T')[0]
        } else {
            startD = customRange.start
            endD = customRange.end
        }
        setBudgetStartDate(startD)
        setBudgetEndDate(endD)

        setErrors({})
        setIsModalOpen(false)
    }

    const resetQuickExpForm = () => {
        setQuickExpCategory('')
        setQuickExpAmount('')
        setQuickExpWalletId('')
        setQErrors({})
        setIsQuickExpModalOpen(false)
    }

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        const err: Record<string, string> = {}
        if (!category) err.category = 'Pilih satu kategori.'
        if (!amount || parseFloat(amount) <= 0) err.amount = 'Isi jumlah lebih dari Rp 0.'
        if (budgetStartDate && budgetEndDate && new Date(budgetStartDate) > new Date(budgetEndDate)) err.dates = 'Tanggal mulai harus sebelum tanggal selesai.'
        setErrors(err)
        if (Object.keys(err).length > 0) return

        const payload = {
            category,
            amount: parseFloat(amount),
            start_date: budgetStartDate,
            end_date: budgetEndDate
        }

        let error
        if (editingId) {
            const res = await supabase.from('budgets').update(payload).eq('id', editingId)
            error = res.error
        } else {
            // Check duplicate overlap (query langsung dari DB)
            const { data: existingBudgets } = await supabase
                .from('budgets')
                .select('id')
                .eq('category', category)
                .lte('start_date', budgetEndDate)
                .gte('end_date', budgetStartDate)
                .limit(1)
            if (existingBudgets && existingBudgets.length > 0) {
                return setErrors({ category: `Budget ${category} untuk tanggal ini sudah ada. Ubah budget yang lama atau pilih tanggal lain.` })
            }

            const res = await supabase.from('budgets').insert([payload])
            error = res.error
        }

        if (error) {
            console.error(error)
            showToast('error', 'Budget gagal disimpan. Coba lagi.')
        } else {
            fetchAllData()
            resetForm()
            showToast('success', editingId ? 'Perubahan tersimpan' : 'Budget ditambahkan')
        }
    }

    const handleQuickExpenseSave = async (e: React.FormEvent) => {
        e.preventDefault()
        const qe: Record<string, string> = {}
        if (!quickExpAmount || parseFloat(quickExpAmount) <= 0) qe.amount = 'Isi jumlah lebih dari Rp 0.'
        if (!quickExpWalletId) qe.wallet = 'Pilih dompet.'
        const wallet = wallets.find(w => w.id === parseInt(quickExpWalletId))
        if (quickExpWalletId && wallet && !qe.amount && wallet.balance < parseFloat(quickExpAmount)) {
            qe.wallet = `Saldo ${wallet.name} kurang Rp ${(parseFloat(quickExpAmount) - wallet.balance).toLocaleString('id-ID')}. Pilih dompet lain atau ubah jumlah.`
        }
        setQErrors(qe)
        if (Object.keys(qe).length > 0 || !wallet) return

        // 1. Insert Transaction
        // Fix timezone bug: pakai T12:00:00 agar tidak shift 1 hari di WIB (sama dengan pattern di handleSaveTransaction)
        const todayStr = new Date().toISOString().split('T')[0]
        const safeDate = new Date(`${todayStr}T12:00:00`).toISOString()
        const payload = {
            title: `Pengeluaran ${quickExpCategory}`,
            amount: parseFloat(quickExpAmount),
            type: 'pengeluaran',
            category: quickExpCategory,
            wallet_id: parseInt(quickExpWalletId),
            date: safeDate,
            created_at: new Date().toISOString()
        }

        const { error: txError } = await supabase.from('transactions').insert([payload])

        if (txError) {
            console.error(txError)
            return showToast('error', 'Pengeluaran gagal disimpan. Coba lagi.')
        }

        // 2. Update Wallet Balance
        const newBalance = wallet.balance - parseFloat(quickExpAmount)
        await supabase.from('wallets').update({ balance: newBalance }).eq('id', wallet.id)

        fetchAllData()
        resetQuickExpForm()
        showToast('success', 'Pengeluaran tersimpan')
    }

    const handleDelete = async (id: number) => {
        const budget = budgets.find(b => b.id === id)
        const confirm = await showConfirm({
            title: `Hapus budget “${budget?.category ?? ''}”?`,
            message: 'Transaksi yang sudah tercatat tidak ikut terhapus.',
            confirmText: 'Hapus budget',
            cancelText: 'Batal',
        })
        if (!confirm) return

        // 1. Simpan state sebelumnya untuk rollback
        const previousBudgets = [...budgets]

        // 2. Optimistic update: langsung hapus dari state lokal
        setBudgets(prev => prev.filter(b => b.id !== id))

        // 3. Request ke database
        const { error } = await supabase.from('budgets').delete().eq('id', id)

        if (!error) {
            // Fetch di background untuk memastikan sync
            fetchAllData()
            showToast('success', 'Budget dihapus')
        } else {
            // 4. Rollback jika gagal
            setBudgets(previousBudgets)
            showToast('error', 'Budget gagal dihapus. Coba lagi.')
        }
    }

    const handleEdit = (b: Budget) => {
        setEditingId(b.id)
        setCategory(b.category)
        setAmount(b.amount.toString())
        setBudgetStartDate(b.start_date)
        setBudgetEndDate(b.end_date)
        setIsModalOpen(true)
    }

    const openQuickExp = (cat: string) => {
        setQuickExpCategory(cat)
        setQuickExpAmount('')
        setQuickExpWalletId('')
        setIsQuickExpModalOpen(true)
    }

    // Calculations
    const getSpentAmount = (cat: string) => {
        return transactions.filter(t => t.category === cat).reduce((acc, curr) => acc + curr.amount, 0)
    }

    const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
    const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))

    const getPeriodLabel = () => {
        if (filterMode === 'monthly') {
            return currentDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
        } else {
            const start = new Date(customRange.start)
            const end = new Date(customRange.end)
            return `${start.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} - ${end.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}`
        }
    }

    // ── Derived values for the redesigned view ──────────────────────────────
    const totalBudget = budgets.reduce((a, b) => a + b.amount, 0)
    const totalSpent = budgets.reduce((a, b) => a + getSpentAmount(b.category), 0)
    const totalSisa = Math.max(totalBudget - totalSpent, 0)
    const totalPct = totalBudget > 0 ? Math.min(100, Math.round((totalSpent / totalBudget) * 100)) : 0
    const periodEnd = filterMode === 'monthly'
        ? new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
        : new Date(customRange.end)
    periodEnd.setHours(23, 59, 59, 999)
    const daysLeft = Math.max(0, Math.ceil((periodEnd.getTime() - Date.now()) / 86400000))
    const perDay = daysLeft > 0 ? Math.floor(totalSisa / daysLeft) : totalSisa

    const ranked = [...budgets].map(b => {
        const spent = getSpentAmount(b.category)
        const pct = b.amount > 0 ? (spent / b.amount) * 100 : 0
        return { b, spent, pct, over: spent > b.amount, near: spent <= b.amount && pct >= 80 }
    }).sort((a, z) => (z.over ? 1 : 0) - (a.over ? 1 : 0) || z.pct - a.pct)
    const overCount = ranked.filter(r => r.over).length
    const nearCount = ranked.filter(r => r.near).length
    const warnParts = [overCount ? `${overCount} budget lewat batas` : '', nearCount ? `${nearCount} hampir habis` : ''].filter(Boolean)

    // Categories without a budget this period (DESIGN.md 7.6), keeping the one being edited.
    const catOptions = [
        ...CATEGORIES.pengeluaran.map(c => c.name),
        ...((customCategories.pengeluaran || []).map(getName)),
    ] // All expense categories; clashes are rejected on save (DESIGN-TAMBAHAN §1)

    // Sheets / dialogs shared by the mobile and web layouts.
    const overlays = (
        <>
            {/* Budget action sheet (AksiBudget) */}
            {actionBudget && (() => {
                const { b, spent, pct, over, near } = actionBudget
                const { Icon } = getCategoryIcon(b.category, 'pengeluaran', customCategories)
                const fmt = (d: string) => new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
                const close = () => setActionBudget(null)
                return (
                    <>
                        <div className="scrim" onClick={close} />
                        <div className="sheet" role="dialog" aria-labelledby="ab-title" style={{ gap: 12 }}>
                            <div className="grabber" />
                            <div className="hstack" style={{ gap: 12 }}>
                                <div className={`ic ${CAT_CLASS[b.category] || 'c-lain'}`}><Icon className="i" /></div>
                                <div className="grow"><h2 className="h2" id="ab-title">{b.category}</h2><div className="meta">{rp(spent)} dari {rp(b.amount)} · {fmt(b.start_date)} – {fmt(b.end_date)}</div></div>
                            </div>
                            <div className={`bar ${over ? 'over' : ''}`}><div style={{ width: `${Math.min(pct, 100)}%`, ...(over ? {} : near ? { background: '#F59E0B' } : {}) }} /></div>
                            <div className="stack" style={{ gap: 0, marginTop: 4 }}>
                                <button className="act" onClick={() => { close(); openQuickExp(b.category) }}><span className="ic-s" style={{ background: 'var(--accent-tint)', color: 'var(--accent)' }}><Plus className="i i-s" /></span><span className="grow">Catat pengeluaran</span></button>
                                <button className="act" onClick={() => { close(); handleEdit(b) }}><span className="ic-s c-lain"><Pencil className="i i-s" /></span><span className="grow">Ubah budget</span></button>
                                <button className="act" style={{ color: 'var(--danger)' }} onClick={() => { close(); handleDelete(b.id) }}><span className="ic-s" style={{ background: 'var(--danger-tint)', color: 'var(--danger)' }}><Trash2 className="i i-s" /></span><span className="grow">Hapus budget</span></button>
                            </div>
                        </div>
                    </>
                )
            })()}

            {/* Filter & period sheet */}
            <PeriodSheet
                isOpen={showSettings}
                onClose={() => setShowSettings(false)}
                filterMode={filterMode}
                setFilterMode={setFilterMode}
                currentDate={currentDate}
                setCurrentDate={setCurrentDate}
                customRange={customRange}
                setCustomRange={setCustomRange}
            />

            {/* Create / edit budget sheet */}
            {isModalOpen && (
                <>
                    <div className="scrim" onClick={resetForm} />
                    <div className="sheet">
                        <div className="grabber" />
                        <div className="between"><h2 className="h2">{editingId ? 'Ubah budget' : 'Buat budget'}</h2><button className="icon-btn ghost" aria-label="Tutup" onClick={resetForm}><X className="i" /></button></div>
                        <form onSubmit={handleSave} className="stack-12">
                            <div className="field">Kategori
                                <div className="g2">
                                    {catOptions.map(name => {
                                        const { Icon } = getCategoryIcon(name, 'pengeluaran', customCategories)
                                        const cls = CAT_CLASS[name] || 'c-lain'
                                        return (
                                            <button key={name} type="button" className={`catb ${category === name ? 'on' : ''} ${errors.category ? 'bad' : ''}`} style={{ minHeight: 56, flexDirection: 'row', justifyContent: 'flex-start', gap: 8, padding: '0 10px' }} onClick={() => { setCategory(name); clearErr('category') }}>
                                                <span className={`ic-s ${cls}`}><Icon className="i i-s" /></span>
                                                <span style={{ textAlign: 'left' }}>{name}</span>
                                            </button>
                                        )
                                    })}
                                </div>
                                <FieldError>{errors.category}</FieldError>
                            </div>
                            <label className="field">Batas (Rp)
                                <input className={`input ${errors.amount ? 'bad' : ''}`} inputMode="numeric" placeholder="0" value={amount ? parseInt(amount.replace(/\D/g, '') || '0').toLocaleString('id-ID') : ''} onChange={(e) => { setAmount(e.target.value.replace(/\D/g, '')); clearErr('amount') }} />
                                <FieldError>{errors.amount}</FieldError>
                            </label>
                            <div className="g2">
                                <label className="field">Tanggal mulai<DatePickerNeo className={`input ${errors.dates ? 'bad' : ''}`} value={budgetStartDate} onChange={(e) => { setBudgetStartDate(e.target.value); clearErr('dates') }} required /></label>
                                <label className="field">Tanggal selesai<DatePickerNeo className={`input ${errors.dates ? 'bad' : ''}`} value={budgetEndDate} onChange={(e) => { setBudgetEndDate(e.target.value); clearErr('dates') }} required /></label>
                            </div>
                            <FieldError>{errors.dates}</FieldError>
                            <button type="submit" className="btn btn-block">{editingId ? 'Simpan perubahan' : 'Simpan budget'}</button>
                            {editingId && (
                                <button type="button" className="link" style={{ color: 'var(--danger)', alignSelf: 'center', padding: '8px 0', display: 'inline-flex', alignItems: 'center', gap: 6 }} onClick={() => { const id = editingId; resetForm(); handleDelete(id) }}>
                                    <Trash2 className="i i-s" />Hapus budget
                                </button>
                            )}
                        </form>
                    </div>
                </>
            )}

            {/* Quick expense sheet */}
            {isQuickExpModalOpen && (
                <>
                    <div className="scrim" onClick={resetQuickExpForm} />
                    <div className="sheet">
                        <div className="grabber" />
                        <div className="between"><div><h2 className="h2">Catat pengeluaran</h2><div className="lbl">Kategori: {quickExpCategory}</div></div><button className="icon-btn ghost" aria-label="Tutup" onClick={resetQuickExpForm}><X className="i" /></button></div>
                        <form onSubmit={handleQuickExpenseSave} className="stack-12">
                            <label className="field">Jumlah (Rp)
                                <input className={`input ${qErrors.amount ? 'bad' : ''}`} inputMode="numeric" autoFocus placeholder="0" value={quickExpAmount ? parseInt(quickExpAmount.replace(/\D/g, '') || '0').toLocaleString('id-ID') : ''} onChange={(e) => { setQuickExpAmount(e.target.value.replace(/\D/g, '')); clearQErr('amount'); clearQErr('wallet') }} />
                                <FieldError>{qErrors.amount}</FieldError>
                            </label>
                            <div className="field">Ambil dari dompet
                                <NeoSelect value={quickExpWalletId} onChange={(v) => { setQuickExpWalletId(v); clearQErr('wallet') }} options={wallets.map(w => ({ label: `${w.name} (${rp(w.balance)})`, value: w.id.toString() }))} placeholder="Pilih dompet" />
                                <FieldError>{qErrors.wallet}</FieldError>
                            </div>
                            <button type="submit" className="btn btn-block">Simpan pengeluaran</button>
                        </form>
                    </div>
                </>
            )}
        </>
    )

    // ── Web (>=768px): BudgetWeb — summary row + card grid; forms open as modals ──
    if (isWeb) {
        return (
            <div className="cd" style={{ minHeight: '100vh', background: 'var(--bg)' }}>
                <main className="main">
                    <div className="ptop">
                        <h1 className="ptitle">Budget</h1>
                        <div className="hstack" style={{ flexWrap: 'wrap', gap: 8 }}>
                            <button className="icon-btn" aria-label="Periode sebelumnya" disabled={filterMode === 'custom'} onClick={prevMonth}><ChevronLeft className="i i-s" /></button>
                            <button className="btn-2" onClick={() => setShowSettings(true)}><Calendar className="i i-s" />{getPeriodLabel()}</button>
                            <button className="icon-btn" aria-label="Periode berikutnya" disabled={filterMode === 'custom'} onClick={nextMonth}><ChevronRight className="i i-s" /></button>
                            <button className="btn" onClick={() => { resetForm(); setIsModalOpen(true) }}><Plus className="i i-s" />Buat budget</button>
                        </div>
                    </div>

                    <div className="wrap">
                        <div className="card stack-12" style={{ flex: '2 1 380px', padding: 20 }}>
                            <span className="lbl">Terpakai dari total budget</span>
                            <div className="hstack" style={{ alignItems: 'baseline', gap: 6 }}><span className="num-l">{rp(totalSpent)}</span><span className="sub">/ {rp(totalBudget)}</span></div>
                            <div className={`bar thick ${totalSpent > totalBudget ? 'over' : ''}`}><div style={{ width: `${totalPct}%` }} /></div>
                            <div className="between" style={{ fontSize: 13 }}><span>Sisa <b>{rp(totalSisa)}</b></span><span className="lbl">{totalPct}% terpakai · {daysLeft} hari lagi</span></div>
                        </div>
                        <div className="card stack" style={{ flex: '1 1 220px', padding: 20 }}>
                            <span className="lbl">Aman dipakai per hari</span>
                            <span className="num-l">± {rp(perDay)}</span>
                            <span className="lbl">Untuk {daysLeft} hari tersisa</span>
                        </div>
                        <div className="card stack" style={{ flex: '1 1 220px', padding: 20 }}>
                            <span className="lbl">Status</span>
                            <div className="hstack" style={{ flexWrap: 'wrap', gap: 6 }}>
                                {overCount > 0 && <span className="badge b-bad">{overCount} lewat batas</span>}
                                {nearCount > 0 && <span className="badge b-warn">{nearCount} hampir habis</span>}
                                {ranked.length - overCount - nearCount > 0 && <span className="badge b-ok">{ranked.length - overCount - nearCount} aman</span>}
                                {ranked.length === 0 && <span className="lbl">Belum ada budget</span>}
                            </div>
                        </div>
                    </div>

                    {loading ? (
                        <SkeletonCards count={4} />
                    ) : ranked.length === 0 ? (
                        <EmptyState icon={<Calendar className="i" />} title="Belum ada budget periode ini" text="Batasi kategori yang paling boros dulu." actionLabel="Buat budget" onAction={() => { resetForm(); setIsModalOpen(true) }} />
                    ) : (
                        <div className="bgrid">
                            {ranked.map(({ b, spent, pct, over, near }) => {
                                const { Icon } = getCategoryIcon(b.category, 'pengeluaran', customCategories)
                                const cls = CAT_CLASS[b.category] || 'c-lain'
                                const sisa = Math.max(b.amount - spent, 0)
                                return (
                                    <button type="button" className="card stack note-card" key={b.id} aria-label={`Aksi budget ${b.category}`} onClick={() => setActionBudget({ b, spent, pct, over, near })}>
                                        <div className="hstack" style={{ gap: 12 }}>
                                            <div className={`ic ${cls}`}><Icon className="i" /></div>
                                            <div className="grow" style={{ minWidth: 0 }}>
                                                <div className="t">{b.category}</div>
                                                <div className="meta">{rp(spent)} dari {rp(b.amount)}</div>
                                            </div>
                                            <MoreHorizontal className="i i-s" style={{ color: 'var(--text-2)', flexShrink: 0 }} />
                                        </div>
                                        <div className={`bar ${over ? 'over' : ''}`}><div style={{ width: `${Math.min(pct, 100)}%`, ...(over ? {} : near ? { background: '#F59E0B' } : {}) }} /></div>
                                        {over ? <span className="badge b-bad" style={{ alignSelf: 'flex-start' }}>Lewat {shortRp(spent - b.amount)}</span>
                                            : near ? <span className="badge b-warn" style={{ alignSelf: 'flex-start' }}>Sisa {shortRp(sisa)}</span>
                                                : <span className="lbl" style={{ fontWeight: 600 }}>Sisa {shortRp(sisa)}</span>}
                                    </button>
                                )
                            })}
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
                        <h1 className="h1">Budget</h1>
                    </div>
                    <button className="icon-btn" aria-label="Buat budget" onClick={() => { resetForm(); setIsModalOpen(true) }}><Plus className="i" /></button>
                </div>

                {/* Period selector */}
                <div className="hstack" style={{ gap: 4 }}>
                    <button className="icon-btn ghost" style={{ width: 36, height: 36 }} aria-label="Periode sebelumnya" disabled={filterMode === 'custom'} onClick={prevMonth}><ChevronLeft className="i i-s" /></button>
                    <button className="chip" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setShowSettings(s => !s)}>
                        <Calendar className="i i-s" />{getPeriodLabel()}
                    </button>
                    <button className="icon-btn ghost" style={{ width: 36, height: 36 }} aria-label="Periode berikutnya" disabled={filterMode === 'custom'} onClick={nextMonth}><ChevronRight className="i i-s" /></button>
                </div>

                {/* Total card */}
                <div className="card stack-12">
                    <div className="between"><span className="lbl">Terpakai dari total budget</span><span className="lbl">{daysLeft} hari lagi</span></div>
                    <div className="hstack" style={{ alignItems: 'baseline', gap: 6 }}><span className="num-l">{rp(totalSpent)}</span><span className="sub">/ {rp(totalBudget)}</span></div>
                    <div className={`bar thick ${totalSpent > totalBudget ? 'over' : ''}`}><div style={{ width: `${totalPct}%` }} /></div>
                    <div className="between" style={{ fontSize: 13 }}><span>Sisa <b>{rp(totalSisa)}</b></span><span className="lbl">Aman dipakai ± {shortRp(perDay)} per hari</span></div>
                </div>

                {warnParts.length > 0 && (
                    <div className="banner warn"><AlertTriangle className="i" />{warnParts.join(', ')}</div>
                )}

                {/* Budget list */}
                {loading ? (
                    <SkeletonCards count={4} />
                ) : ranked.length === 0 ? (
                    <div className="card" style={{ textAlign: 'center' }}>
                        <p className="t" style={{ whiteSpace: 'normal' }}>Belum ada budget periode ini</p>
                        <p className="lbl" style={{ marginTop: 4 }}>Batasi kategori yang paling boros dulu.</p>
                        <button className="btn btn-block" style={{ marginTop: 12 }} onClick={() => { resetForm(); setIsModalOpen(true) }}>Buat budget</button>
                    </div>
                ) : (
                    ranked.map(({ b, spent, pct, over, near }) => {
                        const { Icon } = getCategoryIcon(b.category, 'pengeluaran', customCategories)
                        const cls = CAT_CLASS[b.category] || 'c-lain'
                        const sisa = Math.max(b.amount - spent, 0)
                        return (
                            <button type="button" className="card stack note-card" key={b.id} aria-label={`Aksi budget ${b.category}`} onClick={() => setActionBudget({ b, spent, pct, over, near })}>
                                <div className="hstack" style={{ gap: 12 }}>
                                    <div className={`ic ${cls}`}><Icon className="i" /></div>
                                    <div className="grow">
                                        <div className="t">{b.category}</div>
                                        <div className="meta">{rp(spent)} dari {rp(b.amount)}</div>
                                    </div>
                                    {over ? <span className="badge b-bad">Lewat {shortRp(spent - b.amount)}</span>
                                        : near ? <span className="badge b-warn">Sisa {shortRp(sisa)}</span>
                                            : <span className="lbl" style={{ fontWeight: 600 }}>Sisa {shortRp(sisa)}</span>}
                                </div>
                                <div className={`bar ${over ? 'over' : ''}`}>
                                    <div style={{ width: `${Math.min(pct, 100)}%`, ...(over ? {} : near ? { background: '#F59E0B' } : {}) }} />
                                </div>
                            </button>
                        )
                    })
                )}

                {!loading && ranked.length > 0 && (
                    <button className="btn-2 btn-block" onClick={() => { resetForm(); setIsModalOpen(true) }}><Plus className="i i-s" />Buat budget</button>
                )}
            </div>

            {overlays}
        </div>
    )
}


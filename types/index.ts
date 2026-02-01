export interface Wallet {
    id: number
    name: string
    type: 'bank' | 'ewallet' | 'cash'
    category: 'active' | 'savings'
    balance: number
    created_at?: string
    source_wallet_id?: number | null
}

export interface Budget {
    id: number
    category: string
    amount: number
    month: string // YYYY-MM-DD (first day of month)
    created_at?: string
}

export interface Goal {
    id: number
    name: string
    target_amount: number
    current_amount: number
    deadline?: string
    created_at?: string
}

export interface Transaction {
    id: number
    title: string
    amount: number
    type: 'pemasukan' | 'pengeluaran'
    category: string
    wallet_id?: number
    date: string // ISO string
    created_at: string
}

export interface Debt {
    id: number
    person_name: string
    amount: number
    status: 'pending' | 'paid'
    original_transaction_id?: number
    payment_wallet_id?: number
    payment_transaction_id?: number
    note?: string
    created_at: string
    paid_at?: string
}

export const CATEGORIES = {
    pengeluaran: [
        { name: 'Makanan', color: 'bg-orange-100 text-orange-600' },
        { name: 'Transport', color: 'bg-blue-100 text-blue-600' },
        { name: 'Belanja', color: 'bg-purple-100 text-purple-600' },
        { name: 'Tagihan', color: 'bg-yellow-100 text-yellow-600' },
        { name: 'Rumah', color: 'bg-teal-100 text-teal-600' },
        { name: 'Hiburan', color: 'bg-pink-100 text-pink-600' },
        { name: 'Kesehatan', color: 'bg-red-100 text-red-600' },
        { name: 'Lainnya', color: 'bg-slate-100 text-slate-600' },
    ],
    pemasukan: [
        { name: 'Gaji', color: 'bg-emerald-100 text-emerald-600' },
        { name: 'Hadiah', color: 'bg-pink-100 text-pink-600' },
        { name: 'Investasi', color: 'bg-indigo-100 text-indigo-600' },
        { name: 'Lainnya', color: 'bg-slate-100 text-slate-600' },
    ]
}

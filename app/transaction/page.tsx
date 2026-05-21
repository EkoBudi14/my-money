'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import TransactionModal from '@/components/TransactionModal'
import { Wallet, Transaction, Budget, CustomCategoryDef } from '@/types'
import { Suspense } from 'react'

function TransactionPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const typeParam = searchParams.get('type') as 'pemasukan' | 'pengeluaran' | 'topup' | null
  const editId = searchParams.get('edit')
  const navigatedRef = useRef(false)

  const [wallets, setWallets] = useState<Wallet[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [customCategories, setCustomCategories] = useState<{
    pengeluaran: (string | CustomCategoryDef)[]
    pemasukan: (string | CustomCategoryDef)[]
  }>({ pengeluaran: [], pemasukan: [] })
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAll = async () => {
      const [walletsRes, transactionsRes, budgetsRes, settingsRes] = await Promise.all([
        supabase.from('wallets').select('*'),
        supabase.from('transactions').select('*').order('created_at', { ascending: false }),
        supabase.from('budgets').select('*'),
        supabase.from('user_settings').select('*').eq('id', 1).single()
      ])

      setWallets(walletsRes.data || [])
      setTransactions(transactionsRes.data || [])
      setBudgets(budgetsRes.data || [])

      if (settingsRes.data?.custom_categories) {
        setCustomCategories(settingsRes.data.custom_categories)
      }

      // If editing, find the transaction
      if (editId) {
        const tx = (transactionsRes.data || []).find((t: Transaction) => t.id === parseInt(editId))
        if (tx) setEditingTransaction(tx)
      }

      setLoading(false)
    }

    fetchAll()
  }, [editId])

  const handleClose = () => {
    // Prevent double navigation if onSaved already navigated
    if (navigatedRef.current) return
    router.back()
  }

  const handleSaved = () => {
    // Navigate back to home, data will refresh there
    navigatedRef.current = true
    router.push('/')
  }

  const handleCustomCategoriesChange = (updated: { pengeluaran: (string | CustomCategoryDef)[]; pemasukan: (string | CustomCategoryDef)[] }) => {
    setCustomCategories(updated)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#EFF2F7] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-[#165DFF] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-500 font-medium">Memuat...</p>
        </div>
      </div>
    )
  }

  return (
    <TransactionModal
      isOpen={true}
      editingTransaction={editingTransaction}
      wallets={wallets}
      transactions={transactions}
      budgets={budgets}
      customCategories={customCategories}
      onClose={handleClose}
      onSaved={handleSaved}
      onCustomCategoriesChange={handleCustomCategoriesChange}
      mode="page"
      initialType={typeParam || 'pemasukan'}
    />
  )
}

export default function TransactionPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#EFF2F7] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-[#165DFF] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-500 font-medium">Memuat...</p>
        </div>
      </div>
    }>
      <TransactionPageContent />
    </Suspense>
  )
}

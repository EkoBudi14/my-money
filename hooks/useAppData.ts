'use client'

import { useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import {
  getTransactions, getWallets, getBudgets, getDebts, getGoals,
} from '@/lib/queries'
import { getRecurringBills } from '@/lib/recurring-bills'
import { Transaction, Wallet, Budget, Debt, Goal, Note, RecurringBill } from '@/types'

// Central query keys so every page shares the same cache entry for a table.
// Reusing a key across pages means the second page to read it is instant.
export const qk = {
  transactions: ['transactions'] as const,
  wallets: ['wallets'] as const,
  budgets: ['budgets'] as const,
  debts: ['debts'] as const,
  goals: ['goals'] as const,
  notes: ['notes'] as const,
  bills: ['bills'] as const,
  billPayments: (month: string) => ['billPayments', month] as const,
  settings: ['settings'] as const,
  filterHistory: ['filterHistory'] as const,
}

// Unwrap a Supabase result, throwing on error so React Query marks it failed.
async function unwrap<T>(p: PromiseLike<{ data: T | null; error: unknown }>): Promise<T> {
  const { data, error } = await p
  if (error) throw error
  return (data ?? ([] as unknown as T))
}

export const useTransactions = () =>
  useQuery({ queryKey: qk.transactions, queryFn: () => unwrap<Transaction[]>(getTransactions()) })

export const useWallets = () =>
  useQuery({ queryKey: qk.wallets, queryFn: () => unwrap<Wallet[]>(getWallets()) })

export const useBudgets = () =>
  useQuery({ queryKey: qk.budgets, queryFn: () => unwrap<Budget[]>(getBudgets()) })

export const useDebts = () =>
  useQuery({ queryKey: qk.debts, queryFn: () => unwrap<Debt[]>(getDebts()) })

export const useGoals = () =>
  useQuery({ queryKey: qk.goals, queryFn: () => unwrap<Goal[]>(getGoals()) })

export const useNotes = () =>
  useQuery({
    queryKey: qk.notes,
    queryFn: () => unwrap<Note[]>(
      supabase.from('notes').select('*').order('updated_at', { ascending: false }),
    ),
  })

export const useBills = () =>
  useQuery({ queryKey: qk.bills, queryFn: () => getRecurringBills() })

export const useBillPayments = (month: string) =>
  useQuery({
    queryKey: qk.billPayments(month),
    queryFn: async () => {
      const { data, error } = await supabase.from('bill_payments').select('bill_id').eq('month', month)
      if (error) throw error
      const map: Record<number, boolean> = {}
      data?.forEach(p => { map[p.bill_id] = true })
      return map
    },
  })

// user_settings row id=1 (filter mode + custom range + custom categories).
export const useSettings = () =>
  useQuery({
    queryKey: qk.settings,
    queryFn: async () => {
      const { data } = await supabase.from('user_settings').select('*').eq('id', 1).single()
      return data
    },
  })

export const useFilterHistory = () =>
  useQuery({
    queryKey: qk.filterHistory,
    queryFn: () => unwrap(
      supabase.from('filter_history').select('*').order('start_date', { ascending: true }),
    ),
  })

// Invalidate caches after a mutation so the affected pages revalidate.
// Stable identity (useCallback) so it is safe in useEffect dependency arrays.
export function useInvalidate() {
  const qc = useQueryClient()
  return useCallback(
    (keys: readonly (readonly unknown[])[]) =>
      Promise.all(keys.map(key => qc.invalidateQueries({ queryKey: key as unknown[] }))),
    [qc],
  )
}

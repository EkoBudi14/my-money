'use client'

import { useCallback } from 'react'
import { QueryClient, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import {
  getTransactions, getWallets, getBudgets, getDebts, getGoals,
} from '@/lib/queries'
import { getRecurringBills } from '@/lib/recurring-bills'
import { Transaction, Wallet, Budget, Debt, Goal, Note, Tag } from '@/types'

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
  tags: ['tags'] as const,
}

// Unwrap a Supabase result, throwing on error so React Query marks it failed.
async function unwrap<T>(p: PromiseLike<{ data: T | null; error: unknown }>): Promise<T> {
  const { data, error } = await p
  if (error) throw error
  return (data ?? ([] as unknown as T))
}

// Query definitions, shared by the hooks below and by prefetchAppData.
const q = {
  transactions: { queryKey: qk.transactions, queryFn: () => unwrap<Transaction[]>(getTransactions()) },
  wallets: { queryKey: qk.wallets, queryFn: () => unwrap<Wallet[]>(getWallets()) },
  budgets: { queryKey: qk.budgets, queryFn: () => unwrap<Budget[]>(getBudgets()) },
  debts: { queryKey: qk.debts, queryFn: () => unwrap<Debt[]>(getDebts()) },
  goals: { queryKey: qk.goals, queryFn: () => unwrap<Goal[]>(getGoals()) },
  notes: {
    queryKey: qk.notes,
    queryFn: () => unwrap<Note[]>(
      supabase.from('notes').select('*').order('updated_at', { ascending: false }),
    ),
  },
  bills: { queryKey: qk.bills, queryFn: () => getRecurringBills() },
  // user_settings row id=1 (filter mode + custom range + custom categories).
  settings: {
    queryKey: qk.settings,
    queryFn: async () => {
      const { data } = await supabase.from('user_settings').select('*').eq('id', 1).single()
      return data
    },
  },
  // Labels. null = the tags table does not exist yet (migration not run),
  // which hides every label UI instead of showing an error.
  tags: {
    queryKey: qk.tags,
    queryFn: async (): Promise<Tag[] | null> => {
      const { data, error } = await supabase.from('tags').select('*').order('created_at', { ascending: true })
      if (error) return null
      return (data ?? []) as Tag[]
    },
  },
  filterHistory: {
    queryKey: qk.filterHistory,
    queryFn: () => unwrap(
      supabase.from('filter_history').select('*').order('start_date', { ascending: true }),
    ),
  },
}

export const useTransactions = () => useQuery(q.transactions)
export const useWallets = () => useQuery(q.wallets)
export const useBudgets = () => useQuery(q.budgets)
export const useDebts = () => useQuery(q.debts)
export const useGoals = () => useQuery(q.goals)
export const useNotes = () => useQuery(q.notes)
export const useBills = () => useQuery(q.bills)
export const useSettings = () => useQuery(q.settings)
export const useFilterHistory = () => useQuery(q.filterHistory)
export const useTags = () => useQuery(q.tags)

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

// Warm every shared cache entry so the first visit to any page renders
// with data instead of a skeleton. Already-fresh entries are skipped.
export function prefetchAppData(qc: QueryClient) {
  return Promise.allSettled(Object.values(q).map(def => qc.prefetchQuery(def as Parameters<QueryClient['prefetchQuery']>[0])))
}

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

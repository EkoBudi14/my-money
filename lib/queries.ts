import { supabase } from '@/lib/supabase'

// Data-access layer: thin, typed wrappers around Supabase table reads.
// Each returns the Supabase query result ({ data, error, ... }) so callers keep
// full control over loading/error handling and state updates.

export const getTransactions = () =>
  supabase.from('transactions').select('*').order('created_at', { ascending: false })

export const getWallets = () =>
  supabase.from('wallets').select('*')

export const getGoals = () =>
  supabase.from('goals').select('*').order('created_at', { ascending: false })

export const getBudgets = () =>
  supabase.from('budgets').select('*')

export const getDebts = () =>
  supabase.from('debts').select('*').order('created_at', { ascending: false })

export const getLatestNote = () =>
  supabase.from('notes').select('*').order('updated_at', { ascending: false }).limit(1).single()

export const getNotesCount = () =>
  supabase.from('notes').select('*', { count: 'exact', head: true })

// Read the current balance of a wallet straight from the DB.
// Returns null when the wallet is missing or the query fails.
export async function getFreshWalletBalance(walletId: number): Promise<number | null> {
  const { data, error } = await supabase
    .from('wallets')
    .select('balance')
    .eq('id', walletId)
    .single()
  if (error || !data) return null
  return data.balance
}

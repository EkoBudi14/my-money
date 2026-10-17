import { supabase } from '@/lib/supabase'

/**
 * Restore a row deleted a moment ago (toast "Urungkan", DESIGN-TAMBAHAN §10).
 * Re-inserts with the original id so links stay intact; if the table does not
 * accept an explicit id, inserts it again without one.
 * Only used for rows with no side effects on balances (notes, budgets, goals).
 */
export async function restoreRow(table: 'notes' | 'budgets' | 'goals', row: Record<string, unknown>) {
  const first = await supabase.from(table).insert(row)
  if (!first.error) return true
  const rest = { ...row }
  delete rest.id
  const second = await supabase.from(table).insert(rest)
  return !second.error
}

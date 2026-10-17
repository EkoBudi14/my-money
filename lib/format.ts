// Percentage change from `prev` to `current`.
// When there is no previous value, report 100% if there is any current value, else 0%.
export function getPercentageChange(current: number, prev: number): number {
  if (prev === 0) return current > 0 ? 100 : 0
  return ((current - prev) / prev) * 100
}

// Human-readable label for the active period, in Indonesian.
export function formatPeriodLabel(
  filterMode: 'monthly' | 'custom',
  currentDate: Date,
  customRange: { start: string; end: string },
): string {
  if (filterMode === 'monthly') {
    return currentDate.toLocaleString('id-ID', { month: 'long', year: 'numeric' })
  }
  const s = new Date(customRange.start)
  const e = new Date(customRange.end)
  return `${s.getDate()} ${s.toLocaleString('id-ID', { month: 'short' })} - ${e.getDate()} ${e.toLocaleString('id-ID', { month: 'short' })} ${e.getFullYear()}`
}

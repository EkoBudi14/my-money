'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Range = { start: string; end: string }

const monthRange = (): Range => {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  return { start: fmt(new Date(now.getFullYear(), now.getMonth(), 1)), end: fmt(new Date(now.getFullYear(), now.getMonth() + 1, 0)) }
}

/**
 * Shared period filter stored in user_settings (filter_mode, custom_start_date,
 * custom_end_date) — the same row Beranda and Analitik use, so the period
 * follows the user between pages (DESIGN.md 7.14 "Dipakai di Beranda, Analitik, Riwayat").
 */
export function usePeriodSettings() {
  const [filterMode, setFilterMode] = useState<'monthly' | 'custom'>('monthly')
  const [customRange, setCustomRange] = useState<Range>(monthRange)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('user_settings').select('filter_mode, custom_start_date, custom_end_date').eq('id', 1).single()
      if (data) {
        if (data.filter_mode) setFilterMode(data.filter_mode as 'monthly' | 'custom')
        if (data.custom_start_date && data.custom_end_date) setCustomRange({ start: data.custom_start_date, end: data.custom_end_date })
      }
      setReady(true)
    }
    load()
  }, [])

  useEffect(() => {
    if (!ready) return
    const t = setTimeout(() => {
      supabase.from('user_settings').update({
        filter_mode: filterMode,
        custom_start_date: customRange.start,
        custom_end_date: customRange.end,
        updated_at: new Date().toISOString(),
      }).eq('id', 1).then(() => {})
    }, 500)
    return () => clearTimeout(t)
  }, [filterMode, customRange, ready])

  const inPeriod = (d: Date) => {
    const x = new Date(d); x.setHours(0, 0, 0, 0)
    if (filterMode === 'monthly') return x.getMonth() === currentDate.getMonth() && x.getFullYear() === currentDate.getFullYear()
    const s = new Date(customRange.start); s.setHours(0, 0, 0, 0)
    const e = new Date(customRange.end); e.setHours(0, 0, 0, 0)
    return x >= s && x <= e
  }

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))

  return { filterMode, setFilterMode, customRange, setCustomRange, currentDate, setCurrentDate, inPeriod, prevMonth, nextMonth, ready }
}

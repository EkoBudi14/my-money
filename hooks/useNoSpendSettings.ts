'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useSettings, qk } from '@/hooks/useAppData'
import { DEFAULT_NOSPEND } from '@/lib/insights'
import { NoSpendSettings } from '@/types'

const LS_KEY = 'cd-nospend-settings'

const readLocal = (): NoSpendSettings | null => {
  try {
    const raw = localStorage.getItem(LS_KEY)
    return raw ? (JSON.parse(raw) as NoSpendSettings) : null
  } catch { return null }
}

const valid = (v: unknown): v is NoSpendSettings =>
  !!v && typeof v === 'object' && Array.isArray((v as NoSpendSettings).categories) && typeof (v as NoSpendSettings).target === 'number'

/**
 * Mode Hemat settings. Stored in user_settings.nospend when that column exists
 * (see supabase/migrations/20261114_tags_nospend.sql), otherwise in this
 * browser's localStorage so the feature still works before the migration.
 */
export function useNoSpendSettings() {
  const qc = useQueryClient()
  const settingsQ = useSettings()
  const row = settingsQ.data as Record<string, unknown> | null | undefined
  const inDb = !!row && 'nospend' in row
  const [local, setLocal] = useState<NoSpendSettings | null>(null)
  useEffect(() => { setLocal(readLocal()) }, [])

  const settings = useMemo<NoSpendSettings>(() => {
    if (inDb && valid(row!.nospend)) return row!.nospend as NoSpendSettings
    if (local) return local
    return DEFAULT_NOSPEND
  }, [inDb, row, local])

  const save = useCallback(async (next: NoSpendSettings) => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(next)) } catch { /* private mode */ }
    setLocal(next)
    if (!inDb) return true
    qc.setQueryData(qk.settings, (old: Record<string, unknown> | null | undefined) => (old ? { ...old, nospend: next } : old))
    const { error } = await supabase.from('user_settings').update({ nospend: next }).eq('id', 1)
    return !error
  }, [inDb, qc])

  return { settings, save, ready: !settingsQ.isLoading }
}

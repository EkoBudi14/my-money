'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query'
import { prefetchAppData } from '@/hooks/useAppData'

// Routes warmed in the background so tapping them never waits on code or data.
const ROUTES = [
  '/', '/transactions', '/analytics', '/wallets', '/budgets', '/goals',
  '/recurring', '/notes', '/more', '/kategori', '/transaction',
]

// After the first page settles, fetch every shared table and prefetch route code.
function Warmup() {
  const qc = useQueryClient()
  const router = useRouter()
  useEffect(() => {
    const run = () => {
      prefetchAppData(qc)
      ROUTES.forEach(r => router.prefetch(r))
    }
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }
    if (w.requestIdleCallback) w.requestIdleCallback(run, { timeout: 2000 })
    else setTimeout(run, 800)
  }, [qc, router])
  return null
}

// App-wide data cache (stale-while-revalidate). Pages read from this cache so
// revisiting a page shows the last data instantly and revalidates in the
// background instead of flashing a skeleton on every navigation.
export default function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Data stays "fresh" for 60s: navigating back within that window
            // uses cache with no refetch at all.
            staleTime: 60_000,
            // Keep cached data for 30 min after a page unmounts.
            gcTime: 30 * 60_000,
            // Avoid noisy refetches; data refreshes on mount when stale.
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  )
  return (
    <QueryClientProvider client={client}>
      <Warmup />
      {children}
    </QueryClientProvider>
  )
}

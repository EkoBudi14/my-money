'use client'

import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

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
            // Keep cached data for 5 min after a page unmounts.
            gcTime: 5 * 60_000,
            // Avoid noisy refetches; data refreshes on mount when stale.
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  )
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

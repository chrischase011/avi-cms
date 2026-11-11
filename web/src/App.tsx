import { QueryClientProvider } from '@tanstack/react-query'
import { useEffect } from 'react'
import { RouterProvider } from 'react-router/dom'
import { toast } from 'sonner'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { ThemeProvider } from '@/hooks/use-theme'
import { queryClient } from '@/lib/query-client'
import { queryKeys } from '@/lib/query-keys'
import { router } from '@/router'
import { loginPathFor } from '@/router/guards'
import { ensureCsrf, setUnauthorizedHandler } from '@/services/api'

/** A 401 on any authenticated call means the session is gone. */
function handleSessionExpired(): void {
  const { location } = router.state
  if (location.pathname === '/login') return
  queryClient.setQueryData(queryKeys.me, null)
  queryClient.removeQueries({ predicate: (q) => q.queryKey[0] !== queryKeys.me[0] })
  toast.error('Your session expired. Please sign in again.', { id: 'session-expired' })
  void router.navigate(loginPathFor(location), { replace: true })
}

export default function App() {
  useEffect(() => {
    setUnauthorizedHandler(handleSessionExpired)
    // Make sure the CSRF cookie exists before the first mutation.
    ensureCsrf().catch(() => {
      // Retried automatically before the next mutation.
    })
    return () => setUnauthorizedHandler(null)
  }, [])

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider delayDuration={300}>
          <RouterProvider router={router} />
          <Toaster position="bottom-right" closeButton />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  )
}

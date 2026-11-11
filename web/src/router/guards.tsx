import { ShieldAlert } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link, Navigate, Outlet, useLocation } from 'react-router'
import { EmptyState } from '@/components/common/empty-state'
import { ErrorState } from '@/components/common/error-state'
import { FullPageLoader } from '@/components/common/loading'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/use-auth'
import { hasRole } from '@/lib/permissions'
import type { Role } from '@/types/api'

/** Only allow same-app, path-relative redirects (no protocol or //host). */
export function safeNextPath(value: string | null): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return '/'
  if (value.startsWith('/login')) return '/'
  return value
}

export function loginPathFor(location: { pathname: string; search: string; hash: string }): string {
  const next = `${location.pathname}${location.search}${location.hash}`
  return next === '/' ? '/login' : `/login?next=${encodeURIComponent(next)}`
}

/** Renders child routes only for a signed-in user. */
export function ProtectedRoute() {
  const { user, isLoading, error, refetch } = useAuth()
  const location = useLocation()

  if (isLoading) return <FullPageLoader label="Checking your session" />
  if (error) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background">
        <ErrorState error={error} title="Could not reach Avi CMS" onRetry={() => void refetch()} />
      </div>
    )
  }
  if (!user) return <Navigate to={loginPathFor(location)} replace />
  return <Outlet />
}

/** Redirects signed-in users away from /login. */
export function GuestRoute() {
  const { user, isLoading } = useAuth()
  const location = useLocation()
  if (isLoading) return <FullPageLoader />
  if (user) {
    const next = new URLSearchParams(location.search).get('next')
    return <Navigate to={safeNextPath(next)} replace />
  }
  return <Outlet />
}

export function Forbidden() {
  return (
    <div className="rounded-lg border bg-card">
      <EmptyState
        icon={ShieldAlert}
        title="You do not have access to this page"
        description="Ask an administrator if you need this permission."
        action={
          <Button variant="outline" asChild>
            <Link to="/">Back to dashboard</Link>
          </Button>
        }
      />
    </div>
  )
}

/** Role gate: wraps children, or child routes when used as a layout route. */
export function RequireRole({ roles, children }: { roles: readonly Role[]; children?: ReactNode }) {
  const { user } = useAuth()
  if (!hasRole(user, roles)) return <Forbidden />
  return children ? <>{children}</> : <Outlet />
}

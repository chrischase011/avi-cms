import { isRouteErrorResponse, Link, useRouteError } from 'react-router'
import { ErrorState } from '@/components/common/error-state'
import { Button } from '@/components/ui/button'

/** Shown when rendering or lazy-loading a route throws. */
export function RouteErrorBoundary({ inline = false }: { inline?: boolean }) {
  const error = useRouteError()
  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : 'Unexpected error'

  // A failed chunk load usually means a new build was deployed: reload.
  const retry = () => window.location.reload()

  const content = (
    <div className="rounded-lg border bg-card">
      <ErrorState error={new Error(message)} title="Something went wrong" onRetry={retry} />
      <div className="-mt-8 flex justify-center pb-10">
        <Button variant="link" asChild>
          <Link to="/">Back to dashboard</Link>
        </Button>
      </div>
    </div>
  )

  if (inline) return content
  return <div className="flex min-h-svh items-center justify-center bg-background p-4">{content}</div>
}

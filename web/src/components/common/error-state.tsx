import { AlertTriangle, RotateCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { errorMessage, isApiError } from '@/services/api'

interface ErrorStateProps {
  error: unknown
  title?: string
  onRetry?: () => void
  className?: string
}

export function ErrorState({ error, title, onRetry, className }: ErrorStateProps) {
  const forbidden = isApiError(error) && error.status === 403
  const notFound = isApiError(error) && error.status === 404
  const heading =
    title ?? (forbidden ? 'You do not have access to this' : notFound ? 'Not found' : 'Could not load data')

  return (
    <div
      role="alert"
      className={cn('flex flex-col items-center justify-center px-6 py-14 text-center', className)}
    >
      <div className="mb-4 flex size-10 items-center justify-center rounded-lg border border-destructive/20 bg-destructive/5 text-destructive">
        <AlertTriangle className="size-5" aria-hidden />
      </div>
      <h3 className="text-sm font-medium">{heading}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{errorMessage(error)}</p>
      {onRetry && !forbidden && !notFound ? (
        <Button variant="outline" size="sm" className="mt-5" onClick={onRetry}>
          <RotateCw aria-hidden />
          Try again
        </Button>
      ) : null}
    </div>
  )
}

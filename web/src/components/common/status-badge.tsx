import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import type { Status } from '@/types/api'

export const STATUS_LABELS: Record<Status, string> = {
  draft: 'Draft',
  published: 'Published',
  archived: 'Archived',
}

export const STATUSES: Status[] = ['draft', 'published', 'archived']

const styles: Record<Status, { badge: string; dot: string }> = {
  published: {
    badge: 'border-success/25 bg-success/10 text-success',
    dot: 'bg-success',
  },
  draft: {
    badge: 'border-border bg-muted text-muted-foreground',
    dot: 'bg-muted-foreground/70',
  },
  archived: {
    badge: 'border-warning/25 bg-warning/10 text-warning',
    dot: 'bg-warning',
  },
}

export function StatusBadge({ status, className }: { status: Status; className?: string }) {
  const style = styles[status]
  return (
    <span
      className={cn(
        'inline-flex h-5 items-center gap-1.5 rounded-full border px-2 text-xs font-medium whitespace-nowrap',
        style.badge,
        className,
      )}
    >
      <span className={cn('size-1.5 rounded-full', style.dot)} aria-hidden />
      {STATUS_LABELS[status]}
    </span>
  )
}

/** Small neutral pill, e.g. for roles or active state. */
export function Pill({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex h-5 items-center rounded-full border bg-muted/60 px-2 text-xs font-medium whitespace-nowrap text-muted-foreground',
        className,
      )}
    >
      {children}
    </span>
  )
}

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { PaginationMeta } from '@/types/api'

interface PaginationProps {
  meta: PaginationMeta | undefined
  onPageChange: (page: number) => void
  className?: string
  /** Noun for the summary, e.g. "posts". */
  itemLabel?: string
}

export function Pagination({ meta, onPageChange, className, itemLabel = 'results' }: PaginationProps) {
  if (!meta || meta.total === 0) return null
  const { page, pageSize, total, totalPages } = meta
  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  return (
    <nav
      aria-label="Pagination"
      className={cn('flex flex-col items-center justify-between gap-3 text-sm sm:flex-row', className)}
    >
      <p className="text-muted-foreground tabular-nums">
        {formatNumber(from)}–{formatNumber(to)} of {formatNumber(total)} {itemLabel}
      </p>
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground tabular-nums">
          Page {formatNumber(page)} of {formatNumber(Math.max(totalPages, 1))}
        </span>
        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
        >
          <ChevronLeft />
        </Button>
        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          aria-label="Next page"
        >
          <ChevronRight />
        </Button>
      </div>
    </nav>
  )
}

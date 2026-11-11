import type { ReactNode } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'

export interface Column<T> {
  id: string
  header: ReactNode
  cell: (row: T) => ReactNode
  /** Applied to both the header and body cells. */
  className?: string
  /** Visually hidden header text (e.g. for an actions column). */
  srOnlyHeader?: boolean
}

interface DataTableProps<T> {
  columns: Column<T>[]
  rows: T[] | undefined
  rowKey: (row: T) => string | number
  isLoading?: boolean
  /** Shows a subtle fade while refetching with previous data. */
  isFetching?: boolean
  /** Rendered instead of the table body when there are no rows. */
  empty?: ReactNode
  skeletonRows?: number
  caption?: string
  className?: string
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  isLoading = false,
  isFetching = false,
  empty,
  skeletonRows = 6,
  caption,
  className,
}: DataTableProps<T>) {
  const showEmpty = !isLoading && rows !== undefined && rows.length === 0

  return (
    <div className={cn('overflow-hidden rounded-lg border bg-card', className)}>
      {showEmpty && empty ? (
        empty
      ) : (
        <Table className={cn('transition-opacity', isFetching && !isLoading && 'opacity-60')}>
          {caption ? <caption className="sr-only">{caption}</caption> : null}
          <TableHeader className="bg-muted/40">
            <TableRow className="hover:bg-transparent">
              {columns.map((column) => (
                <TableHead
                  key={column.id}
                  className={cn('h-9 px-3 text-xs font-medium text-muted-foreground', column.className)}
                >
                  {column.srOnlyHeader ? <span className="sr-only">{column.header}</span> : column.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array.from({ length: skeletonRows }, (_, i) => (
                  <TableRow key={`skeleton-${i}`} className="hover:bg-transparent">
                    {columns.map((column) => (
                      <TableCell key={column.id} className={cn('px-3 py-3', column.className)}>
                        <Skeleton className="h-4 w-full max-w-[12rem]" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              : rows?.map((row) => (
                  <TableRow key={rowKey(row)}>
                    {columns.map((column) => (
                      <TableCell key={column.id} className={cn('px-3 py-2.5', column.className)}>
                        {column.cell(row)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}

import { Files, MoreHorizontal, Pencil, Plus, Send, Trash2, Undo2 } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { type Column, DataTable } from '@/components/common/data-table'
import { EmptyState } from '@/components/common/empty-state'
import { ErrorState } from '@/components/common/error-state'
import { FilterSelect, FiltersToolbar } from '@/components/common/filter-select'
import { PageHeader } from '@/components/common/page-header'
import { Pagination } from '@/components/common/pagination'
import { SearchInput } from '@/components/common/search-input'
import { STATUS_LABELS, STATUSES, StatusBadge } from '@/components/common/status-badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useListParams } from '@/hooks/use-list-params'
import { useDeletePage, usePages, usePublishPage } from '@/hooks/use-pages'
import { formatDateTime, formatRelative } from '@/lib/format'
import { errorMessage } from '@/services/api'
import type { PageListParams, PageSummary, Status } from '@/types/api'

const PAGE_SIZE = 20
const FILTER_KEYS = ['status'] as const

function asStatus(value: string): Status | undefined {
  return (STATUSES as string[]).includes(value) ? (value as Status) : undefined
}

export function PagesListPage() {
  const navigate = useNavigate()
  const { page, search, filters, setPage, setSearch, setFilter, reset, hasFilters } = useListParams(FILTER_KEYS)

  const params: PageListParams = {
    page,
    pageSize: PAGE_SIZE,
    search: search || undefined,
    status: asStatus(filters.status),
  }
  const pages = usePages(params)
  const publish = usePublishPage()
  const remove = useDeletePage()
  const [toDelete, setToDelete] = useState<PageSummary | null>(null)

  const togglePublish = (item: PageSummary) => {
    const next = item.status !== 'published'
    publish.mutate(
      { id: item.id, publish: next },
      {
        onSuccess: () => toast.success(next ? `“${item.title}” published` : `“${item.title}” moved to drafts`),
        onError: (error) => toast.error(errorMessage(error)),
      },
    )
  }

  const confirmDelete = () => {
    if (!toDelete) return
    const title = toDelete.title
    remove.mutate(toDelete.id, {
      onSuccess: () => {
        toast.success(`“${title}” deleted`)
        setToDelete(null)
      },
      onError: (error) => toast.error(errorMessage(error)),
    })
  }

  const columns: Column<PageSummary>[] = [
    {
      id: 'title',
      header: 'Title',
      className: 'w-full max-w-0 min-w-56',
      cell: (item) => (
        <div className="min-w-0">
          <Link
            to={`/pages/${item.id}/edit`}
            className="block truncate font-medium text-foreground hover:underline focus-visible:underline focus-visible:outline-none"
          >
            {item.title || 'Untitled'}
          </Link>
          <p className="truncate text-xs text-muted-foreground">/{item.slug}</p>
        </div>
      ),
    },
    { id: 'status', header: 'Status', cell: (item) => <StatusBadge status={item.status} /> },
    {
      id: 'seo',
      header: 'SEO',
      className: 'hidden md:table-cell',
      cell: (item) =>
        item.seoTitle && item.seoDescription ? (
          <span className="text-sm text-muted-foreground">Complete</span>
        ) : (
          <span className="text-sm text-warning">Missing fields</span>
        ),
    },
    {
      id: 'author',
      header: 'Author',
      className: 'hidden lg:table-cell',
      cell: (item) => <span className="text-sm text-muted-foreground">{item.author?.name ?? '—'}</span>,
    },
    {
      id: 'updated',
      header: 'Updated',
      className: 'hidden sm:table-cell',
      cell: (item) => (
        <time
          dateTime={item.updatedAt}
          title={formatDateTime(item.updatedAt)}
          className="text-sm text-muted-foreground tabular-nums"
        >
          {formatRelative(item.updatedAt)}
        </time>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      srOnlyHeader: true,
      className: 'w-10 text-right',
      cell: (item) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${item.title}`}>
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onSelect={() => navigate(`/pages/${item.id}/edit`)}>
              <Pencil aria-hidden />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => togglePublish(item)} disabled={publish.isPending}>
              {item.status === 'published' ? <Undo2 aria-hidden /> : <Send aria-hidden />}
              {item.status === 'published' ? 'Unpublish' : 'Publish'}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={() => setToDelete(item)}>
              <Trash2 aria-hidden />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  const newPageButton = (
    <Button asChild>
      <Link to="/pages/create">
        <Plus aria-hidden />
        New page
      </Link>
    </Button>
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pages"
        description="Static pages such as About, Contact and Privacy Policy."
        actions={newPageButton}
      />

      <FiltersToolbar>
        <SearchInput value={search} onChange={setSearch} placeholder="Search pages…" />
        <FilterSelect
          label="Filter by status"
          allLabel="All statuses"
          value={filters.status}
          onChange={(value) => setFilter('status', value)}
          options={STATUSES.map((status) => ({ value: status, label: STATUS_LABELS[status] }))}
        />
        {hasFilters ? (
          <Button variant="ghost" size="sm" onClick={reset}>
            Clear filters
          </Button>
        ) : null}
      </FiltersToolbar>

      {pages.isError && !pages.data ? (
        <div className="rounded-lg border bg-card">
          <ErrorState error={pages.error} onRetry={() => void pages.refetch()} />
        </div>
      ) : (
        <DataTable
          caption="Pages"
          columns={columns}
          rows={pages.data?.data}
          rowKey={(item) => item.id}
          isLoading={pages.isPending}
          isFetching={pages.isFetching}
          empty={
            hasFilters ? (
              <EmptyState
                icon={Files}
                title="No pages match these filters"
                description="Try a different search or clear the filters."
                action={
                  <Button variant="outline" onClick={reset}>
                    Clear filters
                  </Button>
                }
              />
            ) : (
              <EmptyState
                icon={Files}
                title="No pages yet"
                description="Create pages like About or Contact for your site."
                action={newPageButton}
              />
            )
          }
        />
      )}

      <Pagination meta={pages.data?.meta} onPageChange={setPage} itemLabel="pages" />

      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(open) => !open && setToDelete(null)}
        title="Delete this page?"
        description={toDelete ? <>“{toDelete.title}” will be permanently deleted. This cannot be undone.</> : null}
        confirmLabel="Delete page"
        destructive
        pending={remove.isPending}
        onConfirm={confirmDelete}
      />
    </div>
  )
}

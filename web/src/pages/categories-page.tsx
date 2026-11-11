import { FolderTree, Plus } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { type Column, DataTable } from '@/components/common/data-table'
import { EmptyState } from '@/components/common/empty-state'
import { ErrorState } from '@/components/common/error-state'
import { FiltersToolbar } from '@/components/common/filter-select'
import { PageHeader } from '@/components/common/page-header'
import { Pagination } from '@/components/common/pagination'
import { SearchInput } from '@/components/common/search-input'
import { TaxonomyFormDialog } from '@/components/taxonomy/taxonomy-form-dialog'
import { TaxonomyRowActions } from '@/components/taxonomy/taxonomy-row-actions'
import { Button } from '@/components/ui/button'
import { useCurrentUser } from '@/hooks/use-auth'
import { useListParams } from '@/hooks/use-list-params'
import { useCategories, useDeleteCategory } from '@/hooks/use-taxonomy'
import { formatDate, formatNumber } from '@/lib/format'
import { can } from '@/lib/permissions'
import { errorMessage } from '@/services/api'
import type { Category } from '@/types/api'

const PAGE_SIZE = 20
const NO_FILTERS = [] as const

export function CategoriesPage() {
  const user = useCurrentUser()
  const canManage = can.manageTaxonomy(user)
  const { page, search, setPage, setSearch, reset, hasFilters } = useListParams(NO_FILTERS)
  const query = useCategories({ page, pageSize: PAGE_SIZE, search: search || undefined })
  const deleteCategory = useDeleteCategory()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)
  const [deleting, setDeleting] = useState<Category | null>(null)

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }
  const openEdit = (category: Category) => {
    setEditing(category)
    setFormOpen(true)
  }

  const confirmDelete = () => {
    if (!deleting) return
    const target = deleting
    deleteCategory.mutate(target.id, {
      onSuccess: () => {
        toast.success(`Deleted category “${target.name}”`)
        setDeleting(null)
      },
      onError: (error) => toast.error(errorMessage(error, 'Could not delete the category')),
    })
  }

  const columns: Column<Category>[] = [
    {
      id: 'name',
      header: 'Name',
      className: 'max-w-0 w-full',
      cell: (category) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{category.name}</p>
          {category.description ? (
            <p className="truncate text-xs text-muted-foreground">{category.description}</p>
          ) : null}
        </div>
      ),
    },
    {
      id: 'slug',
      header: 'Slug',
      className: 'hidden md:table-cell',
      cell: (category) => <span className="font-mono text-xs text-muted-foreground">{category.slug}</span>,
    },
    {
      id: 'posts',
      header: 'Posts',
      className: 'text-right',
      cell: (category) =>
        category.postCount > 0 ? (
          <Link
            to={`/posts?categoryId=${category.id}`}
            className="rounded-sm tabular-nums underline-offset-4 hover:text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            aria-label={`${formatNumber(category.postCount)} posts in ${category.name}`}
          >
            {formatNumber(category.postCount)}
          </Link>
        ) : (
          <span className="text-muted-foreground tabular-nums">0</span>
        ),
    },
    {
      id: 'updated',
      header: 'Updated',
      className: 'hidden sm:table-cell text-muted-foreground',
      cell: (category) => <span className="tabular-nums">{formatDate(category.updatedAt)}</span>,
    },
  ]

  if (canManage) {
    columns.push({
      id: 'actions',
      header: 'Actions',
      srOnlyHeader: true,
      className: 'w-10 text-right',
      cell: (category) => (
        <TaxonomyRowActions
          name={category.name}
          onEdit={() => openEdit(category)}
          onDelete={() => setDeleting(category)}
        />
      ),
    })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Categories"
        description="Group posts by topic. Each post belongs to at most one category."
        actions={
          canManage ? (
            <Button onClick={openCreate}>
              <Plus aria-hidden />
              New category
            </Button>
          ) : null
        }
      />

      <FiltersToolbar>
        <SearchInput value={search} onChange={setSearch} placeholder="Search categories…" />
      </FiltersToolbar>

      {query.isError ? (
        <div className="rounded-lg border bg-card">
          <ErrorState error={query.error} onRetry={() => void query.refetch()} />
        </div>
      ) : (
        <DataTable
          caption="Categories"
          columns={columns}
          rows={query.data?.data}
          rowKey={(category) => category.id}
          isLoading={query.isPending}
          isFetching={query.isFetching}
          empty={
            hasFilters ? (
              <EmptyState
                icon={FolderTree}
                title="No matching categories"
                description="Try a different search."
                action={
                  <Button variant="outline" size="sm" onClick={reset}>
                    Clear search
                  </Button>
                }
              />
            ) : (
              <EmptyState
                icon={FolderTree}
                title="No categories yet"
                description={canManage ? 'Create a category to start organizing posts.' : 'Editors can create categories.'}
                action={
                  canManage ? (
                    <Button size="sm" onClick={openCreate}>
                      <Plus aria-hidden />
                      New category
                    </Button>
                  ) : null
                }
              />
            )
          }
        />
      )}

      <Pagination meta={query.data?.meta} onPageChange={setPage} itemLabel="categories" />

      {canManage ? (
        <>
          <TaxonomyFormDialog kind="category" open={formOpen} onOpenChange={setFormOpen} item={editing} />
          <ConfirmDialog
            open={deleting !== null}
            onOpenChange={(open) => !open && setDeleting(null)}
            title={`Delete “${deleting?.name ?? ''}”?`}
            description="Posts in this category become uncategorized. This cannot be undone."
            confirmLabel="Delete category"
            destructive
            pending={deleteCategory.isPending}
            onConfirm={confirmDelete}
          />
        </>
      ) : null}
    </div>
  )
}

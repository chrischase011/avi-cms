import { Plus, Tags } from 'lucide-react'
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
import { useDeleteTag, useTags } from '@/hooks/use-taxonomy'
import { formatDate, formatNumber } from '@/lib/format'
import { can } from '@/lib/permissions'
import { errorMessage } from '@/services/api'
import type { Tag } from '@/types/api'

const PAGE_SIZE = 20
const NO_FILTERS = [] as const

function postsPhrase(count: number): string {
  return count === 1 ? '1 post' : `${formatNumber(count)} posts`
}

export function TagsPage() {
  const user = useCurrentUser()
  const canManage = can.manageTaxonomy(user)
  const { page, search, setPage, setSearch, reset, hasFilters } = useListParams(NO_FILTERS)
  const query = useTags({ page, pageSize: PAGE_SIZE, search: search || undefined })
  const deleteTag = useDeleteTag()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Tag | null>(null)
  const [deleting, setDeleting] = useState<Tag | null>(null)

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }
  const openEdit = (tag: Tag) => {
    setEditing(tag)
    setFormOpen(true)
  }

  const confirmDelete = () => {
    if (!deleting) return
    const target = deleting
    deleteTag.mutate(target.id, {
      onSuccess: () => {
        toast.success(`Deleted tag “${target.name}”`)
        setDeleting(null)
      },
      onError: (error) => toast.error(errorMessage(error, 'Could not delete the tag')),
    })
  }

  const columns: Column<Tag>[] = [
    {
      id: 'name',
      header: 'Name',
      className: 'max-w-0 w-full',
      cell: (tag) => <p className="truncate font-medium">{tag.name}</p>,
    },
    {
      id: 'slug',
      header: 'Slug',
      className: 'hidden md:table-cell',
      cell: (tag) => <span className="font-mono text-xs text-muted-foreground">{tag.slug}</span>,
    },
    {
      id: 'posts',
      header: 'Posts',
      className: 'text-right',
      cell: (tag) =>
        tag.postCount > 0 ? (
          <Link
            to={`/posts?tagId=${tag.id}`}
            className="rounded-sm tabular-nums underline-offset-4 hover:text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            aria-label={`${postsPhrase(tag.postCount)} tagged ${tag.name}`}
          >
            {formatNumber(tag.postCount)}
          </Link>
        ) : (
          <span className="text-muted-foreground tabular-nums">0</span>
        ),
    },
    {
      id: 'updated',
      header: 'Updated',
      className: 'hidden sm:table-cell text-muted-foreground',
      cell: (tag) => <span className="tabular-nums">{formatDate(tag.updatedAt)}</span>,
    },
  ]

  if (canManage) {
    columns.push({
      id: 'actions',
      header: 'Actions',
      srOnlyHeader: true,
      className: 'w-10 text-right',
      cell: (tag) => (
        <TaxonomyRowActions name={tag.name} onEdit={() => openEdit(tag)} onDelete={() => setDeleting(tag)} />
      ),
    })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tags"
        description="Describe posts in more detail. A post can have any number of tags."
        actions={
          canManage ? (
            <Button onClick={openCreate}>
              <Plus aria-hidden />
              New tag
            </Button>
          ) : null
        }
      />

      <FiltersToolbar>
        <SearchInput value={search} onChange={setSearch} placeholder="Search tags…" />
      </FiltersToolbar>

      {query.isError ? (
        <div className="rounded-lg border bg-card">
          <ErrorState error={query.error} onRetry={() => void query.refetch()} />
        </div>
      ) : (
        <DataTable
          caption="Tags"
          columns={columns}
          rows={query.data?.data}
          rowKey={(tag) => tag.id}
          isLoading={query.isPending}
          isFetching={query.isFetching}
          empty={
            hasFilters ? (
              <EmptyState
                icon={Tags}
                title="No matching tags"
                description="Try a different search."
                action={
                  <Button variant="outline" size="sm" onClick={reset}>
                    Clear search
                  </Button>
                }
              />
            ) : (
              <EmptyState
                icon={Tags}
                title="No tags yet"
                description={canManage ? 'Create tags to describe your posts.' : 'Editors can create tags.'}
                action={
                  canManage ? (
                    <Button size="sm" onClick={openCreate}>
                      <Plus aria-hidden />
                      New tag
                    </Button>
                  ) : null
                }
              />
            )
          }
        />
      )}

      <Pagination meta={query.data?.meta} onPageChange={setPage} itemLabel="tags" />

      {canManage ? (
        <>
          <TaxonomyFormDialog kind="tag" open={formOpen} onOpenChange={setFormOpen} item={editing} />
          <ConfirmDialog
            open={deleting !== null}
            onOpenChange={(open) => !open && setDeleting(null)}
            title={`Delete “${deleting?.name ?? ''}”?`}
            description={
              deleting && deleting.postCount > 0
                ? `It will be removed from ${postsPhrase(deleting.postCount)}. This cannot be undone.`
                : 'This tag is not used by any posts. This cannot be undone.'
            }
            confirmLabel="Delete tag"
            destructive
            pending={deleteTag.isPending}
            onConfirm={confirmDelete}
          />
        </>
      ) : null}
    </div>
  )
}

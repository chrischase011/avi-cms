import { FileText, MoreHorizontal, Pencil, Plus, Send, Trash2, Undo2, X } from 'lucide-react'
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
import { useCurrentUser } from '@/hooks/use-auth'
import { useListParams } from '@/hooks/use-list-params'
import { useDeletePost, usePosts, usePublishPost } from '@/hooks/use-posts'
import { useCategories, useTags } from '@/hooks/use-taxonomy'
import { formatDateTime, formatRelative } from '@/lib/format'
import { can } from '@/lib/permissions'
import { errorMessage } from '@/services/api'
import type { PostListParams, PostSummary, Status } from '@/types/api'

const PAGE_SIZE = 20
const FILTER_KEYS = ['status', 'categoryId', 'tagId'] as const

function asStatus(value: string): Status | undefined {
  return (STATUSES as string[]).includes(value) ? (value as Status) : undefined
}

function asId(value: string): number | undefined {
  const id = Number(value)
  return Number.isInteger(id) && id > 0 ? id : undefined
}

export function PostsListPage() {
  const user = useCurrentUser()
  const navigate = useNavigate()
  const { page, search, filters, setPage, setSearch, setFilter, reset, hasFilters } = useListParams(FILTER_KEYS)

  const params: PostListParams = {
    page,
    pageSize: PAGE_SIZE,
    search: search || undefined,
    status: asStatus(filters.status),
    categoryId: asId(filters.categoryId),
    tagId: asId(filters.tagId),
    sort: 'updatedAt',
    order: 'desc',
  }
  const posts = usePosts(params)
  const categories = useCategories()
  const tags = useTags()
  const tagFilterId = asId(filters.tagId)
  const tagFilter = tagFilterId ? tags.data?.data.find((t) => t.id === tagFilterId) : undefined
  const publish = usePublishPost()
  const remove = useDeletePost()
  const [toDelete, setToDelete] = useState<PostSummary | null>(null)

  const canPublish = can.publish(user)

  const togglePublish = (post: PostSummary) => {
    const next = post.status !== 'published'
    publish.mutate(
      { id: post.id, publish: next },
      {
        onSuccess: () => toast.success(next ? `“${post.title}” published` : `“${post.title}” moved to drafts`),
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

  const columns: Column<PostSummary>[] = [
    {
      id: 'title',
      header: 'Title',
      className: 'w-full max-w-0 min-w-56',
      cell: (post) => (
        <div className="flex min-w-0 items-center gap-3">
          {post.featuredImage ? (
            <img
              src={post.featuredImage.url}
              alt=""
              className="hidden size-9 shrink-0 rounded-md border object-cover sm:block"
              loading="lazy"
            />
          ) : (
            <span className="hidden size-9 shrink-0 items-center justify-center rounded-md border bg-muted/50 text-muted-foreground sm:flex">
              <FileText className="size-4" aria-hidden />
            </span>
          )}
          <div className="min-w-0">
            <Link
              to={`/posts/${post.id}/edit`}
              className="block truncate font-medium text-foreground hover:underline focus-visible:underline focus-visible:outline-none"
            >
              {post.title || 'Untitled'}
            </Link>
            <p className="truncate text-xs text-muted-foreground">/{post.slug}</p>
          </div>
        </div>
      ),
    },
    { id: 'status', header: 'Status', cell: (post) => <StatusBadge status={post.status} /> },
    {
      id: 'category',
      header: 'Category',
      className: 'hidden md:table-cell',
      cell: (post) =>
        post.category ? (
          <span className="text-sm">{post.category.name}</span>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        ),
    },
    {
      id: 'author',
      header: 'Author',
      className: 'hidden lg:table-cell',
      cell: (post) => (
        <span className="text-sm text-muted-foreground">
          {post.author.id === user.id ? 'You' : post.author.name}
        </span>
      ),
    },
    {
      id: 'updated',
      header: 'Updated',
      className: 'hidden sm:table-cell',
      cell: (post) => (
        <time dateTime={post.updatedAt} title={formatDateTime(post.updatedAt)} className="text-sm text-muted-foreground tabular-nums">
          {formatRelative(post.updatedAt)}
        </time>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      srOnlyHeader: true,
      className: 'w-10 text-right',
      cell: (post) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${post.title}`}>
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onSelect={() => navigate(`/posts/${post.id}/edit`)}>
              <Pencil aria-hidden />
              Edit
            </DropdownMenuItem>
            {canPublish ? (
              <DropdownMenuItem onSelect={() => togglePublish(post)} disabled={publish.isPending}>
                {post.status === 'published' ? <Undo2 aria-hidden /> : <Send aria-hidden />}
                {post.status === 'published' ? 'Unpublish' : 'Publish'}
              </DropdownMenuItem>
            ) : null}
            {can.editPost(user, post) ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onSelect={() => setToDelete(post)}>
                  <Trash2 aria-hidden />
                  Delete
                </DropdownMenuItem>
              </>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  const newPostButton = (
    <Button asChild>
      <Link to="/posts/create">
        <Plus aria-hidden />
        New post
      </Link>
    </Button>
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Posts"
        description={user.role === 'author' ? 'Your articles and drafts.' : 'Articles, news and announcements.'}
        actions={newPostButton}
      />

      <FiltersToolbar>
        <SearchInput value={search} onChange={setSearch} placeholder="Search posts…" />
        <FilterSelect
          label="Filter by status"
          allLabel="All statuses"
          value={filters.status}
          onChange={(value) => setFilter('status', value)}
          options={STATUSES.map((status) => ({ value: status, label: STATUS_LABELS[status] }))}
        />
        <FilterSelect
          label="Filter by category"
          allLabel="All categories"
          value={filters.categoryId}
          onChange={(value) => setFilter('categoryId', value)}
          options={(categories.data?.data ?? []).map((c) => ({ value: String(c.id), label: c.name }))}
          className="sm:w-48"
          disabled={categories.isPending}
        />
        {tagFilterId ? (
          <Button variant="outline" size="sm" onClick={() => setFilter('tagId', '')} aria-label="Remove tag filter">
            Tag: {tagFilter?.name ?? `#${tagFilterId}`}
            <X aria-hidden />
          </Button>
        ) : null}
        {hasFilters ? (
          <Button variant="ghost" size="sm" onClick={reset}>
            Clear filters
          </Button>
        ) : null}
      </FiltersToolbar>

      {posts.isError && !posts.data ? (
        <div className="rounded-lg border bg-card">
          <ErrorState error={posts.error} onRetry={() => void posts.refetch()} />
        </div>
      ) : (
        <DataTable
          caption="Posts"
          columns={columns}
          rows={posts.data?.data}
          rowKey={(post) => post.id}
          isLoading={posts.isPending}
          isFetching={posts.isFetching}
          empty={
            hasFilters ? (
              <EmptyState
                icon={FileText}
                title="No posts match these filters"
                description="Try a different search or clear the filters."
                action={
                  <Button variant="outline" onClick={reset}>
                    Clear filters
                  </Button>
                }
              />
            ) : (
              <EmptyState
                icon={FileText}
                title="No posts yet"
                description="Write your first post. It stays a draft until it is published."
                action={newPostButton}
              />
            )
          }
        />
      )}

      <Pagination meta={posts.data?.meta} onPageChange={setPage} itemLabel="posts" />

      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(open) => !open && setToDelete(null)}
        title="Delete this post?"
        description={
          toDelete ? (
            <>
              “{toDelete.title}” will be permanently deleted. This cannot be undone.
            </>
          ) : null
        }
        confirmLabel="Delete post"
        destructive
        pending={remove.isPending}
        onConfirm={confirmDelete}
      />
    </div>
  )
}

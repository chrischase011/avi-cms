import { ArrowRight, FilePlus2, FileText, Files, Image, type LucideIcon, PenSquare, Users } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { type Column, DataTable } from '@/components/common/data-table'
import { EmptyState } from '@/components/common/empty-state'
import { ErrorState } from '@/components/common/error-state'
import { PageHeader } from '@/components/common/page-header'
import { StatusBadge } from '@/components/common/status-badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useCurrentUser } from '@/hooks/use-auth'
import { useDashboard } from '@/hooks/use-dashboard'
import { formatDateTime, formatMonth, formatMonthYear, formatNumber, formatRelative } from '@/lib/format'
import { can } from '@/lib/permissions'
import { cn } from '@/lib/utils'
import type { DashboardData, DashboardStats, PageSummary, PostSummary } from '@/types/api'

function greeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

// ---------------------------------------------------------------------------

interface StatCardProps {
  label: string
  value: number
  icon: LucideIcon
  to?: string
  footer?: ReactNode
}

function StatCard({ label, value, icon: Icon, to, footer }: StatCardProps) {
  const body = (
    <>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        <Icon className="size-4 text-muted-foreground" aria-hidden />
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">{formatNumber(value)}</p>
      {footer ? <div className="mt-1 text-xs text-muted-foreground tabular-nums">{footer}</div> : null}
    </>
  )
  const className = 'block rounded-lg border bg-card p-4 transition-colors'
  return to ? (
    <Link
      to={to}
      className={cn(className, 'hover:border-foreground/20 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none')}
    >
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  )
}

function StatsGrid({ stats, showPages, showUsers }: { stats: DashboardStats; showPages: boolean; showUsers: boolean }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        label="Posts"
        value={stats.totalPosts}
        icon={FileText}
        to="/posts"
        footer={`${formatNumber(stats.publishedPosts)} published · ${formatNumber(stats.draftPosts)} drafts`}
      />
      <StatCard
        label="Pages"
        value={stats.totalPages}
        icon={Files}
        to={showPages ? '/pages' : undefined}
        footer="Static site pages"
      />
      <StatCard
        label="Media"
        value={stats.totalMedia}
        icon={Image}
        to="/media"
        footer={`${formatNumber(stats.totalCategories)} categories · ${formatNumber(stats.totalTags)} tags`}
      />
      <StatCard
        label="Users"
        value={stats.totalUsers}
        icon={Users}
        to={showUsers ? '/users' : undefined}
        footer="CMS accounts"
      />
    </div>
  )
}

// ---------------------------------------------------------------------------

function PostsPerMonthChart({ data }: { data: DashboardData['postsPerMonth'] }) {
  const max = Math.max(1, ...data.map((d) => d.count))
  const total = data.reduce((sum, d) => sum + d.count, 0)

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle className="text-base">Published posts</CardTitle>
        <CardDescription>
          <span className="tabular-nums">{formatNumber(total)}</span> in the last {data.length} months
        </CardDescription>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">No publishing activity yet.</p>
        ) : (
          <figure>
            <div className="flex h-44 items-end gap-2 sm:gap-4" aria-hidden>
              {data.map((d) => {
                const height = d.count === 0 ? 0 : Math.max(4, (d.count / max) * 100)
                return (
                  <div key={d.month} className="group flex h-full flex-1 flex-col items-center justify-end gap-1.5">
                    <span className="text-xs font-medium text-muted-foreground tabular-nums group-hover:text-foreground">
                      {formatNumber(d.count)}
                    </span>
                    <div className="flex w-full max-w-12 flex-1 items-end rounded-sm bg-muted/60">
                      <div
                        className="w-full rounded-sm bg-chart-1 transition-[height] duration-500 ease-out group-hover:bg-primary"
                        style={{ height: `${height}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="mt-2 flex gap-2 sm:gap-4" aria-hidden>
              {data.map((d) => (
                <span key={d.month} className="flex-1 text-center text-xs text-muted-foreground">
                  {formatMonth(d.month)}
                </span>
              ))}
            </div>
            <figcaption className="sr-only">Published posts per month</figcaption>
            <table className="sr-only">
              <thead>
                <tr>
                  <th scope="col">Month</th>
                  <th scope="col">Published posts</th>
                </tr>
              </thead>
              <tbody>
                {data.map((d) => (
                  <tr key={d.month}>
                    <td>{formatMonthYear(d.month)}</td>
                    <td>{d.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </figure>
        )}
      </CardContent>
    </Card>
  )
}

function StatusBreakdown({ stats }: { stats: DashboardStats }) {
  const rows = [
    { label: 'Published', value: stats.publishedPosts, className: 'bg-success' },
    { label: 'Drafts', value: stats.draftPosts, className: 'bg-muted-foreground/60' },
    { label: 'Archived', value: stats.archivedPosts, className: 'bg-warning' },
  ]
  const total = Math.max(1, stats.totalPosts)
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Posts by status</CardTitle>
        <CardDescription>
          <span className="tabular-nums">{formatNumber(stats.totalPosts)}</span> posts in total
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
          {rows.map((row) =>
            row.value > 0 ? (
              <div key={row.label} className={row.className} style={{ width: `${(row.value / total) * 100}%` }} />
            ) : null,
          )}
        </div>
        <dl className="space-y-3">
          {rows.map((row) => (
            <div key={row.label} className="flex items-center justify-between text-sm">
              <dt className="flex items-center gap-2 text-muted-foreground">
                <span className={cn('size-2 rounded-full', row.className)} aria-hidden />
                {row.label}
              </dt>
              <dd className="font-medium tabular-nums">
                {formatNumber(row.value)}
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  {Math.round((row.value / total) * 100)}%
                </span>
              </dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------

function SectionCard({
  title,
  to,
  linkLabel,
  className,
  children,
}: {
  title: string
  to?: string
  linkLabel?: string
  className?: string
  children: ReactNode
}) {
  return (
    <Card className={cn('gap-0 pb-0', className)}>
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-4">
        <CardTitle className="text-base">{title}</CardTitle>
        {to ? (
          <Button variant="ghost" size="sm" asChild className="-my-1 text-muted-foreground">
            <Link to={to}>
              {linkLabel ?? 'View all'}
              <ArrowRight aria-hidden />
            </Link>
          </Button>
        ) : null}
      </CardHeader>
      <div className="border-t">{children}</div>
    </Card>
  )
}

function RecentPostsTable({ posts }: { posts: PostSummary[] }) {
  const columns: Column<PostSummary>[] = [
    {
      id: 'title',
      header: 'Title',
      className: 'w-full max-w-0',
      cell: (post) => (
        <Link to={`/posts/${post.id}/edit`} className="block truncate font-medium hover:underline">
          {post.title || 'Untitled'}
        </Link>
      ),
    },
    { id: 'status', header: 'Status', cell: (post) => <StatusBadge status={post.status} /> },
    {
      id: 'author',
      header: 'Author',
      className: 'hidden md:table-cell',
      cell: (post) => <span className="text-muted-foreground">{post.author.name}</span>,
    },
    {
      id: 'created',
      header: 'Created',
      className: 'hidden sm:table-cell text-right',
      cell: (post) => (
        <time dateTime={post.createdAt} title={formatDateTime(post.createdAt)} className="text-muted-foreground tabular-nums">
          {formatRelative(post.createdAt)}
        </time>
      ),
    },
  ]
  return (
    <DataTable
      caption="Recent posts"
      columns={columns}
      rows={posts}
      rowKey={(post) => post.id}
      className="rounded-none border-0 bg-transparent"
      empty={
        <EmptyState
          icon={FileText}
          title="No posts yet"
          action={
            <Button size="sm" asChild>
              <Link to="/posts/create">Write a post</Link>
            </Button>
          }
        />
      }
    />
  )
}

function ActivityList<T extends { id: number; title: string; updatedAt: string; status: PostSummary['status'] }>({
  items,
  href,
  emptyLabel,
}: {
  items: T[]
  href?: (item: T) => string
  emptyLabel: string
}) {
  if (items.length === 0) return <p className="px-4 py-10 text-center text-sm text-muted-foreground">{emptyLabel}</p>
  return (
    <ul className="divide-y">
      {items.map((item) => (
        <li key={item.id} className="flex items-center gap-3 px-4 py-3">
          <div className="min-w-0 flex-1">
            {href ? (
              <Link to={href(item)} className="block truncate text-sm font-medium hover:underline">
                {item.title || 'Untitled'}
              </Link>
            ) : (
              <span className="block truncate text-sm font-medium">{item.title || 'Untitled'}</span>
            )}
            <time
              dateTime={item.updatedAt}
              title={formatDateTime(item.updatedAt)}
              className="text-xs text-muted-foreground tabular-nums"
            >
              Updated {formatRelative(item.updatedAt)}
            </time>
          </div>
          <StatusBadge status={item.status} />
        </li>
      ))}
    </ul>
  )
}

// ---------------------------------------------------------------------------

function DashboardSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading dashboard">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="space-y-3 rounded-lg border bg-card p-4">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-7 w-16" />
            <Skeleton className="h-3 w-32" />
          </div>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-72 rounded-lg lg:col-span-2" />
        <Skeleton className="h-72 rounded-lg" />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-80 rounded-lg lg:col-span-2" />
        <Skeleton className="h-80 rounded-lg" />
      </div>
    </div>
  )
}

export function DashboardPage() {
  const user = useCurrentUser()
  const dashboard = useDashboard()
  const showPages = can.managePages(user)
  const showUsers = can.manageUsers(user)

  const actions = (
    <>
      {showPages ? (
        <Button variant="outline" asChild>
          <Link to="/pages/create">
            <FilePlus2 aria-hidden />
            New page
          </Link>
        </Button>
      ) : null}
      <Button asChild>
        <Link to="/posts/create">
          <PenSquare aria-hidden />
          New post
        </Link>
      </Button>
    </>
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${greeting()}, ${user.name.split(' ')[0] ?? user.name}`}
        description="Here is what is happening with your content."
        actions={actions}
      />

      {dashboard.isPending ? (
        <DashboardSkeleton />
      ) : dashboard.isError ? (
        <div className="rounded-lg border bg-card">
          <ErrorState error={dashboard.error} onRetry={() => void dashboard.refetch()} />
        </div>
      ) : (
        <>
          <StatsGrid stats={dashboard.data.stats} showPages={showPages} showUsers={showUsers} />

          <div className="grid gap-4 lg:grid-cols-3">
            <PostsPerMonthChart data={dashboard.data.postsPerMonth} />
            <StatusBreakdown stats={dashboard.data.stats} />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <SectionCard title="Recent posts" to="/posts" className="lg:col-span-2">
              <RecentPostsTable posts={dashboard.data.recentPosts} />
            </SectionCard>
            <SectionCard title="Recently updated">
              <ActivityList
                items={dashboard.data.recentlyUpdated}
                href={(post) => `/posts/${post.id}/edit`}
                emptyLabel="Nothing updated yet."
              />
            </SectionCard>
          </div>

          {showPages ? (
            <SectionCard title="Recent pages" to="/pages">
              <ActivityList<PageSummary>
                items={dashboard.data.recentPages}
                href={(page) => `/pages/${page.id}/edit`}
                emptyLabel="No pages yet."
              />
            </SectionCard>
          ) : null}
        </>
      )}
    </div>
  )
}

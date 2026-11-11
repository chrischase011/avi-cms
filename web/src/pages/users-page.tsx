import { KeyRound, MoreHorizontal, Pencil, Plus, UserCheck, UserX, Users } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { type Column, DataTable } from '@/components/common/data-table'
import { EmptyState } from '@/components/common/empty-state'
import { ErrorState } from '@/components/common/error-state'
import { FilterSelect, FiltersToolbar } from '@/components/common/filter-select'
import { PageHeader } from '@/components/common/page-header'
import { Pagination } from '@/components/common/pagination'
import { SearchInput } from '@/components/common/search-input'
import { Pill } from '@/components/common/status-badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { SetPasswordDialog } from '@/components/users/set-password-dialog'
import { UserFormDialog } from '@/components/users/user-form-dialog'
import { useCurrentUser } from '@/hooks/use-auth'
import { useListParams } from '@/hooks/use-list-params'
import { useUpdateUser, useUsers } from '@/hooks/use-users'
import { formatDate, formatDateTime, formatRelative, initials } from '@/lib/format'
import { ROLE_LABELS, ROLES } from '@/lib/permissions'
import { cn } from '@/lib/utils'
import { errorMessage } from '@/services/api'
import type { Role, User, UserStatusFilter } from '@/types/api'

const PAGE_SIZE = 20
const FILTER_KEYS = ['role', 'status'] as const

const ROLE_OPTIONS = ROLES.map((role) => ({ value: role, label: ROLE_LABELS[role] }))
const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
]

function asRole(value: string): Role | undefined {
  return (ROLES as string[]).includes(value) ? (value as Role) : undefined
}

function asStatus(value: string): UserStatusFilter | undefined {
  return value === 'active' || value === 'inactive' ? value : undefined
}

function ActiveStatus({ active }: { active: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm whitespace-nowrap">
      <span
        className={cn('size-1.5 rounded-full', active ? 'bg-success' : 'bg-muted-foreground/50')}
        aria-hidden
      />
      <span className={active ? 'text-foreground' : 'text-muted-foreground'}>{active ? 'Active' : 'Inactive'}</span>
    </span>
  )
}

export function UsersPage() {
  const me = useCurrentUser()
  const { page, search, filters, setPage, setSearch, setFilter, reset, hasFilters } = useListParams(FILTER_KEYS)
  const query = useUsers({
    page,
    pageSize: PAGE_SIZE,
    search: search || undefined,
    role: asRole(filters.role),
    status: asStatus(filters.status),
  })
  const updateUser = useUpdateUser()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<User | null>(null)
  const [passwordFor, setPasswordFor] = useState<User | null>(null)
  const [deactivating, setDeactivating] = useState<User | null>(null)

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }
  const openEdit = (user: User) => {
    setEditing(user)
    setFormOpen(true)
  }

  const setActive = (user: User, isActive: boolean) => {
    updateUser.mutate(
      { id: user.id, input: { isActive } },
      {
        onSuccess: () => {
          toast.success(isActive ? `${user.name} can sign in again` : `${user.name} was deactivated`)
          setDeactivating(null)
        },
        onError: (error) => toast.error(errorMessage(error, 'Could not update the user')),
      },
    )
  }

  const columns: Column<User>[] = [
    {
      id: 'user',
      header: 'User',
      className: 'max-w-0 w-full',
      cell: (user) => (
        <div className="flex min-w-0 items-center gap-3">
          <Avatar className="size-8 shrink-0">
            <AvatarFallback className="bg-muted text-xs font-medium text-muted-foreground">
              {initials(user.name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2">
              <span className="truncate font-medium">{user.name}</span>
              {user.id === me.id ? <Pill className="border-primary/20 bg-primary/10 text-primary">You</Pill> : null}
            </div>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          </div>
        </div>
      ),
    },
    {
      id: 'role',
      header: 'Role',
      cell: (user) => <Pill>{ROLE_LABELS[user.role]}</Pill>,
    },
    {
      id: 'status',
      header: 'Status',
      className: 'hidden sm:table-cell',
      cell: (user) => <ActiveStatus active={user.isActive} />,
    },
    {
      id: 'lastLogin',
      header: 'Last sign-in',
      className: 'hidden md:table-cell text-muted-foreground',
      cell: (user) =>
        user.lastLoginAt ? (
          <time dateTime={user.lastLoginAt} title={formatDateTime(user.lastLoginAt)} className="tabular-nums">
            {formatRelative(user.lastLoginAt)}
          </time>
        ) : (
          'Never'
        ),
    },
    {
      id: 'created',
      header: 'Created',
      className: 'hidden lg:table-cell text-muted-foreground',
      cell: (user) => <span className="tabular-nums">{formatDate(user.createdAt)}</span>,
    },
    {
      id: 'actions',
      header: 'Actions',
      srOnlyHeader: true,
      className: 'w-10 text-right',
      cell: (user) => {
        const isSelf = user.id === me.id
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${user.name}`}>
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onSelect={() => openEdit(user)}>
                <Pencil aria-hidden />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setPasswordFor(user)}>
                <KeyRound aria-hidden />
                Set password
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {user.isActive ? (
                <DropdownMenuItem
                  variant="destructive"
                  disabled={isSelf}
                  onSelect={() => setDeactivating(user)}
                  title={isSelf ? 'You cannot deactivate yourself' : undefined}
                >
                  <UserX aria-hidden />
                  Deactivate
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem disabled={isSelf || updateUser.isPending} onSelect={() => setActive(user, true)}>
                  <UserCheck aria-hidden />
                  Activate
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        description="Manage who can sign in and what they can do."
        actions={
          <Button onClick={openCreate}>
            <Plus aria-hidden />
            New user
          </Button>
        }
      />

      <FiltersToolbar>
        <SearchInput value={search} onChange={setSearch} placeholder="Search by name or email…" />
        <FilterSelect
          label="Filter by role"
          allLabel="All roles"
          value={filters.role}
          onChange={(value) => setFilter('role', value)}
          options={ROLE_OPTIONS}
        />
        <FilterSelect
          label="Filter by status"
          allLabel="Any status"
          value={filters.status}
          onChange={(value) => setFilter('status', value)}
          options={STATUS_OPTIONS}
        />
        {hasFilters ? (
          <Button variant="ghost" size="sm" onClick={reset} className="sm:ml-1">
            Clear filters
          </Button>
        ) : null}
      </FiltersToolbar>

      {query.isError ? (
        <div className="rounded-lg border bg-card">
          <ErrorState error={query.error} onRetry={() => void query.refetch()} />
        </div>
      ) : (
        <DataTable
          caption="Users"
          columns={columns}
          rows={query.data?.data}
          rowKey={(user) => user.id}
          isLoading={query.isPending}
          isFetching={query.isFetching}
          empty={
            <EmptyState
              icon={Users}
              title={hasFilters ? 'No matching users' : 'No users yet'}
              description={hasFilters ? 'Try a different search or filter.' : 'Invite your team by creating accounts.'}
              action={
                hasFilters ? (
                  <Button variant="outline" size="sm" onClick={reset}>
                    Clear filters
                  </Button>
                ) : (
                  <Button size="sm" onClick={openCreate}>
                    <Plus aria-hidden />
                    New user
                  </Button>
                )
              }
            />
          }
        />
      )}

      <Pagination meta={query.data?.meta} onPageChange={setPage} itemLabel="users" />

      <UserFormDialog open={formOpen} onOpenChange={setFormOpen} user={editing} currentUserId={me.id} />
      <SetPasswordDialog user={passwordFor} onOpenChange={(open) => !open && setPasswordFor(null)} />
      <ConfirmDialog
        open={deactivating !== null}
        onOpenChange={(open) => !open && setDeactivating(null)}
        title={`Deactivate ${deactivating?.name ?? 'user'}?`}
        description="They will not be able to sign in until an admin activates the account again. Their content stays in place."
        confirmLabel="Deactivate"
        destructive
        pending={updateUser.isPending}
        onConfirm={() => deactivating && setActive(deactivating, false)}
      />
    </div>
  )
}

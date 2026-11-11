import { LogOut, UserRound } from 'lucide-react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuth, useLogout } from '@/hooks/use-auth'
import { initials } from '@/lib/format'
import { ROLE_LABELS } from '@/lib/permissions'

export function UserMenu() {
  const { user } = useAuth()
  const logout = useLogout()
  const navigate = useNavigate()

  if (!user) return null

  const signOut = () => {
    logout.mutate(undefined, {
      onSettled: () => navigate('/login', { replace: true }),
      onError: () => toast.error('Signed out locally, but the server did not respond.'),
    })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 gap-2 px-1.5" aria-label="Account menu">
          <Avatar className="size-6">
            <AvatarFallback className="bg-primary/10 text-[0.65rem] font-semibold text-primary">
              {initials(user.name)}
            </AvatarFallback>
          </Avatar>
          <span className="hidden max-w-32 truncate text-sm font-medium sm:inline">{user.name}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="grid gap-0.5">
            <span className="truncate text-sm font-medium text-foreground">{user.name}</span>
            <span className="truncate text-xs text-muted-foreground">{user.email}</span>
            <span className="text-xs text-muted-foreground">{ROLE_LABELS[user.role]}</span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => navigate('/account')}>
          <UserRound aria-hidden />
          Account
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={signOut} disabled={logout.isPending}>
          <LogOut aria-hidden />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

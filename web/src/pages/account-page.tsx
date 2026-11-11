import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { describedBy, FormField } from '@/components/common/form-field'
import { PageHeader } from '@/components/common/page-header'
import { Pill } from '@/components/common/status-badge'
import { PASSWORD_MIN } from '@/components/users/user-form-dialog'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useChangePassword, useCurrentUser } from '@/hooks/use-auth'
import { applyApiErrors } from '@/lib/form-errors'
import { initials } from '@/lib/format'
import { can, ROLE_LABELS } from '@/lib/permissions'
import { errorMessage, isApiError } from '@/services/api'

const schema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password'),
    newPassword: z.string().min(PASSWORD_MIN, `Password must be at least ${PASSWORD_MIN} characters`),
    confirmPassword: z.string(),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  })
  .refine((values) => values.newPassword !== values.currentPassword, {
    path: ['newPassword'],
    message: 'Choose a password different from the current one',
  })

type FormValues = z.infer<typeof schema>

const EMPTY: FormValues = { currentPassword: '', newPassword: '', confirmPassword: '' }

function ProfileRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1 py-3 sm:grid-cols-[10rem_1fr] sm:gap-4">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="min-w-0 truncate text-sm">{children}</dd>
    </div>
  )
}

export function AccountPage() {
  const user = useCurrentUser()
  const changePassword = useChangePassword()
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: EMPTY })
  const { register, handleSubmit, reset, setError, formState } = form
  const { errors } = formState

  const onSubmit = handleSubmit(async (values) => {
    try {
      await changePassword.mutateAsync({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      })
      reset(EMPTY)
      toast.success('Password changed')
    } catch (error) {
      // A wrong current password is a 400 with this message; other 400s are field errors.
      if (isApiError(error) && error.status === 400 && /current password/i.test(error.message)) {
        setError('currentPassword', { type: 'server', message: 'Current password is incorrect' }, { shouldFocus: true })
        return
      }
      const handled = applyApiErrors(error, setError, { fields: ['currentPassword', 'newPassword'] })
      if (!handled) toast.error(errorMessage(error, 'Could not change your password'))
    }
  })

  const pending = changePassword.isPending

  return (
    <div className="space-y-6">
      <PageHeader title="Account" description="Your profile and sign-in details." />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>
              {can.manageUsers(user) ? (
                <>
                  Edit names, emails and roles on the{' '}
                  <Link to="/users" className="font-medium text-foreground underline-offset-4 hover:underline">
                    Users
                  </Link>{' '}
                  page.
                </>
              ) : (
                'Ask an administrator to change your name, email or role.'
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-2 flex items-center gap-3">
              <Avatar className="size-10">
                <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
                  {initials(user.name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate font-medium">{user.name}</p>
                <p className="truncate text-sm text-muted-foreground">{user.email}</p>
              </div>
            </div>
            <dl className="divide-y">
              <ProfileRow label="Name">{user.name}</ProfileRow>
              <ProfileRow label="Email">{user.email}</ProfileRow>
              <ProfileRow label="Role">
                <Pill>{ROLE_LABELS[user.role]}</Pill>
              </ProfileRow>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <form onSubmit={onSubmit} noValidate className="contents">
            <CardHeader>
              <CardTitle>Change password</CardTitle>
              <CardDescription>Use at least {PASSWORD_MIN} characters. A passphrase works well.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              {/* Helps password managers associate the change with this account. */}
              <input type="text" name="username" autoComplete="username" value={user.email} readOnly hidden />
              <FormField
                label="Current password"
                htmlFor="account-current-password"
                error={errors.currentPassword?.message}
                required
              >
                <Input
                  id="account-current-password"
                  type="password"
                  autoComplete="current-password"
                  aria-invalid={errors.currentPassword ? true : undefined}
                  aria-describedby={describedBy('account-current-password', errors.currentPassword?.message)}
                  {...register('currentPassword')}
                />
              </FormField>
              <FormField
                label="New password"
                htmlFor="account-new-password"
                error={errors.newPassword?.message}
                required
              >
                <Input
                  id="account-new-password"
                  type="password"
                  autoComplete="new-password"
                  aria-invalid={errors.newPassword ? true : undefined}
                  aria-describedby={describedBy('account-new-password', errors.newPassword?.message)}
                  {...register('newPassword')}
                />
              </FormField>
              <FormField
                label="Confirm new password"
                htmlFor="account-confirm-password"
                error={errors.confirmPassword?.message}
                required
              >
                <Input
                  id="account-confirm-password"
                  type="password"
                  autoComplete="new-password"
                  aria-invalid={errors.confirmPassword ? true : undefined}
                  aria-describedby={describedBy('account-confirm-password', errors.confirmPassword?.message)}
                  {...register('confirmPassword')}
                />
              </FormField>
            </CardContent>
            <CardFooter className="justify-end">
              <Button type="submit" disabled={pending}>
                {pending ? <Loader2 className="animate-spin" aria-hidden /> : null}
                Update password
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  )
}

import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { describedBy, FormField } from '@/components/common/form-field'
import { PASSWORD_MIN } from '@/components/users/user-form-dialog'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useSetUserPassword } from '@/hooks/use-users'
import { applyApiErrors } from '@/lib/form-errors'
import { errorMessage } from '@/services/api'
import type { User } from '@/types/api'

const schema = z
  .object({
    password: z.string().min(PASSWORD_MIN, `Password must be at least ${PASSWORD_MIN} characters`),
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  })

type FormValues = z.infer<typeof schema>

interface SetPasswordDialogProps {
  user: User | null
  onOpenChange: (open: boolean) => void
}

export function SetPasswordDialog({ user, onOpenChange }: SetPasswordDialogProps) {
  const setPassword = useSetUserPassword()
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { password: '', confirmPassword: '' },
  })
  const { register, handleSubmit, reset, setError, formState } = form
  const { errors } = formState
  const open = user !== null

  useEffect(() => {
    if (open) reset({ password: '', confirmPassword: '' })
  }, [open, reset])

  const onSubmit = handleSubmit(async (values) => {
    if (!user) return
    try {
      await setPassword.mutateAsync({ id: user.id, password: values.password })
      toast.success(`Password updated for ${user.name}`)
      onOpenChange(false)
    } catch (error) {
      const handled = applyApiErrors(error, setError, { fields: ['password'] })
      if (!handled) toast.error(errorMessage(error, 'Could not set the password'))
    }
  })

  const pending = setPassword.isPending

  return (
    <Dialog open={open} onOpenChange={(next) => (pending ? undefined : onOpenChange(next))}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={onSubmit} noValidate className="grid gap-5">
          <DialogHeader>
            <DialogTitle>Set password</DialogTitle>
            <DialogDescription>
              Choose a new password for {user?.name ?? 'this user'}. They will be signed out on every device.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <FormField
              label="New password"
              htmlFor="set-password-new"
              error={errors.password?.message}
              description={`At least ${PASSWORD_MIN} characters.`}
              required
            >
              <Input
                id="set-password-new"
                type="password"
                autoComplete="new-password"
                autoFocus
                aria-invalid={errors.password ? true : undefined}
                aria-describedby={describedBy('set-password-new', errors.password?.message, 'hint')}
                {...register('password')}
              />
            </FormField>
            <FormField
              label="Confirm password"
              htmlFor="set-password-confirm"
              error={errors.confirmPassword?.message}
              required
            >
              <Input
                id="set-password-confirm"
                type="password"
                autoComplete="new-password"
                aria-invalid={errors.confirmPassword ? true : undefined}
                aria-describedby={describedBy('set-password-confirm', errors.confirmPassword?.message)}
                {...register('confirmPassword')}
              />
            </FormField>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="animate-spin" aria-hidden /> : null}
              Set password
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

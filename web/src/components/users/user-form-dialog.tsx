import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { describedBy, FormField } from '@/components/common/form-field'
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
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { useCreateUser, useUpdateUser } from '@/hooks/use-users'
import { applyApiErrors } from '@/lib/form-errors'
import { ROLE_LABELS, ROLES } from '@/lib/permissions'
import { errorMessage } from '@/services/api'
import type { Role, UpdateUserInput, User } from '@/types/api'

export const PASSWORD_MIN = 10

const ROLE_HINTS: Record<Role, string> = {
  admin: 'Everything, including users and settings',
  editor: 'All posts and pages, publishing, categories, tags and media',
  author: 'Own posts as drafts only; can upload media',
}

const baseSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100, 'Name must be 100 characters or fewer'),
  email: z.string().trim().min(1, 'Email is required').email('Enter a valid email address'),
  role: z.enum(['admin', 'editor', 'author']),
  isActive: z.boolean(),
  password: z.string(),
  confirmPassword: z.string(),
})

function schemaFor(creating: boolean) {
  return baseSchema.superRefine((values, ctx) => {
    if (!creating) return
    if (values.password.length < PASSWORD_MIN) {
      ctx.addIssue({
        code: 'custom',
        path: ['password'],
        message: `Password must be at least ${PASSWORD_MIN} characters`,
      })
    }
    if (values.confirmPassword !== values.password) {
      ctx.addIssue({ code: 'custom', path: ['confirmPassword'], message: 'Passwords do not match' })
    }
  })
}

type FormValues = z.infer<typeof baseSchema>

const FIELDS = ['name', 'email', 'role', 'isActive', 'password'] as const

interface UserFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** User to edit; omit to create. */
  user?: User | null
  currentUserId: number
}

function isRole(value: string): value is Role {
  return (ROLES as string[]).includes(value)
}

export function UserFormDialog({ open, onOpenChange, user, currentUserId }: UserFormDialogProps) {
  const creating = !user
  const isSelf = user?.id === currentUserId
  const createUser = useCreateUser()
  const updateUser = useUpdateUser()
  const pending = createUser.isPending || updateUser.isPending

  const form = useForm<FormValues>({
    resolver: zodResolver(schemaFor(creating)),
    defaultValues: { name: '', email: '', role: 'author', isActive: true, password: '', confirmPassword: '' },
  })
  const { register, handleSubmit, reset, setError, control, formState } = form
  const { errors } = formState

  useEffect(() => {
    if (!open) return
    reset({
      name: user?.name ?? '',
      email: user?.email ?? '',
      role: user?.role ?? 'author',
      isActive: user?.isActive ?? true,
      password: '',
      confirmPassword: '',
    })
  }, [open, user, reset])

  const onSubmit = handleSubmit(async (values) => {
    try {
      if (creating) {
        await createUser.mutateAsync({
          name: values.name,
          email: values.email,
          role: values.role,
          isActive: values.isActive,
          password: values.password,
        })
        toast.success(`Created ${values.name}`)
      } else {
        const input: UpdateUserInput = { name: values.name, email: values.email }
        // The API refuses self-demotion/deactivation; never send them for yourself.
        if (!isSelf) {
          input.role = values.role
          input.isActive = values.isActive
        }
        await updateUser.mutateAsync({ id: user.id, input })
        toast.success(`Saved ${values.name}`)
      }
      onOpenChange(false)
    } catch (error) {
      const handled = applyApiErrors(error, setError, { fields: FIELDS, conflictField: 'email' })
      if (!handled) toast.error(errorMessage(error, 'Could not save the user'))
    }
  })

  const id = (field: string) => `user-form-${field}`
  const selfHint = 'You cannot demote or deactivate yourself.'

  return (
    <Dialog open={open} onOpenChange={(next) => (pending ? undefined : onOpenChange(next))}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={onSubmit} noValidate className="grid gap-5">
          <DialogHeader>
            <DialogTitle>{creating ? 'New user' : `Edit ${user.name}`}</DialogTitle>
            <DialogDescription>
              {creating
                ? 'They can sign in with this email and password right away.'
                : 'Update account details, role and access.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Name" htmlFor={id('name')} error={errors.name?.message} required>
                <Input
                  id={id('name')}
                  autoComplete="off"
                  autoFocus
                  aria-invalid={errors.name ? true : undefined}
                  aria-describedby={describedBy(id('name'), errors.name?.message)}
                  {...register('name')}
                />
              </FormField>
              <FormField label="Email" htmlFor={id('email')} error={errors.email?.message} required>
                <Input
                  id={id('email')}
                  type="email"
                  autoComplete="off"
                  spellCheck={false}
                  aria-invalid={errors.email ? true : undefined}
                  aria-describedby={describedBy(id('email'), errors.email?.message)}
                  {...register('email')}
                />
              </FormField>
            </div>

            <Controller
              control={control}
              name="role"
              render={({ field }) => (
                <FormField
                  label="Role"
                  htmlFor={id('role')}
                  error={errors.role?.message}
                  description={isSelf ? selfHint : ROLE_HINTS[field.value]}
                >
                  <Select
                    value={field.value}
                    onValueChange={(value) => isRole(value) && field.onChange(value)}
                    disabled={isSelf}
                  >
                    <SelectTrigger
                      id={id('role')}
                      className="w-full"
                      aria-invalid={errors.role ? true : undefined}
                      aria-describedby={describedBy(id('role'), errors.role?.message, 'hint')}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES.map((role) => (
                        <SelectItem key={role} value={role}>
                          {ROLE_LABELS[role]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
              )}
            />

            <Controller
              control={control}
              name="isActive"
              render={({ field }) => (
                <div className="flex items-start justify-between gap-4 rounded-lg border p-3">
                  <div className="grid gap-0.5">
                    <Label htmlFor={id('active')} className="text-sm font-medium">
                      Active
                    </Label>
                    <p id={id('active-hint')} className="text-xs text-muted-foreground">
                      {isSelf ? selfHint : 'Inactive users cannot sign in.'}
                    </p>
                  </div>
                  <Switch
                    id={id('active')}
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={isSelf}
                    aria-describedby={id('active-hint')}
                  />
                </div>
              )}
            />

            {creating ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  label="Password"
                  htmlFor={id('password')}
                  error={errors.password?.message}
                  description={`At least ${PASSWORD_MIN} characters.`}
                  required
                >
                  <Input
                    id={id('password')}
                    type="password"
                    autoComplete="new-password"
                    aria-invalid={errors.password ? true : undefined}
                    aria-describedby={describedBy(id('password'), errors.password?.message, 'hint')}
                    {...register('password')}
                  />
                </FormField>
                <FormField
                  label="Confirm password"
                  htmlFor={id('confirm')}
                  error={errors.confirmPassword?.message}
                  required
                >
                  <Input
                    id={id('confirm')}
                    type="password"
                    autoComplete="new-password"
                    aria-invalid={errors.confirmPassword ? true : undefined}
                    aria-describedby={describedBy(id('confirm'), errors.confirmPassword?.message)}
                    {...register('confirmPassword')}
                  />
                </FormField>
              </div>
            ) : null}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="animate-spin" aria-hidden /> : null}
              {creating ? 'Create user' : 'Save changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

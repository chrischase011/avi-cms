import { zodResolver } from '@hookform/resolvers/zod'
import { AlertCircle, Eye, EyeOff, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate, useSearchParams } from 'react-router'
import { z } from 'zod'
import { describedBy, FormField } from '@/components/common/form-field'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useLogin } from '@/hooks/use-auth'
import { applyApiErrors } from '@/lib/form-errors'
import { safeNextPath } from '@/router/guards'
import { errorMessage, isApiError } from '@/services/api'

const schema = z.object({
  email: z.email('Enter a valid email address'),
  password: z.string().min(1, 'Enter your password'),
})

type LoginValues = z.infer<typeof schema>

function loginErrorMessage(error: unknown): string {
  if (isApiError(error)) {
    if (error.status === 429) {
      const wait = error.retryAfter
      return wait
        ? `Too many sign-in attempts. Try again in ${wait < 60 ? `${wait} seconds` : `${Math.ceil(wait / 60)} minutes`}.`
        : 'Too many sign-in attempts. Try again later.'
    }
    if (error.status === 401) return error.message || 'Incorrect email or password.'
  }
  return errorMessage(error, 'Could not sign in. Try again.')
}

export function LoginPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const login = useLogin()
  const [showPassword, setShowPassword] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const form = useForm<LoginValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  })
  const { errors } = form.formState

  const onSubmit = form.handleSubmit((values) => {
    setFormError(null)
    login.mutate(values, {
      onSuccess: () => navigate(safeNextPath(searchParams.get('next')), { replace: true }),
      onError: (error) => {
        const mapped = applyApiErrors(error, form.setError, { fields: ['email', 'password'] })
        if (!mapped) setFormError(loginErrorMessage(error))
        form.resetField('password', { keepError: true })
      },
    })
  })

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg">Sign in</CardTitle>
        <CardDescription>Use your Avi CMS account to continue.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} noValidate className="grid gap-4">
          {formError ? (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
            >
              <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span>{formError}</span>
            </div>
          ) : null}

          <FormField label="Email" htmlFor="email" error={errors.email?.message}>
            <Input
              id="email"
              type="email"
              autoComplete="username"
              autoFocus
              aria-invalid={!!errors.email}
              aria-describedby={describedBy('email', errors.email?.message)}
              {...form.register('email')}
            />
          </FormField>

          <FormField label="Password" htmlFor="password" error={errors.password?.message}>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                className="pr-9"
                aria-invalid={!!errors.password}
                aria-describedby={describedBy('password', errors.password?.message)}
                {...form.register('password')}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute top-1/2 right-1.5 flex size-6 -translate-y-1/2 items-center justify-center rounded text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </FormField>

          <Button type="submit" size="lg" className="mt-1 w-full" disabled={login.isPending}>
            {login.isPending ? <Loader2 className="animate-spin" aria-hidden /> : null}
            Sign in
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

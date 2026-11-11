import { zodResolver } from '@hookform/resolvers/zod'
import { Info, Loader2 } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { ErrorState } from '@/components/common/error-state'
import { CharCounter, describedBy, FormField } from '@/components/common/form-field'
import { FormSkeleton } from '@/components/common/loading'
import { PageHeader } from '@/components/common/page-header'
import { MediaField } from '@/components/media/media-field'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useCurrentUser } from '@/hooks/use-auth'
import { useSettings, useUpdateSettings } from '@/hooks/use-settings'
import { applyApiErrors } from '@/lib/form-errors'
import { can } from '@/lib/permissions'
import { errorMessage } from '@/services/api'
import type { Settings, SettingsInput } from '@/types/api'

const SEO_TITLE_MAX = 70
const SEO_TITLE_RECOMMENDED = 60
const SEO_DESCRIPTION_MAX = 160
const SEO_DESCRIPTION_RECOMMENDED = 155

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

const imageRef = z.object({ id: z.number(), url: z.string(), alt: z.string().optional() }).nullable()

const settingsSchema = z.object({
  siteName: z.string().trim().min(1, 'Site name is required').max(100, 'Keep the site name under 100 characters'),
  siteDescription: z.string().trim().max(300, 'Keep the description under 300 characters'),
  siteUrl: z
    .string()
    .trim()
    .max(2048, 'URL is too long')
    .refine((value) => value === '' || isHttpUrl(value), 'Enter a full URL starting with http:// or https://'),
  logo: imageRef,
  favicon: imageRef,
  defaultSeoTitle: z
    .string()
    .trim()
    .max(SEO_TITLE_MAX, `Keep the SEO title under ${SEO_TITLE_MAX} characters`),
  defaultSeoDescription: z
    .string()
    .trim()
    .max(SEO_DESCRIPTION_MAX, `Keep the SEO description under ${SEO_DESCRIPTION_MAX} characters`),
  postsPerPage: z
    .number({ error: 'Enter a number between 1 and 100' })
    .int('Use a whole number')
    .min(1, 'At least 1 post per page')
    .max(100, 'At most 100 posts per page'),
})

type FormInput = z.input<typeof settingsSchema>
type FormOutput = z.output<typeof settingsSchema>

const FIELDS = [
  'siteName',
  'siteDescription',
  'siteUrl',
  'logo',
  'favicon',
  'defaultSeoTitle',
  'defaultSeoDescription',
  'postsPerPage',
] as const

function toFormValues(settings: Settings): FormInput {
  return {
    siteName: settings.siteName,
    siteDescription: settings.siteDescription,
    siteUrl: settings.siteUrl,
    logo: settings.logoId !== null && settings.logoUrl ? { id: settings.logoId, url: settings.logoUrl } : null,
    favicon:
      settings.faviconId !== null && settings.faviconUrl ? { id: settings.faviconId, url: settings.faviconUrl } : null,
    defaultSeoTitle: settings.defaultSeoTitle,
    defaultSeoDescription: settings.defaultSeoDescription,
    postsPerPage: settings.postsPerPage,
  }
}

function toInput(values: FormOutput): SettingsInput {
  return {
    siteName: values.siteName,
    siteDescription: values.siteDescription,
    siteUrl: values.siteUrl,
    logoId: values.logo?.id ?? null,
    faviconId: values.favicon?.id ?? null,
    defaultSeoTitle: values.defaultSeoTitle,
    defaultSeoDescription: values.defaultSeoDescription,
    postsPerPage: values.postsPerPage,
  }
}

export function SettingsPage() {
  const query = useSettings()

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Site details, branding and defaults used by the public API." />
      {query.isPending ? (
        <Card>
          <CardContent>
            <FormSkeleton fields={5} />
          </CardContent>
        </Card>
      ) : query.isError ? (
        <div className="rounded-lg border bg-card">
          <ErrorState error={query.error} onRetry={() => void query.refetch()} />
        </div>
      ) : (
        <SettingsForm settings={query.data} />
      )}
    </div>
  )
}

function Section({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-5">{children}</CardContent>
    </Card>
  )
}

function SettingsForm({ settings }: { settings: Settings }) {
  const user = useCurrentUser()
  const editable = can.editSettings(user)
  const update = useUpdateSettings()

  const form = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(settingsSchema),
    defaultValues: toFormValues(settings),
    disabled: !editable,
  })
  const { register, control, formState, reset, setError } = form
  const errors = formState.errors

  // Follow server data (e.g. refetch) while the user has no local edits.
  useEffect(() => {
    if (!form.formState.isDirty) reset(toFormValues(settings))
  }, [settings, reset, form.formState.isDirty])

  const onSubmit = form.handleSubmit((values) => {
    update.mutate(toInput(values), {
      onSuccess: (saved) => {
        reset(toFormValues(saved))
        toast.success('Settings saved')
      },
      onError: (error) => {
        const applied = applyApiErrors(error, setError, {
          fields: FIELDS,
          aliases: { logoId: 'logo', faviconId: 'favicon' },
        })
        toast.error(applied ? 'Check the highlighted fields' : errorMessage(error, 'Could not save settings'))
      },
    })
  })

  const [seoTitle = '', seoDescription = '', siteDescription = ''] = useWatch({
    control,
    name: ['defaultSeoTitle', 'defaultSeoDescription', 'siteDescription'],
  })

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      {!editable ? (
        <div className="flex items-start gap-2.5 rounded-lg border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
          <p>Only administrators can change settings.</p>
        </div>
      ) : null}

      <Section title="General" description="How your site identifies itself.">
        <FormField label="Site name" htmlFor="siteName" error={errors.siteName?.message} required>
          <Input
            id="siteName"
            autoComplete="off"
            aria-invalid={errors.siteName ? true : undefined}
            aria-describedby={describedBy('siteName', errors.siteName?.message)}
            {...register('siteName')}
          />
        </FormField>
        <FormField
          label="Site description"
          htmlFor="siteDescription"
          error={errors.siteDescription?.message}
          aside={<CharCounter value={siteDescription} max={300} />}
        >
          <Textarea
            id="siteDescription"
            rows={3}
            aria-invalid={errors.siteDescription ? true : undefined}
            aria-describedby={describedBy('siteDescription', errors.siteDescription?.message)}
            {...register('siteDescription')}
          />
        </FormField>
        <FormField
          label="Site URL"
          htmlFor="siteUrl"
          error={errors.siteUrl?.message}
          description="The public address of the site that consumes this CMS."
        >
          <Input
            id="siteUrl"
            type="url"
            inputMode="url"
            placeholder="https://example.com"
            autoComplete="url"
            aria-invalid={errors.siteUrl ? true : undefined}
            aria-describedby={describedBy('siteUrl', errors.siteUrl?.message, true)}
            {...register('siteUrl')}
          />
        </FormField>
      </Section>

      <Section title="Branding" description="Images are chosen from the media library.">
        <div className="grid gap-6 sm:grid-cols-2">
          <FormField
            label="Logo"
            htmlFor="logo"
            error={errors.logo?.message}
            description="Shown in the admin sidebar and returned by the public settings API."
          >
            <Controller
              control={control}
              name="logo"
              render={({ field }) => (
                <MediaField
                  id="logo"
                  aspect="square"
                  pickerTitle="Choose a logo"
                  value={field.value}
                  disabled={field.disabled}
                  aria-invalid={errors.logo ? true : undefined}
                  aria-describedby={describedBy('logo', errors.logo?.message, true)}
                  onChange={(media) => field.onChange(media ? { id: media.id, url: media.url, alt: media.alt } : null)}
                />
              )}
            />
          </FormField>
          <FormField
            label="Favicon"
            htmlFor="favicon"
            error={errors.favicon?.message}
            description="A square image, ideally 512 × 512 px."
          >
            <Controller
              control={control}
              name="favicon"
              render={({ field }) => (
                <MediaField
                  id="favicon"
                  aspect="square"
                  pickerTitle="Choose a favicon"
                  value={field.value}
                  disabled={field.disabled}
                  aria-invalid={errors.favicon ? true : undefined}
                  aria-describedby={describedBy('favicon', errors.favicon?.message, true)}
                  onChange={(media) => field.onChange(media ? { id: media.id, url: media.url, alt: media.alt } : null)}
                />
              )}
            />
          </FormField>
        </div>
      </Section>

      <Section title="SEO defaults" description="Used when a post or page has no SEO fields of its own.">
        <FormField
          label="Default SEO title"
          htmlFor="defaultSeoTitle"
          error={errors.defaultSeoTitle?.message}
          aside={<CharCounter value={seoTitle} max={SEO_TITLE_MAX} recommended={SEO_TITLE_RECOMMENDED} />}
        >
          <Input
            id="defaultSeoTitle"
            aria-invalid={errors.defaultSeoTitle ? true : undefined}
            aria-describedby={describedBy('defaultSeoTitle', errors.defaultSeoTitle?.message)}
            {...register('defaultSeoTitle')}
          />
        </FormField>
        <FormField
          label="Default SEO description"
          htmlFor="defaultSeoDescription"
          error={errors.defaultSeoDescription?.message}
          aside={
            <CharCounter
              value={seoDescription}
              max={SEO_DESCRIPTION_MAX}
              recommended={SEO_DESCRIPTION_RECOMMENDED}
            />
          }
        >
          <Textarea
            id="defaultSeoDescription"
            rows={3}
            aria-invalid={errors.defaultSeoDescription ? true : undefined}
            aria-describedby={describedBy('defaultSeoDescription', errors.defaultSeoDescription?.message)}
            {...register('defaultSeoDescription')}
          />
        </FormField>
      </Section>

      <Section title="Reading" description="Defaults for public listings.">
        <FormField
          label="Posts per page"
          htmlFor="postsPerPage"
          error={errors.postsPerPage?.message}
          description="Default page size for GET /api/public/posts (1–100)."
          className="max-w-xs"
        >
          <Input
            id="postsPerPage"
            type="number"
            inputMode="numeric"
            min={1}
            max={100}
            step={1}
            className="tabular-nums"
            aria-invalid={errors.postsPerPage ? true : undefined}
            aria-describedby={describedBy('postsPerPage', errors.postsPerPage?.message, true)}
            {...register('postsPerPage', { valueAsNumber: true })}
          />
        </FormField>
      </Section>

      {editable ? (
        <div className="sticky bottom-0 z-10 -mx-4 border-t bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          <div className="flex items-center justify-end gap-3">
            <p className="mr-auto text-sm text-muted-foreground" aria-live="polite">
              {formState.isDirty ? 'You have unsaved changes.' : 'All changes saved.'}
            </p>
            <Button
              type="button"
              variant="outline"
              disabled={!formState.isDirty || update.isPending}
              onClick={() => reset(toFormValues(settings))}
            >
              Discard
            </Button>
            <Button type="submit" disabled={!formState.isDirty || update.isPending}>
              {update.isPending ? <Loader2 className="animate-spin" aria-hidden /> : null}
              Save changes
            </Button>
          </div>
        </div>
      ) : null}
    </form>
  )
}

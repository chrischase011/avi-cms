import { zodResolver } from '@hookform/resolvers/zod'
import { Archive, ArchiveRestore, Eye, Loader2, Send, Trash2, Undo2 } from 'lucide-react'
import { type ChangeEvent, useEffect, useRef, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { Link, useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { z } from 'zod'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { ErrorState } from '@/components/common/error-state'
import { CharCounter, describedBy, FormField } from '@/components/common/form-field'
import { FormSkeleton } from '@/components/common/loading'
import { PageHeader } from '@/components/common/page-header'
import { StatusBadge } from '@/components/common/status-badge'
import { ContentPreviewDialog } from '@/components/editor/content-preview-dialog'
import { RichTextEditor } from '@/components/editor/rich-text-editor'
import { useSaveShortcut, useUnsavedChangesGuard } from '@/components/editor/use-editor-guards'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useCreatePage, useDeletePage, usePage, usePublishPage, useUpdatePage } from '@/hooks/use-pages'
import { useSettings } from '@/hooks/use-settings'
import { applyApiErrors } from '@/lib/form-errors'
import { formatDateTime } from '@/lib/format'
import { SLUG_PATTERN, slugify } from '@/lib/slug'
import { errorMessage, isApiError } from '@/services/api'
import type { Page, PageInput, Status } from '@/types/api'

const SEO_TITLE_MAX = 200 // API limit
const SEO_TITLE_RECOMMENDED = 60
const SEO_DESCRIPTION_MAX = 320 // API limit
const SEO_DESCRIPTION_RECOMMENDED = 155

const schema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200, 'Keep the title under 200 characters'),
  slug: z
    .string()
    .trim()
    .max(200, 'Keep the slug under 200 characters')
    .refine((value) => value === '' || SLUG_PATTERN.test(value), 'Use lowercase letters, numbers and hyphens'),
  content: z.string(),
  seoTitle: z.string().trim().max(SEO_TITLE_MAX, `Keep the SEO title under ${SEO_TITLE_MAX} characters`),
  seoDescription: z
    .string()
    .trim()
    .max(SEO_DESCRIPTION_MAX, `Keep the SEO description under ${SEO_DESCRIPTION_MAX} characters`),
})

type FormValues = z.infer<typeof schema>

const FIELDS = ['title', 'slug', 'content', 'seoTitle', 'seoDescription'] as const

const EMPTY: FormValues = { title: '', slug: '', content: '', seoTitle: '', seoDescription: '' }

function toFormValues(page: Page): FormValues {
  return {
    title: page.title,
    slug: page.slug,
    content: page.content,
    seoTitle: page.seoTitle,
    seoDescription: page.seoDescription,
  }
}

function toInput(values: FormValues): PageInput {
  return {
    title: values.title,
    slug: values.slug || undefined,
    content: values.content,
    seoTitle: values.seoTitle,
    seoDescription: values.seoDescription,
  }
}

type Intent = 'save' | 'publish' | 'unpublish' | 'archive' | 'restore'

const SUCCESS: Record<Intent, string> = {
  save: 'Page saved',
  publish: 'Page published',
  unpublish: 'Page moved to drafts',
  archive: 'Page archived',
  restore: 'Page restored to drafts',
}

function parseId(raw: string | undefined): number | undefined {
  if (raw === undefined) return undefined
  const id = Number(raw)
  return Number.isInteger(id) && id > 0 ? id : Number.NaN
}

export function PageEditorPage() {
  const params = useParams()
  const id = parseId(params.id)
  const isNew = id === undefined
  const query = usePage(id !== undefined && !Number.isNaN(id) ? id : undefined)

  if (id !== undefined && Number.isNaN(id)) return <PageNotFound />
  if (!isNew && query.isPending) {
    return (
      <div className="space-y-6">
        <PageHeader title="Edit page" />
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="rounded-lg border bg-card p-6">
            <FormSkeleton fields={3} />
          </div>
          <div className="rounded-lg border bg-card p-6">
            <FormSkeleton fields={2} />
          </div>
        </div>
      </div>
    )
  }
  if (!isNew && query.isError) {
    if (isApiError(query.error) && query.error.status === 404) return <PageNotFound />
    return (
      <div className="rounded-lg border bg-card">
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      </div>
    )
  }

  return <PageEditor key={query.data?.id ?? 'new'} page={query.data ?? null} />
}

function PageNotFound() {
  return (
    <div className="rounded-lg border bg-card">
      <ErrorState error={new Error('This page does not exist or was deleted.')} title="Page not found" />
      <div className="-mt-8 flex justify-center pb-10">
        <Button variant="outline" asChild>
          <Link to="/pages">Back to pages</Link>
        </Button>
      </div>
    </div>
  )
}

function SearchSnippet({ title, slug, description }: { title: string; slug: string; description: string }) {
  const { data: settings } = useSettings()
  const base = (settings?.siteUrl || 'https://example.com').replace(/\/+$/, '')
  return (
    <div className="rounded-md border bg-background p-3" aria-label="Search result preview">
      <p className="truncate text-xs text-muted-foreground">
        {base}/{slug || 'page-slug'}
      </p>
      <p className="mt-0.5 line-clamp-1 text-[0.9375rem] font-medium text-primary">
        {title || 'Page title'}
      </p>
      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
        {description || 'Add an SEO description to control the text shown in search results.'}
      </p>
    </div>
  )
}

function PageEditor({ page }: { page: Page | null }) {
  const navigate = useNavigate()
  const isNew = page === null
  const status: Status = page?.status ?? 'draft'

  const createPage = useCreatePage()
  const updatePage = useUpdatePage()
  const publishPage = usePublishPage()
  const deletePage = useDeletePage()

  const [pendingIntent, setPendingIntent] = useState<Intent | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const slugTouched = useRef(!isNew)

  const {
    register,
    control,
    handleSubmit,
    setValue,
    setError,
    reset,
    watch,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: page ? toFormValues(page) : EMPTY,
  })

  const guard = useUnsavedChangesGuard(isDirty && pendingIntent === null)

  useEffect(() => {
    const subscription = watch((values, { name }) => {
      if (name === 'title' && !slugTouched.current) {
        setValue('slug', slugify(values.title ?? ''), { shouldDirty: true })
      }
    })
    return () => subscription.unsubscribe()
  }, [watch, setValue])

  const slugField = register('slug', {
    onChange: (event: ChangeEvent<HTMLInputElement>) => {
      slugTouched.current = event.target.value.trim() !== ''
    },
  })

  const run = (intent: Intent) =>
    handleSubmit(async (values) => {
      setPendingIntent(intent)
      try {
        const input = toInput(values)
        let saved: Page
        if (page === null) {
          saved = await createPage.mutateAsync({ ...input, status: 'draft' })
        } else {
          const body: Partial<PageInput> = { ...input }
          if (intent === 'archive') body.status = 'archived'
          if (intent === 'restore') body.status = 'draft'
          saved = await updatePage.mutateAsync({ id: page.id, input: body })
        }
        if (intent === 'publish' || intent === 'unpublish') {
          saved = await publishPage.mutateAsync({ id: saved.id, publish: intent === 'publish' })
        }
        reset(toFormValues(saved))
        slugTouched.current = true
        toast.success(SUCCESS[intent])
        if (page === null) {
          guard.allowNextNavigation()
          navigate(`/pages/${saved.id}/edit`, { replace: true })
        }
      } catch (error) {
        const handled = applyApiErrors(error, setError, { fields: FIELDS, conflictField: 'slug' })
        toast.error(handled ? 'Please fix the highlighted fields.' : errorMessage(error, 'Could not save the page'))
      } finally {
        setPendingIntent(null)
      }
    })()

  useSaveShortcut(() => {
    if (pendingIntent === null) void run('save')
  })

  const confirmDelete = () => {
    if (!page) return
    deletePage.mutate(page.id, {
      onSuccess: () => {
        toast.success('Page deleted')
        setDeleteOpen(false)
        guard.allowNextNavigation()
        navigate('/pages', { replace: true })
      },
      onError: (error) => toast.error(errorMessage(error)),
    })
  }

  const busy = pendingIntent !== null
  const title = watch('title')
  const slug = watch('slug')
  const content = watch('content')
  const seoTitle = watch('seoTitle')
  const seoDescription = watch('seoDescription')

  const spinner = (intent: Intent) =>
    pendingIntent === intent ? <Loader2 className="animate-spin" aria-hidden /> : null

  const actions = (
    <>
      <Button type="button" variant="ghost" onClick={() => setPreviewOpen(true)}>
        <Eye aria-hidden />
        Preview
      </Button>
      {status === 'published' ? (
        <>
          <Button type="button" variant="outline" disabled={busy} onClick={() => void run('unpublish')}>
            {spinner('unpublish') ?? <Undo2 aria-hidden />}
            Unpublish
          </Button>
          <Button type="button" disabled={busy} onClick={() => void run('save')}>
            {spinner('save')}
            Update
          </Button>
        </>
      ) : (
        <>
          <Button type="button" variant="outline" disabled={busy} onClick={() => void run('save')}>
            {spinner('save')}
            {status === 'archived' ? 'Save' : 'Save draft'}
          </Button>
          <Button type="button" disabled={busy} onClick={() => void run('publish')}>
            {spinner('publish') ?? <Send aria-hidden />}
            Publish
          </Button>
        </>
      )}
    </>
  )

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
        void run('save')
      }}
      className="space-y-6"
    >
      <PageHeader
        title={isNew ? 'New page' : title.trim() || 'Untitled'}
        description={
          <span className="inline-flex flex-wrap items-center gap-2">
            <StatusBadge status={status} />
            {page ? <span>Last saved {formatDateTime(page.updatedAt)}</span> : <span>Not saved yet</span>}
            {isDirty ? <span className="text-warning">· Unsaved changes</span> : null}
          </span>
        }
        actions={actions}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-5 rounded-lg border bg-card p-4 sm:p-6">
          <FormField label="Title" htmlFor="page-title" error={errors.title?.message} required>
            <Input
              id="page-title"
              placeholder="Page title"
              className="h-10 text-base font-medium md:text-base"
              autoFocus={isNew}
              aria-invalid={errors.title ? true : undefined}
              aria-describedby={describedBy('page-title', errors.title?.message)}
              {...register('title')}
            />
          </FormField>

          <FormField
            label="Slug"
            htmlFor="page-slug"
            error={errors.slug?.message}
            description="Used in the page URL. Leave empty to generate it from the title."
          >
            <Input
              id="page-slug"
              placeholder="page-url-slug"
              className="font-mono text-[0.8125rem]"
              spellCheck={false}
              autoCapitalize="none"
              aria-invalid={errors.slug ? true : undefined}
              aria-describedby={describedBy('page-slug', errors.slug?.message, true)}
              {...slugField}
            />
          </FormField>

          <FormField label="Content" htmlFor="page-content" error={errors.content?.message}>
            <Controller
              control={control}
              name="content"
              render={({ field }) => (
                <RichTextEditor
                  id="page-content"
                  value={field.value}
                  onChange={field.onChange}
                  disabled={busy}
                  invalid={Boolean(errors.content)}
                  aria-describedby={describedBy('page-content', errors.content?.message)}
                />
              )}
            />
          </FormField>
        </div>

        <aside className="space-y-4" aria-label="Page settings">
          <Card size="sm">
            <CardHeader>
              <CardTitle>Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 text-sm">
                <dt className="text-muted-foreground">Status</dt>
                <dd className="justify-self-end">
                  <StatusBadge status={status} />
                </dd>
                <dt className="text-muted-foreground">Published</dt>
                <dd className="justify-self-end tabular-nums">{formatDateTime(page?.publishedAt)}</dd>
                {page ? (
                  <>
                    <dt className="text-muted-foreground">Author</dt>
                    <dd className="justify-self-end truncate">{page.author?.name ?? '—'}</dd>
                    <dt className="text-muted-foreground">Created</dt>
                    <dd className="justify-self-end tabular-nums">{formatDateTime(page.createdAt)}</dd>
                  </>
                ) : null}
              </dl>
              {page ? (
                <div className="flex flex-wrap gap-2 border-t pt-3">
                  {status !== 'archived' ? (
                    <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => void run('archive')}>
                      {spinner('archive') ?? <Archive aria-hidden />}
                      Archive
                    </Button>
                  ) : (
                    <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => void run('restore')}>
                      {spinner('restore') ?? <ArchiveRestore aria-hidden />}
                      Restore to draft
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    disabled={busy}
                    onClick={() => setDeleteOpen(true)}
                  >
                    <Trash2 aria-hidden />
                    Delete
                  </Button>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card size="sm">
            <CardHeader>
              <CardTitle>Search engine listing</CardTitle>
              <CardDescription>Falls back to the page title and site defaults when empty.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                label="SEO title"
                htmlFor="page-seo-title"
                error={errors.seoTitle?.message}
                aside={<CharCounter value={seoTitle} max={SEO_TITLE_MAX} recommended={SEO_TITLE_RECOMMENDED} />}
              >
                <Input
                  id="page-seo-title"
                  placeholder={title || 'SEO title'}
                  aria-invalid={errors.seoTitle ? true : undefined}
                  aria-describedby={describedBy('page-seo-title', errors.seoTitle?.message)}
                  {...register('seoTitle')}
                />
              </FormField>
              <FormField
                label="SEO description"
                htmlFor="page-seo-description"
                error={errors.seoDescription?.message}
                aside={
                  <CharCounter
                    value={seoDescription}
                    max={SEO_DESCRIPTION_MAX}
                    recommended={SEO_DESCRIPTION_RECOMMENDED}
                  />
                }
              >
                <Textarea
                  id="page-seo-description"
                  rows={3}
                  placeholder="A concise summary of the page"
                  aria-invalid={errors.seoDescription ? true : undefined}
                  aria-describedby={describedBy('page-seo-description', errors.seoDescription?.message)}
                  {...register('seoDescription')}
                />
              </FormField>
              <SearchSnippet title={seoTitle || title} slug={slug} description={seoDescription} />
            </CardContent>
          </Card>
        </aside>
      </div>

      <ContentPreviewDialog open={previewOpen} onOpenChange={setPreviewOpen} title={title} html={content} />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete this page?"
        description="The page will be permanently deleted. This cannot be undone."
        confirmLabel="Delete page"
        destructive
        pending={deletePage.isPending}
        onConfirm={confirmDelete}
      />

      {guard.dialog}
    </form>
  )
}

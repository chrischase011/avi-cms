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
import { TagsMultiSelect } from '@/components/editor/tags-multi-select'
import { useSaveShortcut, useUnsavedChangesGuard } from '@/components/editor/use-editor-guards'
import { MediaField } from '@/components/media/media-field'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useCurrentUser } from '@/hooks/use-auth'
import { useCreatePost, useDeletePost, usePost, usePublishPost, useUpdatePost } from '@/hooks/use-posts'
import { useCategories, useTags } from '@/hooks/use-taxonomy'
import { applyApiErrors } from '@/lib/form-errors'
import { formatDateTime } from '@/lib/format'
import { can } from '@/lib/permissions'
import { SLUG_PATTERN, slugify } from '@/lib/slug'
import { errorMessage, isApiError } from '@/services/api'
import type { Post, PostInput, Status } from '@/types/api'

const NO_CATEGORY = '__none__'

const schema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200, 'Keep the title under 200 characters'),
  slug: z
    .string()
    .trim()
    .max(200, 'Keep the slug under 200 characters')
    .refine((value) => value === '' || SLUG_PATTERN.test(value), 'Use lowercase letters, numbers and hyphens'),
  excerpt: z.string().max(500, 'Keep the excerpt under 500 characters'),
  content: z.string(),
  categoryId: z.number().nullable(),
  tagIds: z.array(z.number()),
  featuredImage: z.object({ id: z.number(), url: z.string(), alt: z.string().optional() }).nullable(),
})

type FormValues = z.infer<typeof schema>

const FIELDS = ['title', 'slug', 'excerpt', 'content', 'categoryId', 'tagIds', 'featuredImage'] as const

const EMPTY: FormValues = {
  title: '',
  slug: '',
  excerpt: '',
  content: '',
  categoryId: null,
  tagIds: [],
  featuredImage: null,
}

function toFormValues(post: Post): FormValues {
  return {
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
    content: post.content,
    categoryId: post.category?.id ?? null,
    tagIds: post.tags.map((tag) => tag.id),
    featuredImage: post.featuredImage
      ? { id: post.featuredImage.id, url: post.featuredImage.url, alt: post.featuredImage.alt }
      : null,
  }
}

function toInput(values: FormValues): PostInput {
  return {
    title: values.title,
    slug: values.slug || undefined,
    excerpt: values.excerpt,
    content: values.content,
    categoryId: values.categoryId,
    tagIds: values.tagIds,
    featuredImageId: values.featuredImage?.id ?? null,
  }
}

type Intent = 'save' | 'publish' | 'unpublish' | 'archive' | 'restore'

const SUCCESS: Record<Intent, string> = {
  save: 'Post saved',
  publish: 'Post published',
  unpublish: 'Post moved to drafts',
  archive: 'Post archived',
  restore: 'Post restored to drafts',
}

function parseId(raw: string | undefined): number | undefined {
  if (raw === undefined) return undefined
  const id = Number(raw)
  return Number.isInteger(id) && id > 0 ? id : Number.NaN
}

export function PostEditorPage() {
  const params = useParams()
  const id = parseId(params.id)
  const isNew = id === undefined
  const query = usePost(id !== undefined && !Number.isNaN(id) ? id : undefined)

  if (id !== undefined && Number.isNaN(id)) return <PostNotFound />
  if (!isNew && query.isPending) {
    return (
      <div className="space-y-6">
        <PageHeader title="Edit post" />
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="rounded-lg border bg-card p-6">
            <FormSkeleton fields={4} />
          </div>
          <div className="rounded-lg border bg-card p-6">
            <FormSkeleton fields={3} />
          </div>
        </div>
      </div>
    )
  }
  if (!isNew && query.isError) {
    if (isApiError(query.error) && query.error.status === 404) return <PostNotFound />
    return (
      <div className="rounded-lg border bg-card">
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      </div>
    )
  }

  // Keyed so switching between records remounts with fresh form state.
  return <PostEditor key={query.data?.id ?? 'new'} post={query.data ?? null} />
}

function PostNotFound() {
  return (
    <div className="rounded-lg border bg-card">
      <ErrorState error={new Error('This post does not exist or you cannot edit it.')} title="Post not found" />
      <div className="-mt-8 flex justify-center pb-10">
        <Button variant="outline" asChild>
          <Link to="/posts">Back to posts</Link>
        </Button>
      </div>
    </div>
  )
}

function PostEditor({ post }: { post: Post | null }) {
  const user = useCurrentUser()
  const navigate = useNavigate()
  const isNew = post === null
  const canPublish = can.publish(user)
  const status: Status = post?.status ?? 'draft'

  const categories = useCategories()
  const tags = useTags()
  const createPost = useCreatePost()
  const updatePost = useUpdatePost()
  const publishPost = usePublishPost()
  const deletePost = useDeletePost()

  const [pendingIntent, setPendingIntent] = useState<Intent | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  // Existing posts keep their slug unless the user edits it.
  const slugTouched = useRef(!isNew)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: post ? toFormValues(post) : EMPTY,
  })
  const {
    register,
    control,
    handleSubmit,
    setValue,
    setError,
    reset,
    watch,
    formState: { errors, isDirty },
  } = form

  const guard = useUnsavedChangesGuard(isDirty && pendingIntent === null)

  // Slug follows the title until edited by hand.
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
      // Clearing the slug hands control back to the title.
      slugTouched.current = event.target.value.trim() !== ''
    },
  })

  const run = (intent: Intent) =>
    handleSubmit(async (values) => {
      setPendingIntent(intent)
      try {
        const input = toInput(values)
        let saved: Post
        if (post === null) {
          saved = await createPost.mutateAsync({ ...input, status: 'draft' })
        } else {
          const body: Partial<PostInput> = { ...input }
          // Authors never send status; editors change it only on purpose.
          if (canPublish && intent === 'archive') body.status = 'archived'
          if (canPublish && intent === 'restore') body.status = 'draft'
          saved = await updatePost.mutateAsync({ id: post.id, input: body })
        }
        if (intent === 'publish' || intent === 'unpublish') {
          saved = await publishPost.mutateAsync({ id: saved.id, publish: intent === 'publish' })
        }
        reset(toFormValues(saved))
        slugTouched.current = true
        toast.success(SUCCESS[intent])
        if (post === null) {
          guard.allowNextNavigation()
          navigate(`/posts/${saved.id}/edit`, { replace: true })
        }
      } catch (error) {
        const handled = applyApiErrors(error, setError, {
          fields: FIELDS,
          conflictField: 'slug',
          aliases: { featuredImageId: 'featuredImage' },
        })
        toast.error(handled ? 'Please fix the highlighted fields.' : errorMessage(error, 'Could not save the post'))
      } finally {
        setPendingIntent(null)
      }
    })()

  useSaveShortcut(() => {
    if (pendingIntent === null) void run('save')
  })

  const confirmDelete = () => {
    if (!post) return
    deletePost.mutate(post.id, {
      onSuccess: () => {
        toast.success('Post deleted')
        setDeleteOpen(false)
        guard.allowNextNavigation()
        navigate('/posts', { replace: true })
      },
      onError: (error) => toast.error(errorMessage(error)),
    })
  }

  const busy = pendingIntent !== null
  const title = watch('title')
  const content = watch('content')
  const excerpt = watch('excerpt')
  const featuredImage = watch('featuredImage')

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
          {canPublish ? (
            <Button type="button" variant="outline" disabled={busy} onClick={() => void run('unpublish')}>
              {spinner('unpublish') ?? <Undo2 aria-hidden />}
              Unpublish
            </Button>
          ) : null}
          <Button type="button" disabled={busy} onClick={() => void run('save')}>
            {spinner('save')}
            Update
          </Button>
        </>
      ) : (
        <>
          <Button
            type="button"
            variant={canPublish ? 'outline' : 'default'}
            disabled={busy}
            onClick={() => void run('save')}
          >
            {spinner('save')}
            {status === 'archived' ? 'Save' : 'Save draft'}
          </Button>
          {canPublish ? (
            <Button type="button" disabled={busy} onClick={() => void run('publish')}>
              {spinner('publish') ?? <Send aria-hidden />}
              Publish
            </Button>
          ) : null}
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
        title={isNew ? 'New post' : title.trim() || 'Untitled'}
        description={
          <span className="inline-flex flex-wrap items-center gap-2">
            <StatusBadge status={status} />
            {post ? <span>Last saved {formatDateTime(post.updatedAt)}</span> : <span>Not saved yet</span>}
            {isDirty ? <span className="text-warning">· Unsaved changes</span> : null}
          </span>
        }
        actions={actions}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-5 rounded-lg border bg-card p-4 sm:p-6">
          <FormField label="Title" htmlFor="post-title" error={errors.title?.message} required>
            <Input
              id="post-title"
              placeholder="Post title"
              className="h-10 text-base font-medium md:text-base"
              autoFocus={isNew}
              aria-invalid={errors.title ? true : undefined}
              aria-describedby={describedBy('post-title', errors.title?.message)}
              {...register('title')}
            />
          </FormField>

          <FormField
            label="Slug"
            htmlFor="post-slug"
            error={errors.slug?.message}
            description="Used in the post URL. Leave empty to generate it from the title."
          >
            <Input
              id="post-slug"
              placeholder="post-url-slug"
              className="font-mono text-[0.8125rem]"
              spellCheck={false}
              autoCapitalize="none"
              aria-invalid={errors.slug ? true : undefined}
              aria-describedby={describedBy('post-slug', errors.slug?.message, true)}
              {...slugField}
            />
          </FormField>

          <FormField
            label="Excerpt"
            htmlFor="post-excerpt"
            error={errors.excerpt?.message}
            description="A short summary for listings and search results."
            aside={<CharCounter value={excerpt} max={500} recommended={300} />}
          >
            <Textarea
              id="post-excerpt"
              rows={3}
              placeholder="Summarize the post in a sentence or two"
              aria-invalid={errors.excerpt ? true : undefined}
              aria-describedby={describedBy('post-excerpt', errors.excerpt?.message, true)}
              {...register('excerpt')}
            />
          </FormField>

          <FormField label="Content" htmlFor="post-content" error={errors.content?.message}>
            <Controller
              control={control}
              name="content"
              render={({ field }) => (
                <RichTextEditor
                  id="post-content"
                  value={field.value}
                  onChange={field.onChange}
                  disabled={busy}
                  invalid={Boolean(errors.content)}
                  aria-describedby={describedBy('post-content', errors.content?.message)}
                />
              )}
            />
          </FormField>
        </div>

        <aside className="space-y-4" aria-label="Post settings">
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
                <dd className="justify-self-end tabular-nums">{formatDateTime(post?.publishedAt)}</dd>
                <dt className="text-muted-foreground">Author</dt>
                <dd className="justify-self-end truncate">
                  {post ? (post.author.id === user.id ? 'You' : post.author.name) : 'You'}
                </dd>
                {post ? (
                  <>
                    <dt className="text-muted-foreground">Created</dt>
                    <dd className="justify-self-end tabular-nums">{formatDateTime(post.createdAt)}</dd>
                  </>
                ) : null}
              </dl>
              {!canPublish ? (
                <p className="rounded-md bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
                  Authors save drafts; an editor publishes.
                </p>
              ) : null}
              {post && (canPublish || can.editPost(user, post)) ? (
                <div className="flex flex-wrap gap-2 border-t pt-3">
                  {canPublish && status !== 'archived' ? (
                    <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => void run('archive')}>
                      {spinner('archive') ?? <Archive aria-hidden />}
                      Archive
                    </Button>
                  ) : null}
                  {canPublish && status === 'archived' ? (
                    <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => void run('restore')}>
                      {spinner('restore') ?? <ArchiveRestore aria-hidden />}
                      Restore to draft
                    </Button>
                  ) : null}
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
              <CardTitle>Organization</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField label="Category" htmlFor="post-category" error={errors.categoryId?.message}>
                <Controller
                  control={control}
                  name="categoryId"
                  render={({ field }) => (
                    <Select
                      value={field.value === null ? NO_CATEGORY : String(field.value)}
                      onValueChange={(value) => field.onChange(value === NO_CATEGORY ? null : Number(value))}
                      disabled={categories.isPending}
                    >
                      <SelectTrigger
                        id="post-category"
                        className="w-full"
                        aria-invalid={errors.categoryId ? true : undefined}
                      >
                        <SelectValue placeholder={categories.isPending ? 'Loading…' : 'Uncategorized'} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NO_CATEGORY}>Uncategorized</SelectItem>
                        {(categories.data?.data ?? []).map((category) => (
                          <SelectItem key={category.id} value={String(category.id)}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </FormField>

              <FormField label="Tags" htmlFor="post-tags" error={errors.tagIds?.message}>
                <Controller
                  control={control}
                  name="tagIds"
                  render={({ field }) => (
                    <TagsMultiSelect
                      id="post-tags"
                      value={field.value}
                      onChange={field.onChange}
                      options={tags.data?.data ?? []}
                      loading={tags.isPending}
                      invalid={Boolean(errors.tagIds)}
                      aria-describedby={describedBy('post-tags', errors.tagIds?.message)}
                    />
                  )}
                />
              </FormField>
            </CardContent>
          </Card>

          <Card size="sm">
            <CardHeader>
              <CardTitle>Featured image</CardTitle>
            </CardHeader>
            <CardContent>
              <Controller
                control={control}
                name="featuredImage"
                render={({ field }) => (
                  <MediaField
                    id="post-featured-image"
                    value={field.value}
                    onChange={(media) =>
                      field.onChange(media ? { id: media.id, url: media.url, alt: media.alt } : null)
                    }
                    disabled={busy}
                    aspect="video"
                    pickerTitle="Choose a featured image"
                  />
                )}
              />
              {errors.featuredImage?.message ? (
                <p role="alert" className="mt-2 text-xs font-medium text-destructive">
                  {errors.featuredImage.message}
                </p>
              ) : null}
            </CardContent>
          </Card>
        </aside>
      </div>

      <ContentPreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        title={title}
        excerpt={excerpt}
        html={content}
        featuredImageUrl={featuredImage?.url}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete this post?"
        description="The post will be permanently deleted. This cannot be undone."
        confirmLabel="Delete post"
        destructive
        pending={deletePost.isPending}
        onConfirm={confirmDelete}
      />

      {guard.dialog}
    </form>
  )
}

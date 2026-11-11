import { zodResolver } from '@hookform/resolvers/zod'
import { Copy, ExternalLink, ImageIcon, Loader2, Trash2, Upload } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { EmptyState } from '@/components/common/empty-state'
import { ErrorState } from '@/components/common/error-state'
import { FiltersToolbar } from '@/components/common/filter-select'
import { CharCounter, describedBy, FormField } from '@/components/common/form-field'
import { PageHeader } from '@/components/common/page-header'
import { Pagination } from '@/components/common/pagination'
import { SearchInput } from '@/components/common/search-input'
import { MediaThumb } from '@/components/media/media-thumb'
import { MediaUpload } from '@/components/media/media-upload'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { useCurrentUser } from '@/hooks/use-auth'
import { useListParams } from '@/hooks/use-list-params'
import { useDeleteMedia, useMediaList, useUpdateMedia } from '@/hooks/use-media'
import { applyApiErrors } from '@/lib/form-errors'
import { formatBytes, formatDateTime, formatMimeType, formatNumber } from '@/lib/format'
import { can } from '@/lib/permissions'
import { cn } from '@/lib/utils'
import { errorMessage } from '@/services/api'
import type { Media } from '@/types/api'

const PAGE_SIZE = 24
const UPLOAD_INPUT_ID = 'media-upload-input'
const ALT_MAX = 300

function absoluteUrl(url: string): string {
  return new URL(url, window.location.origin).toString()
}

export function MediaPage() {
  const { page, search, setPage, setSearch } = useListParams([])
  const query = useMediaList({ page, pageSize: PAGE_SIZE, search: search || undefined })
  const [selected, setSelected] = useState<Media | null>(null)
  const items = query.data?.data

  return (
    <div className="space-y-6">
      <PageHeader
        title="Media"
        description="Images used in posts, pages and site branding."
        actions={
          <Button onClick={() => document.getElementById(UPLOAD_INPUT_ID)?.click()}>
            <Upload aria-hidden />
            Upload
          </Button>
        }
      />

      <MediaUpload inputId={UPLOAD_INPUT_ID} />

      <FiltersToolbar className="sm:justify-between">
        <SearchInput value={search} onChange={setSearch} placeholder="Search media…" />
        {query.data ? (
          <p className="text-sm text-muted-foreground tabular-nums">
            {formatNumber(query.data.meta.total)} {query.data.meta.total === 1 ? 'file' : 'files'}
          </p>
        ) : null}
      </FiltersToolbar>

      {query.isPending ? (
        <MediaGridSkeleton />
      ) : query.isError ? (
        <div className="rounded-lg border bg-card">
          <ErrorState error={query.error} onRetry={() => void query.refetch()} />
        </div>
      ) : items && items.length === 0 ? (
        <div className="rounded-lg border bg-card">
          <EmptyState
            icon={ImageIcon}
            title={search ? 'No files match your search' : 'No media yet'}
            description={
              search ? 'Try a different file name or alt text.' : 'Upload images to use them in your content.'
            }
            action={
              search ? (
                <Button variant="outline" onClick={() => setSearch('')}>
                  Clear search
                </Button>
              ) : null
            }
          />
        </div>
      ) : (
        <ul
          className={cn(
            'grid grid-cols-2 gap-3 transition-opacity sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6',
            query.isPlaceholderData && 'opacity-60',
          )}
          aria-label="Media files"
        >
          {items?.map((media) => (
            <li key={media.id}>
              <button
                type="button"
                onClick={() => setSelected(media)}
                className="group block w-full overflow-hidden rounded-lg border bg-card text-left outline-none transition-colors hover:border-foreground/20 focus-visible:ring-3 focus-visible:ring-ring/50"
                aria-label={`View details for ${media.originalName}`}
              >
                <MediaThumb src={media.url} alt={media.alt} className="aspect-square" />
                <div className="space-y-0.5 border-t px-2.5 py-2">
                  <p className="truncate text-xs font-medium text-foreground" title={media.originalName}>
                    {media.originalName}
                  </p>
                  <p className="text-xs text-muted-foreground tabular-nums">
                    {formatMimeType(media.mimeType)} · {formatBytes(media.size)}
                  </p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      <Pagination meta={query.data?.meta} onPageChange={setPage} itemLabel="files" />

      <MediaDetailsSheet
        media={selected}
        onClose={() => setSelected(null)}
        onUpdated={(media) => setSelected(media)}
      />
    </div>
  )
}

function MediaGridSkeleton() {
  return (
    <div
      className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
      aria-busy="true"
      aria-label="Loading media"
    >
      {Array.from({ length: 12 }, (_, i) => (
        <div key={i} className="overflow-hidden rounded-lg border bg-card">
          <Skeleton className="aspect-square rounded-none" />
          <div className="space-y-1.5 px-2.5 py-2">
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Details

interface MediaDetailsSheetProps {
  media: Media | null
  onClose: () => void
  onUpdated: (media: Media) => void
}

function MediaDetailsSheet({ media, onClose, onUpdated }: MediaDetailsSheetProps) {
  return (
    <Sheet open={media !== null} onOpenChange={(open) => (open ? undefined : onClose())}>
      <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-md">
        {media ? <MediaDetails key={media.id} media={media} onClose={onClose} onUpdated={onUpdated} /> : null}
      </SheetContent>
    </Sheet>
  )
}

const altSchema = z.object({
  alt: z.string().trim().max(ALT_MAX, `Keep alt text under ${ALT_MAX} characters`),
})
type AltValues = z.infer<typeof altSchema>

function MediaDetails({ media, onClose, onUpdated }: { media: Media; onClose: () => void; onUpdated: (media: Media) => void }) {
  const user = useCurrentUser()
  const updateMedia = useUpdateMedia()
  const deleteMedia = useDeleteMedia()
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const canDelete = can.deleteMedia(user, media)

  const form = useForm<AltValues>({ resolver: zodResolver(altSchema), defaultValues: { alt: media.alt } })
  const altValue = useWatch({ control: form.control, name: 'alt' }) ?? ''
  const altError = form.formState.errors.alt?.message

  useEffect(() => {
    form.reset({ alt: media.alt })
  }, [media.alt, form])

  const onSubmit = form.handleSubmit((values) => {
    updateMedia.mutate(
      { id: media.id, alt: values.alt },
      {
        onSuccess: (updated) => {
          toast.success('Alt text saved')
          onUpdated(updated)
        },
        onError: (error) => {
          if (!applyApiErrors(error, form.setError, { fields: ['alt'] })) {
            toast.error(errorMessage(error, 'Could not save alt text'))
          }
        },
      },
    )
  })

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(absoluteUrl(media.url))
      toast.success('URL copied to clipboard')
    } catch {
      toast.error('Could not copy the URL to the clipboard.')
    }
  }

  const confirmDelete = () => {
    deleteMedia.mutate(media.id, {
      onSuccess: () => {
        toast.success('File deleted')
        setConfirmOpen(false)
        onClose()
      },
      onError: (error) => toast.error(errorMessage(error, 'Could not delete the file')),
    })
  }

  return (
    <>
      <SheetHeader className="border-b pr-12">
        <SheetTitle className="truncate">{media.originalName}</SheetTitle>
        <SheetDescription>Media details</SheetDescription>
      </SheetHeader>

      <div className="space-y-5 p-4">
        <MediaThumb
          src={media.url}
          alt={media.alt}
          fit="contain"
          className="aspect-[4/3] rounded-lg border"
          onLoadDimensions={setDimensions}
        />

        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          <dt className="text-muted-foreground">Type</dt>
          <dd className="text-right tabular-nums">{formatMimeType(media.mimeType)}</dd>
          <dt className="text-muted-foreground">Size</dt>
          <dd className="text-right tabular-nums">{formatBytes(media.size)}</dd>
          <dt className="text-muted-foreground">Dimensions</dt>
          <dd className="text-right tabular-nums">
            {dimensions ? `${formatNumber(dimensions.width)} × ${formatNumber(dimensions.height)} px` : '—'}
          </dd>
          <dt className="text-muted-foreground">Uploaded</dt>
          <dd className="text-right tabular-nums">{formatDateTime(media.createdAt)}</dd>
          <dt className="text-muted-foreground">Uploaded by</dt>
          <dd className="truncate text-right">{media.uploadedBy?.name ?? '—'}</dd>
        </dl>

        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" className="flex-1" onClick={() => void copyUrl()}>
            <Copy aria-hidden />
            Copy URL
          </Button>
          <Button variant="outline" size="sm" className="flex-1" asChild>
            <a href={media.url} target="_blank" rel="noopener noreferrer">
              <ExternalLink aria-hidden />
              Open
            </a>
          </Button>
        </div>

        <Separator />

        <form onSubmit={onSubmit} className="space-y-3" noValidate>
          <FormField
            label="Alt text"
            htmlFor="media-alt"
            error={altError}
            description="Describe the image for screen readers and search engines."
            aside={<CharCounter value={altValue} max={ALT_MAX} />}
          >
            <Textarea
              id="media-alt"
              rows={3}
              aria-invalid={altError ? true : undefined}
              aria-describedby={describedBy('media-alt', altError, true)}
              {...form.register('alt')}
            />
          </FormField>
          <div className="flex justify-end">
            <Button type="submit" size="sm" disabled={!form.formState.isDirty || updateMedia.isPending}>
              {updateMedia.isPending ? <Loader2 className="animate-spin" aria-hidden /> : null}
              Save alt text
            </Button>
          </div>
        </form>
      </div>

      {canDelete ? (
        <SheetFooter className="mt-auto border-t">
          <Button type="button" variant="destructive" onClick={() => setConfirmOpen(true)}>
            <Trash2 aria-hidden />
            Delete file
          </Button>
        </SheetFooter>
      ) : null}

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete this file?"
        description={`"${media.originalName}" will be removed permanently. Posts or settings that use it will lose the image.`}
        confirmLabel="Delete"
        destructive
        pending={deleteMedia.isPending}
        onConfirm={confirmDelete}
      />
    </>
  )
}

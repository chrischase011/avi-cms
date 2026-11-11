import { Check, ImageIcon } from 'lucide-react'
import { useState } from 'react'
import { EmptyState } from '@/components/common/empty-state'
import { ErrorState } from '@/components/common/error-state'
import { Pagination } from '@/components/common/pagination'
import { SearchInput } from '@/components/common/search-input'
import { MediaThumb } from '@/components/media/media-thumb'
import { MediaUpload } from '@/components/media/media-upload'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { useMediaList } from '@/hooks/use-media'
import { formatBytes, formatMimeType } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Media } from '@/types/api'

const PAGE_SIZE = 18

interface MediaPickerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (media: Media) => void
  title?: string
  description?: string
}

export function MediaPickerDialog({
  open,
  onOpenChange,
  onSelect,
  title = 'Choose an image',
  description = 'Pick an image from the media library or upload a new one.',
}: MediaPickerDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(90svh,52rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl">
        {/* Remount the body on open so selection/search start fresh. */}
        {open ? (
          <PickerBody
            title={title}
            description={description}
            onCancel={() => onOpenChange(false)}
            onSelect={(media) => {
              onSelect(media)
              onOpenChange(false)
            }}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

interface PickerBodyProps {
  title: string
  description: string
  onCancel: () => void
  onSelect: (media: Media) => void
}

function PickerBody({ title, description, onCancel, onSelect }: PickerBodyProps) {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<Media | null>(null)
  const query = useMediaList({ page, pageSize: PAGE_SIZE, search: search || undefined })
  const items = query.data?.data

  return (
    <>
      <DialogHeader className="border-b px-5 pt-5 pb-4">
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
        <MediaUpload
          compact
          multiple={false}
          onUploaded={(media) => {
            setSelected(media)
            setSearch('')
            setPage(1)
          }}
        />

        <div className="flex items-center justify-between gap-3">
          <SearchInput
            value={search}
            onChange={(value) => {
              setSearch(value)
              setPage(1)
            }}
            placeholder="Search media…"
          />
          {query.data ? (
            <span className="hidden text-xs text-muted-foreground tabular-nums sm:inline">
              {query.data.meta.total} {query.data.meta.total === 1 ? 'image' : 'images'}
            </span>
          ) : null}
        </div>

        {query.isPending ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-6" aria-busy="true" aria-label="Loading">
            {Array.from({ length: 12 }, (_, i) => (
              <Skeleton key={i} className="aspect-square rounded-md" />
            ))}
          </div>
        ) : query.isError ? (
          <ErrorState error={query.error} onRetry={() => void query.refetch()} />
        ) : items && items.length === 0 ? (
          <EmptyState
            icon={ImageIcon}
            title={search ? 'No images match your search' : 'No images yet'}
            description={search ? 'Try a different file name or alt text.' : 'Upload an image to get started.'}
          />
        ) : (
          <div
            role="group"
            aria-label="Media library"
            className={cn(
              'grid grid-cols-2 gap-3 transition-opacity sm:grid-cols-4 md:grid-cols-6',
              query.isPlaceholderData && 'opacity-60',
            )}
          >
            {items?.map((media) => {
              const isSelected = selected?.id === media.id
              return (
                <button
                  key={media.id}
                  type="button"
                  aria-pressed={isSelected}
                  aria-label={media.alt || media.originalName}
                  onClick={() => setSelected(media)}
                  onDoubleClick={() => onSelect(media)}
                  className={cn(
                    'group relative overflow-hidden rounded-md border bg-card text-left outline-none transition-shadow focus-visible:ring-3 focus-visible:ring-ring/50',
                    isSelected ? 'border-primary ring-2 ring-primary' : 'hover:border-foreground/20',
                  )}
                >
                  <MediaThumb src={media.url} alt="" className="aspect-square" />
                  {isSelected ? (
                    <span className="absolute top-1.5 right-1.5 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
                      <Check className="size-3" aria-hidden />
                    </span>
                  ) : null}
                  <span className="block truncate border-t px-2 py-1.5 text-xs text-muted-foreground">
                    {media.originalName}
                  </span>
                </button>
              )
            })}
          </div>
        )}

        <Pagination meta={query.data?.meta} onPageChange={setPage} itemLabel="images" />
      </div>

      <DialogFooter className="items-center border-t bg-muted/30 px-5 py-3 sm:justify-between">
        <p className="min-w-0 truncate text-xs text-muted-foreground">
          {selected ? (
            <>
              <span className="font-medium text-foreground">{selected.originalName}</span>
              <span className="tabular-nums">
                {' '}
                · {formatMimeType(selected.mimeType)} · {formatBytes(selected.size)}
              </span>
            </>
          ) : (
            'No image selected'
          )}
        </p>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="button" disabled={!selected} onClick={() => selected && onSelect(selected)}>
            Select
          </Button>
        </div>
      </DialogFooter>
    </>
  )
}

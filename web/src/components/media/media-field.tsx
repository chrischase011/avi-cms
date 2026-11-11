import { ImagePlus, RefreshCw, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { MediaPickerDialog } from '@/components/media/media-picker-dialog'
import { MediaThumb } from '@/components/media/media-thumb'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Media } from '@/types/api'

interface MediaFieldProps {
  /** Placed on the main button so a <label htmlFor> points at it. */
  id: string
  value: { id: number; url: string; alt?: string } | null
  onChange: (media: Media | null) => void
  disabled?: boolean
  aspect?: 'video' | 'square'
  pickerTitle?: string
  className?: string
  'aria-describedby'?: string
  'aria-invalid'?: boolean
}

/** Image form control backed by the media library. */
export function MediaField({
  id,
  value,
  onChange,
  disabled = false,
  aspect = 'video',
  pickerTitle,
  className,
  ...aria
}: MediaFieldProps) {
  const [open, setOpen] = useState(false)
  const aspectClass = aspect === 'video' ? 'aspect-video' : 'aspect-square max-w-40'

  return (
    <div className={cn('space-y-2', className)}>
      {value ? (
        <>
          <button
            id={id}
            type="button"
            onClick={() => setOpen(true)}
            disabled={disabled}
            aria-label="Replace image"
            {...aria}
            className={cn(
              'block w-full overflow-hidden rounded-lg border outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed',
              aspectClass,
            )}
          >
            <MediaThumb
              src={value.url}
              alt={value.alt ?? ''}
              fit={aspect === 'square' ? 'contain' : 'cover'}
              className="size-full"
            />
          </button>
          {!disabled ? (
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
                <RefreshCw aria-hidden />
                Replace
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)}>
                <Trash2 aria-hidden />
                Remove
              </Button>
            </div>
          ) : null}
        </>
      ) : (
        <button
          id={id}
          type="button"
          onClick={() => setOpen(true)}
          disabled={disabled}
          {...aria}
          className={cn(
            'flex w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-muted/30 text-sm text-muted-foreground outline-none transition-colors hover:border-foreground/25 hover:bg-muted/50 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-muted/30',
            aspectClass,
          )}
        >
          <ImagePlus className="size-5" aria-hidden />
          <span className="font-medium">{disabled ? 'No image' : 'Choose image'}</span>
        </button>
      )}
      <MediaPickerDialog open={open} onOpenChange={setOpen} onSelect={onChange} title={pickerTitle} />
    </div>
  )
}

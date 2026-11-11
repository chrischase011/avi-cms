import { CheckCircle2, Loader2, UploadCloud, X, XCircle } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type DragEvent } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { useMediaLimits, useUploadMedia } from '@/hooks/use-media'
import { formatBytes, formatMimeType } from '@/lib/format'
import { cn } from '@/lib/utils'
import { errorMessage, isApiError } from '@/services/api'
import type { Media, MediaLimits } from '@/types/api'

/** Human list of accepted types, e.g. "PNG, JPEG, GIF or WEBP". */
export function describeAccept(accept: readonly string[]): string {
  const labels = [...new Set(accept.map(formatMimeType))]
  if (labels.length <= 1) return labels[0] ?? 'images'
  return `${labels.slice(0, -1).join(', ')} or ${labels[labels.length - 1]}`
}

/** Client-side check against GET /api/media/limits. Returns an error message or null. */
export function validateFile(file: File, limits: MediaLimits | undefined): string | null {
  if (!limits) return null
  if (limits.accept.length > 0 && !limits.accept.includes(file.type)) {
    return `${file.name}: only ${describeAccept(limits.accept)} files are allowed.`
  }
  if (file.size > limits.maxSize) {
    return `${file.name} is ${formatBytes(file.size)}; the limit is ${formatBytes(limits.maxSize)}.`
  }
  if (file.size === 0) return `${file.name} is empty.`
  return null
}

function uploadErrorMessage(error: unknown, file: File, limits: MediaLimits | undefined): string {
  if (isApiError(error)) {
    if (error.status === 413) {
      return limits
        ? `${file.name} is too large. The limit is ${formatBytes(limits.maxSize)}.`
        : `${file.name} is too large.`
    }
    if (error.status === 415) {
      return limits
        ? `${file.name} is not a supported image. Use ${describeAccept(limits.accept)}.`
        : `${file.name} is not a supported image type.`
    }
  }
  return `${file.name}: ${errorMessage(error, 'Upload failed')}`
}

type UploadStatus = 'uploading' | 'done' | 'error'

interface UploadItem {
  key: string
  name: string
  status: UploadStatus
  message?: string
}

interface MediaUploadProps {
  /** Called for each file that uploads successfully. */
  onUploaded?: (media: Media) => void
  multiple?: boolean
  /** Smaller layout for use inside dialogs. */
  compact?: boolean
  disabled?: boolean
  /** id of the hidden file input, so other buttons can open the picker. */
  inputId?: string
  className?: string
}

let uploadSeq = 0

/** Drag & drop zone plus a "Browse" button. Uploads files one after another. */
export function MediaUpload({
  onUploaded,
  multiple = true,
  compact = false,
  disabled = false,
  inputId,
  className,
}: MediaUploadProps) {
  const { data: limits } = useMediaLimits()
  const upload = useUploadMedia()
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [items, setItems] = useState<UploadItem[]>([])
  const timers = useRef<number[]>([])

  useEffect(() => {
    const pending = timers.current
    return () => pending.forEach((id) => window.clearTimeout(id))
  }, [])

  const patchItem = useCallback((key: string, patch: Partial<UploadItem>) => {
    setItems((prev) => prev.map((item) => (item.key === key ? { ...item, ...patch } : item)))
  }, [])

  const removeItem = useCallback((key: string) => {
    setItems((prev) => prev.filter((item) => item.key !== key))
  }, [])

  const busy = items.some((item) => item.status === 'uploading')

  const handleFiles = useCallback(
    async (fileList: FileList | File[]) => {
      const files = Array.from(fileList).slice(0, multiple ? undefined : 1)
      if (files.length === 0) return

      const queue: Array<{ key: string; file: File }> = []
      for (const file of files) {
        const problem = validateFile(file, limits)
        if (problem) {
          toast.error(problem)
          continue
        }
        uploadSeq += 1
        queue.push({ key: `upload-${uploadSeq}`, file })
      }
      if (queue.length === 0) return

      setItems((prev) => [
        ...prev,
        ...queue.map(({ key, file }) => ({ key, name: file.name, status: 'uploading' as const })),
      ])

      let uploaded = 0
      for (const { key, file } of queue) {
        try {
          const media = await upload.mutateAsync({ file })
          uploaded += 1
          patchItem(key, { status: 'done' })
          timers.current.push(window.setTimeout(() => removeItem(key), 2500))
          onUploaded?.(media)
        } catch (error) {
          patchItem(key, { status: 'error', message: uploadErrorMessage(error, file, limits) })
        }
      }
      if (uploaded > 0) toast.success(uploaded === 1 ? 'Image uploaded' : `${uploaded} images uploaded`)
    },
    [limits, multiple, onUploaded, patchItem, removeItem, upload],
  )

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setDragging(false)
    if (disabled) return
    void handleFiles(event.dataTransfer.files)
  }

  const acceptAttr = limits?.accept.join(',') ?? 'image/*'
  const hint = limits
    ? `${describeAccept(limits.accept)} up to ${formatBytes(limits.maxSize)}`
    : 'Images only'

  return (
    <div className={cn('space-y-2', className)}>
      <div
        onDragEnter={(e) => {
          e.preventDefault()
          if (!disabled) setDragging(true)
        }}
        onDragOver={(e) => {
          e.preventDefault()
          e.dataTransfer.dropEffect = disabled ? 'none' : 'copy'
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragging(false)
        }}
        onDrop={onDrop}
        className={cn(
          'flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed bg-muted/30 text-center transition-colors',
          compact ? 'px-4 py-5 sm:flex-row sm:text-left' : 'px-6 py-8',
          dragging && 'border-primary bg-primary/5',
          disabled && 'opacity-60',
        )}
      >
        <div
          className={cn(
            'flex shrink-0 items-center justify-center rounded-lg border bg-background text-muted-foreground',
            compact ? 'size-9' : 'size-10',
            dragging && 'text-primary',
          )}
        >
          <UploadCloud className="size-5" aria-hidden />
        </div>
        <div className={cn('min-w-0', compact && 'sm:flex-1')}>
          <p className="text-sm font-medium">
            {dragging ? 'Drop to upload' : multiple ? 'Drag images here to upload' : 'Drag an image here to upload'}
          </p>
          <p className="text-xs text-muted-foreground">{hint}</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
        >
          {busy ? <Loader2 className="animate-spin" aria-hidden /> : null}
          Browse files
        </Button>
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept={acceptAttr}
          multiple={multiple}
          disabled={disabled}
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          onChange={(e) => {
            const files = e.target.files
            if (files) void handleFiles(files)
            e.target.value = ''
          }}
        />
      </div>

      {items.length > 0 ? (
        <ul className="space-y-1" aria-live="polite" aria-label="Uploads">
          {items.map((item) => (
            <li
              key={item.key}
              className={cn(
                'flex items-start gap-2 rounded-md border bg-card px-3 py-2 text-sm',
                item.status === 'error' && 'border-destructive/30 bg-destructive/5',
              )}
            >
              {item.status === 'uploading' ? (
                <Loader2 className="mt-0.5 size-4 shrink-0 animate-spin text-muted-foreground" aria-hidden />
              ) : item.status === 'done' ? (
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
              ) : (
                <XCircle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{item.name}</p>
                <p className="text-xs text-muted-foreground">
                  {item.status === 'uploading' ? 'Uploading…' : item.status === 'done' ? 'Uploaded' : item.message}
                </p>
              </div>
              {item.status === 'error' ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => removeItem(item.key)}
                  aria-label={`Dismiss ${item.name}`}
                >
                  <X />
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

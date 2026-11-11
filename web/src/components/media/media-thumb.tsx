import { ImageOff } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'

interface MediaThumbProps {
  src: string
  alt: string
  className?: string
  fit?: 'cover' | 'contain'
  onLoadDimensions?: (size: { width: number; height: number }) => void
}

/** Image with a muted backdrop and a broken-image fallback. */
export function MediaThumb({ src, alt, className, fit = 'cover', onLoadDimensions }: MediaThumbProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const failed = failedSrc === src

  return (
    <div className={cn('relative flex items-center justify-center overflow-hidden bg-muted', className)}>
      {failed ? (
        <div className="flex flex-col items-center gap-1 text-muted-foreground">
          <ImageOff className="size-5" aria-hidden />
          <span className="sr-only">Image unavailable</span>
        </div>
      ) : (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          draggable={false}
          onError={() => setFailedSrc(src)}
          onLoad={(e) =>
            onLoadDimensions?.({ width: e.currentTarget.naturalWidth, height: e.currentTarget.naturalHeight })
          }
          className={cn('size-full', fit === 'cover' ? 'object-cover' : 'object-contain')}
        />
      )}
    </div>
  )
}

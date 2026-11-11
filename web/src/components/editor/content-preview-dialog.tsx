import { useMemo } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { sanitizeHtml } from '@/lib/sanitize'

interface ContentPreviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  excerpt?: string
  html: string
  featuredImageUrl?: string | null
}

/** Read-only rendering of editor HTML, sanitized before injection. */
export function ContentPreviewDialog({
  open,
  onOpenChange,
  title,
  excerpt,
  html,
  featuredImageUrl,
}: ContentPreviewDialogProps) {
  const safeHtml = useMemo(() => (open ? sanitizeHtml(html) : ''), [open, html])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90svh] flex-col gap-0 p-0 sm:max-w-3xl">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle>Preview</DialogTitle>
          <DialogDescription>How the content renders. Site styling may differ.</DialogDescription>
        </DialogHeader>
        <div className="overflow-y-auto px-6 py-8">
          <article className="prose prose-zinc dark:prose-invert mx-auto max-w-prose">
            {featuredImageUrl ? (
              <img src={featuredImageUrl} alt="" className="mt-0 aspect-video w-full rounded-lg object-cover" />
            ) : null}
            <h1>{title.trim() || 'Untitled'}</h1>
            {excerpt?.trim() ? <p className="lead">{excerpt}</p> : null}
            {safeHtml ? (
              <div dangerouslySetInnerHTML={{ __html: safeHtml }} />
            ) : (
              <p className="text-muted-foreground italic">No content yet.</p>
            )}
          </article>
        </div>
      </DialogContent>
    </Dialog>
  )
}

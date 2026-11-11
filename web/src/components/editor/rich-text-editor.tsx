import Image from '@tiptap/extension-image'
import { Placeholder } from '@tiptap/extension-placeholder'
import TextAlign from '@tiptap/extension-text-align'
import { type Editor, EditorContent, useEditor, useEditorState } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Code2,
  Heading2,
  Heading3,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  type LucideIcon,
  Pilcrow,
  Quote,
  Redo2,
  Strikethrough,
  Undo2,
} from 'lucide-react'
import { type FormEvent, useEffect, useRef, useState } from 'react'
import { MediaPickerDialog } from '@/components/media/media-picker-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'
import { Toggle } from '@/components/ui/toggle'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import type { Media } from '@/types/api'

interface RichTextEditorProps {
  id?: string
  value: string
  onChange: (html: string) => void
  placeholder?: string
  disabled?: boolean
  invalid?: boolean
  'aria-describedby'?: string
}

/** Empty documents serialize to '' instead of '<p></p>'. */
function editorHtml(editor: Editor): string {
  return editor.isEmpty ? '' : editor.getHTML()
}

function surfaceAttributes(id?: string, describedBy?: string, invalid?: boolean): Record<string, string> {
  return {
    class: 'tiptap prose prose-zinc dark:prose-invert max-w-none px-4 py-3 text-[0.9375rem]',
    role: 'textbox',
    'aria-multiline': 'true',
    ...(id ? { id } : {}),
    ...(describedBy ? { 'aria-describedby': describedBy } : {}),
    ...(invalid ? { 'aria-invalid': 'true' } : {}),
  }
}

/** Allows http(s), mailto and same-site relative URLs only. */
function normalizeLinkUrl(raw: string): string | null {
  const value = raw.trim()
  if (!value) return null
  if (value.startsWith('/') && !value.startsWith('//')) return value
  if (value.startsWith('#')) return value
  const candidate = /^[a-z][a-z0-9+.-]*:/i.test(value) ? value : `https://${value}`
  try {
    const url = new URL(candidate)
    if (url.protocol === 'http:' || url.protocol === 'https:' || url.protocol === 'mailto:') return candidate
  } catch {
    return null
  }
  return null
}

export function RichTextEditor({
  id,
  value,
  onChange,
  placeholder = 'Start writing…',
  disabled = false,
  invalid = false,
  'aria-describedby': describedBy,
}: RichTextEditorProps) {
  // useEditor keeps its first options; read the latest callback through a ref.
  const onChangeRef = useRef(onChange)
  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  const editor = useEditor({
    immediatelyRender: true,
    shouldRerenderOnTransaction: false,
    editable: !disabled,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
        link: {
          openOnClick: false,
          autolink: true,
          protocols: ['http', 'https', 'mailto'],
          HTMLAttributes: { rel: 'noopener noreferrer' },
        },
      }),
      Image.configure({ inline: false, allowBase64: false }),
      Placeholder.configure({ placeholder }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
    ],
    content: value,
    editorProps: {
      attributes: surfaceAttributes(id, describedBy, invalid),
    },
    onUpdate: ({ editor: current }) => onChangeRef.current(editorHtml(current)),
  })

  // Push external value changes (e.g. a record finished loading) into the
  // editor, but never echo back the editor's own updates.
  useEffect(() => {
    if (!editor || editor.isDestroyed) return
    if (value !== editorHtml(editor)) {
      editor.commands.setContent(value || '', { emitUpdate: false })
    }
  }, [editor, value])

  useEffect(() => {
    if (editor && !editor.isDestroyed) editor.setEditable(!disabled)
  }, [editor, disabled])

  useEffect(() => {
    if (!editor || editor.isDestroyed) return
    editor.setOptions({
      editorProps: { attributes: surfaceAttributes(id, describedBy, invalid) } })
  }, [editor, id, describedBy, invalid])

  return (
    <div
      className={cn(
        'overflow-hidden rounded-lg border border-input bg-background transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 dark:bg-input/30',
        invalid && 'border-destructive focus-within:ring-destructive/20',
        disabled && 'opacity-60',
      )}
    >
      {editor ? <Toolbar editor={editor} disabled={disabled} /> : null}
      <EditorContent editor={editor} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Toolbar

interface ToolbarState {
  paragraph: boolean
  h2: boolean
  h3: boolean
  bold: boolean
  italic: boolean
  strike: boolean
  bulletList: boolean
  orderedList: boolean
  blockquote: boolean
  codeBlock: boolean
  link: boolean
  linkHref: string
  alignLeft: boolean
  alignCenter: boolean
  alignRight: boolean
  canUndo: boolean
  canRedo: boolean
}

function Toolbar({ editor, disabled }: { editor: Editor; disabled: boolean }) {
  const state = useEditorState<ToolbarState>({
    editor,
    selector: ({ editor: e }) => {
      const href: unknown = e.getAttributes('link').href
      return {
        paragraph: e.isActive('paragraph'),
        h2: e.isActive('heading', { level: 2 }),
        h3: e.isActive('heading', { level: 3 }),
        bold: e.isActive('bold'),
        italic: e.isActive('italic'),
        strike: e.isActive('strike'),
        bulletList: e.isActive('bulletList'),
        orderedList: e.isActive('orderedList'),
        blockquote: e.isActive('blockquote'),
        codeBlock: e.isActive('codeBlock'),
        link: e.isActive('link'),
        linkHref: typeof href === 'string' ? href : '',
        alignLeft: e.isActive({ textAlign: 'left' }),
        alignCenter: e.isActive({ textAlign: 'center' }),
        alignRight: e.isActive({ textAlign: 'right' }),
        canUndo: e.can().chain().undo().run(),
        canRedo: e.can().chain().redo().run(),
      }
    },
  })
  const [pickerOpen, setPickerOpen] = useState(false)

  const chain = () => editor.chain().focus()

  const insertImage = (media: Media) => {
    chain().setImage({ src: media.url, alt: media.alt || media.originalName }).run()
    setPickerOpen(false)
  }

  return (
    <div
      role="toolbar"
      aria-label="Formatting"
      className="sticky top-14 z-10 flex flex-wrap items-center gap-0.5 border-b bg-muted/40 px-1.5 py-1 backdrop-blur supports-[backdrop-filter]:bg-muted/60"
    >
      <ToolButton
        icon={Pilcrow}
        label="Paragraph"
        active={state.paragraph && !state.h2 && !state.h3}
        disabled={disabled}
        onClick={() => chain().setParagraph().run()}
      />
      <ToolButton
        icon={Heading2}
        label="Heading 2"
        active={state.h2}
        disabled={disabled}
        onClick={() => chain().toggleHeading({ level: 2 }).run()}
      />
      <ToolButton
        icon={Heading3}
        label="Heading 3"
        active={state.h3}
        disabled={disabled}
        onClick={() => chain().toggleHeading({ level: 3 }).run()}
      />
      <ToolbarDivider />
      <ToolButton
        icon={Bold}
        label="Bold"
        shortcut="Ctrl+B"
        active={state.bold}
        disabled={disabled}
        onClick={() => chain().toggleBold().run()}
      />
      <ToolButton
        icon={Italic}
        label="Italic"
        shortcut="Ctrl+I"
        active={state.italic}
        disabled={disabled}
        onClick={() => chain().toggleItalic().run()}
      />
      <ToolButton
        icon={Strikethrough}
        label="Strikethrough"
        active={state.strike}
        disabled={disabled}
        onClick={() => chain().toggleStrike().run()}
      />
      <ToolbarDivider />
      <ToolButton
        icon={List}
        label="Bulleted list"
        active={state.bulletList}
        disabled={disabled}
        onClick={() => chain().toggleBulletList().run()}
      />
      <ToolButton
        icon={ListOrdered}
        label="Numbered list"
        active={state.orderedList}
        disabled={disabled}
        onClick={() => chain().toggleOrderedList().run()}
      />
      <ToolButton
        icon={Quote}
        label="Quote"
        active={state.blockquote}
        disabled={disabled}
        onClick={() => chain().toggleBlockquote().run()}
      />
      <ToolButton
        icon={Code2}
        label="Code block"
        active={state.codeBlock}
        disabled={disabled}
        onClick={() => chain().toggleCodeBlock().run()}
      />
      <ToolbarDivider />
      <LinkControl editor={editor} active={state.link} href={state.linkHref} disabled={disabled} />
      <ToolButton
        icon={ImagePlus}
        label="Insert image from media library"
        toggle={false}
        disabled={disabled}
        onClick={() => setPickerOpen(true)}
      />
      <ToolbarDivider />
      <ToolButton
        icon={AlignLeft}
        label="Align left"
        active={state.alignLeft}
        disabled={disabled}
        onClick={() => chain().setTextAlign('left').run()}
      />
      <ToolButton
        icon={AlignCenter}
        label="Align center"
        active={state.alignCenter}
        disabled={disabled}
        onClick={() => chain().setTextAlign('center').run()}
      />
      <ToolButton
        icon={AlignRight}
        label="Align right"
        active={state.alignRight}
        disabled={disabled}
        onClick={() => chain().setTextAlign('right').run()}
      />
      <div className="ml-auto flex items-center gap-0.5">
        <ToolButton
          icon={Undo2}
          label="Undo"
          shortcut="Ctrl+Z"
          toggle={false}
          disabled={disabled || !state.canUndo}
          onClick={() => chain().undo().run()}
        />
        <ToolButton
          icon={Redo2}
          label="Redo"
          shortcut="Ctrl+Shift+Z"
          toggle={false}
          disabled={disabled || !state.canRedo}
          onClick={() => chain().redo().run()}
        />
      </div>

      <MediaPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onSelect={insertImage}
        title="Insert image"
        description="Choose an image from the media library or upload a new one."
      />
    </div>
  )
}

function ToolbarDivider() {
  return <Separator orientation="vertical" className="mx-1 data-[orientation=vertical]:h-5" />
}

interface ToolButtonProps {
  icon: LucideIcon
  label: string
  shortcut?: string
  active?: boolean
  /** false renders a plain button instead of a pressed/unpressed toggle. */
  toggle?: boolean
  disabled?: boolean
  onClick: () => void
}

function ToolButton({ icon: Icon, label, shortcut, active = false, toggle = true, disabled, onClick }: ToolButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {toggle ? (
          <Toggle
            size="sm"
            pressed={active}
            onPressedChange={() => onClick()}
            disabled={disabled}
            aria-label={label}
            className="data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-xs data-[state=on]:ring-1 data-[state=on]:ring-border"
          >
            <Icon aria-hidden />
          </Toggle>
        ) : (
          <Button type="button" variant="ghost" size="icon-sm" onClick={onClick} disabled={disabled} aria-label={label}>
            <Icon aria-hidden />
          </Button>
        )}
      </TooltipTrigger>
      <TooltipContent side="bottom">
        {label}
        {shortcut ? <span className="ml-2 text-muted-foreground">{shortcut}</span> : null}
      </TooltipContent>
    </Tooltip>
  )
}

function LinkControl({
  editor,
  active,
  href,
  disabled,
}: {
  editor: Editor
  active: boolean
  href: string
  disabled: boolean
}) {
  const [open, setOpen] = useState(false)
  const [url, setUrl] = useState('')
  const [error, setError] = useState<string | null>(null)

  const onOpenChange = (next: boolean) => {
    if (next) {
      setUrl(href)
      setError(null)
    }
    setOpen(next)
  }

  const apply = (event: FormEvent) => {
    event.preventDefault()
    if (!url.trim()) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      setOpen(false)
      return
    }
    const normalized = normalizeLinkUrl(url)
    if (!normalized) {
      setError('Use an http(s), mailto or relative URL.')
      return
    }
    const chain = editor.chain().focus().extendMarkRange('link')
    if (editor.state.selection.empty && !active) {
      // No selection: insert the URL itself as linked text.
      chain
        .insertContent({ type: 'text', text: normalized, marks: [{ type: 'link', attrs: { href: normalized } }] })
        .run()
    } else {
      chain.setLink({ href: normalized }).run()
    }
    setOpen(false)
  }

  const remove = () => {
    editor.chain().focus().extendMarkRange('link').unsetLink().run()
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Toggle
              size="sm"
              pressed={active}
              disabled={disabled}
              aria-label={active ? 'Edit link' : 'Add link'}
              className="data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-xs data-[state=on]:ring-1 data-[state=on]:ring-border"
            >
              <Link2 aria-hidden />
            </Toggle>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          {active ? 'Edit link' : 'Add link'}
        </TooltipContent>
      </Tooltip>
      <PopoverContent align="start" className="w-80">
        <form onSubmit={apply} className="grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="editor-link-url">Link URL</Label>
            <Input
              id="editor-link-url"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value)
                setError(null)
              }}
              placeholder="https://example.com"
              autoComplete="off"
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? 'editor-link-error' : undefined}
              autoFocus
            />
            {error ? (
              <p id="editor-link-error" role="alert" className="text-xs font-medium text-destructive">
                {error}
              </p>
            ) : null}
          </div>
          <div className="flex justify-end gap-2">
            {active ? (
              <Button type="button" variant="ghost" size="sm" onClick={remove}>
                Remove
              </Button>
            ) : null}
            <Button type="submit" size="sm">
              {active ? 'Update' : 'Add link'}
            </Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  )
}

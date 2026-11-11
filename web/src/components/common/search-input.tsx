import { Search, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Input } from '@/components/ui/input'
import { useDebounce } from '@/hooks/use-debounce'
import { cn } from '@/lib/utils'

interface SearchInputProps {
  /** Committed (debounced) value. */
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  delay?: number
}

/** Search box that keeps a local draft and reports changes after a debounce. */
export function SearchInput({ value, onChange, placeholder = 'Search…', className, delay = 300 }: SearchInputProps) {
  const [draft, setDraft] = useState(value)
  const debounced = useDebounce(draft, delay)

  // Follow external resets (e.g. "clear filters").
  useEffect(() => {
    setDraft(value)
  }, [value])

  // Latest props, read from the debounce effect without re-running it.
  const latest = useRef({ value, onChange })
  useEffect(() => {
    latest.current = { value, onChange }
  })

  useEffect(() => {
    const next = debounced.trim()
    if (next !== latest.current.value) latest.current.onChange(next)
  }, [debounced])

  return (
    <div className={cn('relative w-full sm:w-64', className)}>
      <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
      <Input
        type="search"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder.replace(/…$/, '')}
        className="pr-8 pl-8 [&::-webkit-search-cancel-button]:hidden"
      />
      {draft ? (
        <button
          type="button"
          onClick={() => {
            setDraft('')
            onChange('')
          }}
          className="absolute top-1/2 right-2 flex size-5 -translate-y-1/2 items-center justify-center rounded text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          aria-label="Clear search"
        >
          <X className="size-3.5" />
        </button>
      ) : null}
    </div>
  )
}

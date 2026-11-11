import { ChevronsUpDown, X } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import type { Tag } from '@/types/api'

interface TagsMultiSelectProps {
  id: string
  value: number[]
  onChange: (ids: number[]) => void
  options: Tag[]
  loading?: boolean
  disabled?: boolean
  invalid?: boolean
  'aria-describedby'?: string
}

export function TagsMultiSelect({
  id,
  value,
  onChange,
  options,
  loading = false,
  disabled = false,
  invalid = false,
  'aria-describedby': describedBy,
}: TagsMultiSelectProps) {
  const [open, setOpen] = useState(false)
  const selected = new Set(value)
  const selectedTags = value
    .map((tagId) => options.find((tag) => tag.id === tagId))
    .filter((tag): tag is Tag => tag !== undefined)

  const toggle = (tagId: number) => {
    onChange(selected.has(tagId) ? value.filter((v) => v !== tagId) : [...value, tagId])
  }

  return (
    <div className="grid gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-invalid={invalid || undefined}
            aria-describedby={describedBy}
            disabled={disabled || loading}
            className="w-full justify-between font-normal"
          >
            <span className={cn('truncate', selectedTags.length === 0 && 'text-muted-foreground')}>
              {loading
                ? 'Loading tags…'
                : selectedTags.length === 0
                  ? 'Select tags'
                  : `${selectedTags.length} selected`}
            </span>
            <ChevronsUpDown className="text-muted-foreground" aria-hidden />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-(--radix-popover-trigger-width) min-w-56 p-0" align="start">
          <Command>
            <CommandInput placeholder="Search tags…" />
            <CommandList>
              <CommandEmpty>{options.length === 0 ? 'No tags exist yet.' : 'No matching tags.'}</CommandEmpty>
              <CommandGroup>
                {options.map((tag) => (
                  <CommandItem
                    key={tag.id}
                    value={`${tag.name} ${tag.slug}`}
                    data-checked={selected.has(tag.id)}
                    aria-selected={selected.has(tag.id)}
                    onSelect={() => toggle(tag.id)}
                  >
                    <span className="truncate">{tag.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selectedTags.length > 0 ? (
        <ul className="flex flex-wrap gap-1.5" aria-label="Selected tags">
          {selectedTags.map((tag) => (
            <li key={tag.id}>
              <span className="inline-flex h-6 items-center gap-1 rounded-md border bg-muted/50 pr-0.5 pl-2 text-xs font-medium">
                {tag.name}
                <button
                  type="button"
                  onClick={() => toggle(tag.id)}
                  disabled={disabled}
                  className="flex size-5 items-center justify-center rounded text-muted-foreground hover:bg-background hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  aria-label={`Remove tag ${tag.name}`}
                >
                  <X className="size-3" aria-hidden />
                </button>
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

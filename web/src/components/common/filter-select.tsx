import type { ReactNode } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'

const ALL = '__all__'

export interface FilterOption {
  value: string
  label: string
}

interface FilterSelectProps {
  /** Empty string means "all". */
  value: string
  onChange: (value: string) => void
  options: FilterOption[]
  allLabel: string
  label: string
  className?: string
  disabled?: boolean
}

export function FilterSelect({ value, onChange, options, allLabel, label, className, disabled }: FilterSelectProps) {
  return (
    <Select value={value || ALL} onValueChange={(next) => onChange(next === ALL ? '' : next)} disabled={disabled}>
      <SelectTrigger aria-label={label} className={cn('w-full sm:w-40', className)}>
        <SelectValue placeholder={allLabel} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{allLabel}</SelectItem>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

/** Row that holds a search input and filters above a table. */
export function FiltersToolbar({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center', className)}>{children}</div>
}

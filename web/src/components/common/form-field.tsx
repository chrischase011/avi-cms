import type { ReactNode } from 'react'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

interface FormFieldProps {
  label: ReactNode
  /** id of the control; error/description ids are derived from it. */
  htmlFor: string
  error?: string
  description?: ReactNode
  /** Right-aligned content next to the label, e.g. a character counter. */
  aside?: ReactNode
  required?: boolean
  className?: string
  children: ReactNode
}

export const fieldDescriptionId = (id: string) => `${id}-description`
export const fieldErrorId = (id: string) => `${id}-error`

/**
 * Label + control + description/error. Pass `aria-invalid` and
 * `aria-describedby={describedBy(id, error, description)}` to the control.
 */
export function FormField({
  label,
  htmlFor,
  error,
  description,
  aside,
  required,
  className,
  children,
}: FormFieldProps) {
  return (
    <div className={cn('grid gap-1.5', className)}>
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={htmlFor} className="text-sm font-medium">
          {label}
          {required ? (
            <span className="text-muted-foreground" aria-hidden>
              *
            </span>
          ) : null}
        </Label>
        {aside}
      </div>
      {children}
      {description && !error ? (
        <p id={fieldDescriptionId(htmlFor)} className="text-xs text-muted-foreground">
          {description}
        </p>
      ) : null}
      {error ? (
        <p id={fieldErrorId(htmlFor)} role="alert" className="text-xs font-medium text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  )
}

export function describedBy(id: string, error?: string, description?: ReactNode): string | undefined {
  if (error) return fieldErrorId(id)
  if (description) return fieldDescriptionId(id)
  return undefined
}

/** "42 / 60", turning amber past the recommended length. */
export function CharCounter({ value, max, recommended }: { value: string; max: number; recommended?: number }) {
  const length = value.length
  const over = length > max
  const warn = !over && recommended !== undefined && length > recommended
  return (
    <span
      className={cn(
        'text-xs tabular-nums text-muted-foreground',
        warn && 'text-warning',
        over && 'font-medium text-destructive',
      )}
      aria-live="polite"
    >
      {length} / {max}
    </span>
  )
}

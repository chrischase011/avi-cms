import type { FieldPath, FieldValues, UseFormSetError } from 'react-hook-form'
import { isApiError } from '@/services/api'

interface ApplyOptions<T extends FieldValues> {
  /** Fields that exist in the form; issues for other paths are ignored. */
  fields: ReadonlyArray<FieldPath<T>>
  /** Field that receives a 409 conflict message (e.g. 'slug' or 'email'). */
  conflictField?: FieldPath<T>
  /** Map API body field names to form field names when they differ. */
  aliases?: Partial<Record<string, FieldPath<T>>>
}

/**
 * Copies field-level errors from an ApiError onto a react-hook-form instance.
 * Issues use `in: 'body'` and `path[0]` as the field name.
 * Returns true when at least one field received an error.
 */
export function applyApiErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  { fields, conflictField, aliases }: ApplyOptions<T>,
): boolean {
  if (!isApiError(error)) return false
  let applied = false

  if (error.status === 400 && error.issues) {
    for (const issue of error.issues) {
      if (issue.in !== 'body') continue
      const key = String(issue.path[0] ?? '')
      const field = aliases?.[key] ?? fields.find((f) => f === key)
      if (!field) continue
      setError(field, { type: 'server', message: issue.message }, { shouldFocus: !applied })
      applied = true
    }
  }

  if (error.status === 409 && conflictField) {
    setError(conflictField, { type: 'server', message: error.message || 'Already in use' }, { shouldFocus: true })
    applied = true
  }

  return applied
}

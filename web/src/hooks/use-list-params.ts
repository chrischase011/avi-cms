import { useCallback } from 'react'
import { useSearchParams } from 'react-router'

/**
 * List state (page, search, filters) kept in the URL so it survives reloads
 * and the back button. Filter values are strings; '' means unset.
 */
export function useListParams<K extends string>(filterKeys: readonly K[]) {
  const [searchParams, setSearchParams] = useSearchParams()

  const page = Math.max(1, Number(searchParams.get('page')) || 1)
  const search = searchParams.get('search') ?? ''
  const filters = Object.fromEntries(filterKeys.map((key) => [key, searchParams.get(key) ?? ''])) as Record<
    K,
    string
  >

  const update = useCallback(
    (changes: Record<string, string | number>) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          for (const [key, value] of Object.entries(changes)) {
            if (value === '' || (key === 'page' && value === 1)) next.delete(key)
            else next.set(key, String(value))
          }
          // Any filter/search change resets to the first page.
          if (!('page' in changes)) next.delete('page')
          return next
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  const setPage = useCallback((value: number) => update({ page: value }), [update])
  const setSearch = useCallback((value: string) => update({ search: value }), [update])
  const setFilter = useCallback((key: K, value: string) => update({ [key]: value }), [update])
  const reset = useCallback(() => setSearchParams(new URLSearchParams(), { replace: true }), [setSearchParams])

  const hasFilters = search !== '' || Object.values<string>(filters).some((v) => v !== '')

  return { page, search, filters, setPage, setSearch, setFilter, reset, hasFilters }
}

const dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' })
const dateTimeFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' })
const monthFormatter = new Intl.DateTimeFormat(undefined, { month: 'short' })
const monthYearFormatter = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' })
const numberFormatter = new Intl.NumberFormat()
const relativeFormatter = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })

function parse(value: string | null | undefined): Date | null {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export function formatDate(value: string | null | undefined): string {
  const date = parse(value)
  return date ? dateFormatter.format(date) : '—'
}

export function formatDateTime(value: string | null | undefined): string {
  const date = parse(value)
  return date ? dateTimeFormatter.format(date) : '—'
}

const RELATIVE_STEPS: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ['second', 60],
  ['minute', 60],
  ['hour', 24],
  ['day', 7],
  ['week', 4.345],
  ['month', 12],
  ['year', Number.POSITIVE_INFINITY],
]

export function formatRelative(value: string | null | undefined): string {
  const date = parse(value)
  if (!date) return '—'
  let delta = (date.getTime() - Date.now()) / 1000
  for (const [unit, size] of RELATIVE_STEPS) {
    if (Math.abs(delta) < size) return relativeFormatter.format(Math.round(delta), unit)
    delta /= size
  }
  return dateFormatter.format(date)
}

function monthDate(month: string): Date | null {
  const [year, m] = month.split('-').map(Number)
  if (!year || !m) return null
  return new Date(year, m - 1, 1)
}

/** '2026-06' -> 'Jun' */
export function formatMonth(month: string): string {
  const date = monthDate(month)
  return date ? monthFormatter.format(date) : month
}

/** '2026-06' -> 'June 2026' */
export function formatMonthYear(month: string): string {
  const date = monthDate(month)
  return date ? monthYearFormatter.format(date) : month
}

export function formatNumber(value: number): string {
  return numberFormatter.format(value)
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—'
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB']
  let value = bytes / 1024
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit += 1
  }
  return `${value >= 10 ? value.toFixed(0) : value.toFixed(1)} ${units[unit]}`
}

/** 'image/jpeg' -> 'JPEG' */
export function formatMimeType(mime: string): string {
  const sub = mime.split('/')[1] ?? mime
  return sub.replace(/^x-/, '').toUpperCase()
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  const first = parts[0]?.[0] ?? ''
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : ''
  return (first + last).toUpperCase()
}

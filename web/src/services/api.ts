import type { ErrorEnvelope, ValidationIssue } from '@/types/api'

const API_BASE = '/api'
const CSRF_COOKIE = 'avi_cms_csrf'
const CSRF_HEADER = 'x-csrf-token'

/** Paths whose 401 is an expected answer, not an expired session. */
const UNAUTHORIZED_PASSTHROUGH = ['/auth/login', '/auth/me', '/auth/password']

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

export class ApiError extends Error {
  readonly status: number
  readonly error: string
  readonly issues?: ValidationIssue[]
  readonly retryAfter?: number

  constructor(init: {
    status: number
    message: string
    error?: string
    issues?: ValidationIssue[]
    retryAfter?: number
  }) {
    super(init.message)
    this.name = 'ApiError'
    this.status = init.status
    this.error = init.error ?? ''
    this.issues = init.issues
    this.retryAfter = init.retryAfter
  }
}

export function isApiError(value: unknown): value is ApiError {
  return value instanceof ApiError
}

/** Human-readable message for any thrown value. */
export function errorMessage(error: unknown, fallback = 'Something went wrong'): string {
  if (error instanceof ApiError) return error.message || fallback
  if (error instanceof Error && error.message) return error.message
  return fallback
}

// ---------------------------------------------------------------------------
// CSRF

let csrfTokenFallback: string | null = null
let csrfRequest: Promise<void> | null = null

function readCookie(name: string): string | null {
  const prefix = `${name}=`
  for (const part of document.cookie.split(';')) {
    const trimmed = part.trim()
    if (trimmed.startsWith(prefix)) return decodeURIComponent(trimmed.slice(prefix.length))
  }
  return null
}

function currentCsrfToken(): string | null {
  return readCookie(CSRF_COOKIE) ?? csrfTokenFallback
}

async function fetchCsrfToken(): Promise<void> {
  const res = await fetch(`${API_BASE}/auth/csrf`, {
    credentials: 'include',
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) throw await toApiError(res)
  const body = (await res.json()) as { data?: { csrfToken?: string } }
  csrfTokenFallback = body.data?.csrfToken ?? null
}

/** Makes sure the CSRF cookie exists. Safe to call many times. */
export function ensureCsrf(force = false): Promise<void> {
  if (!force && readCookie(CSRF_COOKIE)) return Promise.resolve()
  if (!csrfRequest) {
    csrfRequest = fetchCsrfToken().finally(() => {
      csrfRequest = null
    })
  }
  return csrfRequest
}

// ---------------------------------------------------------------------------
// Session expiry

type UnauthorizedHandler = () => void
let unauthorizedHandler: UnauthorizedHandler | null = null

/** Registered once by the app shell: clears the user and redirects to /login. */
export function setUnauthorizedHandler(handler: UnauthorizedHandler | null): void {
  unauthorizedHandler = handler
}

// ---------------------------------------------------------------------------
// Requests

export type QueryValue = string | number | boolean | null | undefined
export type QueryParams = Record<string, QueryValue>

interface RequestOptions {
  query?: object
  body?: unknown
  formData?: FormData
  signal?: AbortSignal
}

function buildUrl(path: string, query?: object): string {
  const url = `${API_BASE}${path}`
  if (!query) return url
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query as QueryParams)) {
    if (value === undefined || value === null || value === '') continue
    params.set(key, String(value))
  }
  const qs = params.toString()
  return qs ? `${url}?${qs}` : url
}

function isErrorEnvelope(value: unknown): value is ErrorEnvelope {
  return typeof value === 'object' && value !== null && 'message' in value
}

async function toApiError(res: Response): Promise<ApiError> {
  const retryHeader = res.headers.get('Retry-After')
  const retryAfter = retryHeader ? Number(retryHeader) || undefined : undefined
  let payload: unknown = null
  try {
    payload = await res.json()
  } catch {
    payload = null
  }
  if (isErrorEnvelope(payload)) {
    return new ApiError({
      status: res.status,
      message: String(payload.message),
      error: payload.error,
      issues: payload.details?.issues,
      retryAfter,
    })
  }
  const message =
    res.status >= 500 ? 'The server is unavailable. Try again shortly.' : res.statusText || 'Request failed'
  return new ApiError({ status: res.status, message, retryAfter })
}

function looksLikeCsrfError(error: ApiError): boolean {
  return error.status === 403 && /csrf/i.test(`${error.message} ${error.error}`)
}

async function send(method: string, path: string, options: RequestOptions): Promise<Response> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  let body: BodyInit | undefined
  if (options.formData) {
    // Let the browser set the multipart boundary.
    body = options.formData
  } else if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json'
    body = JSON.stringify(options.body)
  }
  if (MUTATING_METHODS.has(method)) {
    const token = currentCsrfToken()
    if (token) headers[CSRF_HEADER] = token
  }
  try {
    return await fetch(buildUrl(path, options.query), {
      method,
      headers,
      body,
      credentials: 'include',
      signal: options.signal,
    })
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === 'AbortError') throw cause
    throw new ApiError({ status: 0, message: 'Unable to reach the server. Check your connection.' })
  }
}

async function request<T>(method: string, path: string, options: RequestOptions = {}): Promise<T> {
  const mutating = MUTATING_METHODS.has(method)
  if (mutating) await ensureCsrf()

  let res = await send(method, path, options)

  if (!res.ok && mutating && res.status === 403) {
    const error = await toApiError(res.clone())
    if (looksLikeCsrfError(error)) {
      // The token may have rotated or expired: refresh once and retry.
      await ensureCsrf(true)
      res = await send(method, path, options)
    }
  }

  if (!res.ok) {
    const error = await toApiError(res)
    if (error.status === 401 && !UNAUTHORIZED_PASSTHROUGH.some((p) => path.startsWith(p))) {
      unauthorizedHandler?.()
    }
    throw error
  }

  if (res.status === 204) return undefined as T
  const text = await res.text()
  if (!text) return undefined as T
  return JSON.parse(text) as T
}

export const api = {
  get: <T>(path: string, query?: object, signal?: AbortSignal) =>
    request<T>('GET', path, { query, signal }),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, { body }),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, { body }),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, { body }),
  delete: <T = void>(path: string) => request<T>('DELETE', path),
  upload: <T>(path: string, formData: FormData) => request<T>('POST', path, { formData }),
}

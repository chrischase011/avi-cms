// Avi.js has no cookie helpers, so the CMS reads and writes the two headers itself.

export const SESSION_COOKIE = 'avi_cms_session';
export const CSRF_COOKIE = 'avi_cms_csrf';

export function readCookies(header: string | undefined): Record<string, string> {
  const cookies: Record<string, string> = Object.create(null) as Record<string, string>;
  if (!header) return cookies;
  for (const pair of header.split(';')) {
    const index = pair.indexOf('=');
    if (index < 1) continue;
    const name = pair.slice(0, index).trim();
    const raw = pair.slice(index + 1).trim();
    try {
      cookies[name] = decodeURIComponent(raw);
    } catch {
      // A malformed value is ignored rather than failing the request.
    }
  }
  return cookies;
}

export interface CookieOptions {
  httpOnly?: boolean;
  secure: boolean;
  sameSite: 'Strict' | 'Lax';
  /** Seconds. 0 deletes the cookie. */
  maxAge?: number;
}

export function serializeCookie(name: string, value: string, options: CookieOptions): string {
  const parts = [`${name}=${encodeURIComponent(value)}`, 'Path=/', `SameSite=${options.sameSite}`];
  if (options.maxAge !== undefined) {
    parts.push(`Max-Age=${String(options.maxAge)}`);
    if (options.maxAge === 0) parts.push('Expires=Thu, 01 Jan 1970 00:00:00 GMT');
  }
  if (options.httpOnly) parts.push('HttpOnly');
  if (options.secure) parts.push('Secure');
  return parts.join('; ');
}

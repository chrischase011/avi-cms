import { HttpError, type RequestHook } from '@avijs/core';
import { timingSafeEqual } from 'node:crypto';
import { CSRF_COOKIE, readCookies } from './cookies.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Double-submit CSRF protection for the cookie-authenticated admin API. A state-changing
 * request must echo the CSRF cookie in the `x-csrf-token` header; another site can make the
 * browser send the cookie but cannot read it. The public API is read-only and exempt.
 */
export function csrfProtection(): RequestHook {
  return (ctx) => {
    if (SAFE_METHODS.has(ctx.method)) return undefined;
    if (!ctx.path.startsWith('/api/') || ctx.path.startsWith('/api/public/')) return undefined;

    const cookie = readCookies(ctx.headers.cookie)[CSRF_COOKIE];
    const header = ctx.headers['x-csrf-token'];
    const sent = Array.isArray(header) ? header[0] : header;
    if (!cookie || !sent || !equal(cookie, sent)) {
      throw new HttpError(403, 'Missing or invalid CSRF token');
    }
    return undefined;
  };
}

function equal(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

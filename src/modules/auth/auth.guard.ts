import { HttpError, type Context, type Guard } from '@avijs/core';
import { SESSION_COOKIE, readCookies } from '../../common/cookies.js';
import type { UserRole } from '../../database/schema.js';
import './auth.types.js';
import { SessionService } from './session.service.js';

/** Requires a valid session cookie and puts the user on `ctx.state.user`. */
export class AuthGuard {
  constructor(private readonly sessions: SessionService) {}

  async canActivate(ctx: Context): Promise<boolean> {
    const token = readCookies(ctx.headers.cookie)[SESSION_COOKIE];
    const user = token ? await this.sessions.verify(token) : undefined;
    if (!user) {
      // Tell the browser to drop a dead cookie, so the UI goes back to the login page cleanly.
      const headers: Record<string, string> = token
        ? { 'set-cookie': this.sessions.clearSessionCookie() }
        : {};
      throw new HttpError(401, 'Your session has expired. Please sign in again.', { headers });
    }
    ctx.state.user = user;
    return true;
  }
}

/** Lets the request through only for the given roles. Use after AuthGuard. */
export function requireRole(...roles: UserRole[]): Guard {
  return (ctx) => {
    const role = ctx.state.user?.role;
    if (role && roles.includes(role)) return true;
    throw new HttpError(403, 'You do not have permission to do this');
  };
}

export const canManageContent = (role: UserRole) => role === 'admin' || role === 'editor';

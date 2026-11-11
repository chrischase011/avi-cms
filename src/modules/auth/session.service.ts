import { Injectable } from '@avijs/core';
import { eq } from 'drizzle-orm';
import { SignJWT, errors, jwtVerify } from 'jose';
import { randomBytes } from 'node:crypto';
import { CSRF_COOKIE, SESSION_COOKIE, serializeCookie } from '../../common/cookies.js';
import { Config } from '../../config.js';
import { Db } from '../../database/database.module.js';
import { users, type UserRow } from '../../database/schema.js';
import type { AuthUser } from './auth.types.js';

const ISSUER = 'avi-cms';
const AUDIENCE = 'avi-cms-admin';

/** Issues and checks the JWT kept in the HTTP-only session cookie. */
@Injectable()
export class SessionService {
  readonly #key: Uint8Array;

  constructor(
    private readonly db: Db,
    private readonly config: Config,
  ) {
    this.#key = new TextEncoder().encode(config.JWT_SECRET);
  }

  async issue(user: Pick<UserRow, 'id' | 'tokenVersion'>): Promise<string> {
    return new SignJWT({ ver: user.tokenVersion })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(String(user.id))
      .setIssuer(ISSUER)
      .setAudience(AUDIENCE)
      .setIssuedAt()
      .setExpirationTime(`${String(this.config.JWT_TTL)}s`)
      .sign(this.#key);
  }

  /**
   * Returns the user a token belongs to, or undefined when the token is invalid or expired, the
   * account is deactivated, or its sessions were revoked by a password change.
   */
  async verify(token: string): Promise<AuthUser | undefined> {
    let subject: string | undefined;
    let version: unknown;
    try {
      const { payload } = await jwtVerify(token, this.#key, {
        issuer: ISSUER,
        audience: AUDIENCE,
        algorithms: ['HS256'],
      });
      subject = payload.sub;
      version = payload['ver'];
    } catch (error) {
      if (error instanceof errors.JOSEError) return undefined;
      throw error;
    }
    const id = Number(subject);
    if (!Number.isInteger(id)) return undefined;

    const [user] = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    if (!user?.isActive || user.tokenVersion !== version) return undefined;
    return { id: user.id, email: user.email, name: user.name, role: user.role };
  }

  sessionCookie(token: string): string {
    return serializeCookie(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: this.config.COOKIE_SECURE,
      sameSite: 'Lax',
      maxAge: this.config.JWT_TTL,
    });
  }

  clearSessionCookie(): string {
    return serializeCookie(SESSION_COOKIE, '', {
      httpOnly: true,
      secure: this.config.COOKIE_SECURE,
      sameSite: 'Lax',
      maxAge: 0,
    });
  }

  /** Readable by the admin UI, which echoes it in `x-csrf-token`. */
  csrfCookie(token: string): string {
    return serializeCookie(CSRF_COOKIE, token, {
      secure: this.config.COOKIE_SECURE,
      sameSite: 'Strict',
    });
  }

  newCsrfToken(): string {
    return randomBytes(32).toString('base64url');
  }
}

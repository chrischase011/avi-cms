import type { Context, Guard } from '@avijs/core';
import { rateLimit } from '@avijs/security';
import { Config } from '../../config.js';

/** Brute-force protection for the login route, sized from the config. */
export class LoginRateLimitGuard {
  readonly #guard: Guard;

  constructor(config: Config) {
    this.#guard = rateLimit({ limit: config.AUTH_RATE_LIMIT, window: 15 * 60_000 }).guard;
  }

  canActivate(ctx: Context) {
    return this.#guard(ctx);
  }
}

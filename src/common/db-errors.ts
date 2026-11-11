import { HttpError } from '@avijs/core';

interface PgError {
  code?: string;
  constraint?: string;
}

/** Drizzle wraps driver errors; the Postgres error is the cause. */
function pgError(error: unknown): PgError | undefined {
  let current: unknown = error;
  for (let depth = 0; depth < 3 && current && typeof current === 'object'; depth++) {
    const candidate = current as PgError & { cause?: unknown };
    if (typeof candidate.code === 'string' && /^[0-9A-Z]{5}$/.test(candidate.code)) return candidate;
    current = candidate.cause;
  }
  return undefined;
}

/**
 * Turns constraint violations into client errors, so a race between two requests that both
 * passed the "slug is free" check still gets a 409 instead of a 500.
 */
export function rethrowDbError(
  error: unknown,
  messages: { unique?: string; reference?: string; referenceStatus?: 400 | 409 } = {},
): never {
  const pg = pgError(error);
  if (pg?.code === '23505') {
    throw new HttpError(409, messages.unique ?? 'A record with this value already exists', {
      details: { constraint: pg.constraint },
    });
  }
  if (pg?.code === '23503') {
    // On insert/update a foreign key points nowhere (400); on delete the row is still used (409).
    throw new HttpError(
      messages.referenceStatus ?? 409,
      messages.reference ?? 'The record is referenced by other content',
    );
  }
  throw error;
}

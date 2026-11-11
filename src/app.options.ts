import { jsonLogger, logRequests, type AviOptions, type RequestHook } from '@avijs/core';
import { cors, securityHeaders } from '@avijs/security';
import { csrfProtection } from './common/csrf.js';
import type { Config } from './config.js';

/**
 * App-wide options, shared by main.ts and the tests. They are built before any provider exists,
 * so they take the config loaded by the caller.
 */
export function appOptions(config: Config): AviOptions {
  const logger = jsonLogger({ level: config.LOG_LEVEL });
  return {
    logger,
    onResponse:
      config.NODE_ENV === 'test'
        ? undefined
        : logRequests(logger, { skip: (info) => info.route === '/health' || info.route === '/*' }),
    trustProxy: config.TRUST_PROXY,
    shutdownTimeout: 10_000,
    onRequest: [
      securityHeaders({ strictTransportSecurity: config.COOKIE_SECURE ? undefined : false }),
      corsFor(config),
      csrfProtection(),
    ],
  };
}

/** The public API is open to any origin without credentials; the admin API only to its UI. */
function corsFor(config: Config): RequestHook {
  const origins = config.WEB_ORIGINS.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  const publicCors = cors({ origin: '*', methods: ['GET', 'HEAD'] });
  const adminCors = cors({ origin: origins, credentials: true, maxAge: 600 });
  return (ctx) => (ctx.path.startsWith('/api/public/') ? publicCors(ctx) : adminCors(ctx));
}

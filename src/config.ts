import { defineConfig, type TokenType } from '@avijs/core';
import { z } from 'zod';

const bool = (fallback: 'true' | 'false') =>
  z
    .enum(['true', 'false', '1', '0'])
    .default(fallback)
    .transform((value) => value === 'true' || value === '1');

const int = (fallback: string) =>
  z.string().regex(/^\d+$/, 'must be a whole number').default(fallback).transform(Number);

// Environment variables, checked when the app starts. A .env file is read too, if present.
const env = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: int('3001'),
  DATABASE_URL: z.string().url('DATABASE_URL must be a postgres:// URL'),

  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  /** Session lifetime in seconds. */
  JWT_TTL: int('28800'),
  /** Send cookies with the Secure flag. Turn on whenever the app is served over HTTPS. */
  COOKIE_SECURE: bool('false'),

  /** Admin UI origins allowed to call the API with cookies, comma separated. */
  WEB_ORIGINS: z.string().default('http://localhost:3000'),
  /** Prepended to media URLs, e.g. https://cms.example.com. Empty keeps them relative. */
  PUBLIC_URL: z.string().default(''),
  /** Serve the built admin UI (web/dist) from the API server. */
  SERVE_WEB: bool('false'),
  /** Number of proxies in front of the app, for client IPs and rate limits. */
  TRUST_PROXY: int('0'),

  UPLOAD_DIR: z.string().default('uploads'),
  /** Largest upload in bytes. */
  UPLOAD_MAX_SIZE: int(String(5 * 1024 * 1024)),

  /** Login attempts allowed per client per 15 minutes. */
  AUTH_RATE_LIMIT: int('10'),
  LOG_LEVEL: z.enum(['info', 'warn', 'error']).default('info'),
});

export const Config = defineConfig(env, { envFile: '.env' });
// The validated values, to type an injected config: constructor(private readonly config: Config).
export type Config = TokenType<typeof Config>;

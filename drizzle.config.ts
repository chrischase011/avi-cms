import { defineConfig } from 'drizzle-kit';
import { existsSync } from 'node:fs';

// drizzle-kit does not read .env by itself; Node's own parser does, as Avi's config does.
if (existsSync('.env')) process.loadEnvFile('.env');

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/database/schema.ts',
  out: './drizzle',
  dbCredentials: { url: process.env['DATABASE_URL'] ?? '' },
  strict: true,
});

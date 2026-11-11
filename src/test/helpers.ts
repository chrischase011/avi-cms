// Shared setup for the API tests: a clean test database, seeded users, signed-in clients.
import { defineConfig } from '@avijs/core';
import { createTestClient, type TestClient } from '@avijs/testing';
import { sql } from 'drizzle-orm';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { z } from 'zod';
import { appOptions } from '../app.options.js';
import { AppModule } from '../app.module.js';
import { Config } from '../config.js';
import { createDb, type Db } from '../database/database.module.js';
import { runMigrations } from '../database/migrator.js';
import { users, type UserRole } from '../database/schema.js';
import { hashPassword } from '../modules/auth/password.js';

const TestEnv = defineConfig(
  z.object({ TEST_DATABASE_URL: z.string().url('Set TEST_DATABASE_URL to a database the tests may wipe') }),
  { envFile: '.env' },
);

export const PASSWORD = 'correct-horse-battery';

export interface TestApp {
  client: TestClient;
  db: Db;
  config: Config;
  ids: Record<UserRole, number>;
  signIn(email: string, password?: string): Promise<TestClient>;
  close(): Promise<void>;
}

/** Wipes the test database, adds one user per role and starts the app on a random port. */
export async function startTestApp(overrides: Partial<Config> = {}): Promise<TestApp> {
  const { TEST_DATABASE_URL } = await TestEnv.load();
  const uploads = await mkdtemp(path.join(tmpdir(), 'avi-cms-uploads-'));
  const config: Config = {
    ...(await Config.load()),
    NODE_ENV: 'test',
    DATABASE_URL: TEST_DATABASE_URL,
    UPLOAD_DIR: uploads,
    AUTH_RATE_LIMIT: 1000,
    UPLOAD_MAX_SIZE: 64 * 1024,
    PUBLIC_URL: '',
    ...overrides,
  };

  const db = createDb(TEST_DATABASE_URL);
  await runMigrations(db);
  await db.execute(
    sql`truncate table post_tags, posts, pages, media, categories, tags, settings, users restart identity cascade`,
  );
  const passwordHash = await hashPassword(PASSWORD);
  const rows = await db
    .insert(users)
    .values(
      (['admin', 'editor', 'author'] as const).map((role) => ({
        email: `${role}@test.local`,
        name: `${role[0]?.toUpperCase() ?? ''}${role.slice(1)} User`,
        role,
        passwordHash,
      })),
    )
    .returning({ id: users.id, role: users.role });
  const ids = Object.fromEntries(rows.map((row) => [row.role, row.id])) as Record<UserRole, number>;

  const client = await createTestClient(AppModule, {
    ...appOptions(config),
    overrides: [{ provide: Config, useValue: config }],
  });

  return {
    client,
    db,
    config,
    ids,
    signIn: (email, password = PASSWORD) => signIn(client, email, password),
    async close() {
      await client.close();
      await db.$client.end();
      await rm(uploads, { recursive: true, force: true });
    },
  };
}

/** Cookie header value from a response's Set-Cookie headers, merged into an existing jar. */
export function cookieJar(setCookies: string[], jar: Record<string, string> = {}): Record<string, string> {
  for (const line of setCookies) {
    const [pair = ''] = line.split(';');
    const index = pair.indexOf('=');
    jar[pair.slice(0, index)] = pair.slice(index + 1);
  }
  return jar;
}

export const cookieHeader = (jar: Record<string, string>) =>
  Object.entries(jar)
    .map(([name, value]) => `${name}=${value}`)
    .join('; ');

/** Gets a CSRF token, signs in, and returns a client sending the cookies and the token. */
export async function signIn(client: TestClient, email: string, password = PASSWORD): Promise<TestClient> {
  const csrf = await client.get('/api/auth/csrf');
  const jar = cookieJar(csrf.headers.getSetCookie());
  const login = await client.post('/api/auth/login', { email, password }, { headers: { cookie: cookieHeader(jar), 'x-csrf-token': decodeURIComponent(jar['avi_cms_csrf'] ?? '') } });
  if (login.status !== 200) throw new Error(`Sign-in failed for ${email}: ${String(login.status)} ${login.text}`);
  cookieJar(login.headers.getSetCookie(), jar);
  return client.withHeaders({
    cookie: cookieHeader(jar),
    'x-csrf-token': decodeURIComponent(jar['avi_cms_csrf'] ?? ''),
  });
}

/** A multipart/form-data body with one file and optional fields. */
export function multipartBody(
  file: { name?: string; filename: string; type: string; data: Buffer },
  fields: Record<string, string> = {},
): { body: Buffer; headers: Record<string, string> } {
  const boundary = `----avi-test-${Math.random().toString(16).slice(2)}`;
  const parts: Buffer[] = [];
  for (const [name, value] of Object.entries(fields)) {
    parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`));
  }
  parts.push(
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="${file.name ?? 'file'}"; filename="${file.filename}"\r\nContent-Type: ${file.type}\r\n\r\n`,
    ),
    file.data,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  );
  return { body: Buffer.concat(parts), headers: { 'content-type': `multipart/form-data; boundary=${boundary}` } };
}

/** The smallest valid PNG: 1x1, transparent. */
export const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);

import { migrate } from 'drizzle-orm/node-postgres/migrator';
import path from 'node:path';
import type { Db } from './database.module.js';

/** Applies the SQL migrations in drizzle/ that have not run yet. */
export async function runMigrations(db: Db): Promise<void> {
  await migrate(db, { migrationsFolder: path.resolve('drizzle') });
}

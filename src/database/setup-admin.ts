// npm run setup:admin. Creates the first administrator from ADMIN_EMAIL, ADMIN_PASSWORD and
// ADMIN_NAME (environment or .env). Safe to run again: an existing account is left untouched.
import { Config } from '../config.js';
import { ensureAdmin } from './admin.js';
import { createDb } from './database.module.js';

const config = await Config.load();
const db = createDb(config.DATABASE_URL);
try {
  const result = await ensureAdmin(db);
  console.log(
    result.status === 'created'
      ? `Administrator ${result.email} created. Remove ADMIN_PASSWORD from your environment now.`
      : `An account for ${result.email} already exists; nothing changed.`,
  );
} finally {
  await db.$client.end();
}

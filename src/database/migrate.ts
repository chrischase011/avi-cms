// npm run db:migrate. Uses drizzle-orm's migrator, so production needs no dev dependencies.
import { Config } from '../config.js';
import { createDb } from './database.module.js';
import { runMigrations } from './migrator.js';

const config = await Config.load();
const db = createDb(config.DATABASE_URL);
try {
  await runMigrations(db);
  console.log('Migrations applied.');
} finally {
  await db.$client.end();
}

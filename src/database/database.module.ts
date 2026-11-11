import { Module, createToken, defineFactory } from '@avijs/core';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { Config } from '../config.js';
import * as schema from './schema.js';

export type Db = NodePgDatabase<typeof schema> & { $client: pg.Pool };
export const Db = createToken<Db>('Db');

export function createDb(url: string): Db {
  const pool = new pg.Pool({ connectionString: url, max: 10 });
  return drizzle(pool, { schema });
}

@Module({
  imports: [Config.module],
  providers: [
    defineFactory({
      provide: Db,
      inject: [Config],
      useFactory: async (config) => {
        const db = createDb(config.DATABASE_URL);
        // Fail at startup, not on the first request, when the database is unreachable.
        await db.$client.query('select 1');
        return db;
      },
      dispose: (db) => db.$client.end(),
    }),
  ],
  exports: [Db],
})
export class DatabaseModule {}

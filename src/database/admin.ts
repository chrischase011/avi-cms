import { defineConfig } from '@avijs/core';
import { sql } from 'drizzle-orm';
import { z } from 'zod';
import { PasswordSchema } from '../modules/auth/auth.schemas.js';
import { hashPassword } from '../modules/auth/password.js';
import type { Db } from './database.module.js';
import { users } from './schema.js';

/** The first administrator comes from the environment, never from code. */
export const AdminConfig = defineConfig(
  z.object({
    ADMIN_EMAIL: z.string().trim().toLowerCase().email('ADMIN_EMAIL must be an email'),
    ADMIN_PASSWORD: PasswordSchema,
    ADMIN_NAME: z.string().trim().min(1).max(120).default('Administrator'),
  }),
  { envFile: '.env' },
);

export type AdminResult = { status: 'created' | 'exists'; email: string; id: number };

/** Creates the administrator unless an account with that email already exists. */
export async function ensureAdmin(db: Db): Promise<AdminResult> {
  const admin = await AdminConfig.load();
  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(sql`lower(${users.email}) = ${admin.ADMIN_EMAIL}`)
    .limit(1);
  if (existing) return { status: 'exists', email: admin.ADMIN_EMAIL, id: existing.id };

  const [created] = await db
    .insert(users)
    .values({
      email: admin.ADMIN_EMAIL,
      name: admin.ADMIN_NAME,
      role: 'admin',
      passwordHash: await hashPassword(admin.ADMIN_PASSWORD),
    })
    .returning({ id: users.id });
  if (!created) throw new Error('Could not create the administrator');
  return { status: 'created', email: admin.ADMIN_EMAIL, id: created.id };
}

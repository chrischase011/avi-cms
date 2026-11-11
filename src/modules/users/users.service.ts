import { HttpError, Injectable } from '@avijs/core';
import { and, asc, count, eq, ilike, or, sql } from 'drizzle-orm';
import { rethrowDbError } from '../../common/db-errors.js';
import { likePattern, offsetOf, paginated } from '../../common/pagination.js';
import { Db } from '../../database/database.module.js';
import { users, type UserRow } from '../../database/schema.js';
import type { AuthUser } from '../auth/auth.types.js';
import { hashPassword } from '../auth/password.js';
import type { CreateUserDto, UpdateUserDto, UsersQuery } from './dto/user.dto.js';

const DUPLICATE = { unique: 'A user with this email already exists' };

@Injectable()
export class UsersService {
  constructor(private readonly db: Db) {}

  async list(query: UsersQuery) {
    const where = and(
      query.role ? eq(users.role, query.role) : undefined,
      query.status ? eq(users.isActive, query.status === 'active') : undefined,
      query.search
        ? or(ilike(users.name, likePattern(query.search)), ilike(users.email, likePattern(query.search)))
        : undefined,
    );
    const [rows, [total]] = await Promise.all([
      this.db.select().from(users).where(where).orderBy(asc(users.name), asc(users.id)).limit(query.pageSize).offset(offsetOf(query)),
      this.db.select({ value: count() }).from(users).where(where),
    ]);
    return paginated(rows, total?.value ?? 0, query);
  }

  async findOne(id: number): Promise<UserRow> {
    const [user] = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    if (!user) throw new HttpError(404, 'User not found');
    return user;
  }

  async create(input: CreateUserDto): Promise<UserRow> {
    try {
      const [user] = await this.db
        .insert(users)
        .values({
          email: input.email,
          name: input.name,
          role: input.role,
          isActive: input.isActive ?? true,
          passwordHash: await hashPassword(input.password),
        })
        .returning();
      if (!user) throw new Error('Insert returned no row');
      return user;
    } catch (error) {
      rethrowDbError(error, DUPLICATE);
    }
  }

  async update(id: number, input: UpdateUserDto, actor: AuthUser): Promise<UserRow> {
    const current = await this.findOne(id);
    if (id === actor.id) {
      // Keep at least the acting admin able to sign in and manage the CMS.
      if (input.isActive === false) throw new HttpError(400, 'You cannot deactivate your own account');
      if (input.role && input.role !== 'admin') throw new HttpError(400, 'You cannot remove your own admin role');
    }
    const deactivating = input.isActive === false && current.isActive;
    try {
      const [user] = await this.db
        .update(users)
        .set({
          ...input,
          // A deactivated account loses its sessions at once, not when they expire.
          ...(deactivating && { tokenVersion: sql`${users.tokenVersion} + 1` }),
        })
        .where(eq(users.id, id))
        .returning();
      if (!user) throw new HttpError(404, 'User not found');
      return user;
    } catch (error) {
      rethrowDbError(error, DUPLICATE);
    }
  }

  /** Sets a new password and signs the user out everywhere. */
  async setPassword(id: number, password: string): Promise<void> {
    const [user] = await this.db
      .update(users)
      .set({ passwordHash: await hashPassword(password), tokenVersion: sql`${users.tokenVersion} + 1` })
      .where(eq(users.id, id))
      .returning({ id: users.id });
    if (!user) throw new HttpError(404, 'User not found');
  }

  async count(): Promise<number> {
    const [row] = await this.db.select({ value: count() }).from(users);
    return row?.value ?? 0;
  }
}

import { HttpError, Injectable } from '@avijs/core';
import { eq, sql } from 'drizzle-orm';
import { Db } from '../../database/database.module.js';
import { users, type UserRow } from '../../database/schema.js';
import { dummyHash, hashPassword, verifyPassword } from './password.js';

@Injectable()
export class AuthService {
  constructor(private readonly db: Db) {}

  /** Checks credentials. Unknown email, wrong password and inactive accounts look the same. */
  async login(email: string, password: string): Promise<UserRow> {
    const [user] = await this.db
      .select()
      .from(users)
      .where(sql`lower(${users.email}) = ${email.toLowerCase()}`)
      .limit(1);
    const valid = await verifyPassword(password, user?.passwordHash ?? (await dummyHash()));
    if (!user || !valid || !user.isActive) {
      throw new HttpError(401, 'Invalid email or password');
    }
    await this.db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));
    return user;
  }

  /** Changes the password and ends every other session by bumping the token version. */
  async changeOwnPassword(id: number, current: string, next: string): Promise<UserRow> {
    const [user] = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    if (!user || !(await verifyPassword(current, user.passwordHash))) {
      throw new HttpError(400, 'Current password is incorrect');
    }
    const [updated] = await this.db
      .update(users)
      .set({ passwordHash: await hashPassword(next), tokenVersion: user.tokenVersion + 1 })
      .where(eq(users.id, id))
      .returning();
    if (!updated) throw new HttpError(404, 'User not found');
    return updated;
  }

  /** Ends every session of the user, the current one included. */
  async revokeSessions(id: number): Promise<void> {
    await this.db
      .update(users)
      .set({ tokenVersion: sql`${users.tokenVersion} + 1` })
      .where(eq(users.id, id));
  }
}

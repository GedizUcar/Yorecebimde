import { Inject, Injectable } from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import { users } from '@yorecebimde/db/schema';
import { DB_TOKEN, type DbToken } from '../../infrastructure/database.module.js';

export type UserRow = typeof users.$inferSelect;
export type NewUserRow = typeof users.$inferInsert;

@Injectable()
export class UsersRepository {
  constructor(@Inject(DB_TOKEN) private readonly db: DbToken) {}

  async findById(id: string): Promise<UserRow | null> {
    const rows = await this.db
      .select()
      .from(users)
      .where(and(eq(users.id, id), isNull(users.deletedAt)))
      .limit(1);
    return rows[0] ?? null;
  }

  async findByEmail(email: string): Promise<UserRow | null> {
    const rows = await this.db
      .select()
      .from(users)
      .where(and(eq(users.email, email.toLowerCase()), isNull(users.deletedAt)))
      .limit(1);
    return rows[0] ?? null;
  }

  async findByAuthUserId(authUserId: string): Promise<UserRow | null> {
    const rows = await this.db
      .select()
      .from(users)
      .where(and(eq(users.authUserId, authUserId), isNull(users.deletedAt)))
      .limit(1);
    return rows[0] ?? null;
  }

  async create(data: NewUserRow): Promise<UserRow> {
    const rows = await this.db.insert(users).values(data).returning();
    if (!rows[0]) throw new Error('Insert failed');
    return rows[0];
  }

  async updateProfile(
    userId: string,
    patch: Partial<
      Pick<
        UserRow,
        | 'firstName'
        | 'lastName'
        | 'phone'
        | 'preferredLocale'
        | 'marketingEmailOptIn'
        | 'marketingSmsOptIn'
      >
    >,
  ): Promise<UserRow> {
    const rows = await this.db
      .update(users)
      .set({ ...patch, updatedAt: new Date() })
      .where(and(eq(users.id, userId), isNull(users.deletedAt)))
      .returning();
    if (!rows[0]) throw new Error('User not found');
    return rows[0];
  }
}

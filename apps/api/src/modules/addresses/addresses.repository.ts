import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import { addresses } from '@yorecebimde/db/schema';
import { DB_TOKEN, type DbToken } from '../../infrastructure/database.module.js';

export type AddressRow = typeof addresses.$inferSelect;
export type NewAddressRow = typeof addresses.$inferInsert;

@Injectable()
export class AddressesRepository {
  constructor(@Inject(DB_TOKEN) private readonly db: DbToken) {}

  async listByUser(userId: string): Promise<AddressRow[]> {
    return this.db
      .select()
      .from(addresses)
      .where(eq(addresses.userId, userId))
      .orderBy(desc(addresses.isDefault), desc(addresses.createdAt));
  }

  async findByUserAndId(userId: string, id: string): Promise<AddressRow | null> {
    const rows = await this.db
      .select()
      .from(addresses)
      .where(and(eq(addresses.userId, userId), eq(addresses.id, id)))
      .limit(1);
    return rows[0] ?? null;
  }

  async create(data: NewAddressRow): Promise<AddressRow> {
    const rows = await this.db.insert(addresses).values(data).returning();
    if (!rows[0]) throw new Error('Insert failed');
    return rows[0];
  }

  async update(id: string, data: Partial<NewAddressRow>): Promise<AddressRow | null> {
    const rows = await this.db
      .update(addresses)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(addresses.id, id))
      .returning();
    return rows[0] ?? null;
  }

  async delete(userId: string, id: string): Promise<void> {
    await this.db
      .delete(addresses)
      .where(and(eq(addresses.userId, userId), eq(addresses.id, id)));
  }

  /** Set as default — bu user'ın diğer adreslerini default=false yapar. */
  async setDefault(userId: string, id: string): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx.update(addresses).set({ isDefault: false }).where(eq(addresses.userId, userId));
      await tx
        .update(addresses)
        .set({ isDefault: true, updatedAt: new Date() })
        .where(and(eq(addresses.userId, userId), eq(addresses.id, id)));
    });
  }
}

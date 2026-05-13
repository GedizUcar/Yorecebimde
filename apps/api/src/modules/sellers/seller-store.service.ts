import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { sellers } from '@yorecebimde/db/schema';
import { NotFoundError } from '@yorecebimde/shared';
import { DB_TOKEN, type DbToken } from '../../infrastructure/database.module.js';

export const updateStoreSchema = z.object({
  bio: z.string().max(2000).optional(),
  logoUrl: z.string().url().optional(),
  coverUrl: z.string().url().optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().min(10).max(20).optional(),
  addressProvince: z.string().max(100).optional(),
  addressDistrict: z.string().max(100).optional(),
  workingHours: z
    .record(
      z.string(),
      z.object({ open: z.string(), close: z.string(), closed: z.boolean().optional() }),
    )
    .optional(),
});
export type UpdateStoreInput = z.infer<typeof updateStoreSchema>;

@Injectable()
export class SellerStoreService {
  constructor(@Inject(DB_TOKEN) private readonly db: DbToken) {}

  async getMine(sellerId: string) {
    const rows = await this.db
      .select({
        id: sellers.id,
        slug: sellers.slug,
        displayName: sellers.displayName,
        type: sellers.type,
        bio: sellers.bio,
        logoUrl: sellers.logoUrl,
        coverUrl: sellers.coverUrl,
        workingHours: sellers.workingHours,
        contactEmail: sellers.contactEmail,
        contactPhone: sellers.contactPhone,
        addressProvince: sellers.addressProvince,
        addressDistrict: sellers.addressDistrict,
        ratingAvg: sellers.ratingAvg,
        ratingCount: sellers.ratingCount,
        totalSalesCount: sellers.totalSalesCount,
      })
      .from(sellers)
      .where(eq(sellers.id, sellerId))
      .limit(1);
    if (!rows[0]) throw new NotFoundError('Seller', sellerId);
    return rows[0];
  }

  async updateMine(sellerId: string, input: UpdateStoreInput) {
    const patch: Partial<typeof sellers.$inferInsert> = {};
    if (input.bio !== undefined) patch.bio = input.bio;
    if (input.logoUrl !== undefined) patch.logoUrl = input.logoUrl;
    if (input.coverUrl !== undefined) patch.coverUrl = input.coverUrl;
    if (input.contactEmail !== undefined) patch.contactEmail = input.contactEmail;
    if (input.contactPhone !== undefined) patch.contactPhone = input.contactPhone;
    if (input.addressProvince !== undefined) patch.addressProvince = input.addressProvince;
    if (input.addressDistrict !== undefined) patch.addressDistrict = input.addressDistrict;
    if (input.workingHours !== undefined) patch.workingHours = input.workingHours;
    await this.db
      .update(sellers)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(sellers.id, sellerId));
    return this.getMine(sellerId);
  }
}

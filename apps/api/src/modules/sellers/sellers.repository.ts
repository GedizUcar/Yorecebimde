import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { sellers } from '@yorecebimde/db/schema';
import { DB_TOKEN, type DbToken } from '../../infrastructure/database.module.js';

export type SellerRow = typeof sellers.$inferSelect;

/** Public store info — hassas alanlar (IBAN, TC, vergi no) yok. */
export type PublicSeller = {
  id: string;
  slug: string;
  displayName: string;
  type: SellerRow['type'];
  bio: string | null;
  logoUrl: string | null;
  coverUrl: string | null;
  workingHours: unknown;
  contactEmail: string;
  contactPhone: string;
  addressProvince: string | null;
  addressDistrict: string | null;
  ratingAvg: string;
  ratingCount: number;
  totalSalesCount: number;
};

@Injectable()
export class SellersRepository {
  constructor(@Inject(DB_TOKEN) private readonly db: DbToken) {}

  async findPublicBySlug(slug: string): Promise<PublicSeller | null> {
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
      .where(
        and(
          eq(sellers.slug, slug),
          eq(sellers.status, 'approved'),
          isNull(sellers.deletedAt),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  }

  /** Public listing — sitemap ve kategori sayfasında satıcı listesi için. */
  async listPublic(limit = 100): Promise<Array<{ slug: string; displayName: string }>> {
    return this.db
      .select({ slug: sellers.slug, displayName: sellers.displayName })
      .from(sellers)
      .where(and(eq(sellers.status, 'approved'), isNull(sellers.deletedAt)))
      .orderBy(desc(sellers.createdAt))
      .limit(Math.min(500, limit));
  }
}

import { Inject, Injectable } from '@nestjs/common';
import { and, asc, desc, eq, inArray, isNull, sql } from 'drizzle-orm';
import {
  products,
  productImages,
  sellers,
  wishlists,
} from '@yorecebimde/db/schema';
import { DB_TOKEN, type DbToken } from '../../infrastructure/database.module.js';

export type WishlistRow = typeof wishlists.$inferSelect;

export type WishlistItem = {
  id: string;
  productId: string;
  product: {
    id: string;
    slug: string;
    nameTr: string;
    baseUnitPrice: string;
    unit: string;
    isColdChain: boolean;
    seller: { slug: string; displayName: string };
    primaryImage: { thumbnailUrl: string | null; webpUrl: string | null; url: string } | null;
  };
  createdAt: Date;
};

@Injectable()
export class WishlistRepository {
  constructor(@Inject(DB_TOKEN) private readonly db: DbToken) {}

  async listByUser(userId: string): Promise<WishlistItem[]> {
    const rows = await this.db
      .select({
        id: wishlists.id,
        productId: wishlists.productId,
        createdAt: wishlists.createdAt,
        product: products,
        seller: { slug: sellers.slug, displayName: sellers.displayName },
      })
      .from(wishlists)
      .innerJoin(products, eq(products.id, wishlists.productId))
      .innerJoin(sellers, eq(sellers.id, products.sellerId))
      .where(and(eq(wishlists.userId, userId), isNull(products.deletedAt)))
      .orderBy(desc(wishlists.createdAt));

    return this.attachImages(rows);
  }

  async listByDevice(deviceId: string): Promise<WishlistItem[]> {
    const rows = await this.db
      .select({
        id: wishlists.id,
        productId: wishlists.productId,
        createdAt: wishlists.createdAt,
        product: products,
        seller: { slug: sellers.slug, displayName: sellers.displayName },
      })
      .from(wishlists)
      .innerJoin(products, eq(products.id, wishlists.productId))
      .innerJoin(sellers, eq(sellers.id, products.sellerId))
      .where(
        and(
          eq(wishlists.deviceId, deviceId),
          isNull(wishlists.userId),
          isNull(products.deletedAt),
        ),
      )
      .orderBy(desc(wishlists.createdAt));

    return this.attachImages(rows);
  }

  async productIds(userId: string | null, deviceId: string | null): Promise<string[]> {
    if (userId) {
      const rows = await this.db
        .select({ productId: wishlists.productId })
        .from(wishlists)
        .where(eq(wishlists.userId, userId));
      return rows.map((r) => r.productId);
    }
    if (deviceId) {
      const rows = await this.db
        .select({ productId: wishlists.productId })
        .from(wishlists)
        .where(and(eq(wishlists.deviceId, deviceId), isNull(wishlists.userId)));
      return rows.map((r) => r.productId);
    }
    return [];
  }

  async addForUser(userId: string, productId: string): Promise<void> {
    await this.db
      .insert(wishlists)
      .values({ userId, productId })
      .onConflictDoNothing();
  }

  async addForDevice(deviceId: string, productId: string): Promise<void> {
    await this.db
      .insert(wishlists)
      .values({ deviceId, productId })
      .onConflictDoNothing();
  }

  async removeForUser(userId: string, productId: string): Promise<void> {
    await this.db
      .delete(wishlists)
      .where(and(eq(wishlists.userId, userId), eq(wishlists.productId, productId)));
  }

  async removeForDevice(deviceId: string, productId: string): Promise<void> {
    await this.db
      .delete(wishlists)
      .where(
        and(
          eq(wishlists.deviceId, deviceId),
          isNull(wishlists.userId),
          eq(wishlists.productId, productId),
        ),
      );
  }

  /**
   * Login sırasında çağrılır: device_id ile eklenmiş öğeleri user'a taşır.
   * Aynı ürün hem device hem user listesinde olursa device tarafını siler.
   */
  async mergeDeviceIntoUser(deviceId: string, userId: string): Promise<void> {
    await this.db.transaction(async (tx) => {
      const existingUser = await tx
        .select({ productId: wishlists.productId })
        .from(wishlists)
        .where(eq(wishlists.userId, userId));
      const userProductIds = new Set(existingUser.map((r) => r.productId));

      const deviceRows = await tx
        .select()
        .from(wishlists)
        .where(and(eq(wishlists.deviceId, deviceId), isNull(wishlists.userId)));

      for (const row of deviceRows) {
        if (userProductIds.has(row.productId)) {
          await tx.delete(wishlists).where(eq(wishlists.id, row.id));
        } else {
          await tx
            .update(wishlists)
            .set({ userId, deviceId: null })
            .where(eq(wishlists.id, row.id));
        }
      }
    });
  }

  private async attachImages(
    rows: Array<{
      id: string;
      productId: string;
      createdAt: Date;
      product: typeof products.$inferSelect;
      seller: { slug: string; displayName: string };
    }>,
  ): Promise<WishlistItem[]> {
    if (rows.length === 0) return [];
    const productIds = rows.map((r) => r.productId);
    const imgs = await this.db
      .select({
        productId: productImages.productId,
        url: productImages.url,
        webpUrl: productImages.webpUrl,
        thumbnailUrl: productImages.thumbnailUrl,
        sortOrder: productImages.sortOrder,
      })
      .from(productImages)
      .where(
        and(
          inArray(productImages.productId, productIds),
          eq(productImages.processingStatus, 'ready'),
        ),
      )
      .orderBy(asc(productImages.sortOrder));
    const primaryByProduct = new Map<string, { url: string; webpUrl: string | null; thumbnailUrl: string | null }>();
    for (const img of imgs) {
      if (!primaryByProduct.has(img.productId)) {
        primaryByProduct.set(img.productId, {
          url: img.url,
          webpUrl: img.webpUrl,
          thumbnailUrl: img.thumbnailUrl,
        });
      }
    }

    return rows.map((r) => ({
      id: r.id,
      productId: r.productId,
      createdAt: r.createdAt,
      product: {
        id: r.product.id,
        slug: r.product.slug,
        nameTr: r.product.nameTr,
        baseUnitPrice: r.product.baseUnitPrice,
        unit: r.product.unit,
        isColdChain: r.product.isColdChain,
        seller: r.seller,
        primaryImage: primaryByProduct.get(r.productId) ?? null,
      },
    }));
  }

  /** Tek ürün için bulunan kayıt sayısı — hızlı `exists` kontrolü. */
  async exists(
    userId: string | null,
    deviceId: string | null,
    productId: string,
  ): Promise<boolean> {
    if (userId) {
      const rows = await this.db
        .select({ id: wishlists.id })
        .from(wishlists)
        .where(and(eq(wishlists.userId, userId), eq(wishlists.productId, productId)))
        .limit(1);
      return rows.length > 0;
    }
    if (deviceId) {
      const rows = await this.db
        .select({ id: wishlists.id })
        .from(wishlists)
        .where(
          and(
            eq(wishlists.deviceId, deviceId),
            isNull(wishlists.userId),
            eq(wishlists.productId, productId),
          ),
        )
        .limit(1);
      return rows.length > 0;
    }
    return false;
  }

  // For lint: keep helpers used in tx
  _unused() {
    void sql;
  }
}

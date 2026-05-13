import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq, isNull } from 'drizzle-orm';
import {
  carts,
  cartItems,
  products,
  productImages,
  productVariations,
  sellers,
} from '@yorecebimde/db/schema';
import { DB_TOKEN, type DbToken } from '../../infrastructure/database.module.js';

export type CartRow = typeof carts.$inferSelect;
export type CartItemRow = typeof cartItems.$inferSelect;

export type CartItemHydrated = CartItemRow & {
  product: {
    id: string;
    slug: string;
    nameTr: string;
    unit: string;
    baseUnitPrice: string;
    kdvRate: string;
    kdvIncluded: boolean;
    stockQuantity: string;
    isActive: boolean;
    seller: { id: string; slug: string; displayName: string };
    primaryImage: { thumbnailUrl: string | null; webpUrl: string | null; url: string } | null;
  };
  variation: { id: string; label: string; quantity: string; priceOverride: string | null } | null;
};

@Injectable()
export class CartRepository {
  constructor(@Inject(DB_TOKEN) private readonly db: DbToken) {}

  async findByUser(userId: string): Promise<CartRow | null> {
    const rows = await this.db
      .select()
      .from(carts)
      .where(eq(carts.userId, userId))
      .limit(1);
    return rows[0] ?? null;
  }

  async findByDevice(deviceId: string): Promise<CartRow | null> {
    const rows = await this.db
      .select()
      .from(carts)
      .where(and(eq(carts.deviceId, deviceId), isNull(carts.userId)))
      .limit(1);
    return rows[0] ?? null;
  }

  async getOrCreateForUser(userId: string): Promise<CartRow> {
    const existing = await this.findByUser(userId);
    if (existing) return existing;
    const rows = await this.db.insert(carts).values({ userId }).returning();
    return rows[0]!;
  }

  async getOrCreateForDevice(deviceId: string): Promise<CartRow> {
    const existing = await this.findByDevice(deviceId);
    if (existing) return existing;
    const rows = await this.db.insert(carts).values({ deviceId }).returning();
    return rows[0]!;
  }

  async listItems(cartId: string): Promise<CartItemHydrated[]> {
    const rows = await this.db
      .select({
        item: cartItems,
        product: products,
        seller: { id: sellers.id, slug: sellers.slug, displayName: sellers.displayName },
        variation: productVariations,
      })
      .from(cartItems)
      .innerJoin(products, eq(products.id, cartItems.productId))
      .innerJoin(sellers, eq(sellers.id, products.sellerId))
      .leftJoin(productVariations, eq(productVariations.id, cartItems.variationId))
      .where(eq(cartItems.cartId, cartId))
      .orderBy(asc(cartItems.createdAt));

    if (rows.length === 0) return [];

    // Birincil görseller
    const productIds = [...new Set(rows.map((r) => r.product.id))];
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
          eq(productImages.processingStatus, 'ready'),
        ),
      )
      .orderBy(asc(productImages.sortOrder));
    const primary = new Map<string, { url: string; webpUrl: string | null; thumbnailUrl: string | null }>();
    for (const img of imgs) {
      if (productIds.includes(img.productId) && !primary.has(img.productId)) {
        primary.set(img.productId, {
          url: img.url,
          webpUrl: img.webpUrl,
          thumbnailUrl: img.thumbnailUrl,
        });
      }
    }

    return rows.map((r) => ({
      ...r.item,
      product: {
        id: r.product.id,
        slug: r.product.slug,
        nameTr: r.product.nameTr,
        unit: r.product.unit,
        baseUnitPrice: r.product.baseUnitPrice,
        kdvRate: r.product.kdvRate,
        kdvIncluded: r.product.kdvIncluded,
        stockQuantity: r.product.stockQuantity,
        isActive: r.product.isActive,
        seller: r.seller,
        primaryImage: primary.get(r.product.id) ?? null,
      },
      variation: r.variation
        ? {
            id: r.variation.id,
            label: r.variation.label,
            quantity: r.variation.quantity,
            priceOverride: r.variation.priceOverride,
          }
        : null,
    }));
  }

  async findItem(cartId: string, productId: string, variationId: string | null) {
    const rows = await this.db
      .select()
      .from(cartItems)
      .where(
        and(
          eq(cartItems.cartId, cartId),
          eq(cartItems.productId, productId),
          variationId
            ? eq(cartItems.variationId, variationId)
            : isNull(cartItems.variationId),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  }

  async insertItem(data: typeof cartItems.$inferInsert): Promise<CartItemRow> {
    const rows = await this.db.insert(cartItems).values(data).returning();
    return rows[0]!;
  }

  async updateItem(id: string, data: Partial<typeof cartItems.$inferInsert>): Promise<CartItemRow | null> {
    const rows = await this.db
      .update(cartItems)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(cartItems.id, id))
      .returning();
    return rows[0] ?? null;
  }

  async deleteItem(id: string): Promise<void> {
    await this.db.delete(cartItems).where(eq(cartItems.id, id));
  }

  async clearCart(cartId: string): Promise<void> {
    await this.db.delete(cartItems).where(eq(cartItems.cartId, cartId));
  }

  /** Misafir cart → user cart merge. Aynı productId+variation varsa quantity'leri topla. */
  async mergeDeviceIntoUser(deviceId: string, userId: string): Promise<void> {
    await this.db.transaction(async (tx) => {
      const deviceCart = await tx
        .select()
        .from(carts)
        .where(and(eq(carts.deviceId, deviceId), isNull(carts.userId)))
        .limit(1);
      if (!deviceCart[0]) return;

      let userCart = (await tx.select().from(carts).where(eq(carts.userId, userId)).limit(1))[0];
      if (!userCart) {
        const created = await tx.insert(carts).values({ userId }).returning();
        userCart = created[0]!;
      }

      const deviceItems = await tx
        .select()
        .from(cartItems)
        .where(eq(cartItems.cartId, deviceCart[0].id));

      const userItems = await tx
        .select()
        .from(cartItems)
        .where(eq(cartItems.cartId, userCart.id));

      const keyOf = (i: { productId: string; variationId: string | null }) =>
        `${i.productId}::${i.variationId ?? ''}`;
      const userMap = new Map(userItems.map((i) => [keyOf(i), i]));

      for (const d of deviceItems) {
        const k = keyOf(d);
        const existing = userMap.get(k);
        if (existing) {
          const newQty = (Number(existing.quantity) + Number(d.quantity)).toString();
          await tx
            .update(cartItems)
            .set({ quantity: newQty, updatedAt: new Date() })
            .where(eq(cartItems.id, existing.id));
        } else {
          await tx.insert(cartItems).values({
            cartId: userCart.id,
            productId: d.productId,
            ...(d.variationId ? { variationId: d.variationId } : {}),
            quantity: d.quantity,
            unitPriceSnapshot: d.unitPriceSnapshot,
          });
        }
      }

      await tx.delete(carts).where(eq(carts.id, deviceCart[0].id));
    });
  }
}

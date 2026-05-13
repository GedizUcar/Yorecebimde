import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { products, stockMovements } from '@yorecebimde/db/schema';
import { BusinessRuleError, NotFoundError } from '@yorecebimde/shared';
import { DB_TOKEN, type DbToken } from '../../infrastructure/database.module.js';
import { ProductsRepository } from './products.repository.js';
import { SearchService } from '../search/search.service.js';

export const adjustStockSchema = z.object({
  delta: z.number(),
  reason: z.string().min(1).max(500),
});
export type AdjustStockInput = z.infer<typeof adjustStockSchema>;

export const setStockSchema = z.object({
  quantity: z.number().nonnegative(),
  reason: z.string().min(1).max(500),
});
export type SetStockInput = z.infer<typeof setStockSchema>;

@Injectable()
export class StockService {
  constructor(
    @Inject(DB_TOKEN) private readonly db: DbToken,
    private readonly products: ProductsRepository,
    private readonly search: SearchService,
  ) {}

  async adjust(sellerId: string, productId: string, userId: string, input: AdjustStockInput) {
    const product = await this.assertOwnership(sellerId, productId);
    const current = Number(product.stockQuantity);
    const next = current + input.delta;
    if (next < 0) {
      throw new BusinessRuleError('Stok negatif olamaz', { current, delta: input.delta });
    }
    return this.commit(sellerId, productId, userId, {
      delta: input.delta,
      after: next,
      type: input.delta >= 0 ? 'manual_increase' : 'manual_decrease',
      reason: input.reason,
    });
  }

  async set(sellerId: string, productId: string, userId: string, input: SetStockInput) {
    const product = await this.assertOwnership(sellerId, productId);
    const current = Number(product.stockQuantity);
    const delta = input.quantity - current;
    return this.commit(sellerId, productId, userId, {
      delta,
      after: input.quantity,
      type: 'correction',
      reason: input.reason,
    });
  }

  async history(sellerId: string, productId: string, limit = 50) {
    await this.assertOwnership(sellerId, productId);
    return this.db
      .select()
      .from(stockMovements)
      .where(
        and(eq(stockMovements.productId, productId), eq(stockMovements.sellerId, sellerId)),
      )
      .orderBy(desc(stockMovements.createdAt))
      .limit(Math.min(200, limit));
  }

  private async commit(
    sellerId: string,
    productId: string,
    userId: string,
    opts: {
      delta: number;
      after: number;
      type: 'initial' | 'sale' | 'refund' | 'manual_increase' | 'manual_decrease' | 'correction';
      reason: string;
      referenceType?: string;
      referenceId?: string;
    },
  ) {
    await this.db.transaction(async (tx) => {
      await tx
        .update(products)
        .set({ stockQuantity: String(opts.after), updatedAt: new Date() })
        .where(eq(products.id, productId));
      await tx.insert(stockMovements).values({
        productId,
        sellerId,
        type: opts.type,
        quantityDelta: String(opts.delta),
        quantityAfter: String(opts.after),
        reason: opts.reason,
        performedBy: userId,
        ...(opts.referenceType ? { referenceType: opts.referenceType } : {}),
        ...(opts.referenceId ? { referenceId: opts.referenceId } : {}),
      });
    });
    await this.search.indexProduct(productId).catch(() => undefined);
    return { productId, quantityAfter: opts.after };
  }

  /**
   * Internal — Faz 3'te checkout sırasında çağrılır.
   * Stok rezervasyonu öncesi hata fırlatabilir.
   */
  async decreaseForSale(
    sellerId: string,
    productId: string,
    qty: number,
    orderId: string,
  ): Promise<void> {
    if (qty <= 0) return;
    const rows = await this.db
      .update(products)
      .set({
        stockQuantity: sql`${products.stockQuantity} - ${qty}`,
        updatedAt: new Date(),
      })
      .where(and(eq(products.id, productId), sql`${products.stockQuantity} >= ${qty}`))
      .returning({ id: products.id, after: products.stockQuantity });
    if (rows.length === 0) throw new BusinessRuleError('Yetersiz stok');
    await this.db.insert(stockMovements).values({
      productId,
      sellerId,
      type: 'sale',
      quantityDelta: String(-qty),
      quantityAfter: rows[0]!.after,
      reason: `Sipariş #${orderId}`,
      referenceType: 'order',
      referenceId: orderId,
    });
  }

  private async assertOwnership(sellerId: string, productId: string) {
    const product = await this.products.findBySellerAndId(sellerId, productId);
    if (!product) throw new NotFoundError('Product', productId);
    return product;
  }

  /**
   * Cron job — düşük stoklu ürünleri tara, son 24 saatte bildirim atmadıysa
   * notifyLowStockToSeller trigger'ı düşür. Şimdilik sadece sayım döner.
   */
  async findLowStockProducts(): Promise<Array<{
    productId: string;
    sellerId: string;
    nameTr: string;
    stockQuantity: string;
    lowStockThreshold: string | null;
    unit: string;
  }>> {
    const rows = await this.db.execute<{
      product_id: string;
      seller_id: string;
      name_tr: string;
      stock_quantity: string;
      low_stock_threshold: string | null;
      unit: string;
    }>(sql`
      SELECT id AS product_id, seller_id, name_tr, stock_quantity::text, low_stock_threshold::text, unit
      FROM products
      WHERE deleted_at IS NULL
        AND is_active = true
        AND low_stock_notify = true
        AND low_stock_threshold IS NOT NULL
        AND stock_quantity <= low_stock_threshold
      ORDER BY seller_id
      LIMIT 200
    `);
    const list = rows as unknown as Array<{
      product_id: string;
      seller_id: string;
      name_tr: string;
      stock_quantity: string;
      low_stock_threshold: string | null;
      unit: string;
    }>;
    return list.map((r) => ({
      productId: r.product_id,
      sellerId: r.seller_id,
      nameTr: r.name_tr,
      stockQuantity: r.stock_quantity,
      lowStockThreshold: r.low_stock_threshold,
      unit: r.unit,
    }));
  }
}

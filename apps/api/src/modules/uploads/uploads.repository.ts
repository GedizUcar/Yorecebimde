import { Inject, Injectable } from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import { productImages, products } from '@yorecebimde/db/schema';
import { DB_TOKEN, type DbToken } from '../../infrastructure/database.module.js';

export type ProductImageRow = typeof productImages.$inferSelect;
export type NewProductImageRow = typeof productImages.$inferInsert;

@Injectable()
export class UploadsRepository {
  constructor(@Inject(DB_TOKEN) private readonly db: DbToken) {}

  /** Satıcının bu ürüne sahip olup olmadığını kontrol eder. */
  async assertSellerOwnsProduct(sellerId: string, productId: string): Promise<boolean> {
    const rows = await this.db
      .select({ id: products.id })
      .from(products)
      .where(
        and(
          eq(products.id, productId),
          eq(products.sellerId, sellerId),
          isNull(products.deletedAt),
        ),
      )
      .limit(1);
    return rows.length > 0;
  }

  async countImages(productId: string): Promise<number> {
    const rows = await this.db
      .select({ id: productImages.id })
      .from(productImages)
      .where(eq(productImages.productId, productId));
    return rows.length;
  }

  async createImage(data: NewProductImageRow): Promise<ProductImageRow> {
    const rows = await this.db.insert(productImages).values(data).returning();
    if (!rows[0]) throw new Error('Insert failed');
    return rows[0];
  }

  async findById(id: string): Promise<ProductImageRow | null> {
    const rows = await this.db
      .select()
      .from(productImages)
      .where(eq(productImages.id, id))
      .limit(1);
    return rows[0] ?? null;
  }

  async findBySellerAndId(sellerId: string, id: string): Promise<ProductImageRow | null> {
    const rows = await this.db
      .select()
      .from(productImages)
      .where(and(eq(productImages.id, id), eq(productImages.sellerId, sellerId)))
      .limit(1);
    return rows[0] ?? null;
  }

  async updateProcessing(
    id: string,
    status: 'processing' | 'ready' | 'failed',
    fields: Partial<NewProductImageRow> = {},
  ): Promise<void> {
    await this.db
      .update(productImages)
      .set({ processingStatus: status, ...fields, updatedAt: new Date() })
      .where(eq(productImages.id, id));
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(productImages).where(eq(productImages.id, id));
  }
}

import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { productVariations } from '@yorecebimde/db/schema';
import { BusinessRuleError, NotFoundError } from '@yorecebimde/shared';
import { DB_TOKEN, type DbToken } from '../../infrastructure/database.module.js';
import { ProductsRepository } from './products.repository.js';
import { SearchService } from '../search/search.service.js';

export const createVariationSchema = z.object({
  label: z.string().min(1).max(100),
  quantity: z.number().positive(),
  priceOverride: z.number().positive().optional(),
  sku: z.string().max(100).optional(),
  sortOrder: z.number().int().nonnegative().default(0),
});
export type CreateVariationInput = z.infer<typeof createVariationSchema>;

export const updateVariationSchema = createVariationSchema.partial().extend({
  isActive: z.boolean().optional(),
});
export type UpdateVariationInput = z.infer<typeof updateVariationSchema>;

@Injectable()
export class VariationsService {
  constructor(
    @Inject(DB_TOKEN) private readonly db: DbToken,
    private readonly products: ProductsRepository,
    private readonly search: SearchService,
  ) {}

  async list(sellerId: string, productId: string) {
    await this.assertOwnership(sellerId, productId);
    return this.db
      .select()
      .from(productVariations)
      .where(eq(productVariations.productId, productId))
      .orderBy(asc(productVariations.sortOrder));
  }

  async create(sellerId: string, productId: string, input: CreateVariationInput) {
    const product = await this.assertOwnership(sellerId, productId);
    if (product.variationMode === 'none') {
      throw new BusinessRuleError("Ürünün varyasyon modu 'none', önce ürün modunu değiştirin");
    }
    if (product.variationMode === 'stepper') {
      throw new BusinessRuleError(
        'Stepper modu ayrı varyasyon kaydı kullanmaz; min/max/step ürün üzerinde tanımlanır',
      );
    }

    const inserted = await this.db
      .insert(productVariations)
      .values({
        productId,
        sellerId,
        label: input.label,
        quantity: String(input.quantity),
        ...(input.priceOverride !== undefined
          ? { priceOverride: String(input.priceOverride) }
          : {}),
        ...(input.sku !== undefined ? { sku: input.sku } : {}),
        sortOrder: input.sortOrder,
      })
      .returning();
    const row = inserted[0];
    if (!row) throw new Error('Insert failed');

    await this.search.indexProduct(productId).catch(() => undefined);
    return row;
  }

  async update(
    sellerId: string,
    productId: string,
    variationId: string,
    input: UpdateVariationInput,
  ) {
    await this.assertOwnership(sellerId, productId);
    const existing = await this.db
      .select()
      .from(productVariations)
      .where(
        and(
          eq(productVariations.id, variationId),
          eq(productVariations.productId, productId),
          eq(productVariations.sellerId, sellerId),
        ),
      )
      .limit(1);
    if (!existing[0]) throw new NotFoundError('Variation', variationId);

    const patch: Partial<typeof productVariations.$inferInsert> = {};
    if (input.label !== undefined) patch.label = input.label;
    if (input.quantity !== undefined) patch.quantity = String(input.quantity);
    if (input.priceOverride !== undefined) patch.priceOverride = String(input.priceOverride);
    if (input.sku !== undefined) patch.sku = input.sku;
    if (input.sortOrder !== undefined) patch.sortOrder = input.sortOrder;
    if (input.isActive !== undefined) patch.isActive = input.isActive;

    const updated = await this.db
      .update(productVariations)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(productVariations.id, variationId))
      .returning();

    await this.search.indexProduct(productId).catch(() => undefined);
    return updated[0]!;
  }

  async remove(sellerId: string, productId: string, variationId: string) {
    await this.assertOwnership(sellerId, productId);
    const deleted = await this.db
      .delete(productVariations)
      .where(
        and(
          eq(productVariations.id, variationId),
          eq(productVariations.productId, productId),
          eq(productVariations.sellerId, sellerId),
        ),
      )
      .returning({ id: productVariations.id });
    if (deleted.length === 0) throw new NotFoundError('Variation', variationId);
    await this.search.indexProduct(productId).catch(() => undefined);
  }

  private async assertOwnership(sellerId: string, productId: string) {
    const product = await this.products.findBySellerAndId(sellerId, productId);
    if (!product) throw new NotFoundError('Product', productId);
    return product;
  }
}

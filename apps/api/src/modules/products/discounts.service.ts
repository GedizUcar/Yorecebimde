import { Inject, Injectable } from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { discounts } from '@yorecebimde/db/schema';
import { BusinessRuleError, NotFoundError } from '@yorecebimde/shared';
import { DB_TOKEN, type DbToken } from '../../infrastructure/database.module.js';
import { ProductsRepository } from './products.repository.js';
import { SearchService } from '../search/search.service.js';

const tierSchema = z.object({
  minQuantity: z.number().int().positive(),
  percentage: z.number().min(0).max(95),
});

export const createDiscountSchema = z
  .discriminatedUnion('type', [
    z.object({
      type: z.literal('permanent'),
      percentage: z.number().min(0).max(95),
    }),
    z.object({
      type: z.literal('time_based'),
      percentage: z.number().min(0).max(95),
      startsAt: z.string().datetime(),
      endsAt: z.string().datetime(),
    }),
    z.object({
      type: z.literal('quantity_based'),
      tiers: z.array(tierSchema).min(1).max(10),
    }),
  ])
  .refine(
    (d) =>
      d.type !== 'time_based' || new Date(d.startsAt).getTime() < new Date(d.endsAt).getTime(),
    { message: 'startsAt < endsAt olmalı', path: ['endsAt'] },
  );

export type CreateDiscountInput = z.infer<typeof createDiscountSchema>;

export const updateDiscountSchema = z.object({
  percentage: z.number().min(0).max(95).optional(),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional(),
  tiers: z.array(tierSchema).optional(),
  isActive: z.boolean().optional(),
});
export type UpdateDiscountInput = z.infer<typeof updateDiscountSchema>;

@Injectable()
export class DiscountsService {
  constructor(
    @Inject(DB_TOKEN) private readonly db: DbToken,
    private readonly products: ProductsRepository,
    private readonly search: SearchService,
  ) {}

  async list(sellerId: string, productId: string) {
    await this.assertOwnership(sellerId, productId);
    return this.db
      .select()
      .from(discounts)
      .where(and(eq(discounts.productId, productId), isNull(discounts.deletedAt)));
  }

  async create(sellerId: string, productId: string, input: CreateDiscountInput) {
    await this.assertOwnership(sellerId, productId);

    const row = {
      productId,
      sellerId,
      type: input.type,
      ...(input.type === 'permanent' ? { percentage: String(input.percentage) } : {}),
      ...(input.type === 'time_based'
        ? {
            percentage: String(input.percentage),
            startsAt: new Date(input.startsAt),
            endsAt: new Date(input.endsAt),
          }
        : {}),
      ...(input.type === 'quantity_based' ? { tiers: input.tiers } : {}),
    };

    const inserted = await this.db.insert(discounts).values(row).returning();
    if (!inserted[0]) throw new Error('Insert failed');
    await this.search.indexProduct(productId).catch(() => undefined);
    return inserted[0];
  }

  async update(
    sellerId: string,
    productId: string,
    discountId: string,
    input: UpdateDiscountInput,
  ) {
    await this.assertOwnership(sellerId, productId);
    const existing = await this.db
      .select()
      .from(discounts)
      .where(
        and(
          eq(discounts.id, discountId),
          eq(discounts.productId, productId),
          eq(discounts.sellerId, sellerId),
        ),
      )
      .limit(1);
    const current = existing[0];
    if (!current) throw new NotFoundError('Discount', discountId);

    const patch: Partial<typeof discounts.$inferInsert> = {};
    if (input.percentage !== undefined) patch.percentage = String(input.percentage);
    if (input.startsAt !== undefined) patch.startsAt = new Date(input.startsAt);
    if (input.endsAt !== undefined) patch.endsAt = new Date(input.endsAt);
    if (input.tiers !== undefined) patch.tiers = input.tiers;
    if (input.isActive !== undefined) patch.isActive = input.isActive;

    if (current.type === 'time_based') {
      const startsAt = patch.startsAt ?? current.startsAt;
      const endsAt = patch.endsAt ?? current.endsAt;
      if (startsAt && endsAt && startsAt.getTime() >= endsAt.getTime()) {
        throw new BusinessRuleError('startsAt, endsAt değerinden küçük olmalı');
      }
    }

    const updated = await this.db
      .update(discounts)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(discounts.id, discountId))
      .returning();
    await this.search.indexProduct(productId).catch(() => undefined);
    return updated[0]!;
  }

  async remove(sellerId: string, productId: string, discountId: string) {
    await this.assertOwnership(sellerId, productId);
    const deleted = await this.db
      .update(discounts)
      .set({ deletedAt: new Date(), isActive: false, updatedAt: new Date() })
      .where(
        and(
          eq(discounts.id, discountId),
          eq(discounts.productId, productId),
          eq(discounts.sellerId, sellerId),
        ),
      )
      .returning({ id: discounts.id });
    if (deleted.length === 0) throw new NotFoundError('Discount', discountId);
    await this.search.indexProduct(productId).catch(() => undefined);
  }

  private async assertOwnership(sellerId: string, productId: string) {
    const product = await this.products.findBySellerAndId(sellerId, productId);
    if (!product) throw new NotFoundError('Product', productId);
    return product;
  }
}

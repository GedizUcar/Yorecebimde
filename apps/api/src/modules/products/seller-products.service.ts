import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { toSlug, ensureUniqueSlug, NotFoundError, ConflictError } from '@yorecebimde/shared';
import { ProductsRepository, type NewProductRow } from './products.repository.js';
import { SearchService } from '../search/search.service.js';

export const createProductSchema = z.object({
  nameTr: z.string().min(3).max(300),
  nameEn: z.string().max(300).optional(),
  descriptionTr: z.string().max(20_000).optional(),
  shortDescriptionTr: z.string().max(500).optional(),
  unit: z.enum(['kg', 'g', 'lt', 'ml', 'adet', 'paket', 'kasa', 'demet', 'tane']),
  variationMode: z.enum(['none', 'discrete', 'stepper']).default('none'),
  stepperMin: z.number().nonnegative().optional(),
  stepperMax: z.number().nonnegative().optional(),
  stepperStep: z.number().positive().optional(),
  baseUnitPrice: z.number().positive(),
  kdvRate: z.number().min(0).max(50),
  kdvIncluded: z.boolean().default(true),
  isColdChain: z.boolean().default(false),
  weightGrams: z.number().int().positive().optional(),
  stockQuantity: z.number().nonnegative().default(0),
  lowStockThreshold: z.number().nonnegative().optional(),
  categoryIds: z.array(z.string().uuid()).min(1).max(5),
  primaryCategoryId: z.string().uuid(),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;

export const updateProductSchema = createProductSchema.partial().extend({
  isActive: z.boolean().optional(),
});
export type UpdateProductInput = z.infer<typeof updateProductSchema>;

@Injectable()
export class SellerProductsService {
  constructor(
    private readonly repo: ProductsRepository,
    private readonly search: SearchService,
  ) {}

  async create(sellerId: string, input: CreateProductInput) {
    if (!input.categoryIds.includes(input.primaryCategoryId)) {
      throw new ConflictError('primaryCategoryId, categoryIds içinde olmalı');
    }

    const baseSlug = toSlug(input.nameTr);
    const slug = await ensureUniqueSlug(baseSlug, async (candidate) =>
      this.repo.slugTaken(sellerId, candidate),
    );

    const data: NewProductRow = {
      sellerId,
      slug,
      nameTr: input.nameTr,
      ...(input.nameEn ? { nameEn: input.nameEn } : {}),
      ...(input.descriptionTr ? { descriptionTr: input.descriptionTr } : {}),
      ...(input.shortDescriptionTr ? { shortDescriptionTr: input.shortDescriptionTr } : {}),
      unit: input.unit,
      variationMode: input.variationMode,
      ...(input.stepperMin !== undefined ? { stepperMin: String(input.stepperMin) } : {}),
      ...(input.stepperMax !== undefined ? { stepperMax: String(input.stepperMax) } : {}),
      ...(input.stepperStep !== undefined ? { stepperStep: String(input.stepperStep) } : {}),
      baseUnitPrice: String(input.baseUnitPrice),
      kdvRate: String(input.kdvRate),
      kdvIncluded: input.kdvIncluded,
      isColdChain: input.isColdChain,
      ...(input.weightGrams !== undefined ? { weightGrams: input.weightGrams } : {}),
      stockQuantity: String(input.stockQuantity),
      ...(input.lowStockThreshold !== undefined
        ? { lowStockThreshold: String(input.lowStockThreshold) }
        : {}),
      isActive: false, // draft state — yayına satıcı manuel almalı
    };

    const product = await this.repo.create(data);
    await this.repo.setCategories(product.id, sellerId, input.categoryIds, input.primaryCategoryId);
    await this.reindexSilent(product.id);
    return product;
  }

  async update(sellerId: string, productId: string, input: UpdateProductInput) {
    const existing = await this.repo.findBySellerAndId(sellerId, productId);
    if (!existing) throw new NotFoundError('Product', productId);

    const patch: Partial<NewProductRow> = {};
    if (input.nameTr !== undefined) patch.nameTr = input.nameTr;
    if (input.nameEn !== undefined) patch.nameEn = input.nameEn;
    if (input.descriptionTr !== undefined) patch.descriptionTr = input.descriptionTr;
    if (input.shortDescriptionTr !== undefined) patch.shortDescriptionTr = input.shortDescriptionTr;
    if (input.unit !== undefined) patch.unit = input.unit;
    if (input.variationMode !== undefined) patch.variationMode = input.variationMode;
    if (input.stepperMin !== undefined) patch.stepperMin = String(input.stepperMin);
    if (input.stepperMax !== undefined) patch.stepperMax = String(input.stepperMax);
    if (input.stepperStep !== undefined) patch.stepperStep = String(input.stepperStep);
    if (input.baseUnitPrice !== undefined) patch.baseUnitPrice = String(input.baseUnitPrice);
    if (input.kdvRate !== undefined) patch.kdvRate = String(input.kdvRate);
    if (input.kdvIncluded !== undefined) patch.kdvIncluded = input.kdvIncluded;
    if (input.isColdChain !== undefined) patch.isColdChain = input.isColdChain;
    if (input.weightGrams !== undefined) patch.weightGrams = input.weightGrams;
    if (input.stockQuantity !== undefined) patch.stockQuantity = String(input.stockQuantity);
    if (input.lowStockThreshold !== undefined)
      patch.lowStockThreshold = String(input.lowStockThreshold);
    if (input.isActive !== undefined) patch.isActive = input.isActive;

    const updated = await this.repo.update(productId, patch);
    if (!updated) throw new NotFoundError('Product', productId);

    if (input.categoryIds && input.primaryCategoryId) {
      if (!input.categoryIds.includes(input.primaryCategoryId)) {
        throw new ConflictError('primaryCategoryId, categoryIds içinde olmalı');
      }
      await this.repo.setCategories(productId, sellerId, input.categoryIds, input.primaryCategoryId);
    }

    await this.reindexSilent(productId);
    return updated;
  }

  async publish(sellerId: string, productId: string) {
    const existing = await this.repo.findBySellerAndId(sellerId, productId);
    if (!existing) throw new NotFoundError('Product', productId);
    await this.repo.update(productId, { isActive: true });
    await this.reindexSilent(productId);
  }

  async unpublish(sellerId: string, productId: string) {
    const existing = await this.repo.findBySellerAndId(sellerId, productId);
    if (!existing) throw new NotFoundError('Product', productId);
    await this.repo.update(productId, { isActive: false });
    await this.search.removeProduct(productId).catch(() => undefined);
  }

  async softDelete(sellerId: string, productId: string) {
    const existing = await this.repo.findBySellerAndId(sellerId, productId);
    if (!existing) throw new NotFoundError('Product', productId);
    await this.repo.softDelete(productId);
    await this.search.removeProduct(productId).catch(() => undefined);
  }

  async list(sellerId: string, page = 1, limit = 20) {
    return this.repo.listBySeller(sellerId, page, limit);
  }

  async findOne(sellerId: string, productId: string) {
    const product = await this.repo.findBySellerAndId(sellerId, productId);
    if (!product) throw new NotFoundError('Product', productId);
    return product;
  }

  async findOneWithRelations(sellerId: string, productId: string) {
    const product = await this.repo.findBySellerWithRelations(sellerId, productId);
    if (!product) throw new NotFoundError('Product', productId);
    return product;
  }

  private async reindexSilent(productId: string) {
    try {
      await this.search.indexProduct(productId);
    } catch {
      // Search service hatası ürün oluşturmayı engellemesin
    }
  }
}

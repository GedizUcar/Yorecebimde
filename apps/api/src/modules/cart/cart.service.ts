import { Inject, Injectable } from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import {
  products,
  productVariations,
  discounts as discountsTable,
} from '@yorecebimde/db/schema';
import {
  BusinessRuleError,
  NotFoundError,
  pricing,
  money,
  type Discount,
  type VariationOption,
} from '@yorecebimde/shared';
import { DB_TOKEN, type DbToken } from '../../infrastructure/database.module.js';
import { CartRepository, type CartItemHydrated, type CartRow } from './cart.repository.js';

const RESERVATION_TTL_SECONDS = 15 * 60; // 15 dakika
const reservationKey = (productId: string, owner: string) => `reserve:p:${productId}:o:${owner}`;

export type CartIdentity =
  | { kind: 'user'; userId: string }
  | { kind: 'device'; deviceId: string };

export type CartTotals = {
  subtotalCents: number;
  discountCents: number;
  kdvCents: number;
  totalCents: number;
  itemCount: number;
  lineSummaries: Array<{
    itemId: string;
    productId: string;
    variationId: string | null;
    quantity: number;
    unitPriceCents: number;
    lineTotalCents: number;
    discountCents: number;
  }>;
};

export type HydratedCart = {
  cart: CartRow;
  items: CartItemHydrated[];
  totals: CartTotals;
  warnings: string[];
};

@Injectable()
export class CartService {
  constructor(
    private readonly repo: CartRepository,
    @Inject(DB_TOKEN) private readonly db: DbToken,
  ) {}

  async getCart(identity: CartIdentity): Promise<HydratedCart> {
    const cart = await this.resolveCart(identity);
    const items = await this.repo.listItems(cart.id);
    const totals = await this.calculateTotals(items);
    const warnings: string[] = [];
    for (const item of items) {
      if (!item.product.isActive) warnings.push(`${item.product.nameTr}: ürün yayından kaldırıldı`);
      const stockLeft = Number(item.product.stockQuantity);
      if (Number(item.quantity) > stockLeft) {
        warnings.push(
          `${item.product.nameTr}: stok yetersiz (${stockLeft} ${item.product.unit} kaldı)`,
        );
      }
    }
    return { cart, items, totals, warnings };
  }

  async addItem(
    identity: CartIdentity,
    input: { productId: string; variationId?: string | undefined; quantity: number },
  ): Promise<HydratedCart> {
    if (input.quantity <= 0) throw new BusinessRuleError('Miktar pozitif olmalı');

    const product = await this.loadActiveProduct(input.productId);
    if (Number(product.stockQuantity) < input.quantity) {
      throw new BusinessRuleError('Yetersiz stok', { available: product.stockQuantity });
    }

    let variation: typeof productVariations.$inferSelect | null = null;
    if (input.variationId) {
      const vrows = await this.db
        .select()
        .from(productVariations)
        .where(
          and(
            eq(productVariations.id, input.variationId),
            eq(productVariations.productId, input.productId),
            eq(productVariations.isActive, true),
          ),
        )
        .limit(1);
      variation = vrows[0] ?? null;
      if (!variation) throw new NotFoundError('Variation', input.variationId);
    }

    const cart = await this.resolveCart(identity);
    const variationId = variation?.id ?? null;
    const existing = await this.repo.findItem(cart.id, product.id, variationId);

    const unitPrice = variation?.priceOverride ?? product.baseUnitPrice;

    if (existing) {
      const newQty = (Number(existing.quantity) + input.quantity).toString();
      await this.repo.updateItem(existing.id, { quantity: newQty });
    } else {
      await this.repo.insertItem({
        cartId: cart.id,
        productId: product.id,
        ...(variationId ? { variationId } : {}),
        quantity: String(input.quantity),
        unitPriceSnapshot: unitPrice,
      });
    }

    return this.getCart(identity);
  }

  async updateQuantity(
    identity: CartIdentity,
    itemId: string,
    quantity: number,
  ): Promise<HydratedCart> {
    if (quantity < 0) throw new BusinessRuleError('Miktar negatif olamaz');
    const cart = await this.resolveCart(identity);
    const items = await this.repo.listItems(cart.id);
    const item = items.find((i) => i.id === itemId);
    if (!item) throw new NotFoundError('CartItem', itemId);
    if (quantity === 0) {
      await this.repo.deleteItem(itemId);
    } else {
      if (Number(item.product.stockQuantity) < quantity) {
        throw new BusinessRuleError('Yetersiz stok');
      }
      await this.repo.updateItem(itemId, { quantity: String(quantity) });
    }
    return this.getCart(identity);
  }

  async removeItem(identity: CartIdentity, itemId: string): Promise<HydratedCart> {
    const cart = await this.resolveCart(identity);
    const items = await this.repo.listItems(cart.id);
    const item = items.find((i) => i.id === itemId);
    if (!item) throw new NotFoundError('CartItem', itemId);
    await this.repo.deleteItem(itemId);
    return this.getCart(identity);
  }

  async clear(identity: CartIdentity): Promise<HydratedCart> {
    const cart = await this.resolveCart(identity);
    await this.repo.clearCart(cart.id);
    return this.getCart(identity);
  }

  async merge(deviceId: string, userId: string): Promise<void> {
    await this.repo.mergeDeviceIntoUser(deviceId, userId);
  }

  /**
   * Detaylı hesaplama — pricing.ts pure function ile her item için indirim hesaplar.
   * Sepet snapshot fiyatı yerine üründen güncel fiyatı çeker.
   */
  async calculateTotals(items: CartItemHydrated[]): Promise<CartTotals> {
    if (items.length === 0) {
      return {
        subtotalCents: 0,
        discountCents: 0,
        kdvCents: 0,
        totalCents: 0,
        itemCount: 0,
        lineSummaries: [],
      };
    }
    const productIds = [...new Set(items.map((i) => i.productId))];
    const discRows = await this.db
      .select()
      .from(discountsTable)
      .where(
        and(
          eq(discountsTable.isActive, true),
          isNull(discountsTable.deletedAt),
        ),
      );
    const productDiscounts = new Map<string, Discount[]>();
    for (const d of discRows) {
      if (!productIds.includes(d.productId)) continue;
      const list = productDiscounts.get(d.productId) ?? [];
      if (d.type === 'permanent' && d.percentage) {
        list.push({ type: 'permanent', percentage: Number(d.percentage) });
      } else if (d.type === 'time_based' && d.percentage && d.startsAt && d.endsAt) {
        list.push({
          type: 'time_based',
          percentage: Number(d.percentage),
          startsAt: d.startsAt,
          endsAt: d.endsAt,
        });
      } else if (d.type === 'quantity_based' && d.tiers) {
        list.push({
          type: 'quantity_based',
          tiers: d.tiers as Array<{ minQuantity: number; percentage: number }>,
        });
      }
      productDiscounts.set(d.productId, list);
    }

    let subtotal = 0n;
    let totalDiscount = 0n;
    let totalKdv = 0n;
    let total = 0n;
    let itemCount = 0;
    const lineSummaries: CartTotals['lineSummaries'] = [];

    for (const item of items) {
      const qty = Number(item.quantity);
      itemCount += qty;
      const baseUnitPrice = money.fromMajor(item.product.baseUnitPrice);
      const variationOpts: VariationOption | undefined = item.variation
        ? {
            quantity: Number(item.variation.quantity),
            ...(item.unitPriceSnapshot
              ? { priceOverride: money.fromMajor(item.unitPriceSnapshot) }
              : {}),
          }
        : undefined;
      const result = pricing.calculatePrice({
        baseUnitPrice,
        quantity: qty,
        ...(variationOpts ? { variation: variationOpts } : {}),
        discounts: productDiscounts.get(item.productId) ?? [],
      });
      const lineSubtotal = result.subtotal;
      const lineTotal = result.total;
      const lineDiscount = lineSubtotal - lineTotal;

      subtotal += lineSubtotal;
      totalDiscount += lineDiscount;

      // KDV — kdvIncluded ise total içinden ayrıştır, değilse total + KDV
      const kdv = pricing.calculateKdv({
        total: lineTotal,
        kdvRate: Number(item.product.kdvRate),
        kdvIncluded: item.product.kdvIncluded,
      });
      totalKdv += kdv.kdvAmount;
      total += item.product.kdvIncluded ? lineTotal : kdv.grossAmount;

      lineSummaries.push({
        itemId: item.id,
        productId: item.productId,
        variationId: item.variationId ?? null,
        quantity: qty,
        unitPriceCents: Number(money.fromMajor(item.unitPriceSnapshot)),
        lineTotalCents: Number(item.product.kdvIncluded ? lineTotal : kdv.grossAmount),
        discountCents: Number(lineDiscount),
      });
    }

    return {
      subtotalCents: Number(subtotal),
      discountCents: Number(totalDiscount),
      kdvCents: Number(totalKdv),
      totalCents: Number(total),
      itemCount,
      lineSummaries,
    };
  }

  /** Identity'den cart row al — yoksa yarat. */
  async resolveCart(identity: CartIdentity): Promise<CartRow> {
    if (identity.kind === 'user') return this.repo.getOrCreateForUser(identity.userId);
    return this.repo.getOrCreateForDevice(identity.deviceId);
  }

  // Reservation helpers — Faz 3.2'de Redis ile genişletilecek
  reservationKeyFor(productId: string, owner: string): string {
    return reservationKey(productId, owner);
  }
  get reservationTtl(): number {
    return RESERVATION_TTL_SECONDS;
  }

  private async loadActiveProduct(productId: string) {
    const rows = await this.db
      .select()
      .from(products)
      .where(
        and(
          eq(products.id, productId),
          eq(products.isActive, true),
          isNull(products.deletedAt),
        ),
      )
      .limit(1);
    if (!rows[0]) throw new NotFoundError('Product', productId);
    return rows[0];
  }
}

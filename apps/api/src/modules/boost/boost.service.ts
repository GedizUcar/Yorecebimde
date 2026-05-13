import { Inject, Injectable } from '@nestjs/common';
import { and, asc, desc, eq, gt, isNull } from 'drizzle-orm';
import { z } from 'zod';
import {
  boostPackages,
  sellerBoosts,
  products,
} from '@yorecebimde/db/schema';
import {
  BusinessRuleError,
  ForbiddenError,
  NotFoundError,
} from '@yorecebimde/shared';
import { DB_TOKEN, type DbToken } from '../../infrastructure/database.module.js';
import { PaymentsService } from '../payments/payments.service.js';

export const purchaseSchema = z.object({
  productId: z.string().uuid(),
  packageId: z.string().uuid(),
});
export type PurchaseInput = z.infer<typeof purchaseSchema>;

@Injectable()
export class BoostService {
  constructor(
    @Inject(DB_TOKEN) private readonly db: DbToken,
    private readonly payments: PaymentsService,
  ) {}

  listPackages() {
    return this.db
      .select()
      .from(boostPackages)
      .where(eq(boostPackages.isActive, true))
      .orderBy(asc(boostPackages.sortOrder));
  }

  async listMyBoosts(sellerId: string) {
    return this.db
      .select()
      .from(sellerBoosts)
      .where(eq(sellerBoosts.sellerId, sellerId))
      .orderBy(desc(sellerBoosts.startsAt));
  }

  /**
   * Performans raporu — satıcının tüm boost'ları + impressions, clicks, CTR,
   * status (active/expired/cancelled). Aktif boost'lar üstte.
   */
  async reportForSeller(sellerId: string) {
    const rows = await this.db
      .select({
        id: sellerBoosts.id,
        productId: sellerBoosts.productId,
        productName: products.nameTr,
        packageName: boostPackages.name,
        startsAt: sellerBoosts.startsAt,
        endsAt: sellerBoosts.endsAt,
        cancelledAt: sellerBoosts.cancelledAt,
        impressions: sellerBoosts.impressions,
        clicks: sellerBoosts.clicks,
        pricePaidCents: sellerBoosts.pricePaidCents,
      })
      .from(sellerBoosts)
      .leftJoin(products, eq(products.id, sellerBoosts.productId))
      .leftJoin(boostPackages, eq(boostPackages.id, sellerBoosts.packageId))
      .where(eq(sellerBoosts.sellerId, sellerId))
      .orderBy(desc(sellerBoosts.startsAt));

    const now = new Date();
    const enriched = rows.map((r) => {
      const ctr = r.impressions > 0 ? (r.clicks / r.impressions) * 100 : 0;
      const status: 'active' | 'expired' | 'cancelled' = r.cancelledAt
        ? 'cancelled'
        : r.endsAt < now
          ? 'expired'
          : 'active';
      return { ...r, ctr: Number(ctr.toFixed(2)), status };
    });

    const summary = {
      totalImpressions: enriched.reduce((s, r) => s + r.impressions, 0),
      totalClicks: enriched.reduce((s, r) => s + r.clicks, 0),
      totalSpentCents: enriched.reduce((s, r) => s + r.pricePaidCents, 0),
      activeCount: enriched.filter((r) => r.status === 'active').length,
    };
    return { summary, items: enriched };
  }

  /**
   * Boost satın al — Iyzico stub 3DS başlatır, callback'te onay sonrası
   * seller_boosts kaydı `paid_at` ile aktif olur. Faz 4.2'de OrdersService
   * gibi paymentRef pattern'ine taşıyacağız; şimdilik direkt insert.
   */
  async purchase(sellerId: string, buyerEmail: string, input: PurchaseInput) {
    const pkgRows = await this.db
      .select()
      .from(boostPackages)
      .where(and(eq(boostPackages.id, input.packageId), eq(boostPackages.isActive, true)))
      .limit(1);
    const pkg = pkgRows[0];
    if (!pkg) throw new NotFoundError('Package', input.packageId);

    const productRows = await this.db
      .select({ id: products.id, sellerId: products.sellerId })
      .from(products)
      .where(eq(products.id, input.productId))
      .limit(1);
    const product = productRows[0];
    if (!product) throw new NotFoundError('Product', input.productId);
    if (product.sellerId !== sellerId) throw new ForbiddenError('Bu ürün sizin değil');

    // Aynı ürün için aktif boost varsa engelle (Faz 6: kalan süreyi uzat)
    const now = new Date();
    const activeRows = await this.db
      .select({ id: sellerBoosts.id })
      .from(sellerBoosts)
      .where(
        and(
          eq(sellerBoosts.productId, input.productId),
          gt(sellerBoosts.endsAt, now),
          isNull(sellerBoosts.cancelledAt),
        ),
      )
      .limit(1);
    if (activeRows[0]) {
      throw new BusinessRuleError('Bu ürün için zaten aktif bir boost var');
    }

    const paymentRef = `boost-${sellerId.substring(0, 8)}-${Date.now()}`;
    const endsAt = new Date(Date.now() + pkg.durationDays * 24 * 60 * 60 * 1000);

    const inserted = await this.db
      .insert(sellerBoosts)
      .values({
        sellerId,
        productId: input.productId,
        packageId: input.packageId,
        startsAt: now,
        endsAt,
        paymentRef,
        pricePaidCents: pkg.priceCents,
        // paidAt null kalır — callback sonrası set edilir
      })
      .returning();
    const boost = inserted[0]!;

    const intent = await this.payments.initiate3DS({
      paymentRef,
      amountCents: pkg.priceCents,
      buyerEmail,
      callbackPath: '/v1/webhooks/iyzico/callback',
    });

    return {
      boostId: boost.id,
      paymentRef,
      redirectUrl: intent.redirectUrl,
    };
  }

  async cancel(sellerId: string, boostId: string) {
    const rows = await this.db
      .select()
      .from(sellerBoosts)
      .where(and(eq(sellerBoosts.id, boostId), eq(sellerBoosts.sellerId, sellerId)))
      .limit(1);
    const b = rows[0];
    if (!b) throw new NotFoundError('Boost', boostId);
    if (b.cancelledAt) throw new BusinessRuleError('Zaten iptal edilmiş');
    await this.db
      .update(sellerBoosts)
      .set({ cancelledAt: new Date(), updatedAt: new Date() })
      .where(eq(sellerBoosts.id, boostId));
    return { boostId, cancelled: true };
  }

  /** Iyzico callback'ten geliştirilebilir — paymentRef ile eşleşen boost'u paid yap. */
  async confirmPayment(paymentRef: string) {
    await this.db
      .update(sellerBoosts)
      .set({ paidAt: new Date(), updatedAt: new Date() })
      .where(and(eq(sellerBoosts.paymentRef, paymentRef), isNull(sellerBoosts.paidAt)));
  }
}

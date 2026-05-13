import { Inject, Injectable } from '@nestjs/common';
import { and, eq, gte, isNull, or, sql } from 'drizzle-orm';
import { couponUsages, coupons } from '@yorecebimde/db/schema';
import { BusinessRuleError, ValidationError } from '@yorecebimde/shared';
import { DB_TOKEN, type DbToken } from '../../infrastructure/database.module.js';

export type CouponValidationResult = {
  couponId: string;
  code: string;
  discountCents: number;
  description: string | null;
};

@Injectable()
export class CouponsService {
  constructor(@Inject(DB_TOKEN) private readonly db: DbToken) {}

  /**
   * Sepet tarafında validate — gerçek apply orders create sırasında olur
   * (idempotent + transactional).
   */
  async validate(
    code: string,
    userId: string,
    cartSubtotalCents: number,
    context?: { categoryIds?: string[]; sellerIds?: string[] },
  ): Promise<CouponValidationResult> {
    const trimmed = code.trim().toUpperCase();
    const [coupon] = await this.db
      .select()
      .from(coupons)
      .where(and(eq(coupons.code, trimmed), isNull(coupons.deletedAt)))
      .limit(1);
    if (!coupon) throw new ValidationError('Kupon bulunamadı');
    if (!coupon.isActive) throw new BusinessRuleError('Kupon aktif değil');

    const now = new Date();
    if (coupon.validFrom > now) throw new BusinessRuleError('Kupon henüz geçerli değil');
    if (coupon.validUntil < now) throw new BusinessRuleError('Kupon süresi dolmuş');

    if (coupon.boundUserId && coupon.boundUserId !== userId) {
      throw new BusinessRuleError('Bu kupon size ait değil');
    }

    if (cartSubtotalCents < coupon.minOrderCents) {
      const minLiras = (coupon.minOrderCents / 100).toFixed(2);
      throw new BusinessRuleError(`Minimum sepet tutarı ${minLiras} ₺`);
    }

    if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
      throw new BusinessRuleError('Kupon kullanım limiti dolmuş');
    }

    const [userUsage] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(couponUsages)
      .where(
        and(
          eq(couponUsages.couponId, coupon.id),
          eq(couponUsages.userId, userId),
          isNull(couponUsages.revokedAt),
        ),
      );
    if (userUsage && userUsage.count >= coupon.perUserLimit) {
      throw new BusinessRuleError('Bu kuponu daha önce kullandınız');
    }

    if (coupon.appliesTo && typeof coupon.appliesTo === 'object') {
      const applies = coupon.appliesTo as { categoryIds?: string[]; sellerIds?: string[] };
      if (applies.categoryIds?.length && context?.categoryIds?.length) {
        const match = applies.categoryIds.some((id) => context.categoryIds!.includes(id));
        if (!match) throw new BusinessRuleError('Kupon bu sepete uygulanamaz');
      }
      if (applies.sellerIds?.length && context?.sellerIds?.length) {
        const match = applies.sellerIds.some((id) => context.sellerIds!.includes(id));
        if (!match) throw new BusinessRuleError('Kupon bu satıcıya uygulanamaz');
      }
    }

    let discountCents = 0;
    if (coupon.discountType === 'percent') {
      const pct = Number(coupon.discountValue);
      discountCents = Math.floor((cartSubtotalCents * pct) / 100);
    } else {
      discountCents = Math.floor(Number(coupon.discountValue) * 100);
    }
    if (coupon.maxDiscountCents && discountCents > coupon.maxDiscountCents) {
      discountCents = coupon.maxDiscountCents;
    }
    if (discountCents > cartSubtotalCents) discountCents = cartSubtotalCents;

    return {
      couponId: coupon.id,
      code: coupon.code,
      discountCents,
      description: coupon.description,
    };
  }

  /** Order create sırasında — usage row insert + usage_count increment. */
  async applyToOrder(couponId: string, userId: string, orderId: string, discountCents: number) {
    await this.db.insert(couponUsages).values({
      couponId,
      userId,
      orderId,
      discountAppliedCents: discountCents,
    });
    await this.db
      .update(coupons)
      .set({ usageCount: sql`${coupons.usageCount} + 1`, updatedAt: new Date() })
      .where(eq(coupons.id, couponId));
  }

  /** Refund'da rollback — usage row revoke. */
  async revokeForOrder(orderId: string) {
    await this.db
      .update(couponUsages)
      .set({ revokedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(couponUsages.orderId, orderId), isNull(couponUsages.revokedAt)));
  }

  /** Kullanıcının kendi kuponları (bound + global aktif). */
  async listMyCoupons(userId: string) {
    const now = new Date();
    const rows = await this.db
      .select()
      .from(coupons)
      .where(
        and(
          eq(coupons.isActive, true),
          isNull(coupons.deletedAt),
          gte(coupons.validUntil, now),
          or(eq(coupons.boundUserId, userId), isNull(coupons.boundUserId)),
        ),
      )
      .limit(50);
    return rows;
  }
}

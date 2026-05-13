import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import { coupons, referralCodes, referrals } from '@yorecebimde/db/schema';
import { BusinessRuleError, ValidationError } from '@yorecebimde/shared';
import { DB_TOKEN, type DbToken } from '../../infrastructure/database.module.js';
import { LoyaltyService } from '../loyalty/loyalty.service.js';

const REFERRER_REWARD_POINTS = 100;
const REFEREE_COUPON_VALUE = '25.00';
const REFEREE_COUPON_VALID_DAYS = 30;

/**
 * Referral akışı:
 * 1. Her kullanıcı kayıt sonrası unique 8-char kod alır (`getOrCreateCode`)
 * 2. Yeni kayıt sırasında kod kullanılırsa `referrals` row açılır (pending)
 * 3. Referee ilk sipariş `completed` olunca → reward verilir:
 *    - Referrer'a 100 puan
 *    - Referee'ye 25 TL otomatik kupon (30g)
 *    - referrals.status = completed
 */
@Injectable()
export class ReferralService {
  constructor(
    @Inject(DB_TOKEN) private readonly db: DbToken,
    private readonly loyalty: LoyaltyService,
  ) {}

  async getOrCreateCode(userId: string) {
    const existing = await this.db
      .select()
      .from(referralCodes)
      .where(eq(referralCodes.userId, userId))
      .limit(1);
    if (existing[0]) return existing[0];
    const code = this.generateCode();
    const [row] = await this.db
      .insert(referralCodes)
      .values({ userId, code })
      .returning();
    return row!;
  }

  async listMyReferrals(userId: string) {
    return this.db
      .select()
      .from(referrals)
      .where(and(eq(referrals.referrerUserId, userId), isNull(referrals.deletedAt)))
      .orderBy(desc(referrals.createdAt))
      .limit(100);
  }

  /** Yeni kayıt sırasında çağrılır (refereeUserId yeni kullanıcı, code başkasının kodu). */
  async redeemCode(code: string, refereeUserId: string, refereeIp?: string) {
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length < 4) throw new ValidationError('Geçersiz davet kodu');

    const [codeRow] = await this.db
      .select()
      .from(referralCodes)
      .where(eq(referralCodes.code, trimmed))
      .limit(1);
    if (!codeRow) throw new ValidationError('Davet kodu bulunamadı');
    if (codeRow.userId === refereeUserId) {
      throw new BusinessRuleError('Kendi kodunuzu kullanamazsınız');
    }
    // Tek referral hakkı (referee başına)
    const [existing] = await this.db
      .select({ id: referrals.id })
      .from(referrals)
      .where(eq(referrals.refereeUserId, refereeUserId))
      .limit(1);
    if (existing) throw new BusinessRuleError('Zaten bir davetle kayıtsınız');

    const [inserted] = await this.db
      .insert(referrals)
      .values({
        referrerUserId: codeRow.userId,
        refereeUserId,
        code: trimmed,
        status: 'pending',
        ...(refereeIp ? { refereeIp } : {}),
      })
      .returning();
    return inserted!;
  }

  /** Sipariş `completed` olunca tetiklenir — referee'nin ilk siparişiyse reward verir. */
  async maybeCompleteOnFirstOrder(refereeUserId: string, orderId: string) {
    const [pending] = await this.db
      .select()
      .from(referrals)
      .where(
        and(
          eq(referrals.refereeUserId, refereeUserId),
          eq(referrals.status, 'pending'),
          isNull(referrals.deletedAt),
        ),
      )
      .limit(1);
    if (!pending) return null;

    // Referrer'a 100 puan ekle
    await this.loyalty.getOrCreateAccount(pending.referrerUserId);
    const { loyaltyTransactions, loyaltyAccounts } = await import('@yorecebimde/db/schema');
    await this.db.insert(loyaltyTransactions).values({
      userId: pending.referrerUserId,
      type: 'earn',
      points: REFERRER_REWARD_POINTS,
      note: `Davet ödülü — referee: ${refereeUserId}`,
      expiresAt: new Date(Date.now() + 365 * 86400_000),
    });
    await this.db
      .update(loyaltyAccounts)
      .set({
        balance: sql`${loyaltyAccounts.balance} + ${REFERRER_REWARD_POINTS}`,
        lifetimeEarned: sql`${loyaltyAccounts.lifetimeEarned} + ${REFERRER_REWARD_POINTS}`,
        updatedAt: new Date(),
      })
      .where(eq(loyaltyAccounts.userId, pending.referrerUserId));

    // Referee'ye otomatik kupon
    const couponCode = `REF-${this.generateCode(8)}`;
    await this.db.insert(coupons).values({
      code: couponCode,
      discountType: 'fixed',
      discountValue: REFEREE_COUPON_VALUE,
      minOrderCents: 5000,
      perUserLimit: 1,
      boundUserId: refereeUserId,
      validUntil: new Date(Date.now() + REFEREE_COUPON_VALID_DAYS * 86400_000),
      description: 'Davet hoşgeldin kuponu',
    });

    await this.db
      .update(referrals)
      .set({ status: 'completed', firstOrderId: orderId, rewardedAt: new Date() })
      .where(eq(referrals.id, pending.id));

    await this.db
      .update(referralCodes)
      .set({ totalRedemptions: sql`${referralCodes.totalRedemptions} + 1` })
      .where(eq(referralCodes.userId, pending.referrerUserId));

    return {
      referralId: pending.id,
      referrerUserId: pending.referrerUserId,
      refereeUserId,
      couponCode,
      points: REFERRER_REWARD_POINTS,
    };
  }

  private generateCode(len = 8): string {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // ambiguity-free
    let s = '';
    for (let i = 0; i < len; i++) {
      s += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
    return s;
  }
}

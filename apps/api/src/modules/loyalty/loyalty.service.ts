import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, isNull, lt, sql } from 'drizzle-orm';
import { loyaltyAccounts, loyaltyTransactions } from '@yorecebimde/db/schema';
import { BusinessRuleError } from '@yorecebimde/shared';
import { DB_TOKEN, type DbToken } from '../../infrastructure/database.module.js';

/**
 * Sadakat puanı sistemi.
 * - Earn: sipariş `completed` olunca otomatik (1 TL = 1 puan, override edilebilir)
 * - Redeem: checkout sırasında, 100 puan = 1 TL indirim default
 * - Expire: 365 gün (cron job — `expireOldPoints` daily çağırır)
 */
@Injectable()
export class LoyaltyService {
  /** 1 TL = X puan. System setting `loyalty.earn_rate` override eder. */
  private readonly EARN_RATE = 1;
  /** 100 puan = 1 TL indirim default. */
  private readonly REDEEM_PER_LIRA = 100;
  private readonly EXPIRY_DAYS = 365;

  constructor(@Inject(DB_TOKEN) private readonly db: DbToken) {}

  async getOrCreateAccount(userId: string) {
    const rows = await this.db
      .select()
      .from(loyaltyAccounts)
      .where(eq(loyaltyAccounts.userId, userId))
      .limit(1);
    if (rows[0]) return rows[0];
    const [inserted] = await this.db
      .insert(loyaltyAccounts)
      .values({ userId, balance: 0, lifetimeEarned: 0, lifetimeRedeemed: 0 })
      .returning();
    return inserted!;
  }

  async getBalance(userId: string) {
    const acc = await this.getOrCreateAccount(userId);
    return {
      balance: acc.balance,
      lifetimeEarned: acc.lifetimeEarned,
      lifetimeRedeemed: acc.lifetimeRedeemed,
      lirasFromPoints: Math.floor(acc.balance / this.REDEEM_PER_LIRA),
      redeemPerLira: this.REDEEM_PER_LIRA,
    };
  }

  async listTransactions(userId: string, limit = 50) {
    return this.db
      .select()
      .from(loyaltyTransactions)
      .where(and(eq(loyaltyTransactions.userId, userId), isNull(loyaltyTransactions.deletedAt)))
      .orderBy(desc(loyaltyTransactions.createdAt))
      .limit(Math.min(limit, 200));
  }

  /** Sipariş `completed` olunca tetiklenir. Idempotent — aynı orderId 2. kez gelirse no-op. */
  async earnFromOrder(userId: string, orderId: string, orderSubtotalLiras: number) {
    const existing = await this.db
      .select()
      .from(loyaltyTransactions)
      .where(
        and(
          eq(loyaltyTransactions.orderId, orderId),
          eq(loyaltyTransactions.type, 'earn'),
          isNull(loyaltyTransactions.deletedAt),
        ),
      )
      .limit(1);
    if (existing[0]) return existing[0];

    const points = Math.floor(orderSubtotalLiras * this.EARN_RATE);
    if (points <= 0) return null;

    await this.getOrCreateAccount(userId);
    const expiresAt = new Date(Date.now() + this.EXPIRY_DAYS * 86400_000);
    const [tx] = await this.db
      .insert(loyaltyTransactions)
      .values({
        userId,
        type: 'earn',
        points,
        orderId,
        note: `Sipariş için kazanılan puan`,
        expiresAt,
      })
      .returning();
    await this.db
      .update(loyaltyAccounts)
      .set({
        balance: sql`${loyaltyAccounts.balance} + ${points}`,
        lifetimeEarned: sql`${loyaltyAccounts.lifetimeEarned} + ${points}`,
        updatedAt: new Date(),
      })
      .where(eq(loyaltyAccounts.userId, userId));
    return tx;
  }

  /**
   * Refund tetiklendiğinde — siparişte kullanılan puan + kazanılan puan revoke.
   * - `redeem` tx varsa: aynı miktar pozitif `refund_revoke` tx + balance geri.
   * - `earn` tx varsa: aynı miktar negatif `refund_revoke` tx + balance düş.
   * Idempotent: aynı orderId için zaten refund_revoke yazılmışsa atlanır.
   */
  async refundForOrder(orderId: string): Promise<{ refunded: number; revoked: number }> {
    // Dedupe
    const [already] = await this.db
      .select({ id: loyaltyTransactions.id })
      .from(loyaltyTransactions)
      .where(
        and(
          eq(loyaltyTransactions.orderId, orderId),
          eq(loyaltyTransactions.type, 'refund_revoke'),
        ),
      )
      .limit(1);
    if (already) return { refunded: 0, revoked: 0 };

    let refundedPoints = 0;
    let revokedPoints = 0;

    // 1) Redeem'i geri al
    const redeems = await this.db
      .select()
      .from(loyaltyTransactions)
      .where(
        and(
          eq(loyaltyTransactions.orderId, orderId),
          eq(loyaltyTransactions.type, 'redeem'),
          isNull(loyaltyTransactions.deletedAt),
        ),
      );
    for (const r of redeems) {
      const refundPoints = Math.abs(r.points);
      await this.db.insert(loyaltyTransactions).values({
        userId: r.userId,
        type: 'refund_revoke',
        points: refundPoints,
        orderId,
        note: `Refund: redeem geri verildi`,
      });
      await this.db
        .update(loyaltyAccounts)
        .set({
          balance: sql`${loyaltyAccounts.balance} + ${refundPoints}`,
          lifetimeRedeemed: sql`GREATEST(0, ${loyaltyAccounts.lifetimeRedeemed} - ${refundPoints})`,
          updatedAt: new Date(),
        })
        .where(eq(loyaltyAccounts.userId, r.userId));
      refundedPoints += refundPoints;
    }

    // 2) Earn'i revoke et (eğer order completed olduysa earn yazıldı, refund sonrası alınamaz)
    const earns = await this.db
      .select()
      .from(loyaltyTransactions)
      .where(
        and(
          eq(loyaltyTransactions.orderId, orderId),
          eq(loyaltyTransactions.type, 'earn'),
          isNull(loyaltyTransactions.deletedAt),
        ),
      );
    for (const e of earns) {
      const earnPoints = e.points;
      await this.db.insert(loyaltyTransactions).values({
        userId: e.userId,
        type: 'refund_revoke',
        points: -earnPoints,
        orderId,
        note: `Refund: earn iptal`,
      });
      await this.db
        .update(loyaltyAccounts)
        .set({
          balance: sql`GREATEST(0, ${loyaltyAccounts.balance} - ${earnPoints})`,
          lifetimeEarned: sql`GREATEST(0, ${loyaltyAccounts.lifetimeEarned} - ${earnPoints})`,
          updatedAt: new Date(),
        })
        .where(eq(loyaltyAccounts.userId, e.userId));
      revokedPoints += earnPoints;
    }

    return { refunded: refundedPoints, revoked: revokedPoints };
  }

  /** Checkout sırasında kullanılır. Bakiye yetersizse hata. */
  async redeem(userId: string, points: number, orderId?: string | null) {
    if (points <= 0) throw new BusinessRuleError('Puan miktarı pozitif olmalı');
    const acc = await this.getOrCreateAccount(userId);
    if (acc.balance < points) throw new BusinessRuleError('Yetersiz puan bakiyesi');
    const [tx] = await this.db
      .insert(loyaltyTransactions)
      .values({
        userId,
        type: 'redeem',
        points: -points,
        ...(orderId ? { orderId } : {}),
        note: `Sipariş için kullanılan puan`,
      })
      .returning();
    await this.db
      .update(loyaltyAccounts)
      .set({
        balance: sql`${loyaltyAccounts.balance} - ${points}`,
        lifetimeRedeemed: sql`${loyaltyAccounts.lifetimeRedeemed} + ${points}`,
        updatedAt: new Date(),
      })
      .where(eq(loyaltyAccounts.userId, userId));
    return { transaction: tx, discountLiras: points / this.REDEEM_PER_LIRA };
  }

  pointsToLiras(points: number): number {
    return points / this.REDEEM_PER_LIRA;
  }

  /**
   * Cron entry — süresi geçmiş earn tx'leri expire eder. Idempotent:
   * her earn tx için (orderId varsa orderId, yoksa earnTxId üzerinden note
   * eşleşmesi ile) zaten yazılmış expire tx varsa atlanır.
   */
  async expireOldPoints(): Promise<{ expiredPoints: number; txCount: number }> {
    const now = new Date();
    const dueEarns = await this.db
      .select()
      .from(loyaltyTransactions)
      .where(
        and(
          eq(loyaltyTransactions.type, 'earn'),
          lt(loyaltyTransactions.expiresAt, now),
          isNull(loyaltyTransactions.deletedAt),
        ),
      )
      .limit(1000);

    let totalExpired = 0;
    let txCount = 0;
    for (const earn of dueEarns) {
      const noteMarker = `expire_for:${earn.id}`;
      const [existing] = await this.db
        .select({ id: loyaltyTransactions.id })
        .from(loyaltyTransactions)
        .where(
          and(
            eq(loyaltyTransactions.type, 'expire'),
            eq(loyaltyTransactions.note, noteMarker),
          ),
        )
        .limit(1);
      if (existing) continue;

      const expirePoints = earn.points;
      await this.db.insert(loyaltyTransactions).values({
        userId: earn.userId,
        type: 'expire',
        points: -expirePoints,
        ...(earn.orderId ? { orderId: earn.orderId } : {}),
        note: noteMarker,
      });
      await this.db
        .update(loyaltyAccounts)
        .set({
          balance: sql`GREATEST(0, ${loyaltyAccounts.balance} - ${expirePoints})`,
          updatedAt: new Date(),
        })
        .where(eq(loyaltyAccounts.userId, earn.userId));
      totalExpired += expirePoints;
      txCount++;
    }
    return { expiredPoints: totalExpired, txCount };
  }
}

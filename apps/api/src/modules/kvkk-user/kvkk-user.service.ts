import { Inject, Injectable } from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import {
  addresses,
  carts,
  cartItems,
  loyaltyAccounts,
  loyaltyTransactions,
  orders,
  productReviews,
  productQuestions,
  referralCodes,
  referrals,
  users,
  wishlists,
} from '@yorecebimde/db/schema';
import { BusinessRuleError } from '@yorecebimde/shared';
import { DB_TOKEN, type DbToken } from '../../infrastructure/database.module.js';

/**
 * KVKK self-service: data export + account delete (right to erasure).
 *
 * - Export: kullanıcının tüm verisini JSON olarak döner. Sync (admin
 *   `kvkk-talep` form'undan async export Faz 8'de).
 * - Delete: hesap deletedAt set, PII anonimize. Yasal saklama (sipariş +
 *   fatura) anonim olarak kalır (KVKK madde 28 — yasal saklama yükümlülüğü).
 */
@Injectable()
export class KvkkUserService {
  constructor(@Inject(DB_TOKEN) private readonly db: DbToken) {}

  async exportData(userId: string) {
    const [user] = await this.db
      .select()
      .from(users)
      .where(and(eq(users.id, userId), isNull(users.deletedAt)))
      .limit(1);
    if (!user) throw new BusinessRuleError('Kullanıcı bulunamadı');

    const [
      addressRows,
      orderRows,
      reviewRows,
      questionRows,
      loyaltyAcc,
      loyaltyTxs,
      referralCode,
      referralRows,
      wishlistRows,
    ] = await Promise.all([
      this.db.select().from(addresses).where(eq(addresses.userId, userId)),
      this.db.select().from(orders).where(eq(orders.userId, userId)),
      this.db.select().from(productReviews).where(eq(productReviews.userId, userId)),
      this.db.select().from(productQuestions).where(eq(productQuestions.userId, userId)),
      this.db
        .select()
        .from(loyaltyAccounts)
        .where(eq(loyaltyAccounts.userId, userId))
        .limit(1),
      this.db
        .select()
        .from(loyaltyTransactions)
        .where(eq(loyaltyTransactions.userId, userId)),
      this.db
        .select()
        .from(referralCodes)
        .where(eq(referralCodes.userId, userId))
        .limit(1),
      this.db
        .select()
        .from(referrals)
        .where(eq(referrals.referrerUserId, userId)),
      this.db.select().from(wishlists).where(eq(wishlists.userId, userId)),
    ]);

    return {
      exportedAt: new Date().toISOString(),
      profile: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        status: user.status,
        preferredLocale: user.preferredLocale,
        marketingEmailOptIn: user.marketingEmailOptIn,
        marketingSmsOptIn: user.marketingSmsOptIn,
        kvkkAcceptedAt: user.kvkkAcceptedAt,
        kvkkVersionAccepted: user.kvkkVersionAccepted,
        twoFaEnabled: user.twoFaEnabled,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
      },
      addresses: addressRows,
      orders: orderRows,
      reviews: reviewRows,
      questions: questionRows,
      loyalty: {
        account: loyaltyAcc[0] ?? null,
        transactions: loyaltyTxs,
      },
      referral: {
        myCode: referralCode[0] ?? null,
        invitedUsers: referralRows.map((r) => ({
          id: r.id,
          refereeUserId: r.refereeUserId,
          status: r.status,
          rewardedAt: r.rewardedAt,
          createdAt: r.createdAt,
        })),
      },
      wishlist: wishlistRows,
    };
  }

  /**
   * Hesap anonimleştirme + soft-delete. Sipariş/fatura kalır (yasal saklama),
   * isim ve adresler REDACT edilir.
   */
  async deleteAccount(userId: string) {
    const [user] = await this.db
      .select()
      .from(users)
      .where(and(eq(users.id, userId), isNull(users.deletedAt)))
      .limit(1);
    if (!user) throw new BusinessRuleError('Kullanıcı bulunamadı');
    if (user.role !== 'customer') {
      throw new BusinessRuleError(
        'Satıcı/Admin hesapları self-service silinemez. Lütfen destek ekibiyle iletişime geçin.',
      );
    }

    const now = new Date();
    const redactedEmail = `deleted-${userId.substring(0, 8)}@yorecebimde.deleted`;

    // Profil anonimize
    await this.db
      .update(users)
      .set({
        firstName: 'REDACTED',
        lastName: 'REDACTED',
        email: redactedEmail,
        phone: null,
        marketingEmailOptIn: false,
        marketingSmsOptIn: false,
        status: 'deleted',
        deletedAt: now,
        updatedAt: now,
      })
      .where(eq(users.id, userId));

    // Adresleri sil (soft delete + redact)
    await this.db
      .update(addresses)
      .set({
        recipientName: 'REDACTED',
        phone: 'REDACTED',
        addressLine: 'REDACTED',
        deletedAt: now,
        updatedAt: now,
      })
      .where(eq(addresses.userId, userId));

    // Wishlist temizle
    await this.db.delete(wishlists).where(eq(wishlists.userId, userId));

    // Açık sepetleri kapat (cart_items cascade)
    const userCarts = await this.db.select().from(carts).where(eq(carts.userId, userId));
    for (const c of userCarts) {
      await this.db.delete(cartItems).where(eq(cartItems.cartId, c.id));
    }
    await this.db.delete(carts).where(eq(carts.userId, userId));

    return { ok: true, anonymizedAt: now };
  }
}

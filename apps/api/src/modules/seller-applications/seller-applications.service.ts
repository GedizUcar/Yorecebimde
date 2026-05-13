import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { randomBytes } from 'node:crypto';
import {
  sellerApplications,
  sellers,
  users,
  authUser,
} from '@yorecebimde/db/schema';
import {
  BusinessRuleError,
  ConflictError,
  NotFoundError,
  encryptToString,
  toSlug,
  logger,
} from '@yorecebimde/shared';
import { env } from '@yorecebimde/config/api';
import { DB_TOKEN, type DbToken } from '../../infrastructure/database.module.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { PaymentsService } from '../payments/payments.service.js';

export const createApplicationSchema = z.object({
  email: z.string().email(),
  phone: z.string().min(10).max(20),
  contactName: z.string().min(2).max(200),
  displayName: z.string().min(2).max(200),
  type: z.enum(['individual', 'company']),
  legalName: z.string().max(300).optional(),
  taxId: z.string().min(10).max(11).optional(),
  iban: z.string().min(20).max(34),
  tcKimlik: z.string().length(11).optional(),
  tradeRegistryNo: z.string().max(50).optional(),
  foodBusinessRegNo: z.string().max(50).optional(),
});
export type CreateApplicationInput = z.infer<typeof createApplicationSchema>;

export const reviewSchema = z.object({
  notes: z.string().max(1000).optional(),
});
export type ReviewInput = z.infer<typeof reviewSchema>;

@Injectable()
export class SellerApplicationsService {
  constructor(
    @Inject(DB_TOKEN) private readonly db: DbToken,
    private readonly notifications: NotificationsService,
    private readonly payments: PaymentsService,
  ) {}

  async apply(input: CreateApplicationInput) {
    const existing = await this.db
      .select({ id: sellerApplications.id, status: sellerApplications.status })
      .from(sellerApplications)
      .where(eq(sellerApplications.email, input.email))
      .limit(1);
    if (existing[0] && ['pending', 'approved'].includes(existing[0].status)) {
      throw new ConflictError('Bu email için zaten başvuru mevcut', {
        applicationId: existing[0].id,
        status: existing[0].status,
      });
    }
    if (input.type === 'individual' && !input.tcKimlik) {
      throw new BusinessRuleError('Şahıs başvurusunda TC kimlik zorunlu');
    }
    if (input.type === 'company' && !input.taxId) {
      throw new BusinessRuleError('Şirket başvurusunda vergi no zorunlu');
    }

    const data = {
      email: input.email,
      phone: input.phone,
      contactName: input.contactName,
      displayName: input.displayName,
      type: input.type,
      ...(input.legalName ? { legalName: input.legalName } : {}),
      ...(input.taxId ? { taxIdEncrypted: encryptToString(input.taxId, env.ENCRYPTION_KEY) } : {}),
      ibanEncrypted: encryptToString(input.iban, env.ENCRYPTION_KEY),
      ...(input.tcKimlik
        ? { tcKimlikEncrypted: encryptToString(input.tcKimlik, env.ENCRYPTION_KEY) }
        : {}),
      ...(input.tradeRegistryNo ? { tradeRegistryNo: input.tradeRegistryNo } : {}),
      ...(input.foodBusinessRegNo ? { foodBusinessRegNo: input.foodBusinessRegNo } : {}),
      status: 'pending' as const,
    };

    const rows = await this.db.insert(sellerApplications).values(data).returning();
    const app = rows[0]!;

    // Super admin'e bildirim (stub email log)
    await this.notifications
      .send({
        trigger: 'order.paid' as never, // template engine henüz application trigger eklenmedi → generic email
        channels: ['email'],
        recipient: { email: env.RESEND_FROM ?? 'admin@yorecebimde.com' },
        data: {
          orderNo: `APP-${app.id.substring(0, 8)}`,
          total: '—',
          recipientName: 'Süper Admin',
        },
      })
      .catch(() => undefined);

    return { id: app.id, status: app.status };
  }

  async findById(id: string) {
    const rows = await this.db
      .select()
      .from(sellerApplications)
      .where(eq(sellerApplications.id, id))
      .limit(1);
    if (!rows[0]) throw new NotFoundError('Application', id);
    return rows[0];
  }

  async listForAdmin(status?: string, page = 1, limit = 50) {
    const conds = status ? [eq(sellerApplications.status, status)] : [];
    return this.db
      .select()
      .from(sellerApplications)
      .where(conds.length ? and(...conds) : undefined)
      .orderBy(desc(sellerApplications.createdAt))
      .limit(limit)
      .offset((Math.max(1, page) - 1) * limit);
  }

  async approve(applicationId: string, reviewerId: string, notes?: string) {
    const app = await this.findById(applicationId);
    if (app.status !== 'pending') {
      throw new BusinessRuleError('Sadece bekleyen başvurular onaylanabilir');
    }

    return this.db.transaction(async (tx) => {
      // Seller create
      const slugBase = toSlug(app.displayName);
      let slug = slugBase;
      let counter = 1;
      while (true) {
        const exists = await tx
          .select({ id: sellers.id })
          .from(sellers)
          .where(eq(sellers.slug, slug))
          .limit(1);
        if (!exists[0]) break;
        slug = `${slugBase}-${counter++}`;
      }

      const sellerRows = await tx
        .insert(sellers)
        .values({
          slug,
          displayName: app.displayName,
          type: app.type,
          ...(app.legalName ? { legalName: app.legalName } : {}),
          ...(app.taxIdEncrypted ? { taxIdEncrypted: app.taxIdEncrypted } : {}),
          ibanEncrypted: app.ibanEncrypted,
          ...(app.tcKimlikEncrypted ? { tcKimlikEncrypted: app.tcKimlikEncrypted } : {}),
          ...(app.tradeRegistryNo ? { tradeRegistryNo: app.tradeRegistryNo } : {}),
          ...(app.foodBusinessRegNo ? { foodBusinessRegNo: app.foodBusinessRegNo } : {}),
          status: 'approved' as const,
          approvedAt: new Date(),
          contactEmail: app.email,
          contactPhone: app.phone,
          addressCountry: 'TR',
          addressFull: '',
        })
        .returning();
      const seller = sellerRows[0]!;

      // Invite token üret
      const inviteToken = randomBytes(32).toString('hex');
      const inviteTokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      await tx
        .update(sellerApplications)
        .set({
          status: 'approved',
          reviewedBy: reviewerId,
          reviewedAt: new Date(),
          ...(notes ? { reviewNotes: notes } : {}),
          inviteToken,
          inviteTokenExpiresAt,
          sellerId: seller.id,
          updatedAt: new Date(),
        })
        .where(eq(sellerApplications.id, applicationId));

      // Iyzico stub: sub-merchant create — non-blocking
      this.payments
        .createSubMerchant({
          sellerId: seller.id,
          type: app.type,
          iban: '(decrypted-in-real-impl)',
          taxIdOrTcKimlik: 'masked',
          ...(app.legalName ? { legalName: app.legalName } : {}),
        })
        .catch((err) => logger.warn({ err: String(err) }, 'submerchant stub failed'));

      // Davet emaili (stub log)
      const inviteUrl = `${env.BETTER_AUTH_URL}/satici-davet/${inviteToken}`;
      logger.info({ inviteUrl, email: app.email }, '[STUB] seller invite email');

      return {
        applicationId,
        sellerId: seller.id,
        slug: seller.slug,
        inviteToken,
        inviteUrl,
        inviteExpiresAt: inviteTokenExpiresAt,
      };
    });
  }

  async reject(applicationId: string, reviewerId: string, notes?: string) {
    const app = await this.findById(applicationId);
    if (app.status !== 'pending') {
      throw new BusinessRuleError('Sadece bekleyen başvurular reddedilebilir');
    }
    await this.db
      .update(sellerApplications)
      .set({
        status: 'rejected',
        reviewedBy: reviewerId,
        reviewedAt: new Date(),
        ...(notes ? { reviewNotes: notes } : {}),
        updatedAt: new Date(),
      })
      .where(eq(sellerApplications.id, applicationId));
    return { applicationId, status: 'rejected' as const };
  }

  /**
   * Davet token'ı redeem — yeni satıcı kullanıcısı oluşturur (Better-Auth flow).
   * Auth user + domain user + seller bağlantısı kurulur.
   */
  async redeemInvite(input: { token: string; password: string }) {
    const rows = await this.db
      .select()
      .from(sellerApplications)
      .where(eq(sellerApplications.inviteToken, input.token))
      .limit(1);
    const app = rows[0];
    if (!app) throw new NotFoundError('Invite', input.token);
    if (!app.inviteTokenExpiresAt || app.inviteTokenExpiresAt < new Date()) {
      throw new BusinessRuleError('Davet bağlantısı süresi dolmuş');
    }
    if (!app.sellerId) throw new BusinessRuleError('Davet için seller bağlantısı yok');

    // Check: email zaten kayıtlı mı?
    const existingAuth = await this.db
      .select({ id: authUser.id })
      .from(authUser)
      .where(eq(authUser.email, app.email))
      .limit(1);
    if (existingAuth[0]) {
      throw new ConflictError(
        'Bu email zaten kayıtlı. Önce mevcut hesabınızla giriş yapın, davet linkini panelinizden tamamlayın.',
      );
    }

    return {
      ready: true,
      sellerId: app.sellerId,
      email: app.email,
      name: app.contactName,
      // Frontend bu bilgilerle Better-Auth signUp.email çağıracak
      // Setelah signUp, domain users tablosuna hook tarafından row eklenir,
      // sonra seller_applications.invite_token kullanılarak users.id ↔ seller.id bağlanır
    };
  }

  /** Davet redeem sonrası, signup'tan dönen userId ile seller.userId set et. */
  async completeRedeem(input: { token: string; userDomainId: string }) {
    const rows = await this.db
      .select()
      .from(sellerApplications)
      .where(eq(sellerApplications.inviteToken, input.token))
      .limit(1);
    const app = rows[0];
    if (!app || !app.sellerId) throw new NotFoundError('Invite', input.token);

    await this.db.transaction(async (tx) => {
      await tx
        .update(users)
        .set({ role: 'seller', updatedAt: new Date() })
        .where(eq(users.id, input.userDomainId));
      await tx
        .update(sellers)
        .set({ userId: input.userDomainId, updatedAt: new Date() })
        .where(eq(sellers.id, app.sellerId!));
      await tx
        .update(sellerApplications)
        .set({ inviteToken: null, inviteTokenExpiresAt: null, updatedAt: new Date() })
        .where(eq(sellerApplications.id, app.id));
    });

    void isNull;
    return { sellerId: app.sellerId };
  }
}

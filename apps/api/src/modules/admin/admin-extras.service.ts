import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, isNull } from 'drizzle-orm';
import {
  systemSettings,
  notificationTemplates,
  kvkkRequests,
  sellers,
  users,
  authUser,
} from '@yorecebimde/db/schema';
import {
  BusinessRuleError,
  ForbiddenError,
  NotFoundError,
  decryptFromString,
} from '@yorecebimde/shared';
import { env } from '@yorecebimde/config/api';
import { DB_TOKEN, type DbToken } from '../../infrastructure/database.module.js';
import { AdminService } from './admin.service.js';

/**
 * Faz 5.2 admin polish — PII reveal, system settings, notification templates,
 * KVKK requests, admin team, manuel komisyon override.
 *
 * Tüm yazma operasyonları AdminService.auditLog ile audit'lenir.
 */
@Injectable()
export class AdminExtrasService {
  constructor(
    @Inject(DB_TOKEN) private readonly db: DbToken,
    private readonly admin: AdminService,
  ) {}

  // ─── PII Reveal (audit'li unmask) ───────────────────────────

  async revealSellerPii(
    actorId: string,
    sellerId: string,
    field: 'iban' | 'tcKimlik' | 'taxId',
    reason: string,
  ): Promise<{ field: string; value: string }> {
    if (reason.length < 10) {
      throw new BusinessRuleError('Reveal sebebi en az 10 karakter olmalı');
    }
    const rows = await this.db
      .select({
        ibanEncrypted: sellers.ibanEncrypted,
        tcKimlikEncrypted: sellers.tcKimlikEncrypted,
        taxIdEncrypted: sellers.taxIdEncrypted,
      })
      .from(sellers)
      .where(eq(sellers.id, sellerId))
      .limit(1);
    const seller = rows[0];
    if (!seller) throw new NotFoundError('Seller', sellerId);

    const encrypted =
      field === 'iban'
        ? seller.ibanEncrypted
        : field === 'tcKimlik'
          ? seller.tcKimlikEncrypted
          : seller.taxIdEncrypted;
    if (!encrypted) {
      throw new BusinessRuleError(`${field} verisi yok`);
    }

    let value: string;
    try {
      value = decryptFromString(encrypted, env.ENCRYPTION_KEY);
    } catch {
      // Seed verisindeki `fake:` prefix'li placeholder'lar için fallback
      if (encrypted.startsWith('fake:')) {
        value = Buffer.from(encrypted.slice(5), 'base64').toString();
      } else {
        throw new BusinessRuleError('Decrypt başarısız');
      }
    }

    await this.admin.auditLog(actorId, `seller.pii_reveal.${field}`, 'seller', sellerId, {
      reason,
    });

    return { field, value };
  }

  // ─── Manuel komisyon override ───────────────────────────────

  async setCommissionOverride(
    actorId: string,
    sellerId: string,
    rate: number | null,
    reason: string,
  ) {
    if (rate !== null && (rate < 0 || rate > 50)) {
      throw new BusinessRuleError('Komisyon oranı 0-50 aralığında olmalı');
    }
    const rows = await this.db
      .select({ commissionRateOverride: sellers.commissionRateOverride })
      .from(sellers)
      .where(eq(sellers.id, sellerId))
      .limit(1);
    if (!rows[0]) throw new NotFoundError('Seller', sellerId);
    const previous = rows[0].commissionRateOverride;

    await this.db
      .update(sellers)
      .set({
        commissionRateOverride: rate === null ? null : String(rate),
        updatedAt: new Date(),
      })
      .where(eq(sellers.id, sellerId));

    await this.admin.auditLog(actorId, 'seller.commission_override', 'seller', sellerId, {
      previous: previous ?? null,
      new: rate,
      reason,
    });

    return { sellerId, commissionRateOverride: rate };
  }

  // ─── System Settings ────────────────────────────────────────

  async listSettings() {
    const rows = await this.db
      .select()
      .from(systemSettings)
      .orderBy(systemSettings.category, systemSettings.key);
    // Secret değerleri mask
    return rows.map((r) => ({
      ...r,
      value: r.isSecret === 'true' ? '***' : r.value,
    }));
  }

  async upsertSetting(
    actorId: string,
    key: string,
    value: unknown,
    category: string,
    description?: string,
    isSecret = false,
  ) {
    const existing = await this.db
      .select()
      .from(systemSettings)
      .where(eq(systemSettings.key, key))
      .limit(1);
    if (existing[0]) {
      await this.db
        .update(systemSettings)
        .set({
          value,
          category,
          ...(description !== undefined ? { description } : {}),
          isSecret: isSecret ? 'true' : 'false',
          updatedBy: actorId,
          updatedAt: new Date(),
        })
        .where(eq(systemSettings.key, key));
      await this.admin.auditLog(actorId, 'system_setting.update', 'system_setting', existing[0].id, {
        key,
      });
    } else {
      const inserted = await this.db
        .insert(systemSettings)
        .values({
          key,
          value,
          category,
          ...(description !== undefined ? { description } : {}),
          isSecret: isSecret ? 'true' : 'false',
          updatedBy: actorId,
        })
        .returning();
      await this.admin.auditLog(
        actorId,
        'system_setting.create',
        'system_setting',
        inserted[0]!.id,
        { key },
      );
    }
  }

  async deleteSetting(actorId: string, key: string) {
    const rows = await this.db
      .delete(systemSettings)
      .where(eq(systemSettings.key, key))
      .returning({ id: systemSettings.id });
    if (rows[0]) {
      await this.admin.auditLog(actorId, 'system_setting.delete', 'system_setting', rows[0].id, {
        key,
      });
    }
  }

  // ─── Notification Templates ──────────────────────────────────

  async listTemplates() {
    return this.db
      .select()
      .from(notificationTemplates)
      .orderBy(notificationTemplates.triggerKey, notificationTemplates.channel);
  }

  async upsertTemplate(
    actorId: string,
    input: {
      triggerKey: string;
      channel: string;
      locale?: string | undefined;
      subject?: string | undefined;
      body: string;
      isActive?: boolean | undefined;
    },
  ) {
    const locale = input.locale ?? 'tr';
    const existing = await this.db
      .select()
      .from(notificationTemplates)
      .where(
        and(
          eq(notificationTemplates.triggerKey, input.triggerKey),
          eq(notificationTemplates.channel, input.channel),
          eq(notificationTemplates.locale, locale),
        ),
      )
      .limit(1);

    if (existing[0]) {
      await this.db
        .update(notificationTemplates)
        .set({
          ...(input.subject !== undefined ? { subject: input.subject } : {}),
          body: input.body,
          isActive: input.isActive === false ? 'false' : 'true',
          updatedBy: actorId,
          updatedAt: new Date(),
        })
        .where(eq(notificationTemplates.id, existing[0].id));
      await this.admin.auditLog(
        actorId,
        'notification_template.update',
        'notification_template',
        existing[0].id,
        { triggerKey: input.triggerKey, channel: input.channel },
      );
      return existing[0];
    }

    const inserted = await this.db
      .insert(notificationTemplates)
      .values({
        triggerKey: input.triggerKey,
        channel: input.channel,
        locale,
        ...(input.subject !== undefined ? { subject: input.subject } : {}),
        body: input.body,
        isActive: input.isActive === false ? 'false' : 'true',
        updatedBy: actorId,
      })
      .returning();
    await this.admin.auditLog(
      actorId,
      'notification_template.create',
      'notification_template',
      inserted[0]!.id,
      { triggerKey: input.triggerKey, channel: input.channel },
    );
    return inserted[0]!;
  }

  // ─── KVKK Requests ───────────────────────────────────────────

  async listKvkkRequests(status?: string) {
    const conds = status ? [eq(kvkkRequests.status, status as 'pending')] : [];
    return this.db
      .select()
      .from(kvkkRequests)
      .where(conds.length ? and(...conds) : undefined)
      .orderBy(desc(kvkkRequests.createdAt));
  }

  async createKvkkRequest(input: {
    email: string;
    phone?: string | undefined;
    contactName: string;
    type: 'access' | 'deletion' | 'rectification' | 'portability' | 'objection';
    requestText: string;
    userId?: string | undefined;
  }) {
    const rows = await this.db
      .insert(kvkkRequests)
      .values({
        email: input.email,
        ...(input.phone ? { phone: input.phone } : {}),
        contactName: input.contactName,
        type: input.type,
        requestText: input.requestText,
        ...(input.userId ? { userId: input.userId } : {}),
        status: 'pending',
      })
      .returning();
    return rows[0]!;
  }

  async respondKvkkRequest(
    actorId: string,
    requestId: string,
    input: {
      status: 'in_progress' | 'completed' | 'rejected';
      response: string;
    },
  ) {
    const rows = await this.db
      .update(kvkkRequests)
      .set({
        status: input.status,
        response: input.response,
        handledBy: actorId,
        handledAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(kvkkRequests.id, requestId))
      .returning();
    if (!rows[0]) throw new NotFoundError('KvkkRequest', requestId);

    await this.admin.auditLog(actorId, `kvkk.${input.status}`, 'kvkk_request', requestId, {
      response: input.response.substring(0, 200),
    });
    return rows[0];
  }

  // ─── Admin Team CRUD ─────────────────────────────────────────

  async listAdmins() {
    const rows = await this.db
      .select({
        id: users.id,
        authUserId: users.authUserId,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
        status: users.status,
        lastLoginAt: users.lastLoginAt,
        createdAt: users.createdAt,
        authEmail: authUser.email,
      })
      .from(users)
      .leftJoin(authUser, eq(authUser.id, users.authUserId))
      .where(
        and(
          isNull(users.deletedAt),
          // role in ('admin', 'super_admin') — Drizzle inArray ile pgEnum
        ),
      );
    return rows
      .filter((r) => r.role === 'admin' || r.role === 'super_admin')
      .map((r) => ({
        ...r,
        email: r.email || r.authEmail || '',
      }));
  }

  async setAdminRole(
    actorId: string,
    targetUserId: string,
    role: 'admin' | 'super_admin' | 'customer',
    reason: string,
  ) {
    const actor = await this.db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.id, actorId))
      .limit(1);
    if (actor[0]?.role !== 'super_admin') {
      throw new ForbiddenError('Sadece super_admin role değiştirebilir');
    }
    const target = await this.db
      .select({ id: users.id, role: users.role })
      .from(users)
      .where(eq(users.id, targetUserId))
      .limit(1);
    if (!target[0]) throw new NotFoundError('User', targetUserId);
    if (target[0].id === actorId && role !== 'super_admin') {
      throw new BusinessRuleError('Kendi super_admin rolünüzü düşüremezsiniz');
    }

    await this.db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, targetUserId));

    await this.admin.auditLog(actorId, 'admin.role_change', 'user', targetUserId, {
      previous: target[0].role,
      new: role,
      reason,
    });
  }

  async suspendAdmin(actorId: string, targetUserId: string, reason: string) {
    const actor = await this.db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.id, actorId))
      .limit(1);
    if (actor[0]?.role !== 'super_admin') {
      throw new ForbiddenError('Sadece super_admin suspend yapabilir');
    }
    if (targetUserId === actorId) {
      throw new BusinessRuleError('Kendinizi suspend edemezsiniz');
    }

    await this.db
      .update(users)
      .set({ status: 'suspended', updatedAt: new Date() })
      .where(eq(users.id, targetUserId));
    await this.admin.auditLog(actorId, 'admin.suspend', 'user', targetUserId, { reason });
  }
}

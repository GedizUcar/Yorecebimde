import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, gte, isNull, lte, sql } from 'drizzle-orm';
import {
  orders,
  sellers,
  sellerApplications,
  disputes,
  products,
  auditLogs,
  users,
  authUser,
} from '@yorecebimde/db/schema';
import { BusinessRuleError, NotFoundError, logger } from '@yorecebimde/shared';
import { DB_TOKEN, type DbToken } from '../../infrastructure/database.module.js';
import { PaymentsService } from '../payments/payments.service.js';

@Injectable()
export class AdminService {
  constructor(
    @Inject(DB_TOKEN) private readonly db: DbToken,
    private readonly payments: PaymentsService,
  ) {}

  async dashboard() {
    const now = new Date();
    const today = new Date(now.setHours(0, 0, 0, 0));
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const allOrders = await this.db
      .select({
        totalCents: orders.totalCents,
        status: orders.status,
        createdAt: orders.createdAt,
      })
      .from(orders);

    let gmvToday = 0,
      gmvWeek = 0,
      gmvMonth = 0,
      gmvTotal = 0;
    let countToday = 0,
      countWeek = 0,
      countMonth = 0;
    for (const o of allOrders) {
      if (['cancelled', 'refunded'].includes(o.status)) continue;
      gmvTotal += o.totalCents;
      if (o.createdAt >= today) {
        gmvToday += o.totalCents;
        countToday++;
      }
      if (o.createdAt >= weekAgo) {
        gmvWeek += o.totalCents;
        countWeek++;
      }
      if (o.createdAt >= monthAgo) {
        gmvMonth += o.totalCents;
        countMonth++;
      }
    }

    const [sellersAgg] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(sellers)
      .where(and(eq(sellers.status, 'approved'), isNull(sellers.deletedAt)));

    const [pendingApps] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(sellerApplications)
      .where(eq(sellerApplications.status, 'pending'));

    const [openDisputes] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(disputes)
      .where(eq(disputes.status, 'opened'));

    const [escalatedDisputes] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(disputes)
      .where(eq(disputes.status, 'escalated'));

    return {
      gmv: {
        today: gmvToday,
        week: gmvWeek,
        month: gmvMonth,
        total: gmvTotal,
      },
      counts: {
        ordersToday: countToday,
        ordersWeek: countWeek,
        ordersMonth: countMonth,
        activeSellers: sellersAgg?.count ?? 0,
        pendingApplications: pendingApps?.count ?? 0,
        openDisputes: openDisputes?.count ?? 0,
        escalatedDisputes: escalatedDisputes?.count ?? 0,
      },
    };
  }

  // ─── Sellers Management ─────────────────────────────────────

  async listSellers(filter: { status?: string; q?: string } = {}) {
    const conds: ReturnType<typeof eq>[] = [isNull(sellers.deletedAt)];
    if (filter.status) {
      conds.push(eq(sellers.status, filter.status as 'approved'));
    }
    return this.db
      .select({
        id: sellers.id,
        slug: sellers.slug,
        displayName: sellers.displayName,
        type: sellers.type,
        status: sellers.status,
        contactEmail: sellers.contactEmail,
        ratingAvg: sellers.ratingAvg,
        ratingCount: sellers.ratingCount,
        totalSalesCount: sellers.totalSalesCount,
        createdAt: sellers.createdAt,
      })
      .from(sellers)
      .where(and(...conds))
      .orderBy(desc(sellers.createdAt))
      .limit(200);
  }

  async findSeller(id: string) {
    const rows = await this.db.select().from(sellers).where(eq(sellers.id, id)).limit(1);
    if (!rows[0]) throw new NotFoundError('Seller', id);
    return rows[0];
  }

  async sellerTransition(
    actorId: string,
    sellerId: string,
    target: 'suspended' | 'approved' | 'closed',
    reason?: string,
  ) {
    const seller = await this.findSeller(sellerId);
    const updates: Partial<typeof sellers.$inferInsert> = {
      status: target,
      updatedAt: new Date(),
    };
    await this.db.update(sellers).set(updates).where(eq(sellers.id, sellerId));
    await this.auditLog(actorId, `seller.${target}`, 'seller', sellerId, {
      previousStatus: seller.status,
      reason,
    });
    return { sellerId, status: target };
  }

  // ─── Categories CRUD (admin) ─────────────────────────────────

  async createCategory(
    actorId: string,
    input: {
      slug: string;
      nameTr: string;
      nameEn?: string | undefined;
      parentId?: string | undefined;
      defaultKdvRate?: number | undefined;
      isActive?: boolean | undefined;
    },
  ) {
    const { categories } = await import('@yorecebimde/db/schema');
    // path + depth hesapla (parent varsa)
    let path = `/${input.slug}`;
    let depth = 0;
    if (input.parentId) {
      const parentRows = await this.db
        .select({ path: categories.path, depth: categories.depth })
        .from(categories)
        .where(eq(categories.id, input.parentId))
        .limit(1);
      const parent = parentRows[0];
      if (!parent) throw new NotFoundError('ParentCategory', input.parentId);
      path = `${parent.path}/${input.slug}`;
      depth = parent.depth + 1;
    }
    const rows = await this.db
      .insert(categories)
      .values({
        slug: input.slug,
        nameTr: input.nameTr,
        ...(input.nameEn ? { nameEn: input.nameEn } : {}),
        ...(input.parentId ? { parentId: input.parentId } : {}),
        ...(input.defaultKdvRate !== undefined
          ? { defaultKdvRate: String(input.defaultKdvRate) }
          : {}),
        isActive: input.isActive ?? true,
        path,
        depth,
      })
      .returning();
    await this.auditLog(actorId, 'category.create', 'category', rows[0]!.id, {
      slug: input.slug,
    });
    return rows[0]!;
  }

  async updateCategory(
    actorId: string,
    id: string,
    patch: {
      nameTr?: string | undefined;
      nameEn?: string | undefined;
      isActive?: boolean | undefined;
      defaultKdvRate?: number | undefined;
    },
  ) {
    const { categories } = await import('@yorecebimde/db/schema');
    const data: Partial<typeof categories.$inferInsert> = { updatedAt: new Date() };
    if (patch.nameTr !== undefined) data.nameTr = patch.nameTr;
    if (patch.nameEn !== undefined) data.nameEn = patch.nameEn;
    if (patch.isActive !== undefined) data.isActive = patch.isActive;
    if (patch.defaultKdvRate !== undefined) data.defaultKdvRate = String(patch.defaultKdvRate);
    await this.db.update(categories).set(data).where(eq(categories.id, id));
    await this.auditLog(actorId, 'category.update', 'category', id, patch);
  }

  async deleteCategory(actorId: string, id: string) {
    const { categories } = await import('@yorecebimde/db/schema');
    // Alt kategori varsa engelle
    const children = await this.db
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.parentId, id))
      .limit(1);
    if (children[0]) {
      throw new BusinessRuleError('Önce alt kategorileri silin');
    }
    await this.db
      .update(categories)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(categories.id, id));
    await this.auditLog(actorId, 'category.delete', 'category', id, {});
  }

  // ─── Boost Packages CRUD ────────────────────────────────────

  async createBoostPackage(
    actorId: string,
    input: {
      name: string;
      durationDays: number;
      priceCents: number;
      weight?: number | undefined;
      isActive?: boolean | undefined;
      sortOrder?: number | undefined;
    },
  ) {
    const { boostPackages } = await import('@yorecebimde/db/schema');
    const rows = await this.db
      .insert(boostPackages)
      .values({
        name: input.name,
        durationDays: input.durationDays,
        priceCents: input.priceCents,
        weight: input.weight ?? 1,
        isActive: input.isActive ?? true,
        sortOrder: input.sortOrder ?? 0,
      })
      .returning();
    await this.auditLog(actorId, 'boost_package.create', 'boost_package', rows[0]!.id, {
      name: input.name,
    });
    return rows[0]!;
  }

  async updateBoostPackage(
    actorId: string,
    id: string,
    patch: {
      name?: string | undefined;
      durationDays?: number | undefined;
      priceCents?: number | undefined;
      isActive?: boolean | undefined;
      sortOrder?: number | undefined;
    },
  ) {
    const { boostPackages } = await import('@yorecebimde/db/schema');
    await this.db
      .update(boostPackages)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(boostPackages.id, id));
    await this.auditLog(actorId, 'boost_package.update', 'boost_package', id, patch);
  }

  async deleteBoostPackage(actorId: string, id: string) {
    const { boostPackages } = await import('@yorecebimde/db/schema');
    await this.db
      .update(boostPackages)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(boostPackages.id, id));
    await this.auditLog(actorId, 'boost_package.delete', 'boost_package', id, {});
  }

  // ─── Disputes admin ─────────────────────────────────────────

  async listDisputes(status?: string) {
    const conds: ReturnType<typeof eq>[] = [];
    if (status) conds.push(eq(disputes.status, status as 'opened'));
    return this.db
      .select()
      .from(disputes)
      .where(conds.length ? and(...conds) : undefined)
      .orderBy(desc(disputes.createdAt))
      .limit(200);
  }

  async resolveDispute(
    actorId: string,
    disputeId: string,
    input: {
      winner: 'customer' | 'seller' | 'split';
      refundAmountCents?: number | undefined;
      decisionNotes: string;
    },
  ) {
    const rows = await this.db.select().from(disputes).where(eq(disputes.id, disputeId)).limit(1);
    const d = rows[0];
    if (!d) throw new NotFoundError('Dispute', disputeId);
    if (['resolved_customer', 'resolved_seller'].includes(d.status)) {
      throw new BusinessRuleError('Bu iade zaten karara bağlanmış');
    }
    const newStatus =
      input.winner === 'customer' || input.winner === 'split'
        ? 'resolved_customer'
        : 'resolved_seller';

    await this.db
      .update(disputes)
      .set({
        status: newStatus,
        resolvedAt: new Date(),
        resolvedBy: actorId,
        resolution: input.decisionNotes,
        updatedAt: new Date(),
      })
      .where(eq(disputes.id, disputeId));

    // Stub refund — Faz 4.3'te gerçek Iyzico
    if (input.refundAmountCents && input.refundAmountCents > 0) {
      logger.info(
        { disputeId, refundCents: input.refundAmountCents, winner: input.winner },
        '[STUB] dispute refund triggered',
      );
    }

    // Order durumunu güncelle
    if (input.winner === 'customer' || input.winner === 'split') {
      await this.db
        .update(orders)
        .set({ status: 'refunded', updatedAt: new Date() })
        .where(eq(orders.id, d.orderId));
    }

    await this.auditLog(actorId, 'dispute.resolve', 'dispute', disputeId, {
      winner: input.winner,
      refundAmountCents: input.refundAmountCents,
    });
    void this.payments;
    return { disputeId, status: newStatus };
  }

  // ─── Audit log query ────────────────────────────────────────

  async listAuditLogs(filter: {
    actorId?: string;
    action?: string;
    targetType?: string;
    targetId?: string;
    from?: Date;
    to?: Date;
    limit?: number;
  }) {
    const conds: ReturnType<typeof eq>[] = [];
    if (filter.actorId) conds.push(eq(auditLogs.actorUserId, filter.actorId));
    if (filter.action) conds.push(eq(auditLogs.action, filter.action));
    if (filter.targetType) conds.push(eq(auditLogs.targetType, filter.targetType));
    if (filter.targetId) conds.push(eq(auditLogs.targetId, filter.targetId));
    if (filter.from) conds.push(gte(auditLogs.createdAt, filter.from));
    if (filter.to) conds.push(lte(auditLogs.createdAt, filter.to));

    const limit = Math.min(1000, filter.limit ?? 100);
    return this.db
      .select({
        id: auditLogs.id,
        actorUserId: auditLogs.actorUserId,
        actorRole: auditLogs.actorRole,
        action: auditLogs.action,
        targetType: auditLogs.targetType,
        targetId: auditLogs.targetId,
        metadata: auditLogs.metadata,
        createdAt: auditLogs.createdAt,
      })
      .from(auditLogs)
      .where(conds.length ? and(...conds) : undefined)
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit);
  }

  /**
   * Internal helper — audit log insert. Diğer admin service'ler bu fonksiyonu çağırır.
   */
  async auditLog(
    actorId: string,
    action: string,
    targetType: string,
    targetId: string,
    metadata: Record<string, unknown> = {},
  ) {
    try {
      await this.db.insert(auditLogs).values({
        actorUserId: actorId,
        action,
        targetType,
        targetId,
        metadata,
      });
    } catch (err) {
      logger.warn({ err: String(err), action }, 'audit log insert failed');
    }
    // unused suppressors
    void users;
    void authUser;
    void products;
  }
}

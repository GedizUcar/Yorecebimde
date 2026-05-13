import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, lte } from 'drizzle-orm';
import { z } from 'zod';
import { disputes, orders } from '@yorecebimde/db/schema';
import {
  BusinessRuleError,
  ForbiddenError,
  NotFoundError,
  logger,
} from '@yorecebimde/shared';
import { DB_TOKEN, type DbToken } from '../../infrastructure/database.module.js';
import { NotificationsService } from '../notifications/notifications.service.js';

export const openDisputeSchema = z.object({
  orderId: z.string().uuid(),
  reason: z.enum(['not_received', 'damaged', 'wrong_item', 'not_as_described', 'other']),
  message: z.string().min(10).max(2000),
  evidence: z.array(z.string().url()).max(5).default([]),
});
export type OpenDisputeInput = z.infer<typeof openDisputeSchema>;

export const respondDisputeSchema = z.object({
  decision: z.enum(['accept', 'reject']),
  message: z.string().min(10).max(2000),
  evidence: z.array(z.string().url()).max(5).default([]),
});
export type RespondDisputeInput = z.infer<typeof respondDisputeSchema>;

const AUTO_ESCALATE_DAYS = 7;

@Injectable()
export class DisputesService {
  constructor(
    @Inject(DB_TOKEN) private readonly db: DbToken,
    private readonly notifications: NotificationsService,
  ) {}

  async openByUser(userId: string, input: OpenDisputeInput) {
    const orderRows = await this.db
      .select()
      .from(orders)
      .where(and(eq(orders.id, input.orderId), eq(orders.userId, userId)))
      .limit(1);
    const order = orderRows[0];
    if (!order) throw new NotFoundError('Order', input.orderId);
    if (!['delivered', 'shipped'].includes(order.status)) {
      throw new BusinessRuleError('Sadece kargolanmış/teslim edilmiş siparişler için iade açılabilir');
    }

    // Already an open dispute?
    const existing = await this.db
      .select({ id: disputes.id })
      .from(disputes)
      .where(and(eq(disputes.orderId, input.orderId), eq(disputes.userId, userId)))
      .limit(1);
    if (existing[0]) {
      throw new BusinessRuleError('Bu sipariş için zaten iade açık');
    }

    const rows = await this.db
      .insert(disputes)
      .values({
        orderId: input.orderId,
        userId,
        sellerId: order.sellerId,
        reason: input.reason,
        customerMessage: input.message,
        customerEvidence: input.evidence,
        status: 'opened',
      })
      .returning();
    const dispute = rows[0]!;

    // Notify seller (stub)
    this.notifications
      .send({
        trigger: 'order.cancelled.seller', // template uygunsa, yoksa fallback log
        channels: ['email'],
        recipient: { email: 'seller-stub@example.com', sellerId: order.sellerId },
        data: {
          orderNo: order.orderNo,
          reason: `İade talebi açıldı: ${input.reason}`,
        },
      })
      .catch((err) => logger.warn({ err: String(err) }, 'dispute notify failed'));

    await this.db
      .update(orders)
      .set({ status: 'return_requested', updatedAt: new Date() })
      .where(eq(orders.id, input.orderId));

    return dispute;
  }

  async respondBySeller(sellerId: string, disputeId: string, input: RespondDisputeInput) {
    const rows = await this.db
      .select()
      .from(disputes)
      .where(and(eq(disputes.id, disputeId), eq(disputes.sellerId, sellerId)))
      .limit(1);
    const dispute = rows[0];
    if (!dispute) throw new NotFoundError('Dispute', disputeId);
    if (dispute.status !== 'opened') {
      throw new BusinessRuleError('Sadece açık iadeler cevaplanabilir');
    }

    if (input.decision === 'accept') {
      // Accept: order → returned, refund job (Faz 4'te gerçek Iyzico refund)
      await this.db.transaction(async (tx) => {
        await tx
          .update(disputes)
          .set({
            sellerResponse: input.message,
            sellerEvidence: input.evidence,
            status: 'resolved_customer',
            resolvedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(disputes.id, disputeId));
        await tx
          .update(orders)
          .set({ status: 'returned', updatedAt: new Date() })
          .where(eq(orders.id, dispute.orderId));
      });
      logger.info({ disputeId }, '[STUB] refund job queued — gerçek Iyzico Faz 4');
    } else {
      // Reject: 7 gün otomatik eskalasyon zamanlanır
      const autoEscalateAt = new Date(Date.now() + AUTO_ESCALATE_DAYS * 24 * 60 * 60 * 1000);
      await this.db
        .update(disputes)
        .set({
          sellerResponse: input.message,
          sellerEvidence: input.evidence,
          status: 'seller_responded',
          autoEscalateAt,
          updatedAt: new Date(),
        })
        .where(eq(disputes.id, disputeId));
    }

    return this.findById(disputeId);
  }

  async findById(id: string) {
    const rows = await this.db.select().from(disputes).where(eq(disputes.id, id)).limit(1);
    if (!rows[0]) throw new NotFoundError('Dispute', id);
    return rows[0];
  }

  async listByUser(userId: string) {
    return this.db
      .select()
      .from(disputes)
      .where(eq(disputes.userId, userId))
      .orderBy(desc(disputes.createdAt));
  }

  async listBySeller(sellerId: string, status?: string) {
    const conds = [eq(disputes.sellerId, sellerId)];
    if (status) {
      conds.push(eq(disputes.status, status as 'opened'));
    }
    return this.db
      .select()
      .from(disputes)
      .where(and(...conds))
      .orderBy(desc(disputes.createdAt));
  }

  /**
   * Cron job: seller_responded + autoEscalateAt < now → escalated
   */
  async runEscalationCheck(): Promise<{ escalated: number }> {
    const due = await this.db
      .select()
      .from(disputes)
      .where(
        and(eq(disputes.status, 'seller_responded'), lte(disputes.autoEscalateAt, new Date())),
      );
    for (const d of due) {
      await this.db
        .update(disputes)
        .set({ status: 'escalated', updatedAt: new Date() })
        .where(eq(disputes.id, d.id));
      logger.info({ disputeId: d.id }, '[dispute] escalated to super admin');
      // Notify super admin (stub)
    }
    return { escalated: due.length };
  }

  /** Ownership guard helper (controller'da kullanılmıyor — cancel için future hook). */
  assertOwnership(dispute: typeof disputes.$inferSelect, role: 'user' | 'seller', id: string) {
    if (role === 'user' && dispute.userId !== id) throw new ForbiddenError();
    if (role === 'seller' && dispute.sellerId !== id) throw new ForbiddenError();
  }
}

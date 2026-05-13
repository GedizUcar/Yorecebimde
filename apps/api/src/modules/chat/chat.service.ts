import { Inject, Injectable } from '@nestjs/common';
import { and, asc, desc, eq, gt, isNotNull, sql } from 'drizzle-orm';
import { z } from 'zod';
import {
  chatThreads,
  chatMessages,
  orders,
  sellers,
} from '@yorecebimde/db/schema';
import {
  BusinessRuleError,
  ForbiddenError,
  NotFoundError,
} from '@yorecebimde/shared';
import { DB_TOKEN, type DbToken } from '../../infrastructure/database.module.js';
import { RealtimeService } from '../realtime/realtime.service.js';

export const sendMessageSchema = z.object({
  body: z.string().min(1).max(4000),
  attachments: z.array(z.string().url()).max(5).default([]),
});
export type SendMessageInput = z.infer<typeof sendMessageSchema>;

export const startOrderThreadSchema = z.object({ orderId: z.string().uuid() });
export type StartOrderThreadInput = z.infer<typeof startOrderThreadSchema>;

export const startDirectThreadSchema = z.object({ sellerId: z.string().uuid() });
export type StartDirectThreadInput = z.infer<typeof startDirectThreadSchema>;

@Injectable()
export class ChatService {
  constructor(
    @Inject(DB_TOKEN) private readonly db: DbToken,
    private readonly realtime: RealtimeService,
  ) {}

  async listForUser(userId: string) {
    const rows = await this.db
      .select({
        thread: chatThreads,
        seller: { id: sellers.id, slug: sellers.slug, displayName: sellers.displayName },
      })
      .from(chatThreads)
      .innerJoin(sellers, eq(sellers.id, chatThreads.sellerId))
      .where(eq(chatThreads.userId, userId))
      .orderBy(desc(chatThreads.lastMessageAt));
    return rows;
  }

  async listForSeller(sellerId: string) {
    return this.db
      .select()
      .from(chatThreads)
      .where(eq(chatThreads.sellerId, sellerId))
      .orderBy(desc(chatThreads.lastMessageAt));
  }

  async startOrderThread(userId: string, orderId: string) {
    const orderRows = await this.db
      .select()
      .from(orders)
      .where(and(eq(orders.id, orderId), eq(orders.userId, userId)))
      .limit(1);
    const order = orderRows[0];
    if (!order) throw new NotFoundError('Order', orderId);

    const existing = await this.db
      .select()
      .from(chatThreads)
      .where(and(eq(chatThreads.orderId, orderId), eq(chatThreads.kind, 'order')))
      .limit(1);
    if (existing[0]) return existing[0];

    const rows = await this.db
      .insert(chatThreads)
      .values({
        kind: 'order',
        userId,
        sellerId: order.sellerId,
        orderId,
      })
      .returning();
    return rows[0]!;
  }

  async startDirectThread(userId: string, sellerId: string) {
    // Anti-spam: kullanıcı satıcıdan en az 1 sipariş geçmişi olmalı
    const ordersFromSeller = await this.db
      .select({ id: orders.id })
      .from(orders)
      .where(and(eq(orders.userId, userId), eq(orders.sellerId, sellerId)))
      .limit(1);
    if (!ordersFromSeller[0]) {
      throw new BusinessRuleError(
        'Direkt mesaj için bu satıcıdan en az 1 sipariş vermiş olmalısınız',
      );
    }

    const existing = await this.db
      .select()
      .from(chatThreads)
      .where(
        and(
          eq(chatThreads.userId, userId),
          eq(chatThreads.sellerId, sellerId),
          eq(chatThreads.kind, 'direct'),
        ),
      )
      .limit(1);
    if (existing[0]) return existing[0];

    const rows = await this.db
      .insert(chatThreads)
      .values({ kind: 'direct', userId, sellerId })
      .returning();
    return rows[0]!;
  }

  async listMessages(threadId: string, requester: { userId: string; sellerId?: string }, sinceMs?: number) {
    const thread = await this.assertAccess(threadId, requester);
    const conds = [eq(chatMessages.threadId, threadId)];
    if (sinceMs) {
      conds.push(gt(chatMessages.createdAt, new Date(sinceMs)));
    }
    return {
      thread,
      messages: await this.db
        .select()
        .from(chatMessages)
        .where(and(...conds))
        .orderBy(asc(chatMessages.createdAt)),
    };
  }

  async sendMessage(
    threadId: string,
    requester: { userId: string; sellerId?: string },
    senderRole: 'user' | 'seller',
    input: SendMessageInput,
  ) {
    await this.assertAccess(threadId, requester);
    if (senderRole === 'seller' && !requester.sellerId) {
      throw new ForbiddenError('Satıcı kimliği gerekli');
    }
    const inserted = await this.db.transaction(async (tx) => {
      const r = await tx
        .insert(chatMessages)
        .values({
          threadId,
          senderRole,
          senderUserId: requester.userId,
          body: input.body,
          attachments: input.attachments,
        })
        .returning();
      // Unread counters'i güncelle (zıt taraf için)
      const oppositeKey = senderRole === 'user' ? 'seller' : 'user';
      await tx
        .update(chatThreads)
        .set({
          lastMessageAt: new Date(),
          unreadByUser: sql`
            jsonb_set(
              ${chatThreads.unreadByUser},
              ${'{' + oppositeKey + '}'}::text[],
              ((COALESCE(${chatThreads.unreadByUser}->>${oppositeKey}, '0')::int) + 1)::text::jsonb
            )
          `,
          updatedAt: new Date(),
        })
        .where(eq(chatThreads.id, threadId));
      return r[0]!;
    });

    // WebSocket broadcast (eğer subscribe olan client varsa)
    this.realtime.broadcastNewMessage(threadId, {
      id: inserted.id,
      threadId: inserted.threadId,
      senderRole: inserted.senderRole,
      body: inserted.body,
      attachments: inserted.attachments,
      createdAt: inserted.createdAt,
    });

    return inserted;
  }

  async markRead(
    threadId: string,
    requester: { userId: string; sellerId?: string },
    role: 'user' | 'seller',
  ) {
    await this.assertAccess(threadId, requester);
    await this.db
      .update(chatThreads)
      .set({
        unreadByUser: sql`jsonb_set(${chatThreads.unreadByUser}, ${'{' + role + '}'}::text[], '0'::jsonb)`,
        updatedAt: new Date(),
      })
      .where(eq(chatThreads.id, threadId));
    await this.db
      .update(chatMessages)
      .set({ readAt: new Date(), updatedAt: new Date() })
      .where(and(eq(chatMessages.threadId, threadId), isNotNull(chatMessages.readAt)));
  }

  private async assertAccess(
    threadId: string,
    requester: { userId: string; sellerId?: string },
  ) {
    const rows = await this.db
      .select()
      .from(chatThreads)
      .where(eq(chatThreads.id, threadId))
      .limit(1);
    const thread = rows[0];
    if (!thread) throw new NotFoundError('Thread', threadId);
    if (
      thread.userId !== requester.userId &&
      (!requester.sellerId || thread.sellerId !== requester.sellerId)
    ) {
      throw new ForbiddenError();
    }
    return thread;
  }
}

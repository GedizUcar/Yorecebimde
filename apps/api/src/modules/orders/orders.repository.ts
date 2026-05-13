import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, lte, sql } from 'drizzle-orm';
import {
  orders,
  orderItems,
  orderNoSeq,
} from '@yorecebimde/db/schema';
import { DB_TOKEN, type DbToken } from '../../infrastructure/database.module.js';

export type OrderRow = typeof orders.$inferSelect;
export type NewOrderRow = typeof orders.$inferInsert;
export type OrderItemRow = typeof orderItems.$inferSelect;
export type NewOrderItemRow = typeof orderItems.$inferInsert;

@Injectable()
export class OrdersRepository {
  constructor(@Inject(DB_TOKEN) private readonly db: DbToken) {}

  /** Yeni sipariş + itemları tek transaction'da kayıt et + order_no üret. */
  async createOrderWithItems(
    order: Omit<NewOrderRow, 'orderNo'>,
    items: Omit<NewOrderItemRow, 'orderId'>[],
  ): Promise<{ order: OrderRow; items: OrderItemRow[] }> {
    return this.db.transaction(async (tx) => {
      const orderNo = await this.nextOrderNoTx(tx);
      const insertedOrder = (
        await tx
          .insert(orders)
          .values({ ...order, orderNo })
          .returning()
      )[0]!;
      const itemsInserted: OrderItemRow[] = [];
      for (const it of items) {
        const r = await tx
          .insert(orderItems)
          .values({ ...it, orderId: insertedOrder.id })
          .returning();
        itemsInserted.push(r[0]!);
      }
      return { order: insertedOrder, items: itemsInserted };
    });
  }

  async findByIdForUser(userId: string, id: string) {
    const rows = await this.db
      .select()
      .from(orders)
      .where(and(eq(orders.id, id), eq(orders.userId, userId)))
      .limit(1);
    return rows[0] ?? null;
  }

  async findByNoForUser(userId: string, orderNo: string) {
    const rows = await this.db
      .select()
      .from(orders)
      .where(and(eq(orders.orderNo, orderNo), eq(orders.userId, userId)))
      .limit(1);
    return rows[0] ?? null;
  }

  async findByIdForSeller(sellerId: string, id: string) {
    const rows = await this.db
      .select()
      .from(orders)
      .where(and(eq(orders.id, id), eq(orders.sellerId, sellerId)))
      .limit(1);
    return rows[0] ?? null;
  }

  async listByUser(userId: string, page = 1, limit = 20) {
    const offset = (Math.max(1, page) - 1) * limit;
    return this.db
      .select()
      .from(orders)
      .where(eq(orders.userId, userId))
      .orderBy(desc(orders.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async listBySeller(sellerId: string, page = 1, limit = 20, status?: string) {
    const offset = (Math.max(1, page) - 1) * limit;
    const conds = [eq(orders.sellerId, sellerId)];
    if (status) {
      conds.push(eq(orders.status, status as OrderRow['status']));
    }
    return this.db
      .select()
      .from(orders)
      .where(and(...conds))
      .orderBy(desc(orders.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async listItems(orderId: string) {
    return this.db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, orderId));
  }

  async findByPaymentRef(paymentRef: string): Promise<OrderRow[]> {
    return this.db
      .select()
      .from(orders)
      .where(eq(orders.paymentRef, paymentRef));
  }

  async findDeliveredOlderThanDays(days: number): Promise<OrderRow[]> {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return this.db
      .select()
      .from(orders)
      .where(and(eq(orders.status, 'delivered'), lte(orders.deliveredAt, cutoff)));
  }

  async updateStatus(orderId: string, status: OrderRow['status'], extra: Partial<NewOrderRow> = {}) {
    const rows = await this.db
      .update(orders)
      .set({ status, ...extra, updatedAt: new Date() })
      .where(eq(orders.id, orderId))
      .returning();
    return rows[0] ?? null;
  }

  /**
   * Faz 6.2 — multi-seller kupon/loyalty apportionment için: order'ın
   * `discountCents` ve `totalCents` alanlarını güncelle.
   */
  async applyExtraDiscount(orderId: string, extraDiscountCents: number) {
    const [row] = await this.db
      .update(orders)
      .set({
        discountCents: sql`${orders.discountCents} + ${extraDiscountCents}`,
        totalCents: sql`GREATEST(0, ${orders.totalCents} - ${extraDiscountCents})`,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, orderId))
      .returning();
    return row;
  }

  /**
   * `YRC-YYYY-XXXXX` formatında sipariş numarası üret — yıl başına atomic counter.
   */
  private async nextOrderNoTx(
    tx: Parameters<Parameters<DbToken['transaction']>[0]>[0],
  ): Promise<string> {
    const year = new Date().getFullYear();
    const existing = await tx
      .select()
      .from(orderNoSeq)
      .where(eq(orderNoSeq.yearVal, year))
      .limit(1);
    let nextNo: number;
    if (existing[0]) {
      const updated = await tx
        .update(orderNoSeq)
        .set({ lastNo: sql`${orderNoSeq.lastNo} + 1`, updatedAt: new Date() })
        .where(eq(orderNoSeq.yearVal, year))
        .returning();
      nextNo = updated[0]!.lastNo;
    } else {
      const inserted = await tx
        .insert(orderNoSeq)
        .values({ yearVal: year, lastNo: 1 })
        .returning();
      nextNo = inserted[0]!.lastNo;
    }
    return `YRC-${year}-${String(nextNo).padStart(5, '0')}`;
  }
}

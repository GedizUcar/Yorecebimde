import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, gte, inArray, lte } from 'drizzle-orm';
import { orders, orderItems } from '@yorecebimde/db/schema';
import { DB_TOKEN, type DbToken } from '../../infrastructure/database.module.js';

export type SalesFilter = {
  from?: Date;
  to?: Date;
  status?: string;
};

const COMPLETED_STATUSES = [
  'paid',
  'confirmed',
  'preparing',
  'shipped',
  'delivered',
  'completed',
] as const;

@Injectable()
export class SellerReportsService {
  constructor(@Inject(DB_TOKEN) private readonly db: DbToken) {}

  /**
   * Satıcının kendi siparişlerinin satış raporu — CSV stream için flat row üretir.
   * Default filter: completed/paid/shipped/delivered (iptal hariç).
   */
  async sales(sellerId: string, filter: SalesFilter = {}) {
    const conds = [eq(orders.sellerId, sellerId)];
    if (filter.from) conds.push(gte(orders.createdAt, filter.from));
    if (filter.to) conds.push(lte(orders.createdAt, filter.to));
    if (filter.status) {
      conds.push(eq(orders.status, filter.status as 'paid'));
    } else {
      conds.push(inArray(orders.status, COMPLETED_STATUSES));
    }

    const orderRows = await this.db
      .select()
      .from(orders)
      .where(and(...conds))
      .orderBy(desc(orders.createdAt));

    if (orderRows.length === 0) return { orders: [], items: [] };

    const orderIds = orderRows.map((o) => o.id);
    const items = await this.db
      .select()
      .from(orderItems)
      .where(inArray(orderItems.orderId, orderIds));
    return { orders: orderRows, items };
  }

  /**
   * CSV string üret — order item bazında flat rows.
   * Customer name, item snapshot, fiyat, KDV oranı, komisyon (varsa), payout.
   */
  async exportCsv(sellerId: string, filter: SalesFilter = {}): Promise<string> {
    const { orders: orderRows, items } = await this.sales(sellerId, filter);
    const lines: string[] = [];
    lines.push(
      [
        'order_no',
        'created_at',
        'status',
        'customer_name',
        'province',
        'district',
        'product_name',
        'variation',
        'quantity',
        'unit',
        'unit_price',
        'line_total',
        'discount',
        'kdv_rate',
      ].join(','),
    );

    for (const order of orderRows) {
      const orderItems_ = items.filter((it) => it.orderId === order.id);
      const addr = (order.shippingAddressSnapshot ?? {}) as {
        recipientName?: string;
        province?: string;
        district?: string;
      };
      for (const it of orderItems_) {
        const row = [
          csvSafe(order.orderNo),
          order.createdAt.toISOString(),
          order.status,
          csvSafe(addr.recipientName ?? ''),
          csvSafe(addr.province ?? ''),
          csvSafe(addr.district ?? ''),
          csvSafe(it.productNameSnapshot),
          csvSafe(it.variationLabelSnapshot ?? ''),
          it.quantity,
          it.unitSnapshot,
          (it.unitPriceCents / 100).toFixed(2),
          (it.lineTotalCents / 100).toFixed(2),
          (it.discountCents / 100).toFixed(2),
          it.kdvRate,
        ].join(',');
        lines.push(row);
      }
    }
    return lines.join('\n');
  }

  /**
   * Aggregate KPI'lar — dashboard için.
   */
  async kpis(sellerId: string) {
    const all = await this.sales(sellerId);
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;
    let todayCount = 0;
    let todayGmv = 0;
    let weekCount = 0;
    let weekGmv = 0;
    let monthCount = 0;
    let monthGmv = 0;
    let pendingCount = 0;
    let pendingGmv = 0;
    for (const o of all.orders) {
      const ageMs = now - o.createdAt.getTime();
      if (ageMs < day) {
        todayCount++;
        todayGmv += o.totalCents;
      }
      if (ageMs < 7 * day) {
        weekCount++;
        weekGmv += o.totalCents;
      }
      if (ageMs < 30 * day) {
        monthCount++;
        monthGmv += o.totalCents;
      }
      if (o.status === 'paid') {
        pendingCount++;
        pendingGmv += o.totalCents;
      }
    }
    return {
      today: { count: todayCount, gmvCents: todayGmv },
      week: { count: weekCount, gmvCents: weekGmv },
      month: { count: monthCount, gmvCents: monthGmv },
      pending: { count: pendingCount, gmvCents: pendingGmv },
    };
  }
}

function csvSafe(s: string): string {
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

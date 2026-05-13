import { Inject, Injectable } from '@nestjs/common';
import { and, eq, gte, isNull, lt, sql } from 'drizzle-orm';
import { orders, sellers } from '@yorecebimde/db/schema';
import { DB_TOKEN, type DbToken } from '../../infrastructure/database.module.js';

export type EtbisMonthSummary = {
  month: string; // YYYY-MM
  totalOrders: number;
  paidOrders: number;
  totalGmvCents: number;
  paidGmvCents: number;
  activeSellers: number;
  newSellersInMonth: number;
};

/**
 * ETBIS otomatik bildirim Faz 8+'da gerçek API entegrasyonu olacak. Şu an:
 *  - Aylık özet rapor üret (admin'in manuel form doldurması için)
 *  - CSV/JSON export
 */
@Injectable()
export class EtbisService {
  constructor(@Inject(DB_TOKEN) private readonly db: DbToken) {}

  async monthlySummary(year: number, month: number): Promise<EtbisMonthSummary> {
    const start = new Date(Date.UTC(year, month - 1, 1));
    const end = new Date(Date.UTC(year, month, 1));
    const monthStr = `${year}-${String(month).padStart(2, '0')}`;

    const [orderStats] = await this.db
      .select({
        totalOrders: sql<number>`count(*)::int`,
        totalGmvCents: sql<number>`coalesce(sum(${orders.totalCents}), 0)::bigint`,
        paidOrders: sql<number>`count(*) FILTER (WHERE ${orders.status} IN ('paid','confirmed','preparing','shipped','delivered','completed'))::int`,
        paidGmvCents: sql<number>`coalesce(sum(${orders.totalCents}) FILTER (WHERE ${orders.status} IN ('paid','confirmed','preparing','shipped','delivered','completed')), 0)::bigint`,
      })
      .from(orders)
      .where(
        and(
          gte(orders.createdAt, start),
          lt(orders.createdAt, end),
          isNull(orders.deletedAt),
        ),
      );

    const [activeRow] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(sellers)
      .where(and(eq(sellers.status, 'approved'), isNull(sellers.deletedAt)));

    const [newSellerRow] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(sellers)
      .where(
        and(
          eq(sellers.status, 'approved'),
          gte(sellers.approvedAt, start),
          lt(sellers.approvedAt, end),
          isNull(sellers.deletedAt),
        ),
      );

    return {
      month: monthStr,
      totalOrders: orderStats?.totalOrders ?? 0,
      paidOrders: orderStats?.paidOrders ?? 0,
      totalGmvCents: Number(orderStats?.totalGmvCents ?? 0),
      paidGmvCents: Number(orderStats?.paidGmvCents ?? 0),
      activeSellers: activeRow?.count ?? 0,
      newSellersInMonth: newSellerRow?.count ?? 0,
    };
  }

  /** Last 12 ay özet — admin dashboard'a indir butonu. */
  async lastTwelveMonths(): Promise<EtbisMonthSummary[]> {
    const now = new Date();
    const out: EtbisMonthSummary[] = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const s = await this.monthlySummary(d.getFullYear(), d.getMonth() + 1);
      out.push(s);
    }
    return out;
  }

  toCsv(rows: EtbisMonthSummary[]): string {
    const header = [
      'month',
      'total_orders',
      'paid_orders',
      'total_gmv_tl',
      'paid_gmv_tl',
      'active_sellers',
      'new_sellers',
    ].join(',');
    const body = rows
      .map((r) =>
        [
          r.month,
          r.totalOrders,
          r.paidOrders,
          (r.totalGmvCents / 100).toFixed(2),
          (r.paidGmvCents / 100).toFixed(2),
          r.activeSellers,
          r.newSellersInMonth,
        ].join(','),
      )
      .join('\n');
    return `${header}\n${body}\n`;
  }
}

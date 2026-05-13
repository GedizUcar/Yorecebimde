import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { invoices } from '@yorecebimde/db/schema';
import { logger } from '@yorecebimde/shared';
import { DB_TOKEN, type DbToken } from '../../infrastructure/database.module.js';
import { NilveraProvider } from './nilvera.provider.js';

type EArsivInput = {
  orderId: string;
  orderNo: string;
  userId: string;
  sellerId: string;
  customer: { name: string; email: string; tcKimlik?: string };
  items: Array<{ name: string; quantity: number; unitPriceCents: number; kdvRate: number }>;
  sellerLegalName: string;
  grossCents: number;
  netCents: number;
  kdvCents: number;
};

@Injectable()
export class InvoicingService {
  constructor(
    @Inject(DB_TOKEN) private readonly db: DbToken,
    private readonly nilvera: NilveraProvider,
  ) {}

  /**
   * Sipariş paid olunca e-Arşiv kes. Idempotent — aynı order için zaten kesilmişse skip.
   */
  async issueForOrder(input: EArsivInput): Promise<void> {
    const existing = await this.db
      .select({ id: invoices.id })
      .from(invoices)
      .where(eq(invoices.orderId, input.orderId))
      .limit(1);
    if (existing[0]) {
      logger.info({ orderId: input.orderId }, 'invoice already issued, skipping');
      return;
    }

    const draft = await this.db
      .insert(invoices)
      .values({
        type: 'e_arsiv',
        orderId: input.orderId,
        userId: input.userId,
        sellerId: input.sellerId,
        grossCents: String(input.grossCents),
        netCents: String(input.netCents),
        kdvCents: String(input.kdvCents),
        status: 'pending',
      })
      .returning();
    const draftId = draft[0]!.id;

    try {
      const result = await this.nilvera.issueEArsiv({
        orderNo: input.orderNo,
        customer: input.customer,
        items: input.items,
        sellerLegalName: input.sellerLegalName,
      });
      await this.db
        .update(invoices)
        .set({
          invoiceNo: result.invoiceNo,
          pdfUrl: result.pdfUrl,
          status: 'issued',
          issuedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(invoices.id, draftId));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await this.db
        .update(invoices)
        .set({ status: 'failed', error: msg.substring(0, 500), updatedAt: new Date() })
        .where(eq(invoices.id, draftId));
      throw err;
    }
  }

  async findByOrderId(orderId: string) {
    const rows = await this.db
      .select()
      .from(invoices)
      .where(eq(invoices.orderId, orderId))
      .limit(1);
    return rows[0] ?? null;
  }
}

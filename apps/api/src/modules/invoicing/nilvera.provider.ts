import { Injectable } from '@nestjs/common';
import { logger } from '@yorecebimde/shared';
import { env } from '@yorecebimde/config/api';

/**
 * Nilvera adapter — e-Arşiv (B2C) ve e-Fatura (B2B / komisyon).
 *
 * **Faz 3.1 — stub** (env.NILVERA_API_KEY yoksa).
 *   - issueEArsiv → mock invoice no + fake PDF URL
 *   - issueEFatura → aynı
 *
 * Faz 4'te real:
 *   - Nilvera REST API client
 *   - Sandbox: NILVERA_TEST_MODE=true
 *   - PDF dönüşü → MinIO `invoices` bucket'ına stream upload
 *   - Presigned download URL kullanıcı paneline gider
 */
@Injectable()
export class NilveraProvider {
  readonly isStub: boolean;

  constructor() {
    this.isStub = !env.NILVERA_API_KEY;
    if (this.isStub) {
      logger.warn('[nilvera] STUB mode — credentials missing');
    }
  }

  async issueEArsiv(input: {
    orderNo: string;
    customer: { name: string; email: string; tcKimlik?: string };
    items: Array<{ name: string; quantity: number; unitPriceCents: number; kdvRate: number }>;
    sellerLegalName: string;
  }): Promise<{ invoiceNo: string; pdfUrl: string }> {
    const invoiceNo = `EAR-${new Date().getFullYear()}-${Date.now().toString().slice(-8)}`;
    const pdfUrl = `${env.BETTER_AUTH_URL}/api/stub/invoice/${invoiceNo}.pdf`;
    logger.info(
      {
        provider: 'nilvera-stub',
        orderNo: input.orderNo,
        customer: input.customer.email,
        items: input.items.length,
        invoiceNo,
      },
      '[STUB] e-Arşiv issued',
    );
    return { invoiceNo, pdfUrl };
  }

  async issueEFatura(input: {
    sellerLegalName: string;
    sellerTaxNo: string;
    period: string;
    commissionCents: number;
  }): Promise<{ invoiceNo: string; pdfUrl: string }> {
    const invoiceNo = `EFA-${new Date().getFullYear()}-${Date.now().toString().slice(-8)}`;
    const pdfUrl = `${env.BETTER_AUTH_URL}/api/stub/invoice/${invoiceNo}.pdf`;
    logger.info(
      {
        provider: 'nilvera-stub',
        seller: input.sellerLegalName,
        period: input.period,
        commission: input.commissionCents,
        invoiceNo,
      },
      '[STUB] e-Fatura issued (commission)',
    );
    return { invoiceNo, pdfUrl };
  }
}

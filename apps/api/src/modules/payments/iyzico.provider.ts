import { Injectable } from '@nestjs/common';
import { logger } from '@yorecebimde/shared';
import { env } from '@yorecebimde/config/api';

/**
 * Iyzico Sub-Merchant + 3DS Payment provider.
 *
 * **Faz 3.1 — stub implementation** (env'de IYZICO_API_KEY tanımlı değilse aktif).
 *   - initiate3DS → mock 3DS URL döner (kullanıcı browser'da onayla/reddet seçer)
 *   - createSubMerchant → fake submerchant_id
 *   - refund → log + success
 *
 * Faz 4'te bu dosyayı `iyzico-real.provider.ts` ile değiştir:
 *   - SDK: `import Iyzipay from 'iyzipay'`
 *   - this.client = new Iyzipay({ apiKey, secretKey, uri })
 *   - initiate3DS → iyzipay.threedsInitialize.create(...)
 *   - Callback flow: paymentTransactions[].subMerchantKey + subMerchantPrice + itemTransferType=MARKETPLACE
 */
@Injectable()
export class IyzicoProvider {
  readonly isStub: boolean;

  constructor() {
    this.isStub = !env.IYZICO_API_KEY;
    if (this.isStub) {
      logger.warn('[iyzico] STUB mode — credentials missing, using mock payment flow');
    } else {
      logger.info('[iyzico] LIVE mode — but real SDK not wired yet (Faz 4)');
    }
  }

  async createSubMerchant(input: {
    sellerId: string;
    legalName?: string;
    iban: string;
    type: 'individual' | 'company';
    taxOffice?: string | null;
    taxIdOrTcKimlik: string;
  }): Promise<{ submerchantKey: string }> {
    logger.info(
      { provider: 'iyzico-stub', sellerId: input.sellerId, type: input.type },
      '[STUB] sub-merchant created',
    );
    return { submerchantKey: `stub-sm-${input.sellerId.substring(0, 8)}` };
  }

  /**
   * 3DS initialize — mock URL döner. Web browser bu URL'i yükler;
   * mock sayfa "Onayla / Reddet" butonları sunar, sonuçta callback endpoint'imize POST eder.
   */
  async initiate3DS(input: {
    paymentRef: string;
    amountCents: number;
    buyerEmail: string;
    callbackUrl: string;
  }): Promise<{ redirectUrl: string; paymentToken: string }> {
    const token = `tok-${input.paymentRef}-${Date.now()}`;
    const redirectUrl = `${env.BETTER_AUTH_URL}/odeme/iyzico-mock?token=${encodeURIComponent(
      token,
    )}&ref=${encodeURIComponent(input.paymentRef)}&amount=${input.amountCents}`;
    logger.info(
      { provider: 'iyzico-stub', token, amountCents: input.amountCents },
      '[STUB] 3DS initiated',
    );
    return { redirectUrl, paymentToken: token };
  }

  /**
   * Iyzico callback'inden gelen `token` ile ödeme statusunu sorgular.
   * Stub: token formatından çıkarım yapar (test akışı için).
   */
  async verifyPayment(token: string): Promise<{
    success: boolean;
    paymentRef: string | null;
    providerPaymentId: string | null;
  }> {
    if (token.includes('decline')) {
      return { success: false, paymentRef: null, providerPaymentId: null };
    }
    const parts = token.split('-');
    const paymentRef = parts.length >= 3 ? parts.slice(1, -1).join('-') : null;
    return {
      success: true,
      paymentRef,
      providerPaymentId: `stub-pay-${Date.now()}`,
    };
  }

  async refund(input: {
    providerPaymentId: string;
    amountCents: number;
    reason: string;
  }): Promise<{ refundRef: string }> {
    logger.info(
      {
        provider: 'iyzico-stub',
        paymentId: input.providerPaymentId,
        amountCents: input.amountCents,
        reason: input.reason,
      },
      '[STUB] refund processed',
    );
    return { refundRef: `stub-refund-${Date.now()}` };
  }

  /**
   * Marketplace payout — sub-merchant → satıcı IBAN'ına transfer.
   * Stub: log + success.
   */
  async payout(input: {
    submerchantKey: string;
    amountCents: number;
    orderIds: string[];
  }): Promise<{ payoutRef: string }> {
    logger.info(
      {
        provider: 'iyzico-stub',
        submerchant: input.submerchantKey,
        amountCents: input.amountCents,
        orderCount: input.orderIds.length,
      },
      '[STUB] payout queued',
    );
    return { payoutRef: `stub-payout-${Date.now()}` };
  }
}

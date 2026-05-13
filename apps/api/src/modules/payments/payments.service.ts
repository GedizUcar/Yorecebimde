import { Injectable } from '@nestjs/common';
import { IyzicoProvider } from './iyzico.provider.js';

export type Initiate3DSInput = {
  /** Bizim sipariş referansımız (Iyzico tarafına `conversation_id` gönderilir) */
  paymentRef: string;
  amountCents: number;
  buyerEmail: string;
  callbackPath: string;
};

@Injectable()
export class PaymentsService {
  constructor(private readonly iyzico: IyzicoProvider) {}

  /**
   * 3DS başlat — Iyzico'dan redirect URL al, kullanıcıyı oraya yönlendireceğiz.
   * Faz 3.1 stub'da bu URL `/odeme/iyzico-mock` sayfamıza gider.
   */
  async initiate3DS(input: Initiate3DSInput) {
    return this.iyzico.initiate3DS({
      paymentRef: input.paymentRef,
      amountCents: input.amountCents,
      buyerEmail: input.buyerEmail,
      callbackUrl: input.callbackPath,
    });
  }

  async verifyCallback(token: string) {
    return this.iyzico.verifyPayment(token);
  }

  async refund(input: { providerPaymentId: string; amountCents: number; reason: string }) {
    return this.iyzico.refund(input);
  }

  async createSubMerchant(input: {
    sellerId: string;
    legalName?: string;
    iban: string;
    type: 'individual' | 'company';
    taxOffice?: string | null;
    taxIdOrTcKimlik: string;
  }) {
    return this.iyzico.createSubMerchant(input);
  }
}

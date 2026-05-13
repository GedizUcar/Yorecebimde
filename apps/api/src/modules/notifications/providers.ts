import { Injectable } from '@nestjs/common';
import { logger } from '@yorecebimde/shared';

export type SendEmailInput = {
  to: string;
  subject: string;
  body: string;
};

export type SendSmsInput = {
  to: string;
  body: string;
};

export type SendPushInput = {
  to: string;
  title: string;
  body: string;
};

export type ProviderResult = {
  providerRef: string;
};

/**
 * Stub Email Provider — Resend yerine log atar.
 * Faz 4'te `apps/api/src/modules/notifications/providers/resend.ts`'e taşıyıp
 * `RESEND_API_KEY` ile gerçek API'ye bağlayacağız.
 */
@Injectable()
export class EmailProvider {
  async send(input: SendEmailInput): Promise<ProviderResult> {
    const ref = `stub-email-${Date.now()}`;
    logger.info(
      {
        provider: 'email-stub',
        to: input.to,
        subject: input.subject,
        bodyPreview: input.body.substring(0, 120),
        ref,
      },
      '[STUB] email sent',
    );
    return { providerRef: ref };
  }
}

/**
 * Stub SMS Provider — NetGSM yerine log atar.
 * Header onayı + gerçek entegrasyon Faz 4'te.
 */
@Injectable()
export class SmsProvider {
  async send(input: SendSmsInput): Promise<ProviderResult> {
    const ref = `stub-sms-${Date.now()}`;
    logger.info(
      {
        provider: 'sms-stub',
        to: input.to,
        bodyPreview: input.body.substring(0, 160),
        ref,
      },
      '[STUB] sms sent',
    );
    return { providerRef: ref };
  }
}

/**
 * Stub Push Provider — Expo Push yerine log.
 * Mobile app gelince (Faz 7) aktive olacak.
 */
@Injectable()
export class PushProvider {
  async send(input: SendPushInput): Promise<ProviderResult> {
    const ref = `stub-push-${Date.now()}`;
    logger.info(
      {
        provider: 'push-stub',
        to: input.to,
        title: input.title,
        ref,
      },
      '[STUB] push sent',
    );
    return { providerRef: ref };
  }
}

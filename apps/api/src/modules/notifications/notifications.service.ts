import { Inject, Injectable, type OnModuleInit, type OnModuleDestroy } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { Queue, Worker } from 'bullmq';
import { notificationsLog } from '@yorecebimde/db/schema';
import { logger } from '@yorecebimde/shared';
import { env } from '@yorecebimde/config/api';
import { DB_TOKEN, type DbToken } from '../../infrastructure/database.module.js';
import { QueueRegistry } from '../../infrastructure/queue.module.js';
import { EmailProvider, SmsProvider, PushProvider } from './providers.js';
import { render, type TemplateChannel, type TriggerKey } from './templates.js';

const QUEUE_NAME = 'notifications';

export type SendInput = {
  trigger: TriggerKey;
  channels: TemplateChannel[];
  recipient: {
    email?: string;
    phone?: string;
    pushToken?: string;
    userId?: string;
    sellerId?: string;
  };
  data: Record<string, string | number>;
};

type NotificationJob = {
  trigger: TriggerKey;
  channel: TemplateChannel;
  recipient: string;
  subject?: string;
  body: string;
  context: Record<string, unknown>;
  logId: string;
};

@Injectable()
export class NotificationsService implements OnModuleInit, OnModuleDestroy {
  private readonly queue: Queue<NotificationJob>;
  private worker?: Worker<NotificationJob>;

  constructor(
    @Inject(DB_TOKEN) private readonly db: DbToken,
    private readonly registry: QueueRegistry,
    private readonly email: EmailProvider,
    private readonly sms: SmsProvider,
    private readonly push: PushProvider,
  ) {
    this.queue = new Queue<NotificationJob>(QUEUE_NAME, {
      connection: this.registry.getConnection(),
    });
  }

  onModuleInit() {
    this.worker = new Worker<NotificationJob>(
      QUEUE_NAME,
      async (job) => this.deliver(job.data),
      {
        connection: this.registry.getConnection(),
        concurrency: 4,
      },
    );

    this.worker.on('failed', async (job, err) => {
      logger.error({ jobId: job?.id, err: err.message }, 'notification delivery failed');
      if (job?.data.logId) {
        await this.db
          .update(notificationsLog)
          .set({
            status: 'failed',
            error: err.message.substring(0, 500),
            sentAt: new Date(),
          })
          .where(eq(notificationsLog.id, job.data.logId));
      }
    });

    this.registry.registerWorker(this.worker);
    logger.info('notifications worker started');
  }

  async onModuleDestroy() {
    await this.worker?.close();
    await this.queue.close();
  }

  /**
   * Bildirim kaydını queue'ya at — log satırı `queued` olarak insert edilir,
   * worker `sent`/`failed`/`skipped` durumuna geçer.
   */
  async send(input: SendInput): Promise<void> {
    const baseUrl = env.BETTER_AUTH_URL;
    const data: Record<string, string | number> = { baseUrl, ...input.data };

    for (const channel of input.channels) {
      const tpl = render(input.trigger, channel, data);
      if (!tpl) continue;

      const recipient =
        channel === 'email'
          ? input.recipient.email
          : channel === 'sms'
            ? input.recipient.phone
            : channel === 'push'
              ? input.recipient.pushToken
              : undefined;

      if (!recipient) {
        // İlgili kanal için recipient yok — skip
        const inserted = await this.db
          .insert(notificationsLog)
          .values({
            triggerKey: input.trigger,
            channel,
            recipient: '(missing)',
            ...(input.recipient.userId ? { userId: input.recipient.userId } : {}),
            ...(input.recipient.sellerId ? { sellerId: input.recipient.sellerId } : {}),
            ...(tpl.subject ? { subject: tpl.subject } : {}),
            body: tpl.body,
            context: data,
            status: 'skipped',
            error: 'recipient missing',
          })
          .returning({ id: notificationsLog.id });
        void inserted;
        continue;
      }

      const inserted = await this.db
        .insert(notificationsLog)
        .values({
          triggerKey: input.trigger,
          channel,
          recipient,
          ...(input.recipient.userId ? { userId: input.recipient.userId } : {}),
          ...(input.recipient.sellerId ? { sellerId: input.recipient.sellerId } : {}),
          ...(tpl.subject ? { subject: tpl.subject } : {}),
          body: tpl.body,
          context: data,
          status: 'queued',
        })
        .returning({ id: notificationsLog.id });
      const logId = inserted[0]!.id;

      await this.queue.add(
        `${input.trigger}:${channel}`,
        {
          trigger: input.trigger,
          channel,
          recipient,
          ...(tpl.subject ? { subject: tpl.subject } : {}),
          body: tpl.body,
          context: data,
          logId,
        },
        {
          jobId: logId,
          attempts: 3,
          backoff: { type: 'exponential', delay: 30_000 },
          removeOnComplete: { count: 200 },
          removeOnFail: { count: 100 },
        },
      );
    }
  }

  private async deliver(job: NotificationJob): Promise<void> {
    let ref: string;
    if (job.channel === 'email') {
      const r = await this.email.send({
        to: job.recipient,
        subject: job.subject ?? '(no subject)',
        body: job.body,
      });
      ref = r.providerRef;
    } else if (job.channel === 'sms') {
      const r = await this.sms.send({ to: job.recipient, body: job.body });
      ref = r.providerRef;
    } else if (job.channel === 'push') {
      const r = await this.push.send({
        to: job.recipient,
        title: job.subject ?? 'Yörecebimde',
        body: job.body,
      });
      ref = r.providerRef;
    } else {
      // in_app — sadece DB log, ileride WebSocket emit'e bağlanacak
      ref = `in-app-${Date.now()}`;
    }

    await this.db
      .update(notificationsLog)
      .set({
        status: 'sent',
        sentAt: new Date(),
        providerRef: ref,
      })
      .where(eq(notificationsLog.id, job.logId));
  }
}

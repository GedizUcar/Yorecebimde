import { Injectable, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import { Inject } from '@nestjs/common';
import { Queue, Worker } from 'bullmq';
import { sellers, products } from '@yorecebimde/db/schema';
import { logger } from '@yorecebimde/shared';
import { DB_TOKEN, type DbToken } from '../../infrastructure/database.module.js';
import { QueueRegistry } from '../../infrastructure/queue.module.js';
import { OrdersService } from '../orders/orders.service.js';
import { DisputesService } from '../disputes/disputes.service.js';
import { StockService } from '../products/stock.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { LoyaltyService } from '../loyalty/loyalty.service.js';
import { BoostListingService } from '../boost/boost-listing.service.js';

const QUEUE_NAME = 'cron';

type CronJob =
  | { type: 'escrow-release' }
  | { type: 'dispute-escalation' }
  | { type: 'low-stock-check' }
  | { type: 'cart-cleanup' }
  | { type: 'loyalty-expire' }
  | { type: 'boost-rotation' };

@Injectable()
export class CronService implements OnModuleInit, OnModuleDestroy {
  private queue?: Queue<CronJob>;
  private worker?: Worker<CronJob>;
  /** Aynı (sellerId,productId) için 24 saatte 1 bildirim — process-level memo */
  private lowStockSentAt = new Map<string, number>();
  private readonly LOW_STOCK_THROTTLE_MS = 24 * 60 * 60 * 1000;

  constructor(
    private readonly registry: QueueRegistry,
    private readonly orders: OrdersService,
    private readonly disputes: DisputesService,
    private readonly stock: StockService,
    private readonly notifications: NotificationsService,
    private readonly loyalty: LoyaltyService,
    private readonly boostListing: BoostListingService,
    @Inject(DB_TOKEN) private readonly db: DbToken,
  ) {}

  async onModuleInit() {
    this.queue = new Queue<CronJob>(QUEUE_NAME, {
      connection: this.registry.getConnection(),
    });

    // Recurring jobs — idempotent jobId, BullMQ aynı schedule'ı re-register etmez
    await this.queue.add(
      'escrow-release',
      { type: 'escrow-release' },
      {
        jobId: 'cron:escrow-release',
        repeat: { pattern: '0 * * * *' }, // her saat başı
        removeOnComplete: { count: 50 },
        removeOnFail: { count: 50 },
      },
    );
    await this.queue.add(
      'dispute-escalation',
      { type: 'dispute-escalation' },
      {
        jobId: 'cron:dispute-escalation',
        repeat: { pattern: '*/15 * * * *' }, // 15 dakikada bir
        removeOnComplete: { count: 50 },
        removeOnFail: { count: 50 },
      },
    );
    await this.queue.add(
      'low-stock-check',
      { type: 'low-stock-check' },
      {
        jobId: 'cron:low-stock-check',
        repeat: { pattern: '0 9 * * *' }, // her gün 09:00
        removeOnComplete: { count: 50 },
        removeOnFail: { count: 50 },
      },
    );
    // Faz 6.2
    await this.queue.add(
      'loyalty-expire',
      { type: 'loyalty-expire' },
      {
        jobId: 'cron:loyalty-expire',
        repeat: { pattern: '15 3 * * *' }, // her gün 03:15
        removeOnComplete: { count: 50 },
        removeOnFail: { count: 50 },
      },
    );
    await this.queue.add(
      'boost-rotation',
      { type: 'boost-rotation' },
      {
        jobId: 'cron:boost-rotation',
        repeat: { pattern: '0 * * * *' }, // her saat başı
        removeOnComplete: { count: 50 },
        removeOnFail: { count: 50 },
      },
    );

    this.worker = new Worker<CronJob>(
      QUEUE_NAME,
      async (job) => {
        if (job.data.type === 'escrow-release') {
          const result = await this.orders.releaseEscrowDue();
          logger.info(result, 'escrow release cron completed');
        } else if (job.data.type === 'dispute-escalation') {
          const result = await this.disputes.runEscalationCheck();
          logger.info(result, 'dispute escalation cron completed');
        } else if (job.data.type === 'low-stock-check') {
          const result = await this.runLowStockCheck();
          logger.info(result, 'low stock check cron completed');
        } else if (job.data.type === 'loyalty-expire') {
          const result = await this.loyalty.expireOldPoints();
          logger.info(result, 'loyalty expire cron completed');
        } else if (job.data.type === 'boost-rotation') {
          const result = await this.boostListing.rotateExpired();
          logger.info(result, 'boost rotation cron completed');
        }
      },
      {
        connection: this.registry.getConnection(),
        concurrency: 1,
      },
    );

    this.worker.on('failed', (job, err) => {
      logger.error({ jobId: job?.id, err: err.message }, 'cron job failed');
    });

    this.registry.registerWorker(this.worker);
    logger.info('cron worker started');
  }

  async onModuleDestroy() {
    await this.worker?.close();
    await this.queue?.close();
  }

  private async runLowStockCheck(): Promise<{ notified: number; skippedThrottle: number }> {
    const list = await this.stock.findLowStockProducts();
    let notified = 0;
    let skipped = 0;
    const now = Date.now();

    // Seller bilgileri cache (tek query'de tek seller fetch yerine batched)
    const sellerIds = [...new Set(list.map((p) => p.sellerId))];
    const sellerRows = sellerIds.length
      ? await this.db
          .select({
            id: sellers.id,
            displayName: sellers.displayName,
            contactEmail: sellers.contactEmail,
            contactPhone: sellers.contactPhone,
          })
          .from(sellers)
          .where(and(eq(sellers.status, 'approved'), isNull(sellers.deletedAt)))
      : [];
    const sellerMap = new Map(sellerRows.map((s) => [s.id, s]));

    for (const item of list) {
      const key = `${item.sellerId}:${item.productId}`;
      const last = this.lowStockSentAt.get(key) ?? 0;
      if (now - last < this.LOW_STOCK_THROTTLE_MS) {
        skipped++;
        continue;
      }
      const seller = sellerMap.get(item.sellerId);
      if (!seller) continue;

      await this.notifications
        .send({
          trigger: 'low_stock.seller',
          channels: ['email'],
          recipient: {
            email: seller.contactEmail,
            sellerId: seller.id,
          },
          data: {
            productName: item.nameTr,
            productId: item.productId,
            stock: item.stockQuantity,
            unit: item.unit,
          },
        })
        .catch((err) => logger.warn({ err: String(err) }, 'low stock notify failed'));

      this.lowStockSentAt.set(key, now);
      notified++;
    }

    void products;
    return { notified, skippedThrottle: skipped };
  }
}

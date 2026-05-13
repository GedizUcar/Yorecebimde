import { Global, Module, type OnModuleDestroy } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { Queue, Worker, type ConnectionOptions } from 'bullmq';
import { Redis } from 'ioredis';
import { env } from '@yorecebimde/config/api';

export const REDIS_TOKEN = Symbol('REDIS_CONNECTION');
export const IMAGE_QUEUE_TOKEN = Symbol('IMAGE_QUEUE');
export const SEARCH_QUEUE_TOKEN = Symbol('SEARCH_QUEUE');

export const QUEUE_NAMES = {
  image: 'image-processing',
  search: 'search-sync',
} as const;

/**
 * BullMQ connection — paylaşılan Redis instance.
 * BullMQ kendi connection'unu auto-prefix etmiyor, ioredis'in `lazyConnect`
 * pattern'i ile process boyunca tek connection paylaşıyoruz.
 */
function buildConnection(): ConnectionOptions {
  return {
    host: new URL(env.REDIS_URL).hostname,
    port: Number(new URL(env.REDIS_URL).port || 6379),
    password: new URL(env.REDIS_URL).password || undefined,
    ...(env.REDIS_TLS ? { tls: {} } : {}),
    maxRetriesPerRequest: null,
  };
}

@Injectable()
export class QueueRegistry implements OnModuleDestroy {
  private readonly connection: ConnectionOptions;
  readonly redis: Redis;
  readonly imageQueue: Queue;
  readonly searchQueue: Queue;
  private readonly workers: Worker[] = [];

  constructor() {
    this.connection = buildConnection();
    this.redis = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: null,
      ...(env.REDIS_TLS ? { tls: {} } : {}),
    });
    this.imageQueue = new Queue(QUEUE_NAMES.image, { connection: this.connection });
    this.searchQueue = new Queue(QUEUE_NAMES.search, { connection: this.connection });
  }

  registerWorker(worker: Worker) {
    this.workers.push(worker);
  }

  getConnection(): ConnectionOptions {
    return this.connection;
  }

  async onModuleDestroy() {
    await Promise.all(this.workers.map((w) => w.close()));
    await this.imageQueue.close();
    await this.searchQueue.close();
    this.redis.disconnect();
  }
}

@Global()
@Module({
  providers: [
    QueueRegistry,
    { provide: REDIS_TOKEN, useFactory: (q: QueueRegistry) => q.redis, inject: [QueueRegistry] },
    { provide: IMAGE_QUEUE_TOKEN, useFactory: (q: QueueRegistry) => q.imageQueue, inject: [QueueRegistry] },
    { provide: SEARCH_QUEUE_TOKEN, useFactory: (q: QueueRegistry) => q.searchQueue, inject: [QueueRegistry] },
  ],
  exports: [QueueRegistry, REDIS_TOKEN, IMAGE_QUEUE_TOKEN, SEARCH_QUEUE_TOKEN],
})
export class QueueModule {}

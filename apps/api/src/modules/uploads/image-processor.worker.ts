import { Inject, Injectable, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { GetObjectCommand, PutObjectCommand, type S3Client } from '@aws-sdk/client-s3';
import { Worker } from 'bullmq';
import sharp from 'sharp';
import { logger } from '@yorecebimde/shared';
import { env } from '@yorecebimde/config/api';
import { S3_TOKEN, S3_BUCKETS, type S3Buckets } from '../../infrastructure/minio.module.js';
import { QueueRegistry, QUEUE_NAMES } from '../../infrastructure/queue.module.js';
import { UploadsRepository } from './uploads.repository.js';
import { SearchService } from '../search/search.service.js';

type ImageJobPayload = {
  imageId: string;
  productId: string;
  sellerId: string;
  storageKey: string;
};

const FULL_MAX_DIM = 1600;
const THUMB_DIM = 400;
const WEBP_QUALITY = 82;

@Injectable()
export class ImageProcessorWorker implements OnModuleInit, OnModuleDestroy {
  private worker?: Worker<ImageJobPayload>;

  constructor(
    private readonly registry: QueueRegistry,
    private readonly repo: UploadsRepository,
    private readonly search: SearchService,
    @Inject(S3_TOKEN) private readonly s3: S3Client,
    @Inject(S3_BUCKETS) private readonly buckets: S3Buckets,
  ) {}

  onModuleInit() {
    this.worker = new Worker<ImageJobPayload>(
      QUEUE_NAMES.image,
      async (job) => this.handle(job.data),
      {
        connection: this.registry.getConnection(),
        concurrency: 2,
      },
    );

    this.worker.on('failed', (job, err) => {
      logger.error({ jobId: job?.id, err: err.message }, 'image processing failed');
      if (job?.data.imageId && job.attemptsMade >= (job.opts.attempts ?? 1)) {
        void this.repo.updateProcessing(job.data.imageId, 'failed', {
          processingError: err.message.substring(0, 500),
        });
      }
    });

    this.registry.registerWorker(this.worker);
    logger.info('image processor worker started');
  }

  async onModuleDestroy() {
    await this.worker?.close();
  }

  private async handle(payload: ImageJobPayload): Promise<void> {
    const { imageId, storageKey } = payload;
    logger.info({ imageId, storageKey }, 'processing image');

    const originalBytes = await this.downloadObject(storageKey);
    const meta = await sharp(originalBytes).metadata();

    const dir = storageKey.substring(0, storageKey.lastIndexOf('/'));
    const fullKey = `${dir}/full.webp`;
    const thumbKey = `${dir}/thumb.webp`;

    const fullBuf = await sharp(originalBytes)
      .rotate()
      .resize({ width: FULL_MAX_DIM, height: FULL_MAX_DIM, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY })
      .toBuffer();

    const thumbBuf = await sharp(originalBytes)
      .rotate()
      .resize({ width: THUMB_DIM, height: THUMB_DIM, fit: 'cover', position: 'centre' })
      .webp({ quality: WEBP_QUALITY })
      .toBuffer();

    await Promise.all([
      this.uploadObject(fullKey, fullBuf, 'image/webp'),
      this.uploadObject(thumbKey, thumbBuf, 'image/webp'),
    ]);

    const webpUrl = `${env.MINIO_PUBLIC_URL}/${this.buckets.products}/${fullKey}`;
    const thumbnailUrl = `${env.MINIO_PUBLIC_URL}/${this.buckets.products}/${thumbKey}`;

    await this.repo.updateProcessing(imageId, 'ready', {
      webpUrl,
      thumbnailUrl,
      width: meta.width ?? null,
      height: meta.height ?? null,
      fileSizeBytes: originalBytes.length,
      processingError: null,
    });

    logger.info({ imageId }, 'image processed');

    // Reindex product in Meilisearch so the new thumbnail appears in search hits.
    try {
      await this.search.indexProduct(payload.productId);
    } catch (err) {
      logger.warn({ err, productId: payload.productId }, 'meili reindex skipped');
    }
  }

  private async downloadObject(key: string): Promise<Buffer> {
    const res = await this.s3.send(
      new GetObjectCommand({ Bucket: this.buckets.products, Key: key }),
    );
    if (!res.Body) throw new Error('Empty S3 response');
    const chunks: Buffer[] = [];
    for await (const chunk of res.Body as AsyncIterable<Buffer | Uint8Array>) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }

  private async uploadObject(key: string, body: Buffer, contentType: string): Promise<void> {
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.buckets.products,
        Key: key,
        Body: body,
        ContentType: contentType,
        CacheControl: 'public, max-age=31536000, immutable',
      }),
    );
  }
}

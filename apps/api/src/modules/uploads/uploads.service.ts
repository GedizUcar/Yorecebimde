import { Inject, Injectable } from '@nestjs/common';
import { DeleteObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import type { Readable } from 'node:stream';
import type { Queue } from 'bullmq';
import { newId, NotFoundError, BusinessRuleError, ForbiddenError } from '@yorecebimde/shared';
import { env } from '@yorecebimde/config/api';
import { S3_TOKEN, S3_BUCKETS, type S3Buckets } from '../../infrastructure/minio.module.js';
import { IMAGE_QUEUE_TOKEN } from '../../infrastructure/queue.module.js';
import { UploadsRepository } from './uploads.repository.js';
import { buildMediaUrl } from '../media/media.url.js';
import type { S3Client } from '@aws-sdk/client-s3';

const ALLOWED_CONTENT_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'] as const;

export type UploadResult = {
  imageId: string;
  storageKey: string;
  status: 'processing';
};

export type UploadInput = {
  sellerId: string;
  productId: string;
  contentType: string;
  fileName: string;
  stream: Readable;
};

@Injectable()
export class UploadsService {
  constructor(
    private readonly repo: UploadsRepository,
    @Inject(S3_TOKEN) private readonly s3: S3Client,
    @Inject(S3_BUCKETS) private readonly buckets: S3Buckets,
    @Inject(IMAGE_QUEUE_TOKEN) private readonly imageQueue: Queue,
  ) {}

  /**
   * Direct multipart upload — stream geliyor, MinIO'ya internal network
   * üzerinden gönderiyoruz. Bittiğinde image-processing job'u kuyruğa düşer.
   */
  async uploadProductImage(input: UploadInput): Promise<UploadResult> {
    if (!(ALLOWED_CONTENT_TYPES as readonly string[]).includes(input.contentType)) {
      throw new BusinessRuleError('Desteklenmeyen dosya türü', {
        contentType: input.contentType,
        allowed: ALLOWED_CONTENT_TYPES,
      });
    }

    const ownsProduct = await this.repo.assertSellerOwnsProduct(input.sellerId, input.productId);
    if (!ownsProduct) throw new NotFoundError('Product', input.productId);

    const existingCount = await this.repo.countImages(input.productId);
    if (existingCount >= env.MAX_PRODUCT_IMAGES) {
      throw new BusinessRuleError(
        `Maksimum ${env.MAX_PRODUCT_IMAGES} görsel ekleyebilirsiniz`,
      );
    }

    const imageId = newId();
    const ext = extFromContentType(input.contentType);
    const storageKey = `products/${input.productId}/${imageId}/original.${ext}`;
    const publicUrl = buildMediaUrl(env.BETTER_AUTH_URL, this.buckets.products, storageKey);

    await this.repo.createImage({
      id: imageId,
      productId: input.productId,
      sellerId: input.sellerId,
      storageKey,
      url: publicUrl,
      sortOrder: existingCount,
      processingStatus: 'processing',
    });

    const upload = new Upload({
      client: this.s3,
      params: {
        Bucket: this.buckets.products,
        Key: storageKey,
        Body: input.stream,
        ContentType: input.contentType,
      },
    });
    try {
      await upload.done();
    } catch (err) {
      await this.repo.delete(imageId).catch(() => undefined);
      throw new BusinessRuleError('Dosya yüklenirken hata oluştu', {
        cause: err instanceof Error ? err.message : String(err),
      });
    }

    await this.imageQueue.add(
      'process-image',
      { imageId, productId: input.productId, sellerId: input.sellerId, storageKey },
      {
        jobId: `image:${imageId}`,
        attempts: 3,
        backoff: { type: 'exponential', delay: 5_000 },
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 50 },
      },
    );

    return { imageId, storageKey, status: 'processing' };
  }

  async deleteImage(sellerId: string, imageId: string): Promise<void> {
    const image = await this.repo.findBySellerAndId(sellerId, imageId);
    if (!image) throw new NotFoundError('Image', imageId);
    if (image.sellerId !== sellerId) throw new ForbiddenError();

    const keysToDelete = [image.storageKey];
    if (image.webpUrl) keysToDelete.push(deriveKey(image.storageKey, 'webp'));
    if (image.thumbnailUrl) keysToDelete.push(deriveKey(image.storageKey, 'thumb'));

    await Promise.all(
      keysToDelete.map((key) =>
        this.s3
          .send(new DeleteObjectCommand({ Bucket: this.buckets.products, Key: key }))
          .catch(() => undefined),
      ),
    );
    await this.repo.delete(imageId);
  }
}

function extFromContentType(ct: string): string {
  switch (ct) {
    case 'image/jpeg':
      return 'jpg';
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    case 'image/avif':
      return 'avif';
    default:
      return 'bin';
  }
}

function deriveKey(originalKey: string, variant: 'webp' | 'thumb'): string {
  const dir = originalKey.substring(0, originalKey.lastIndexOf('/'));
  return variant === 'webp' ? `${dir}/full.webp` : `${dir}/thumb.webp`;
}

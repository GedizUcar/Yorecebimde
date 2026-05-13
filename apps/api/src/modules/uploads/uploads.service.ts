import { Inject, Injectable } from '@nestjs/common';
import { PutObjectCommand, HeadObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { Queue } from 'bullmq';
import { newId, NotFoundError, BusinessRuleError, ForbiddenError } from '@yorecebimde/shared';
import { env } from '@yorecebimde/config/api';
import { S3_TOKEN, S3_BUCKETS, type S3Buckets } from '../../infrastructure/minio.module.js';
import { IMAGE_QUEUE_TOKEN } from '../../infrastructure/queue.module.js';
import { UploadsRepository } from './uploads.repository.js';
import type { S3Client } from '@aws-sdk/client-s3';

const ALLOWED_CONTENT_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'] as const;
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const PRESIGN_TTL_SEC = 60 * 10;

export type PresignResult = {
  uploadUrl: string;
  imageId: string;
  storageKey: string;
  expiresInSec: number;
  maxFileSizeBytes: number;
};

export type PresignInput = {
  sellerId: string;
  productId: string;
  contentType: string;
  fileName: string;
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
   * Satıcı ürün için yeni görsel presigned URL alır. Çağrı sırasında
   * product_images satırı `pending` olarak oluşturulur — client uploadı
   * tamamladıktan sonra `/complete` ile job tetiklenir.
   */
  async presignProductImage(input: PresignInput): Promise<PresignResult> {
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
    const publicUrl = `${env.MINIO_PUBLIC_URL}/${this.buckets.products}/${storageKey}`;

    await this.repo.createImage({
      id: imageId,
      productId: input.productId,
      sellerId: input.sellerId,
      storageKey,
      url: publicUrl,
      sortOrder: existingCount,
      processingStatus: 'pending',
    });

    const command = new PutObjectCommand({
      Bucket: this.buckets.products,
      Key: storageKey,
      ContentType: input.contentType,
    });
    const uploadUrl = await getSignedUrl(this.s3, command, { expiresIn: PRESIGN_TTL_SEC });

    return {
      uploadUrl,
      imageId,
      storageKey,
      expiresInSec: PRESIGN_TTL_SEC,
      maxFileSizeBytes: MAX_FILE_SIZE_BYTES,
    };
  }

  /**
   * Client upload'u bitirdiğinde çağrılır. Dosyanın MinIO'da varlığını
   * doğrular ve image-processing job'unu kuyruğa alır.
   */
  async completeProductImage(sellerId: string, imageId: string): Promise<void> {
    const image = await this.repo.findBySellerAndId(sellerId, imageId);
    if (!image) throw new NotFoundError('Image', imageId);
    if (image.processingStatus === 'ready') return;

    try {
      await this.s3.send(
        new HeadObjectCommand({ Bucket: this.buckets.products, Key: image.storageKey }),
      );
    } catch {
      throw new BusinessRuleError('Dosya henüz yüklenmemiş veya hatalı yüklendi');
    }

    await this.repo.updateProcessing(imageId, 'processing');
    await this.imageQueue.add(
      'process-image',
      { imageId, productId: image.productId, sellerId: image.sellerId, storageKey: image.storageKey },
      {
        jobId: `image:${imageId}`,
        attempts: 3,
        backoff: { type: 'exponential', delay: 5_000 },
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 50 },
      },
    );
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

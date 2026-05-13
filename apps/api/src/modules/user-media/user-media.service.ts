import { Inject, Injectable } from '@nestjs/common';
import { Upload } from '@aws-sdk/lib-storage';
import type { Readable } from 'node:stream';
import { newId, BusinessRuleError } from '@yorecebimde/shared';
import { env } from '@yorecebimde/config/api';
import { S3_TOKEN, S3_BUCKETS, type S3Buckets } from '../../infrastructure/minio.module.js';
import { buildMediaUrl } from '../media/media.url.js';
import type { S3Client } from '@aws-sdk/client-s3';

const ALLOWED_CONTENT_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

export type UserMediaContext = 'review' | 'question_attachment' | 'profile_avatar';

export type UploadResult = {
  storageKey: string;
  publicUrl: string;
};

/**
 * Müşteri-uploaded media için direct multipart upload. Review, Q&A attachment,
 * profile avatar gibi case'ler. Browser → API → MinIO (internal network).
 *
 * Ürün görseli pipeline'ından farkı:
 *  - DB row YOK (uploader frontend'i URL'i doğrudan parent kayıta yazar)
 *  - Sharp processing YOK (originali kullan, max boyut sınırlı)
 *  - Virus scan placeholder (ClamAV Faz 8'de)
 */
@Injectable()
export class UserMediaService {
  constructor(
    @Inject(S3_TOKEN) private readonly s3: S3Client,
    @Inject(S3_BUCKETS) private readonly buckets: S3Buckets,
  ) {}

  async uploadMedia(input: {
    userId: string;
    context: UserMediaContext;
    contentType: string;
    fileName: string;
    stream: Readable;
  }): Promise<UploadResult> {
    if (!(ALLOWED_CONTENT_TYPES as readonly string[]).includes(input.contentType)) {
      throw new BusinessRuleError('Desteklenmeyen dosya türü', {
        contentType: input.contentType,
        allowed: ALLOWED_CONTENT_TYPES,
      });
    }

    const id = newId();
    const ext = extFromContentType(input.contentType);
    const storageKey = `users/${input.userId}/${input.context}/${id}.${ext}`;

    const upload = new Upload({
      client: this.s3,
      params: {
        Bucket: this.buckets.userMedia,
        Key: storageKey,
        Body: input.stream,
        ContentType: input.contentType,
        Metadata: {
          'uploaded-by': input.userId,
          'upload-context': input.context,
          'scan-status': 'pending',
        },
      },
    });
    try {
      await upload.done();
    } catch (err) {
      throw new BusinessRuleError('Dosya yüklenirken hata oluştu', {
        cause: err instanceof Error ? err.message : String(err),
      });
    }

    return {
      storageKey,
      publicUrl: buildMediaUrl(env.BETTER_AUTH_URL, this.buckets.userMedia, storageKey),
    };
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
    default:
      return 'bin';
  }
}

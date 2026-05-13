import { Inject, Injectable } from '@nestjs/common';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { newId, BusinessRuleError } from '@yorecebimde/shared';
import { env } from '@yorecebimde/config/api';
import { S3_TOKEN, S3_BUCKETS, type S3Buckets } from '../../infrastructure/minio.module.js';
import type { S3Client } from '@aws-sdk/client-s3';

const ALLOWED_CONTENT_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB review/Q&A için (ürün'den daha küçük)
const PRESIGN_TTL_SEC = 60 * 10;

export type UserMediaContext = 'review' | 'question_attachment' | 'profile_avatar';

export type PresignResult = {
  uploadUrl: string;
  storageKey: string;
  publicUrl: string;
  expiresInSec: number;
  maxFileSizeBytes: number;
};

/**
 * Müşteri-uploaded media için presigned PUT URL. Review, Q&A attachment,
 * (gelecek) profile avatar gibi case'ler.
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

  async presignUpload(input: {
    userId: string;
    context: UserMediaContext;
    contentType: string;
    fileName: string;
  }): Promise<PresignResult> {
    if (!(ALLOWED_CONTENT_TYPES as readonly string[]).includes(input.contentType)) {
      throw new BusinessRuleError('Desteklenmeyen dosya türü', {
        contentType: input.contentType,
        allowed: ALLOWED_CONTENT_TYPES,
      });
    }

    const id = newId();
    const ext = extFromContentType(input.contentType);
    // Path: users/<userId>/<context>/<id>.<ext>
    const storageKey = `users/${input.userId}/${input.context}/${id}.${ext}`;
    const publicUrl = `${env.MINIO_PUBLIC_URL}/${this.buckets.userMedia}/${storageKey}`;

    const command = new PutObjectCommand({
      Bucket: this.buckets.userMedia,
      Key: storageKey,
      ContentType: input.contentType,
      // ClamAV scan tag (Faz 8 — webhook listener temizleyecek/dosyayı silecek)
      Metadata: {
        'uploaded-by': input.userId,
        'upload-context': input.context,
        'scan-status': 'pending',
      },
    });
    const uploadUrl = await getSignedUrl(this.s3, command, { expiresIn: PRESIGN_TTL_SEC });

    return {
      uploadUrl,
      storageKey,
      publicUrl,
      expiresInSec: PRESIGN_TTL_SEC,
      maxFileSizeBytes: MAX_FILE_SIZE_BYTES,
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

import { Global, Module } from '@nestjs/common';
import { S3Client } from '@aws-sdk/client-s3';
import { env } from '@yorecebimde/config/api';

export const S3_TOKEN = Symbol('S3_CLIENT');
export const S3_BUCKETS = Symbol('S3_BUCKETS');

export type S3Buckets = {
  products: string;
  sellerDocuments: string;
  invoices: string;
  chatAttachments: string;
  disputes: string;
  backups: string;
  userMedia: string;
};

@Global()
@Module({
  providers: [
    {
      provide: S3_TOKEN,
      useFactory: () =>
        new S3Client({
          endpoint: `${env.MINIO_USE_SSL ? 'https' : 'http'}://${env.MINIO_ENDPOINT}:${env.MINIO_PORT}`,
          region: 'us-east-1',
          credentials: {
            accessKeyId: env.MINIO_ACCESS_KEY,
            secretAccessKey: env.MINIO_SECRET_KEY,
          },
          forcePathStyle: true,
        }),
    },
    {
      provide: S3_BUCKETS,
      useValue: {
        products: 'products',
        sellerDocuments: 'seller-documents',
        invoices: 'invoices',
        chatAttachments: 'chat-attachments',
        disputes: 'disputes',
        backups: 'backups',
        userMedia: 'user-media',
      } satisfies S3Buckets,
    },
  ],
  exports: [S3_TOKEN, S3_BUCKETS],
})
export class MinioModule {}

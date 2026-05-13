import { Controller, Get, Inject, NotFoundException, Param, Res } from '@nestjs/common';
import { GetObjectCommand, type S3Client } from '@aws-sdk/client-s3';
import type { FastifyReply } from 'fastify';
import type { Readable } from 'node:stream';
import { S3_TOKEN, S3_BUCKETS, type S3Buckets } from '../../infrastructure/minio.module.js';

// Buckets that may be served publicly through this proxy. Excludes anything
// with PII or financial data (seller-documents, invoices, disputes, backups).
const PUBLIC_BUCKETS = new Set(['products', 'user-media']);

@Controller('media')
export class MediaController {
  constructor(
    @Inject(S3_TOKEN) private readonly s3: S3Client,
    @Inject(S3_BUCKETS) private readonly buckets: S3Buckets,
  ) {
    void this.buckets;
  }

  @Get(':bucket/*')
  async get(
    @Param('bucket') bucket: string,
    @Param('0') key: string,
    @Res() reply: FastifyReply,
  ) {
    if (!PUBLIC_BUCKETS.has(bucket)) throw new NotFoundException();
    if (!key) throw new NotFoundException();

    let response;
    try {
      response = await this.s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    } catch {
      throw new NotFoundException();
    }
    if (!response.Body) throw new NotFoundException();

    if (response.ContentType) reply.header('content-type', response.ContentType);
    if (response.ContentLength) reply.header('content-length', String(response.ContentLength));
    if (response.ETag) reply.header('etag', response.ETag);
    // Hashed keys (products/{productId}/{imageId}/...) are immutable
    reply.header('cache-control', 'public, max-age=31536000, immutable');

    return reply.send(response.Body as Readable);
  }
}

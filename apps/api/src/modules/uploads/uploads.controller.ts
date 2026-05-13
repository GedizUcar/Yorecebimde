import { Controller, Delete, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { SellerGuard } from '../../common/guards/session.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { SessionUser } from '../../common/guards/session.guard.js';
import { UploadsService } from './uploads.service.js';
import { UploadsRepository } from './uploads.repository.js';
import { BusinessRuleError, NotFoundError } from '@yorecebimde/shared';

@Controller('uploads')
@UseGuards(SellerGuard)
export class UploadsController {
  constructor(
    private readonly service: UploadsService,
    private readonly repo: UploadsRepository,
  ) {}

  @Get('images/:imageId')
  async getImage(@CurrentUser() user: SessionUser, @Param('imageId') imageId: string) {
    const img = await this.repo.findBySellerAndId(user.sellerId!, imageId);
    if (!img) throw new NotFoundError('Image', imageId);
    return {
      data: {
        id: img.id,
        productId: img.productId,
        processingStatus: img.processingStatus,
        thumbnailUrl: img.thumbnailUrl,
        webpUrl: img.webpUrl,
        processingError: img.processingError,
      },
    };
  }

  /**
   * Single-step direct upload — browser POSTs multipart/form-data with a `file`
   * field. API streams to MinIO over the internal Docker network and enqueues
   * the image-processing worker. Replaces the previous presign + browser PUT
   * flow (which required a public storage subdomain).
   */
  @Post('products/:productId/image')
  async upload(
    @CurrentUser() user: SessionUser,
    @Param('productId') productId: string,
    @Req() req: FastifyRequest,
  ) {
    const part = await req.file();
    if (!part) throw new BusinessRuleError('Dosya bulunamadı');

    const result = await this.service.uploadProductImage({
      sellerId: user.sellerId!,
      productId,
      contentType: part.mimetype,
      fileName: part.filename,
      stream: part.file,
    });

    if (part.file.truncated) {
      throw new BusinessRuleError('Dosya çok büyük (max 10 MB)');
    }

    return { data: result };
  }

  @Delete('products/:productId/images/:imageId')
  async deleteImage(
    @CurrentUser() user: SessionUser,
    @Param('imageId') imageId: string,
  ) {
    await this.service.deleteImage(user.sellerId!, imageId);
    return { data: { imageId, deleted: true } };
  }
}

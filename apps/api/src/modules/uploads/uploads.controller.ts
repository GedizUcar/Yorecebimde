import { Body, Controller, Delete, Get, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { SellerGuard } from '../../common/guards/session.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { SessionUser } from '../../common/guards/session.guard.js';
import { UploadsService } from './uploads.service.js';
import { UploadsRepository } from './uploads.repository.js';
import { NotFoundError } from '@yorecebimde/shared';

const presignSchema = z.object({
  contentType: z.enum(['image/jpeg', 'image/png', 'image/webp', 'image/avif']),
  fileName: z.string().min(1).max(255),
});
class PresignDto extends createZodDto(presignSchema) {}

@Controller('uploads')
@UseGuards(SellerGuard)
export class UploadsController {
  constructor(
    private readonly service: UploadsService,
    private readonly repo: UploadsRepository,
  ) {}

  /** Image polling — frontend uploader status'u takip etmek için. */
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
   * Yeni ürün görseli için presigned PUT URL üretir.
   * Çağrı sırasında product_images satırı `pending` durumunda oluşturulur.
   */
  @Post('products/:productId/presign')
  async presign(
    @CurrentUser() user: SessionUser,
    @Param('productId') productId: string,
    @Body() body: PresignDto,
  ) {
    const result = await this.service.presignProductImage({
      sellerId: user.sellerId!,
      productId,
      contentType: body.contentType,
      fileName: body.fileName,
    });
    return { data: result };
  }

  /**
   * Client upload'u bitirdiğinde tetiklenir. MinIO'da dosya varlığını
   * doğrular ve Sharp processing job'unu kuyruğa alır.
   */
  @Post('products/:productId/images/:imageId/complete')
  @HttpCode(202)
  async complete(
    @CurrentUser() user: SessionUser,
    @Param('imageId') imageId: string,
  ) {
    await this.service.completeProductImage(user.sellerId!, imageId);
    return { data: { imageId, status: 'processing' } };
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

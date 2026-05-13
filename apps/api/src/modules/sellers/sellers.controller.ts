import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { NotFoundError } from '@yorecebimde/shared';
import { SellersRepository } from './sellers.repository.js';

@ApiTags('sellers')
@Controller('sellers')
export class SellersController {
  constructor(private readonly repo: SellersRepository) {}

  @Get()
  @ApiOperation({ summary: 'Public mağaza listesi (sitemap + listeleme için)' })
  async list(@Query('limit') limit?: string) {
    const data = await this.repo.listPublic(limit ? Number(limit) : 100);
    return { data };
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Public mağaza vitrin info' })
  async getPublic(@Param('slug') slug: string) {
    const seller = await this.repo.findPublicBySlug(slug);
    if (!seller) throw new NotFoundError('Seller', slug);
    return { data: seller };
  }
}

import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { NotFoundError } from '@yorecebimde/shared';
import { CategoriesRepository } from './categories.repository.js';

@ApiTags('categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly repo: CategoriesRepository) {}

  /** Tüm kategori ağacı (nested). Anasayfa kategori menüsü buradan beslenir. */
  @Get('tree')
  @ApiOperation({ summary: 'Nested kategori ağacı (active + non-deleted)' })
  async getTree() {
    const tree = await this.repo.getTree();
    return { data: tree };
  }

  /** Flat liste — admin tarafı veya breadcrumb için. */
  @Get()
  @ApiOperation({ summary: 'Flat aktif kategori listesi' })
  async list(@Query('parent') parentSlug?: string) {
    if (parentSlug) {
      const parent = await this.repo.findBySlug(parentSlug);
      if (!parent) throw new NotFoundError('Category', parentSlug);
      const data = await this.repo.findChildren(parent.id);
      return { data };
    }
    const data = await this.repo.listActive();
    return { data };
  }

  /** Bir kategorinin detayı + breadcrumb (ancestor zinciri). */
  @Get(':slug')
  @ApiOperation({ summary: 'Kategori detay + breadcrumb' })
  async getDetail(@Param('slug') slug: string) {
    const cat = await this.repo.findBySlug(slug);
    if (!cat) throw new NotFoundError('Category', slug);
    const breadcrumb = await this.repo.findAncestorsBySlug(slug);
    const children = await this.repo.findChildren(cat.id);
    return {
      data: {
        ...cat,
        breadcrumb,
        children,
      },
    };
  }
}

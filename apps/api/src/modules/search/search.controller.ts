import { Controller, Get, Post, Query } from '@nestjs/common';
import { SearchService } from './search.service.js';

@Controller('search')
export class SearchController {
  constructor(private readonly service: SearchService) {}

  /**
   * Public product search.
   * GET /v1/search/products?q=peynir&category=peynir&sort=relevance
   */
  @Get('products')
  async products(
    @Query('q') q?: string,
    @Query('category') category?: string,
    @Query('seller') seller?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('discounted') discounted?: string,
    @Query('coldChain') coldChain?: string,
    @Query('sort')
    sort?: 'relevance' | 'price_asc' | 'price_desc' | 'newest' | 'best_selling' | 'top_rated',
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.service.searchProducts({
      query: q ?? '',
      ...(category !== undefined ? { categorySlug: category } : {}),
      ...(seller !== undefined ? { sellerSlug: seller } : {}),
      ...(minPrice !== undefined ? { minPrice: Number(minPrice) } : {}),
      ...(maxPrice !== undefined ? { maxPrice: Number(maxPrice) } : {}),
      onlyDiscounted: discounted === 'true',
      onlyColdChain: coldChain === 'true',
      ...(sort !== undefined ? { sort } : {}),
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    });
    return {
      data: result.items,
      meta: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        hasMore: result.page * result.limit < result.total,
        query: result.query,
      },
    };
  }

  /**
   * Lightweight autocomplete — sadece nameTr + slug + sellerSlug + thumbnailUrl döner.
   * Frontend debounced search bar'da kullanır.
   */
  @Get('autocomplete')
  async autocomplete(@Query('q') q?: string, @Query('limit') limit?: string) {
    const query = (q ?? '').trim();
    if (query.length < 2) return { data: [] };
    const lim = Math.min(10, Math.max(1, limit ? Number(limit) : 5));
    const result = await this.service.searchProducts({ query, page: 1, limit: lim });
    return {
      data: result.items.map((h) => ({
        id: h.id,
        slug: h.slug,
        nameTr: h.nameTr,
        sellerSlug: h.sellerSlug,
        sellerName: h.sellerName,
        thumbnailUrl: h.thumbnailUrl,
        baseUnitPrice: h.baseUnitPrice,
        unit: h.unit,
      })),
    };
  }

  /**
   * Geçici admin reindex tetikleyici — Faz 2'de auth/RBAC eklenince
   * super_admin guard'ı alacak. Şimdilik internal kullanım için açık.
   */
  @Post('reindex/products')
  async reindexProducts() {
    const result = await this.service.reindexAll();
    return { data: result };
  }
}

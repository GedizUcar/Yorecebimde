import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { NotFoundError, money } from '@yorecebimde/shared';
import { ProductsRepository } from './products.repository.js';
import { BoostListingService } from '../boost/boost-listing.service.js';

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(
    private readonly repo: ProductsRepository,
    private readonly boost: BoostListingService,
  ) {}

  /** Public listeleme — kategori, satıcı, fiyat, indirim, soğuk zincir filter'ları. */
  @Get()
  @ApiOperation({ summary: 'Aktif ürünlerin public listesi' })
  async list(
    @Query('category') category?: string,
    @Query('seller') seller?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('discounted') discounted?: string,
    @Query('coldChain') coldChain?: string,
    @Query('sort') sort?: 'newest' | 'price_asc' | 'price_desc' | 'best_selling' | 'top_rated',
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.repo.publicListing({
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
    const p = page ? Number(page) : 1;
    const l = limit ? Number(limit) : 20;

    // Faz 6 — sponsorlu slot interleave (sadece ilk sayfa, kategori filtreliyse)
    let items: typeof result.items | Array<(typeof result.items)[number] & { isSponsored?: boolean; boostId?: string }> = result.items;
    if (p === 1 && result.items.length > 0) {
      const candidates = await this.boost.getCandidates({
        ...(category !== undefined ? { categorySlug: category } : {}),
        ...(seller !== undefined ? { sellerSlug: seller } : {}),
        limit: Math.ceil(l / 5) + 2,
      });
      if (candidates.length > 0) {
        const productIds = candidates.map((c) => c.productId);
        const boostedProducts = await this.repo.findManyByIdsForListing(productIds);
        const byId = new Map(boostedProducts.map((p) => [p.id, p] as const));
        const enriched = candidates
          .map((c) => {
            const product = byId.get(c.productId);
            if (!product) return null;
            return { ...c, product };
          })
          .filter((x): x is NonNullable<typeof x> => x !== null);
        items = this.boost.interleave(result.items, enriched);
      }
    }

    return {
      data: items,
      meta: {
        page: p,
        limit: l,
        total: result.total,
        hasMore: p * l < result.total,
      },
    };
  }

  /**
   * Public ürün detay — /products/<sellerSlug>/<productSlug>.
   * URL'i mağaza-bazlı tutuyoruz çünkü slug satıcı içinde unique.
   */
  @Get(':sellerSlug/:productSlug')
  @ApiOperation({ summary: 'Ürün detay (satıcı + ürün slug ile)' })
  async detail(
    @Param('sellerSlug') sellerSlug: string,
    @Param('productSlug') productSlug: string,
  ) {
    const product = await this.repo.findPublicBySlug(sellerSlug, productSlug);
    if (!product) throw new NotFoundError('Product', `${sellerSlug}/${productSlug}`);

    // Fiyat snapshot — frontend Faz 3 sepete eklerken kullanır
    const basePrice = money.fromMajor(product.baseUnitPrice);
    return {
      data: {
        ...product,
        // Derived fields
        formattedBasePrice: money.format(basePrice, 'tr'),
      },
    };
  }
}

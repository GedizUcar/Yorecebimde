import Link from 'next/link';
import { apiServer } from '@/lib/api';
import { ProductCard } from '@/components/product-card';
import type { ListingProduct } from '@/lib/api-types';

type Props = {
  searchParams: Promise<{ q?: string; sort?: string }>;
};

type SearchHit = {
  id: string;
  slug: string;
  sellerSlug: string;
  sellerName: string;
  nameTr: string;
  shortDescriptionTr: string | null;
  unit: string;
  baseUnitPrice: number;
  isColdChain: boolean;
  hasDiscount: boolean;
  bestDiscountPct: number;
  thumbnailUrl: string | null;
};

type SearchResponse = SearchHit[];

export default async function SearchPage({ searchParams }: Props) {
  const { q = '', sort } = await searchParams;

  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (sort) params.set('sort', sort);
  params.set('limit', '24');

  const result = await apiServer
    .get<SearchResponse>(`/v1/search/products?${params}`)
    .catch(() => [] as SearchHit[]);

  // SearchHit'i ProductCard'ın ListingProduct şemasına adapte et
  const products: ListingProduct[] = result.map((h) => {
    const base: ListingProduct = {
      id: h.id,
      sellerId: '',
      slug: h.slug,
      nameTr: h.nameTr,
      nameEn: null,
      descriptionTr: null,
      shortDescriptionTr: h.shortDescriptionTr,
      unit: h.unit as ListingProduct['unit'],
      variationMode: 'none',
      stepperMin: null,
      stepperMax: null,
      stepperStep: null,
      baseUnitPrice: String(h.baseUnitPrice),
      kdvRate: '0',
      kdvIncluded: true,
      isColdChain: h.isColdChain,
      weightGrams: null,
      stockQuantity: '0',
      isActive: true,
      ratingAvg: '0',
      ratingCount: 0,
      viewCount: 0,
      salesCount: 0,
      createdAt: '',
      updatedAt: '',
      seller: { id: '', slug: h.sellerSlug, displayName: h.sellerName },
    };
    if (h.bestDiscountPct > 0) base.bestDiscountPct = h.bestDiscountPct;
    if (h.thumbnailUrl) {
      base.primaryImage = { url: h.thumbnailUrl, webpUrl: h.thumbnailUrl, thumbnailUrl: h.thumbnailUrl };
    }
    return base;
  });

  return (
    <main className="tile-light">
      <div className="max-w-content mx-auto space-y-6">
        <nav className="text-sm text-ink-muted80">
          <ol className="flex flex-wrap items-center gap-2">
            <li>
              <Link href="/" className="hover:text-primary">
                Anasayfa
              </Link>
            </li>
            <li>›</li>
            <li className="text-ink font-medium">Arama</li>
          </ol>
        </nav>

        <div>
          <h1>{q ? `“${q}” için sonuçlar` : 'Arama'}</h1>
          <p className="text-sm text-ink-muted80">{products.length} ürün bulundu</p>
        </div>

        {q.length === 0 ? (
          <p className="text-ink-muted80">Aramak istediğiniz ürünü üst arama kutusuna yazın.</p>
        ) : products.length === 0 ? (
          <div className="rounded-lg bg-canvas-parchment p-12 text-center">
            <p className="text-ink-muted80">Sonuç bulunamadı. Farklı bir kelime deneyin.</p>
          </div>
        ) : (
          <ul className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map((p) => (
              <li key={p.id}>
                <ProductCard product={p} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}

export const dynamic = 'force-dynamic';

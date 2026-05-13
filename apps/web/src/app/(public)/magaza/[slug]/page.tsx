import { notFound } from 'next/navigation';
import Link from 'next/link';
import { apiServer, ApiClientError } from '@/lib/api';
import type { ListingProduct } from '@/lib/api-types';
import { ProductCard } from '@/components/product-card';

type PublicSeller = {
  id: string;
  slug: string;
  displayName: string;
  type: 'individual' | 'company';
  bio: string | null;
  logoUrl: string | null;
  coverUrl: string | null;
  contactEmail: string;
  contactPhone: string;
  addressProvince: string | null;
  addressDistrict: string | null;
  ratingAvg: string;
  ratingCount: number;
  totalSalesCount: number;
};

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function SellerStorefront({ params }: Props) {
  const { slug } = await params;

  let seller: PublicSeller;
  try {
    seller = await apiServer.get<PublicSeller>(`/v1/sellers/${slug}`);
  } catch (e) {
    if (e instanceof ApiClientError && e.status === 404) notFound();
    throw e;
  }

  const products = await apiServer
    .get<ListingProduct[]>(`/v1/products?seller=${encodeURIComponent(slug)}&limit=24`)
    .catch(() => [] as ListingProduct[]);

  const location = [seller.addressDistrict, seller.addressProvince].filter(Boolean).join(', ');

  return (
    <main className="tile-light">
      <div className="max-w-content mx-auto space-y-8">
        {/* Breadcrumb */}
        <nav className="text-sm text-ink-muted80">
          <ol className="flex flex-wrap items-center gap-2">
            <li>
              <Link href="/" className="hover:text-primary">
                Anasayfa
              </Link>
            </li>
            <li>›</li>
            <li className="text-ink font-medium">{seller.displayName}</li>
          </ol>
        </nav>

        {/* Mağaza header */}
        <header className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-canvas-parchment flex items-center justify-center text-2xl">
              {seller.type === 'company' ? '🏢' : '👨‍🌾'}
            </div>
            <div className="flex-1 min-w-0">
              <h1>{seller.displayName}</h1>
              {location && <p className="text-sm text-ink-muted80">📍 {location}</p>}
            </div>
          </div>
          {seller.bio && <p className="text-ink-muted80 max-w-prose">{seller.bio}</p>}
          <div className="flex flex-wrap gap-4 text-sm">
            <span className="text-ink-muted80">
              <span className="text-ink font-medium">{products.length}</span> ürün
            </span>
            <span className="text-ink-muted80">
              <span className="text-ink font-medium">{seller.totalSalesCount}</span> satış
            </span>
            {Number(seller.ratingAvg) > 0 && (
              <span className="text-ink-muted80">
                ⭐ <span className="text-ink font-medium">{seller.ratingAvg}</span> ({seller.ratingCount})
              </span>
            )}
          </div>
        </header>

        {/* Ürünler */}
        <section className="space-y-4 pt-6 border-t border-hairline">
          <h2 className="text-lg font-semibold">Ürünler</h2>
          {products.length === 0 ? (
            <div className="rounded-lg bg-canvas-parchment p-12 text-center">
              <p className="text-ink-muted80">Henüz ürün eklenmemiş.</p>
            </div>
          ) : (
            <ul className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {products.map((product) => (
                <li key={product.id}>
                  <ProductCard product={product} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  try {
    const s = await apiServer.get<PublicSeller>(`/v1/sellers/${slug}`);
    return {
      title: s.displayName,
      description: s.bio ?? `${s.displayName} mağazası — yöresel ürünler`,
    };
  } catch {
    return { title: 'Mağaza bulunamadı' };
  }
}

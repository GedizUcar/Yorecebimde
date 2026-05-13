import { notFound } from 'next/navigation';
import Link from 'next/link';
import { apiServer, ApiClientError } from '@/lib/api';
import type { CategoryDetail, ListingProduct } from '@/lib/api-types';
import { ProductCard } from '@/components/product-card';

type Props = {
  params: Promise<{ slug: string[] }>;
};

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params;
  const targetSlug = slug[slug.length - 1];
  if (!targetSlug) notFound();

  let category: CategoryDetail;
  try {
    category = await apiServer.get<CategoryDetail>(`/v1/categories/${targetSlug}`);
  } catch (e) {
    if (e instanceof ApiClientError && e.status === 404) notFound();
    throw e;
  }

  const products = await apiServer
    .get<ListingProduct[]>(`/v1/products?category=${encodeURIComponent(targetSlug)}&limit=24`)
    .catch(() => [] as ListingProduct[]);

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
            {category.breadcrumb.map((b, i) => (
              <li key={b.id} className="flex items-center gap-2">
                <span>›</span>
                {i === category.breadcrumb.length - 1 ? (
                  <span className="text-ink font-medium">{b.nameTr}</span>
                ) : (
                  <Link
                    href={`/kategori/${b.slug}`}
                    className="hover:text-primary"
                  >
                    {b.nameTr}
                  </Link>
                )}
              </li>
            ))}
          </ol>
        </nav>

        {/* Başlık */}
        <header className="space-y-2">
          <h1>{category.nameTr}</h1>
          {category.descriptionTr && (
            <p className="text-ink-muted80 max-w-prose">{category.descriptionTr}</p>
          )}
        </header>

        {/* Alt kategori chip'leri (varsa) */}
        {category.children.length > 0 && (
          <section>
            <h2 className="sr-only">Alt kategoriler</h2>
            <ul className="flex flex-wrap gap-2">
              {category.children.map((child) => (
                <li key={child.id}>
                  <Link
                    href={`/kategori/${child.slug}`}
                    className="inline-flex items-center px-4 py-2 rounded-pill bg-canvas-parchment hover:bg-canvas-pearl text-sm font-medium transition-colors"
                  >
                    {child.nameTr}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Ürün listesi */}
        <section className="space-y-4">
          <header className="flex items-baseline justify-between">
            <h2 className="text-lg font-semibold">
              Ürünler {products.length > 0 && <span className="text-ink-muted80">({products.length})</span>}
            </h2>
          </header>

          {products.length === 0 ? (
            <div className="rounded-lg bg-canvas-parchment p-12 text-center">
              <p className="text-ink-muted80">
                Bu kategoride henüz ürün yok. Satıcılarımızın ürün eklemesini bekliyoruz.
              </p>
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
  const targetSlug = slug[slug.length - 1];
  if (!targetSlug) return { title: 'Kategori bulunamadı' };

  try {
    const cat = await apiServer.get<CategoryDetail>(`/v1/categories/${targetSlug}`);
    return {
      title: cat.nameTr,
      description: cat.descriptionTr ?? `${cat.nameTr} kategorisindeki yöresel ürünler`,
    };
  } catch {
    return { title: 'Kategori bulunamadı' };
  }
}

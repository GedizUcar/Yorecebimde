import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { apiServer } from '@/lib/api';
import type { CategoryWithChildren, ListingProduct } from '@/lib/api-types';
import { ProductCard } from '@/components/product-card';
import { PlaceholderImage } from '@/components/placeholder-image';

export default async function HomePage() {
  const t = await getTranslations();

  const [tree, featured, discounted] = await Promise.all([
    apiServer.get<CategoryWithChildren[]>('/v1/categories/tree').catch(() => [] as CategoryWithChildren[]),
    apiServer.get<ListingProduct[]>('/v1/products?sort=newest&limit=8').catch(() => [] as ListingProduct[]),
    apiServer.get<ListingProduct[]>('/v1/products?discounted=true&limit=4').catch(() => [] as ListingProduct[]),
  ]);

  const topLevel = tree[0]?.children ?? [];

  return (
    <main>
      {/* Hero */}
      <section className="tile-parchment">
        <div className="max-w-narrow mx-auto text-center space-y-8">
          <h1 className="text-balance">{t('home.heroTitle')}</h1>
          <p className="text-lg text-ink-muted80 max-w-prose mx-auto">
            {t('home.heroSubtitle')}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link href="/" className="btn-primary">
              {t('home.ctaShop')}
            </Link>
            <Link href="/satici-ol" className="btn-ghost">
              {t('home.ctaSeller')}
            </Link>
          </div>
        </div>
      </section>

      {/* Kategoriler */}
      {topLevel.length > 0 && (
        <section className="tile-light">
          <div className="max-w-content mx-auto space-y-10">
            <header className="text-center space-y-2">
              <h2>Kategoriler</h2>
              <p className="text-ink-muted80">Yöresel gıdayı kategoriye göre keşfet</p>
            </header>
            <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {topLevel.map((cat) => (
                <li key={cat.id}>
                  <Link
                    href={`/kategori/${cat.slug}`}
                    className="group block aspect-square rounded-lg overflow-hidden relative hover:shadow-product transition-shadow"
                  >
                    {cat.iconUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={cat.iconUrl}
                        alt={cat.nameTr}
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <PlaceholderImage
                        seed={cat.slug}
                        category={cat.slug}
                        size="lg"
                        className="absolute inset-0 w-full h-full group-hover:scale-105 transition-transform duration-300"
                      />
                    )}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/80 via-ink/30 to-transparent p-4">
                      <span className="font-semibold text-canvas block">{cat.nameTr}</span>
                      {cat.children.length > 0 && (
                        <span className="text-xs text-canvas/70 mt-1 block">
                          {cat.children.length} alt kategori
                        </span>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* Öne çıkan ürünler */}
      {featured.length > 0 && (
        <section className="tile-parchment">
          <div className="max-w-content mx-auto space-y-8">
            <header className="text-center space-y-2">
              <h2>Yeni eklenenler</h2>
              <p className="text-ink-muted80">Üreticilerden son gelen ürünler</p>
            </header>
            <ul className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {featured.map((product) => (
                <li key={product.id}>
                  <ProductCard product={product} />
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* İndirimli ürünler (varsa) */}
      {discounted.length > 0 && (
        <section className="tile-dark">
          <div className="max-w-content mx-auto space-y-8">
            <header className="text-center space-y-2">
              <h2 className="text-white">İndirimde</h2>
              <p className="text-white/70">Sınırlı süre veya kalıcı indirimler</p>
            </header>
            <ul className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {discounted.map((product) => (
                <li key={product.id}>
                  <ProductCard product={product} />
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* Seller CTA */}
      <section className="tile-parchment">
        <div className="max-w-narrow mx-auto text-center space-y-4">
          <h3>Üreticiyseniz başvurun</h3>
          <p className="text-ink-muted80">
            Yöresel ürününüzü tüm Türkiye'ye satmak için satıcı başvurusu yapabilirsiniz.
          </p>
          <Link href="/satici-ol" className="btn-primary">
            {t('home.ctaSeller')}
          </Link>
        </div>
      </section>
    </main>
  );
}

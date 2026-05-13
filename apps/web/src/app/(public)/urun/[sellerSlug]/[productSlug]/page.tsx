import { notFound } from 'next/navigation';
import Link from 'next/link';
import { apiServer, ApiClientError } from '@/lib/api';
import type { ProductWithRelations } from '@/lib/api-types';
import { ProductGallery } from '@/components/product-gallery';
import { WishlistButton } from '@/components/wishlist-button';
import { AddToCartButton } from '@/components/add-to-cart-button';
import { ProductReviews } from '@/components/reviews/product-reviews';
import { ProductQuestions } from '@/components/questions/product-questions';

type Props = {
  params: Promise<{ sellerSlug: string; productSlug: string }>;
};

function formatPrice(amount: string | number): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(num);
}

export default async function ProductDetailPage({ params }: Props) {
  const { sellerSlug, productSlug } = await params;

  let product: ProductWithRelations;
  try {
    product = await apiServer.get<ProductWithRelations>(`/v1/products/${sellerSlug}/${productSlug}`);
  } catch (e) {
    if (e instanceof ApiClientError && e.status === 404) notFound();
    throw e;
  }

  const primaryCategory = product.categories.find((c) => c.isPrimary) ?? product.categories[0];
  const basePrice = parseFloat(product.baseUnitPrice);

  // En yüksek aktif indirimi göster (UI'da kullanıcıya gösterilen)
  const now = new Date();
  let bestDiscountPct = 0;
  let discountType: string | null = null;
  for (const d of product.discounts) {
    if (!d.percentage) continue;
    const pct = parseFloat(d.percentage);
    if (d.type === 'permanent' && pct > bestDiscountPct) {
      bestDiscountPct = pct;
      discountType = 'permanent';
    } else if (d.type === 'time_based' && d.startsAt && d.endsAt && pct > bestDiscountPct) {
      const start = new Date(d.startsAt);
      const end = new Date(d.endsAt);
      if (now >= start && now <= end) {
        bestDiscountPct = pct;
        discountType = 'time_based';
      }
    }
  }
  const hasQuantityDiscount = product.discounts.some((d) => d.type === 'quantity_based');
  const discountedPrice = bestDiscountPct > 0 ? basePrice * (1 - bestDiscountPct / 100) : null;

  const baseUrl =
    process.env.NEXT_PUBLIC_WEB_URL ?? 'https://yorecebimde-staging.gkteches.com';
  const finalPrice = discountedPrice ?? basePrice;
  const productJsonLd = {
    '@context': 'https://schema.org/',
    '@type': 'Product',
    name: product.nameTr,
    description: product.shortDescriptionTr ?? product.descriptionTr ?? product.nameTr,
    image: product.images.map((i) => i.webpUrl ?? i.url).filter(Boolean),
    brand: { '@type': 'Brand', name: product.seller.displayName },
    offers: {
      '@type': 'Offer',
      url: `${baseUrl}/urun/${product.seller.slug}/${product.slug}`,
      priceCurrency: 'TRY',
      price: finalPrice.toFixed(2),
      availability:
        Number(product.stockQuantity) > 0
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
      seller: { '@type': 'Organization', name: product.seller.displayName },
    },
  };
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org/',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Anasayfa', item: `${baseUrl}/` },
      ...(primaryCategory
        ? [
            {
              '@type': 'ListItem',
              position: 2,
              name: primaryCategory.nameTr,
              item: `${baseUrl}/kategori/${primaryCategory.slug}`,
            },
          ]
        : []),
      {
        '@type': 'ListItem',
        position: primaryCategory ? 3 : 2,
        name: product.nameTr,
        item: `${baseUrl}/urun/${product.seller.slug}/${product.slug}`,
      },
    ],
  };

  return (
    <main className="tile-light">
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <div className="max-w-content mx-auto space-y-8">
        {/* Breadcrumb */}
        <nav className="text-sm text-ink-muted80">
          <ol className="flex flex-wrap items-center gap-2">
            <li>
              <Link href="/" className="hover:text-primary">
                Anasayfa
              </Link>
            </li>
            {primaryCategory && (
              <>
                <li>›</li>
                <li>
                  <Link
                    href={`/kategori/${primaryCategory.slug}`}
                    className="hover:text-primary"
                  >
                    {primaryCategory.nameTr}
                  </Link>
                </li>
              </>
            )}
            <li>›</li>
            <li className="text-ink font-medium">{product.nameTr}</li>
          </ol>
        </nav>

        <div className="grid md:grid-cols-2 gap-12">
          {/* Sol — görsel galerisi */}
          <ProductGallery
            images={product.images.map((i) => ({
              id: i.id,
              full: i.webpUrl ?? i.url,
              thumb: i.thumbnailUrl ?? i.webpUrl ?? i.url,
              alt: i.altText ?? product.nameTr,
            }))}
            fallbackLabel="Ürün görseli yakında"
          />

          {/* Sağ — bilgi */}
          <div className="space-y-6">
            <div className="space-y-2">
              <Link
                href={`/magaza/${product.seller.slug}`}
                className="text-sm text-primary hover:underline"
              >
                {product.seller.displayName}
              </Link>
              <div className="flex items-start justify-between gap-3">
                <h1 className="text-3xl font-semibold flex-1">{product.nameTr}</h1>
                <WishlistButton productId={product.id} />
              </div>
              {product.shortDescriptionTr && (
                <p className="text-ink-muted80">{product.shortDescriptionTr}</p>
              )}
            </div>

            {/* Fiyat */}
            <div className="space-y-1">
              {discountedPrice !== null ? (
                <>
                  <p className="text-sm text-ink-muted80 line-through">
                    {formatPrice(basePrice)}
                    <span className="text-xs ml-1">/ {product.unit}</span>
                  </p>
                  <p className="text-3xl font-bold text-primary">
                    {formatPrice(discountedPrice)}
                    <span className="text-base text-ink-muted80 font-normal ml-1">
                      / {product.unit}
                    </span>
                  </p>
                  <p className="inline-block px-2 py-1 rounded-pill bg-primary text-white text-xs font-medium">
                    %{bestDiscountPct.toFixed(0)} indirim
                    {discountType === 'time_based' ? ' · sınırlı süre' : ''}
                  </p>
                </>
              ) : (
                <p className="text-3xl font-bold">
                  {formatPrice(basePrice)}
                  <span className="text-base text-ink-muted80 font-normal ml-1">
                    / {product.unit}
                  </span>
                </p>
              )}
              {hasQuantityDiscount && (
                <p className="text-sm text-primary mt-2">
                  Çok alana indirim — fazla aldıkça fiyat düşer
                </p>
              )}
            </div>

            {/* Varyasyonlar / Stepper — Faz 3'te sepete eklerken interaktif olur */}
            {product.variationMode === 'discrete' && product.variations.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Boy seçiniz</h3>
                <div className="flex flex-wrap gap-2">
                  {product.variations.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      disabled
                      className="px-4 py-2 rounded-pill border border-hairline text-sm hover:border-primary disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-ink-muted80">
                  Sepete ekleme Faz 3'te aktif olacak.
                </p>
              </div>
            )}
            {product.variationMode === 'stepper' && product.stepperMin && product.stepperMax && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Miktar</h3>
                <p className="text-sm text-ink-muted80">
                  {product.stepperMin}–{product.stepperMax} {product.unit}{' '}
                  ({product.stepperStep} {product.unit} artışla)
                </p>
              </div>
            )}

            {/* Özellikler */}
            <div className="space-y-1 text-sm">
              {product.isColdChain && (
                <p className="inline-block px-3 py-1 rounded-pill bg-canvas-parchment text-ink">
                  ❄ Soğuk zincir
                </p>
              )}
              <p className="text-ink-muted80">
                Stok: <span className="text-ink">{product.stockQuantity} {product.unit}</span>
              </p>
              <p className="text-ink-muted80">
                KDV: <span className="text-ink">%{product.kdvRate}{product.kdvIncluded ? ' (dahil)' : ' (hariç)'}</span>
              </p>
            </div>

            <AddToCartButton
              productId={product.id}
              unit={product.unit}
              stockQuantity={Number(product.stockQuantity)}
            />
          </div>
        </div>

        {/* Açıklama */}
        {product.descriptionTr && (
          <section className="max-w-prose space-y-3 pt-8 border-t border-hairline">
            <h2 className="text-xl font-semibold">Ürün hakkında</h2>
            <p className="text-ink-muted80 whitespace-pre-line">{product.descriptionTr}</p>
          </section>
        )}

        <section className="pt-8 border-t border-hairline space-y-4">
          <h2 className="text-xl font-semibold">Yorumlar</h2>
          <ProductReviews productId={product.id} />
        </section>

        <section className="pt-8 border-t border-hairline space-y-4">
          <h2 className="text-xl font-semibold">Soru & Cevap</h2>
          <ProductQuestions productId={product.id} />
        </section>
      </div>
    </main>
  );
}

export async function generateMetadata({ params }: Props) {
  const { sellerSlug, productSlug } = await params;
  try {
    const p = await apiServer.get<ProductWithRelations>(`/v1/products/${sellerSlug}/${productSlug}`);
    return {
      title: `${p.nameTr} · ${p.seller.displayName}`,
      description: p.shortDescriptionTr ?? p.nameTr,
    };
  } catch {
    return { title: 'Ürün bulunamadı' };
  }
}

'use client';

import Link from 'next/link';
import type { ListingProduct } from '@/lib/api-types';
import { WishlistButton } from '@/components/wishlist-button';
import { PlaceholderImage } from '@/components/placeholder-image';

function formatPrice(amount: string | number): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(num);
}

export function ProductCard({
  product,
}: {
  product: ListingProduct & { isSponsored?: boolean; boostId?: string };
}) {
  const basePrice = parseFloat(product.baseUnitPrice);
  const discountPct = product.bestDiscountPct ?? 0;
  const discountedPrice = discountPct > 0 ? basePrice * (1 - discountPct / 100) : null;

  function trackClick() {
    if (product.boostId) {
      void fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}/v1/boost/track/${product.boostId}/click`,
        { method: 'POST', credentials: 'omit' },
      ).catch(() => {});
    }
  }

  return (
    <Link
      href={`/urun/${product.seller.slug}/${product.slug}`}
      onClick={trackClick}
      className="group relative block rounded-lg border border-hairline overflow-hidden hover:shadow-product transition-shadow bg-canvas"
    >
      <div className="absolute top-2 right-2 z-10">
        <WishlistButton productId={product.id} size="sm" />
      </div>
      {product.isSponsored && (
        <span
          className="absolute top-2 left-2 z-10 px-2 py-1 rounded-pill bg-canvas/90 text-ink-muted80 text-[10px] font-medium border border-hairline"
          title="Sponsorlu içerik"
        >
          Sponsorlu
        </span>
      )}
      {/* Görsel */}
      <div className="relative aspect-square bg-canvas-parchment overflow-hidden">
        {product.primaryImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.primaryImage.thumbnailUrl ?? product.primaryImage.webpUrl ?? product.primaryImage.url}
            alt={product.nameTr}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <PlaceholderImage
            seed={product.nameTr}
            category={product.nameTr}
            size="lg"
            className="absolute inset-0 w-full h-full group-hover:scale-105 transition-transform duration-300"
          />
        )}
        {discountPct > 0 && (
          <span className="absolute top-2 left-2 px-2 py-1 rounded-pill bg-primary text-white text-xs font-semibold">
            %{discountPct.toFixed(0)} indirim
          </span>
        )}
        {product.isColdChain && (
          <span
            className="absolute bottom-2 left-2 px-2 py-1 rounded-pill bg-canvas text-ink text-xs font-medium border border-hairline"
            title="Soğuk zincir"
          >
            ❄
          </span>
        )}
      </div>

      <div className="p-4 space-y-2">
        <p className="text-xs text-ink-muted80 line-clamp-1">{product.seller.displayName}</p>
        <h3 className="text-sm font-semibold line-clamp-2 group-hover:text-primary transition-colors">
          {product.nameTr}
        </h3>
        {product.shortDescriptionTr && (
          <p className="text-xs text-ink-muted80 line-clamp-1">{product.shortDescriptionTr}</p>
        )}
        <div className="pt-1">
          {discountedPrice !== null ? (
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="text-sm text-ink-muted80 line-through">
                {formatPrice(basePrice)}
              </span>
              <span className="text-base font-bold text-primary">
                {formatPrice(discountedPrice)}
              </span>
              <span className="text-xs text-ink-muted80">/ {product.unit}</span>
            </div>
          ) : (
            <div className="flex items-baseline gap-1">
              <span className="text-base font-bold">{formatPrice(basePrice)}</span>
              <span className="text-xs text-ink-muted80">/ {product.unit}</span>
            </div>
          )}
          {product.hasQuantityDiscount && (
            <p className="text-xs text-primary mt-1">+ Çok alana indirim</p>
          )}
        </div>
      </div>
    </Link>
  );
}

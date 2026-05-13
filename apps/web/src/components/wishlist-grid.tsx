'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { getDeviceId } from '@/lib/device-id';
import { WishlistButton } from '@/components/wishlist-button';
import { PlaceholderImage } from '@/components/placeholder-image';

type Item = {
  id: string;
  productId: string;
  createdAt: string;
  product: {
    id: string;
    slug: string;
    nameTr: string;
    baseUnitPrice: string;
    unit: string;
    isColdChain: boolean;
    seller: { slug: string; displayName: string };
    primaryImage: { thumbnailUrl: string | null; webpUrl: string | null; url: string } | null;
  };
};

function formatPrice(amount: string): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
  }).format(parseFloat(amount));
}

export function WishlistGrid() {
  const [items, setItems] = useState<Item[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const deviceId = getDeviceId();
    apiClient
      .get<Item[]>('/v1/wishlist', { headers: { 'x-device-id': deviceId } })
      .then(setItems)
      .catch(() => setError('Beğendiklerim yüklenemedi.'));
  }, []);

  if (error) {
    return (
      <div className="rounded-lg bg-canvas-parchment p-12 text-center">
        <p className="text-ink-muted80">{error}</p>
      </div>
    );
  }

  if (items === null) {
    return <div className="text-sm text-ink-muted80">Yükleniyor…</div>;
  }

  if (items.length === 0) {
    return (
      <div className="rounded-lg bg-canvas-parchment p-12 text-center space-y-3">
        <p className="text-ink-muted80">Henüz beğendiğiniz ürün yok.</p>
        <Link href="/" className="inline-block text-primary hover:underline text-sm">
          Anasayfada gez →
        </Link>
      </div>
    );
  }

  return (
    <ul className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {items.map((item) => {
        const p = item.product;
        const thumb = p.primaryImage?.thumbnailUrl ?? p.primaryImage?.webpUrl ?? p.primaryImage?.url;
        return (
          <li key={item.id}>
            <Link
              href={`/urun/${p.seller.slug}/${p.slug}`}
              className="group relative block rounded-lg border border-hairline overflow-hidden hover:shadow-product transition-shadow bg-canvas"
            >
              <div className="absolute top-2 right-2 z-10">
                <WishlistButton productId={p.id} size="sm" />
              </div>
              <div className="relative aspect-square overflow-hidden">
                {thumb ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={thumb}
                    alt={p.nameTr}
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                ) : (
                  <PlaceholderImage
                    seed={p.nameTr}
                    category={p.nameTr}
                    size="lg"
                    className="absolute inset-0 w-full h-full group-hover:scale-105 transition-transform duration-300"
                  />
                )}
                {p.isColdChain && (
                  <span className="absolute bottom-2 left-2 px-2 py-1 rounded-pill bg-canvas text-ink text-xs font-medium border border-hairline">
                    ❄
                  </span>
                )}
              </div>
              <div className="p-4 space-y-1">
                <p className="text-xs text-ink-muted80 line-clamp-1">{p.seller.displayName}</p>
                <h3 className="text-sm font-semibold line-clamp-2 group-hover:text-primary transition-colors">
                  {p.nameTr}
                </h3>
                <p className="pt-1 flex items-baseline gap-1">
                  <span className="text-base font-bold">{formatPrice(p.baseUnitPrice)}</span>
                  <span className="text-xs text-ink-muted80">/ {p.unit}</span>
                </p>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';

type Review = {
  id: string;
  rating: number;
  body: string | null;
  photos: string[];
  sellerReply: string | null;
  sellerReplyAt: string | null;
  createdAt: string;
  reviewerName: string;
};

export function ProductReviews({ productId }: { productId: string }) {
  const [items, setItems] = useState<Review[] | null>(null);
  const [sort, setSort] = useState<'newest' | 'highest' | 'lowest'>('newest');

  useEffect(() => {
    apiClient
      .get<Review[]>(`/v1/reviews/product/${productId}?sort=${sort}`)
      .then(setItems)
      .catch(() => setItems([]));
  }, [productId, sort]);

  if (!items) return <p className="text-sm text-ink-muted80">Yükleniyor…</p>;

  if (items.length === 0) {
    return (
      <p className="text-sm text-ink-muted80">
        Henüz yorum yok. İlk yorumu siz yapabilirsiniz!
      </p>
    );
  }

  const avg = items.reduce((s, r) => s + r.rating, 0) / items.length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-3xl font-bold">{avg.toFixed(1)}</span>
          <span className="ml-2 text-sm text-ink-muted80">
            / 5 · {items.length} yorum
          </span>
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as typeof sort)}
          className="px-3 py-1 border border-hairline rounded-md text-sm"
        >
          <option value="newest">En yeni</option>
          <option value="highest">En yüksek puan</option>
          <option value="lowest">En düşük puan</option>
        </select>
      </div>

      <div className="space-y-3">
        {items.map((r) => (
          <div key={r.id} className="rounded-lg bg-canvas border border-hairline p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-amber-600">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                <span className="text-sm font-medium">{r.reviewerName}</span>
              </div>
              <span className="text-xs text-ink-muted80">
                {new Date(r.createdAt).toLocaleDateString('tr-TR')}
              </span>
            </div>
            {r.body && <p className="text-sm">{r.body}</p>}
            {r.photos.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {r.photos.map((url, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={i}
                    src={url}
                    alt=""
                    className="w-20 h-20 object-cover rounded-md border border-hairline"
                  />
                ))}
              </div>
            )}
            {r.sellerReply && (
              <div className="mt-2 pt-2 border-t border-hairline bg-canvas-parchment -m-4 mt-2 p-3">
                <p className="text-xs font-medium text-primary">Satıcı cevabı:</p>
                <p className="text-sm mt-1">{r.sellerReply}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

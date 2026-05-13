'use client';

import { useEffect, useState } from 'react';
import { apiClient, ClientApiError } from '@/lib/api-client';
import { UserMediaUploader } from '@/components/user-media-uploader';

type Reviewable = {
  orderItemId: string;
  orderId: string;
  productId: string;
  productName: string;
  orderNo: string;
  status: string;
  deliveredAt: string | null;
  reviewId: string | null;
};

export function MyReviews() {
  const [items, setItems] = useState<Reviewable[] | null>(null);
  const [active, setActive] = useState<Reviewable | null>(null);
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function load() {
    apiClient.get<Reviewable[]>('/v1/reviews/reviewable').then(setItems).catch(() => setItems([]));
  }
  useEffect(load, []);

  async function submit() {
    if (!active) return;
    setErr(null);
    setSubmitting(true);
    try {
      await apiClient.post('/v1/reviews', {
        orderItemId: active.orderItemId,
        rating,
        body: body.trim() || null,
        photos,
      });
      setActive(null);
      setBody('');
      setRating(5);
      setPhotos([]);
      load();
    } catch (e) {
      setErr(e instanceof ClientApiError ? e.message : 'Yorum kaydedilemedi');
    } finally {
      setSubmitting(false);
    }
  }

  if (!items) return <p className="text-sm text-ink-muted80">Yükleniyor…</p>;
  if (items.length === 0) {
    return (
      <p className="text-sm text-ink-muted80">
        Yorum yapabileceğiniz sipariş yok. Teslim aldığınız ürünler burada görünecek.
      </p>
    );
  }

  const pending = items.filter((i) => !i.reviewId);
  const done = items.filter((i) => i.reviewId);

  return (
    <div className="space-y-6">
      <section>
        <h2 className="font-semibold mb-3">Yorum Bekleyenler ({pending.length})</h2>
        {pending.length === 0 ? (
          <p className="text-sm text-ink-muted80">Tüm yorumlar tamam ✓</p>
        ) : (
          <div className="space-y-2">
            {pending.map((p) => (
              <div
                key={p.orderItemId}
                className="rounded-lg bg-canvas border border-hairline p-4 flex items-center justify-between"
              >
                <div>
                  <p className="font-medium">{p.productName}</p>
                  <p className="text-xs text-ink-muted80">Sipariş: {p.orderNo}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setActive(p)}
                  className="px-4 py-2 rounded-pill bg-primary text-white text-sm hover:bg-primary-700"
                >
                  Yorum Yaz
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {done.length > 0 && (
        <section>
          <h2 className="font-semibold mb-3">Yorumladığınız Ürünler ({done.length})</h2>
          <div className="space-y-2">
            {done.map((d) => (
              <div
                key={d.orderItemId}
                className="rounded-lg bg-canvas-parchment p-4 flex items-center justify-between"
              >
                <div>
                  <p className="font-medium">{d.productName}</p>
                  <p className="text-xs text-ink-muted80">{d.orderNo}</p>
                </div>
                <span className="text-xs text-green-700">✓ Yorum yapıldı</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {active && (
        <div className="fixed inset-0 bg-ink/40 flex items-center justify-center z-50 p-4">
          <div className="bg-canvas rounded-lg max-w-md w-full p-6 space-y-4">
            <h3 className="font-semibold">{active.productName}</h3>

            <div>
              <label className="text-sm font-medium">Puan:</label>
              <div className="flex items-center gap-1 mt-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setRating(n)}
                    className={`text-2xl ${n <= rating ? 'text-amber-500' : 'text-ink-muted80'}`}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="review-body" className="text-sm font-medium">
                Yorumunuz (opsiyonel):
              </label>
              <textarea
                id="review-body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={4}
                maxLength={2000}
                placeholder="Ürün hakkındaki düşünceleriniz…"
                className="w-full mt-1 px-3 py-2 border border-hairline rounded-md text-sm"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Fotoğraf (opsiyonel):</label>
              <div className="mt-1">
                <UserMediaUploader
                  context="review"
                  max={6}
                  current={photos}
                  onUploaded={(url) => setPhotos((p) => [...p, url])}
                  onRemove={(url) => setPhotos((p) => p.filter((u) => u !== url))}
                />
              </div>
            </div>

            {err && <p className="text-xs text-red-700">{err}</p>}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setActive(null)}
                className="px-4 py-2 rounded-pill border border-hairline text-sm hover:bg-canvas-parchment"
              >
                İptal
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={submitting}
                className="px-4 py-2 rounded-pill bg-primary text-white text-sm hover:bg-primary-700 disabled:opacity-60"
              >
                {submitting ? 'Kaydediliyor…' : 'Yorumu Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

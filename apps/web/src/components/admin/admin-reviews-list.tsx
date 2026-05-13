'use client';

import { useEffect, useState } from 'react';
import { apiClient, ClientApiError } from '@/lib/api-client';
import { useToast } from '@/components/toast';

type Review = {
  id: string;
  productId: string;
  productName: string | null;
  sellerName: string | null;
  reviewerName: string;
  rating: number;
  body: string | null;
  photos: string[];
  sellerReply: string | null;
  status: 'visible' | 'hidden_by_admin' | 'removed_by_user';
  hiddenReason: string | null;
  createdAt: string;
};

const STATUS_LABEL: Record<Review['status'], string> = {
  visible: 'Görünür',
  hidden_by_admin: 'Admin Gizledi',
  removed_by_user: 'Kullanıcı Kaldırdı',
};

const STATUS_COLOR: Record<Review['status'], string> = {
  visible: 'bg-green-100 text-green-700',
  hidden_by_admin: 'bg-red-100 text-red-700',
  removed_by_user: 'bg-canvas-parchment',
};

export function AdminReviewsList() {
  const { show } = useToast();
  const [items, setItems] = useState<Review[] | null>(null);
  const [status, setStatus] = useState<Review['status'] | 'all'>('all');

  function load() {
    const qs = status === 'all' ? '' : `?status=${status}`;
    apiClient.get<Review[]>(`/v1/admin/reviews${qs}`).then(setItems).catch(() => setItems([]));
  }
  useEffect(load, [status]);

  async function hide(r: Review) {
    const reason = prompt(`${r.reviewerName} yorumunu gizleyeceksiniz. Sebep (min 10 karakter):`);
    if (!reason || reason.length < 10) return show('Sebep en az 10 karakter olmalı', 'error');
    try {
      await apiClient.post(`/v1/admin/reviews/${r.id}/hide`, { reason });
      show('Yorum gizlendi', 'success');
      load();
    } catch (e) {
      show(e instanceof ClientApiError ? e.message : 'Başarısız', 'error');
    }
  }

  async function restore(r: Review) {
    if (!confirm(`${r.reviewerName} yorumunu tekrar göstermek istiyor musunuz?`)) return;
    try {
      await apiClient.post(`/v1/admin/reviews/${r.id}/restore`);
      show('Yorum tekrar görünür', 'success');
      load();
    } catch (e) {
      show(e instanceof ClientApiError ? e.message : 'Başarısız', 'error');
    }
  }

  if (!items) return <p className="text-sm text-ink-muted80">Yükleniyor…</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        {(['all', 'visible', 'hidden_by_admin', 'removed_by_user'] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatus(s)}
            className={`px-3 py-1 rounded-pill text-sm border ${
              status === s
                ? 'bg-primary text-white border-primary'
                : 'border-hairline hover:bg-canvas-parchment'
            }`}
          >
            {s === 'all' ? 'Tümü' : STATUS_LABEL[s]}
          </button>
        ))}
      </div>

      <p className="text-xs text-ink-muted80">{items.length} kayıt</p>

      {items.length === 0 ? (
        <p className="text-sm text-ink-muted80 text-center py-8">Sonuç yok.</p>
      ) : (
        <div className="space-y-3">
          {items.map((r) => (
            <div key={r.id} className="rounded-lg bg-canvas border border-hairline p-4 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-amber-600">
                      {'★'.repeat(r.rating)}
                      {'☆'.repeat(5 - r.rating)}
                    </span>
                    <span className="text-sm font-medium">{r.reviewerName}</span>
                    <span className="text-xs text-ink-muted80">
                      → {r.productName ?? '-'} ({r.sellerName ?? '-'})
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-pill text-xs ${STATUS_COLOR[r.status]}`}
                    >
                      {STATUS_LABEL[r.status]}
                    </span>
                  </div>
                  <p className="text-xs text-ink-muted80 mt-1">
                    {new Date(r.createdAt).toLocaleString('tr-TR')}
                  </p>
                </div>
                <div className="flex gap-2">
                  {r.status === 'visible' && (
                    <button
                      type="button"
                      onClick={() => hide(r)}
                      className="text-red-700 hover:underline text-sm"
                    >
                      Gizle
                    </button>
                  )}
                  {r.status === 'hidden_by_admin' && (
                    <button
                      type="button"
                      onClick={() => restore(r)}
                      className="text-primary hover:underline text-sm"
                    >
                      Geri Aç
                    </button>
                  )}
                </div>
              </div>
              {r.body && <p className="text-sm">{r.body}</p>}
              {r.sellerReply && (
                <div className="bg-canvas-parchment p-2 rounded-md text-xs">
                  <strong>Satıcı:</strong> {r.sellerReply}
                </div>
              )}
              {r.hiddenReason && (
                <div className="bg-red-50 p-2 rounded-md text-xs text-red-700">
                  <strong>Gizleme sebebi:</strong> {r.hiddenReason}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

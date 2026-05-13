'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';

type Dispute = {
  id: string;
  orderId: string;
  reason: string;
  customerMessage: string;
  sellerResponse: string | null;
  status: string;
  createdAt: string;
};

const STATUS_LABELS: Record<string, string> = {
  opened: 'Açık · satıcı cevabı bekleniyor',
  seller_responded: 'Satıcı cevap verdi',
  escalated: 'Süper admine eskale edildi',
  resolved_customer: 'Lehinize çözüldü',
  resolved_seller: 'Satıcı lehine çözüldü',
};

const REASONS: Record<string, string> = {
  not_received: 'Ulaşmadı',
  damaged: 'Hasarlı',
  wrong_item: 'Yanlış ürün',
  not_as_described: 'Açıklamayla uyumsuz',
  other: 'Diğer',
};

export function CustomerDisputesList() {
  const [items, setItems] = useState<Dispute[] | null>(null);

  useEffect(() => {
    apiClient.get<Dispute[]>('/v1/disputes').then(setItems).catch(() => setItems([]));
  }, []);

  if (!items) return <p className="text-sm text-ink-muted80">Yükleniyor…</p>;
  if (items.length === 0) {
    return (
      <div className="rounded-lg bg-canvas-parchment p-12 text-center">
        <p className="text-ink-muted80">Henüz iade talebiniz yok.</p>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {items.map((d) => (
        <li key={d.id} className="rounded-lg bg-canvas border border-hairline p-4 space-y-2">
          <div className="flex items-start justify-between gap-3">
            <p className="font-medium">{REASONS[d.reason] ?? d.reason}</p>
            <span className="px-2 py-1 rounded-pill bg-canvas-parchment text-xs">
              {STATUS_LABELS[d.status] ?? d.status}
            </span>
          </div>
          <p className="text-xs text-ink-muted80">
            {new Date(d.createdAt).toLocaleString('tr-TR')}
          </p>
          <p className="text-sm whitespace-pre-line">{d.customerMessage}</p>
          {d.sellerResponse && (
            <div className="rounded-md bg-canvas-parchment p-3 text-sm whitespace-pre-line">
              <p className="text-xs text-ink-muted80 mb-1">Satıcı cevabı:</p>
              {d.sellerResponse}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

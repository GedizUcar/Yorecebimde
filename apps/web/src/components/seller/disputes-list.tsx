'use client';

import { useEffect, useState } from 'react';
import { apiClient, ClientApiError } from '@/lib/api-client';
import { useToast } from '@/components/toast';

type Dispute = {
  id: string;
  orderId: string;
  reason: string;
  customerMessage: string;
  sellerResponse: string | null;
  status: string;
  autoEscalateAt: string | null;
  createdAt: string;
};

const STATUS_LABELS: Record<string, string> = {
  opened: 'Yeni',
  seller_responded: 'Cevap verildi (eskalasyon bekleniyor)',
  escalated: 'Süper admine eskale',
  resolved_customer: 'Müşteri lehine çözüldü',
  resolved_seller: 'Satıcı lehine çözüldü',
};

const REASONS: Record<string, string> = {
  not_received: 'Ulaşmadı',
  damaged: 'Hasarlı',
  wrong_item: 'Yanlış ürün',
  not_as_described: 'Açıklamayla uyumsuz',
  other: 'Diğer',
};

export function SellerDisputesList() {
  const { show } = useToast();
  const [items, setItems] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [decision, setDecision] = useState<'accept' | 'reject'>('reject');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    apiClient
      .get<Dispute[]>('/v1/seller/disputes')
      .then(setItems)
      .catch(() => show('Liste yüklenemedi', 'error'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function respond(disputeId: string) {
    if (message.length < 10) {
      show('Cevap en az 10 karakter olmalı', 'error');
      return;
    }
    setBusy(true);
    try {
      const updated = await apiClient.post<Dispute>(`/v1/seller/disputes/${disputeId}/respond`, {
        decision,
        message,
        evidence: [],
      });
      setItems((prev) => prev.map((d) => (d.id === disputeId ? updated : d)));
      setActiveId(null);
      setMessage('');
      show('Cevap kaydedildi', 'success');
    } catch (e) {
      show(e instanceof ClientApiError ? e.message : 'Cevap gönderilemedi', 'error');
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p className="text-sm text-ink-muted80">Yükleniyor…</p>;
  if (items.length === 0) {
    return (
      <div className="rounded-lg bg-canvas-parchment p-12 text-center">
        <p className="text-ink-muted80">İade talebi yok.</p>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {items.map((d) => (
        <li key={d.id} className="rounded-lg bg-canvas border border-hairline p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <p className="font-medium">{REASONS[d.reason] ?? d.reason}</p>
              <p className="text-xs text-ink-muted80">
                Sipariş: {d.orderId.substring(0, 8)}… ·{' '}
                {new Date(d.createdAt).toLocaleString('tr-TR')}
              </p>
            </div>
            <span className="px-2 py-1 rounded-pill bg-canvas-parchment text-xs">
              {STATUS_LABELS[d.status] ?? d.status}
            </span>
          </div>
          <div className="rounded-md bg-canvas-parchment p-3 text-sm whitespace-pre-line">
            <p className="text-xs text-ink-muted80 mb-1">Müşteri mesajı:</p>
            {d.customerMessage}
          </div>
          {d.sellerResponse && (
            <div className="rounded-md border border-hairline p-3 text-sm whitespace-pre-line">
              <p className="text-xs text-ink-muted80 mb-1">Sizin cevabınız:</p>
              {d.sellerResponse}
              {d.autoEscalateAt && (
                <p className="text-xs text-ink-muted80 mt-2">
                  Otomatik eskalasyon:{' '}
                  {new Date(d.autoEscalateAt).toLocaleString('tr-TR')}
                </p>
              )}
            </div>
          )}

          {d.status === 'opened' && (
            activeId === d.id ? (
              <div className="space-y-3 border-t border-hairline pt-3">
                <div className="flex gap-2">
                  {(['accept', 'reject'] as const).map((dec) => (
                    <button
                      key={dec}
                      type="button"
                      onClick={() => setDecision(dec)}
                      className={`px-3 py-1.5 rounded-pill text-sm border-2 ${
                        decision === dec
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-hairline'
                      }`}
                    >
                      {dec === 'accept' ? 'İadeyi Kabul Et' : 'Reddet'}
                    </button>
                  ))}
                </div>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                  placeholder="Mesajınız (kabul/red sebebiniz)"
                  className="w-full px-3 py-2 border border-hairline rounded-md text-sm"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => respond(d.id)}
                    disabled={busy || message.length < 10}
                    className="btn-primary text-sm disabled:opacity-60"
                  >
                    {busy ? 'Kaydediliyor…' : 'Cevabı Gönder'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveId(null)}
                    className="px-3 py-2 rounded-pill border border-hairline text-sm"
                  >
                    İptal
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setActiveId(d.id);
                  setMessage('');
                }}
                className="text-sm text-primary hover:underline"
              >
                Cevap ver →
              </button>
            )
          )}
        </li>
      ))}
    </ul>
  );
}

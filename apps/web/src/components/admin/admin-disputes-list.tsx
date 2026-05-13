'use client';

import { useEffect, useState } from 'react';
import { apiClient, ClientApiError } from '@/lib/api-client';
import { useToast } from '@/components/toast';

type Dispute = {
  id: string;
  orderId: string;
  userId: string;
  sellerId: string;
  reason: string;
  customerMessage: string;
  sellerResponse: string | null;
  status: string;
  autoEscalateAt: string | null;
  resolvedAt: string | null;
  resolution: string | null;
  createdAt: string;
};

const STATUS_LABELS: Record<string, string> = {
  opened: 'Açık',
  seller_responded: 'Satıcı cevap verdi',
  escalated: 'Eskale',
  resolved_customer: 'Müşteri lehine',
  resolved_seller: 'Satıcı lehine',
};

const REASONS: Record<string, string> = {
  not_received: 'Ulaşmadı',
  damaged: 'Hasarlı',
  wrong_item: 'Yanlış ürün',
  not_as_described: 'Açıklamayla uyumsuz',
  other: 'Diğer',
};

type Props = { searchParams?: Promise<{ status?: string }> };

export function AdminDisputesList({ searchParams }: Props) {
  const { show } = useToast();
  const [items, setItems] = useState<Dispute[] | null>(null);
  const [status, setStatus] = useState('');
  const [active, setActive] = useState<Dispute | null>(null);
  const [winner, setWinner] = useState<'customer' | 'seller' | 'split'>('customer');
  const [refundAmount, setRefundAmount] = useState('');
  const [decisionNotes, setDecisionNotes] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (searchParams) {
      searchParams.then((sp) => {
        if (sp.status) setStatus(sp.status);
      });
    }
  }, [searchParams]);

  async function load() {
    const qs = status ? `?status=${status}` : '';
    setItems(await apiClient.get<Dispute[]>(`/v1/admin/disputes${qs}`));
  }
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  async function resolve() {
    if (!active) return;
    if (decisionNotes.length < 10) return show('Karar açıklaması en az 10 karakter', 'error');
    setBusy(true);
    try {
      await apiClient.post(`/v1/admin/disputes/${active.id}/resolve`, {
        winner,
        decisionNotes,
        refundAmountCents: refundAmount ? Math.round(Number(refundAmount) * 100) : undefined,
      });
      show('Karar verildi', 'success');
      setActive(null);
      setRefundAmount('');
      setDecisionNotes('');
      void load();
    } catch (e) {
      show(e instanceof ClientApiError ? e.message : 'Karar kaydedilemedi', 'error');
    } finally {
      setBusy(false);
    }
  }

  if (!items) return <p className="text-sm text-ink-muted80">Yükleniyor…</p>;

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {['', 'opened', 'seller_responded', 'escalated', 'resolved_customer', 'resolved_seller'].map((s) => (
          <button
            key={s || 'all'}
            type="button"
            onClick={() => setStatus(s)}
            className={`px-4 py-1.5 rounded-pill text-sm border ${
              status === s
                ? 'bg-primary text-white border-primary'
                : 'border-hairline hover:border-primary'
            }`}
          >
            {s ? STATUS_LABELS[s] : 'Hepsi'}
          </button>
        ))}
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-ink-muted80 p-8 text-center bg-canvas-parchment rounded-lg">
          Bu filtrede iade yok.
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((d) => (
            <li
              key={d.id}
              className={`rounded-lg border p-4 ${
                d.status === 'escalated' ? 'border-red-300 bg-red-50' : 'border-hairline bg-canvas'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{REASONS[d.reason] ?? d.reason}</p>
                  <p className="text-xs text-ink-muted80">
                    Sipariş: {d.orderId.substring(0, 8)}… ·{' '}
                    {new Date(d.createdAt).toLocaleString('tr-TR')}
                  </p>
                </div>
                <div className="text-right">
                  <span
                    className={`px-2 py-1 rounded-pill text-xs ${
                      d.status === 'escalated'
                        ? 'bg-red-200 text-red-900'
                        : 'bg-canvas-parchment'
                    }`}
                  >
                    {STATUS_LABELS[d.status] ?? d.status}
                  </span>
                  {!d.resolvedAt && (
                    <button
                      type="button"
                      onClick={() => setActive(d)}
                      className="block mt-2 text-sm text-primary hover:underline"
                    >
                      Karar ver →
                    </button>
                  )}
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-3 mt-3 text-sm">
                <div className="rounded-md bg-canvas-parchment p-3 whitespace-pre-line">
                  <p className="text-xs text-ink-muted80 mb-1">Müşteri</p>
                  {d.customerMessage}
                </div>
                {d.sellerResponse && (
                  <div className="rounded-md border border-hairline p-3 whitespace-pre-line">
                    <p className="text-xs text-ink-muted80 mb-1">Satıcı</p>
                    {d.sellerResponse}
                  </div>
                )}
              </div>
              {d.resolution && (
                <div className="rounded-md bg-green-50 border border-green-200 p-3 mt-3 text-sm">
                  <p className="text-xs text-green-800 mb-1">Karar:</p>
                  {d.resolution}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Decision modal */}
      {active && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          onClick={() => setActive(null)}
        >
          <div
            className="bg-canvas rounded-lg max-w-xl w-full p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start">
              <h2 className="text-xl font-semibold">İade Kararı</h2>
              <button type="button" onClick={() => setActive(null)} className="text-ink-muted80">
                ✕
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Karar yönü</label>
              <div className="grid grid-cols-3 gap-2">
                {(['customer', 'seller', 'split'] as const).map((w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => setWinner(w)}
                    className={`px-3 py-2 rounded-md border-2 text-sm font-medium ${
                      winner === w
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-hairline hover:border-primary'
                    }`}
                  >
                    {w === 'customer' ? 'Müşteri lehine' : w === 'seller' ? 'Satıcı lehine' : 'Bölünmüş'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Refund miktarı (TL, müşteriye iade edilecek)
              </label>
              <input
                type="number"
                step="0.01"
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 border border-hairline rounded-md text-sm"
              />
              <p className="text-xs text-ink-muted80 mt-1">
                Iyzico refund Faz 4.3'te gerçek; şu an stub log atılacak.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Karar açıklaması</label>
              <textarea
                value={decisionNotes}
                onChange={(e) => setDecisionNotes(e.target.value)}
                rows={4}
                placeholder="Neden bu karara vardınız? (audit log'a yazılacak)"
                className="w-full px-3 py-2 border border-hairline rounded-md text-sm"
              />
            </div>

            <button
              type="button"
              onClick={resolve}
              disabled={busy || decisionNotes.length < 10}
              className="btn-primary w-full disabled:opacity-60"
            >
              {busy ? 'Kaydediliyor…' : 'Kararı Onayla'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

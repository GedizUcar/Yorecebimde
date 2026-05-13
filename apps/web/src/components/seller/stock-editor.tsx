'use client';

import { useEffect, useState } from 'react';
import { apiClient, ClientApiError } from '@/lib/api-client';
import { useToast } from '@/components/toast';

type Movement = {
  id: string;
  type: string;
  quantityDelta: string;
  quantityAfter: string;
  reason: string | null;
  createdAt: string;
};

type Props = {
  productId: string;
  currentStock: string;
  unit: string;
};

export function StockEditor({ productId, currentStock, unit }: Props) {
  const { show } = useToast();
  const [stock, setStock] = useState(currentStock);
  const [delta, setDelta] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<Movement[]>([]);

  useEffect(() => {
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadHistory() {
    try {
      const data = await apiClient.get<Movement[]>(
        `/v1/seller/products/${productId}/stock/history?limit=20`,
      );
      setHistory(data);
    } catch {
      // sessizce
    }
  }

  async function adjust() {
    if (!delta || !reason) {
      show('Miktar değişimi ve sebep zorunlu', 'error');
      return;
    }
    setBusy(true);
    try {
      const result = await apiClient.post<{ quantityAfter: number }>(
        `/v1/seller/products/${productId}/stock/adjust`,
        { delta: Number(delta), reason },
      );
      setStock(String(result.quantityAfter));
      setDelta('');
      setReason('');
      await loadHistory();
      show('Stok güncellendi', 'success');
    } catch (e) {
      show(e instanceof ClientApiError ? e.message : 'Güncellenemedi', 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bg-canvas border border-hairline rounded-lg p-6 space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Mevcut stok</h2>
        <p className="text-3xl font-bold mt-1">
          {stock} <span className="text-base text-ink-muted80 font-normal">{unit}</span>
        </p>
      </div>

      <div className="border-t border-hairline pt-4 space-y-3">
        <h3 className="text-sm font-medium">Hızlı düzeltme</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            type="number"
            step="0.001"
            value={delta}
            onChange={(e) => setDelta(e.target.value)}
            placeholder="Değişim (+10 veya -3)"
            className="px-3 py-2 border border-hairline rounded-md text-sm"
          />
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Sebep (yeni parti, fire, sayım düzeltmesi…)"
            className="px-3 py-2 border border-hairline rounded-md text-sm"
          />
        </div>
        <button
          type="button"
          onClick={adjust}
          disabled={busy}
          className="px-4 py-2 rounded-pill bg-primary text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
        >
          {busy ? 'Kaydediliyor…' : 'Stok güncelle'}
        </button>
      </div>

      <div className="border-t border-hairline pt-4 space-y-3">
        <h3 className="text-sm font-medium">Hareket geçmişi</h3>
        {history.length === 0 ? (
          <p className="text-sm text-ink-muted80">Henüz hareket yok.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {history.map((m) => {
              const delta = Number(m.quantityDelta);
              return (
                <li
                  key={m.id}
                  className="flex items-center justify-between py-2 border-b border-hairline last:border-0"
                >
                  <div>
                    <span
                      className={`font-mono ${delta >= 0 ? 'text-green-700' : 'text-red-700'}`}
                    >
                      {delta >= 0 ? '+' : ''}
                      {delta}
                    </span>
                    <span className="text-ink-muted80 ml-2">→ {m.quantityAfter}</span>
                    {m.reason && (
                      <span className="text-ink-muted80 ml-2">· {m.reason}</span>
                    )}
                  </div>
                  <span className="text-xs text-ink-muted80">
                    {new Date(m.createdAt).toLocaleString('tr-TR')}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient, ClientApiError } from '@/lib/api-client';
import { useToast } from '@/components/toast';

export function SellerOrderActions({ orderId, status }: { orderId: string; status: string }) {
  const router = useRouter();
  const { show } = useToast();
  const [busy, setBusy] = useState(false);
  const [showShipForm, setShowShipForm] = useState(false);
  const [trackingNo, setTrackingNo] = useState('');
  const [cargoMode, setCargoMode] = useState<
    'self_managed' | 'aras' | 'mng' | 'yurtici' | 'ptt'
  >('self_managed');
  const [showCancelForm, setShowCancelForm] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  async function call(endpoint: string, body?: unknown, successMsg = 'Güncellendi') {
    if (busy) return;
    setBusy(true);
    try {
      await apiClient.post(`/v1/seller/orders/${orderId}/${endpoint}`, body);
      show(successMsg, 'success');
      router.refresh();
      setShowShipForm(false);
      setShowCancelForm(false);
    } catch (e) {
      show(e instanceof ClientApiError ? e.message : 'İşlem başarısız', 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-lg bg-canvas border border-hairline p-5 space-y-3">
      <h2 className="font-semibold">Aksiyonlar</h2>

      {status === 'paid' && (
        <button
          type="button"
          onClick={() => call('confirm', undefined, 'Sipariş onaylandı')}
          disabled={busy}
          className="btn-primary w-full text-sm disabled:opacity-60"
        >
          Onayla
        </button>
      )}

      {status === 'confirmed' && (
        <button
          type="button"
          onClick={() => call('start-preparing', undefined, 'Hazırlığa başlandı')}
          disabled={busy}
          className="btn-primary w-full text-sm disabled:opacity-60"
        >
          Hazırlığa başla
        </button>
      )}

      {status === 'preparing' && !showShipForm && (
        <button
          type="button"
          onClick={() => setShowShipForm(true)}
          className="btn-primary w-full text-sm"
        >
          Kargoya ver
        </button>
      )}

      {status === 'preparing' && showShipForm && (
        <div className="space-y-2">
          <input
            type="text"
            value={trackingNo}
            onChange={(e) => setTrackingNo(e.target.value)}
            placeholder="Kargo takip no"
            className="w-full px-3 py-2 border border-hairline rounded-md text-sm"
          />
          <select
            value={cargoMode}
            onChange={(e) => setCargoMode(e.target.value as typeof cargoMode)}
            className="w-full px-3 py-2 border border-hairline rounded-md text-sm"
          >
            <option value="self_managed">Kendi kargo</option>
            <option value="aras">Aras</option>
            <option value="mng">MNG</option>
            <option value="yurtici">Yurtiçi</option>
            <option value="ptt">PTT</option>
          </select>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => call('ship', { trackingNo, cargoMode }, 'Kargoya verildi')}
              disabled={busy || trackingNo.length < 3}
              className="btn-primary flex-1 text-sm disabled:opacity-60"
            >
              {busy ? 'Kaydediliyor…' : 'Kaydet'}
            </button>
            <button
              type="button"
              onClick={() => setShowShipForm(false)}
              className="px-3 py-2 rounded-pill border border-hairline text-sm hover:bg-canvas-parchment"
            >
              İptal
            </button>
          </div>
        </div>
      )}

      {status === 'shipped' && (
        <button
          type="button"
          onClick={() => call('mark-delivered', undefined, 'Teslim edildi olarak işaretlendi')}
          disabled={busy}
          className="btn-primary w-full text-sm disabled:opacity-60"
        >
          Teslim edildi olarak işaretle
        </button>
      )}

      {(status === 'paid' || status === 'confirmed' || status === 'preparing') &&
        !showCancelForm && (
          <button
            type="button"
            onClick={() => setShowCancelForm(true)}
            className="w-full text-sm text-red-700 hover:underline"
          >
            İptal et
          </button>
        )}

      {showCancelForm && (
        <div className="space-y-2 border-t border-hairline pt-3">
          <textarea
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            rows={2}
            placeholder="İptal sebebi (zorunlu)"
            className="w-full px-3 py-2 border border-hairline rounded-md text-sm"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => call('cancel', { reason: cancelReason }, 'Sipariş iptal edildi')}
              disabled={busy || cancelReason.length < 3}
              className="px-3 py-2 rounded-pill bg-red-600 text-white text-sm flex-1 disabled:opacity-60"
            >
              İptal et
            </button>
            <button
              type="button"
              onClick={() => setShowCancelForm(false)}
              className="px-3 py-2 rounded-pill border border-hairline text-sm hover:bg-canvas-parchment"
            >
              Vazgeç
            </button>
          </div>
        </div>
      )}

      {(status === 'delivered' || status === 'completed' || status === 'cancelled') && (
        <p className="text-sm text-ink-muted80">Bu siparişte yapılacak işlem yok.</p>
      )}
    </div>
  );
}

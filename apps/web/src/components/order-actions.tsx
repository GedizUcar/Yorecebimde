'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient, ClientApiError } from '@/lib/api-client';
import { useToast } from '@/components/toast';

export function OrderActions({ orderId, status }: { orderId: string; status: string }) {
  const router = useRouter();
  const { show } = useToast();
  const [busy, setBusy] = useState(false);
  const [showDispute, setShowDispute] = useState(false);
  const [reason, setReason] = useState<
    'not_received' | 'damaged' | 'wrong_item' | 'not_as_described' | 'other'
  >('damaged');
  const [message, setMessage] = useState('');

  async function confirmDelivery() {
    if (busy) return;
    if (!confirm('Siparişi teslim aldığınızı onaylıyor musunuz?')) return;
    setBusy(true);
    try {
      await apiClient.post(`/v1/orders/${orderId}/confirm-delivery`);
      show('Sipariş onaylandı, tamamlandı', 'success');
      router.refresh();
    } catch (e) {
      show(e instanceof ClientApiError ? e.message : 'Onaylanamadı', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function openDispute() {
    if (message.length < 10) {
      show('Mesaj en az 10 karakter olmalı', 'error');
      return;
    }
    setBusy(true);
    try {
      await apiClient.post('/v1/disputes', { orderId, reason, message, evidence: [] });
      show('İade talebi açıldı', 'success');
      router.refresh();
    } catch (e) {
      show(e instanceof ClientApiError ? e.message : 'Açılamadı', 'error');
    } finally {
      setBusy(false);
    }
  }

  if (status === 'delivered' || status === 'shipped') {
    return (
      <div className="space-y-2">
        {status === 'delivered' && (
          <button
            type="button"
            onClick={confirmDelivery}
            disabled={busy}
            className="btn-primary w-full text-sm disabled:opacity-60"
          >
            {busy ? 'Onaylanıyor…' : 'Siparişi onayla'}
          </button>
        )}
        {showDispute ? (
          <div className="space-y-2 border-t border-hairline pt-3">
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value as typeof reason)}
              className="w-full px-3 py-2 border border-hairline rounded-md text-sm"
            >
              <option value="not_received">Sipariş ulaşmadı</option>
              <option value="damaged">Hasarlı geldi</option>
              <option value="wrong_item">Yanlış ürün</option>
              <option value="not_as_described">Açıklamayla uyumsuz</option>
              <option value="other">Diğer</option>
            </select>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              placeholder="Lütfen durumu açıklayın (en az 10 karakter)"
              className="w-full px-3 py-2 border border-hairline rounded-md text-sm"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={openDispute}
                disabled={busy || message.length < 10}
                className="px-3 py-2 rounded-pill bg-red-600 text-white text-sm flex-1 disabled:opacity-60"
              >
                İade aç
              </button>
              <button
                type="button"
                onClick={() => setShowDispute(false)}
                className="px-3 py-2 rounded-pill border border-hairline text-sm"
              >
                Vazgeç
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowDispute(true)}
            className="w-full text-sm text-red-700 hover:underline"
          >
            İade talebi aç
          </button>
        )}
      </div>
    );
  }
  return null;
}

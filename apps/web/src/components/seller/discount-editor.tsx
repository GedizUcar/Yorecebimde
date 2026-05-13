'use client';

import { useState } from 'react';
import { apiClient, ClientApiError } from '@/lib/api-client';
import type { Discount } from '@/lib/api-types';
import { useToast } from '@/components/toast';

type Props = {
  productId: string;
  initial: Discount[];
};

type NewDiscount =
  | { type: 'permanent'; percentage: string }
  | { type: 'time_based'; percentage: string; startsAt: string; endsAt: string }
  | { type: 'quantity_based'; tiers: Array<{ minQuantity: string; percentage: string }> };

export function DiscountEditor({ productId, initial }: Props) {
  const { show } = useToast();
  const [items, setItems] = useState<Discount[]>(initial.filter((d) => d.isActive));
  const [busy, setBusy] = useState(false);
  const [newD, setNewD] = useState<NewDiscount>({ type: 'permanent', percentage: '' });

  function setType(t: NewDiscount['type']) {
    if (t === 'permanent') setNewD({ type: 'permanent', percentage: '' });
    else if (t === 'time_based')
      setNewD({ type: 'time_based', percentage: '', startsAt: '', endsAt: '' });
    else
      setNewD({
        type: 'quantity_based',
        tiers: [{ minQuantity: '', percentage: '' }],
      });
  }

  async function create() {
    setBusy(true);
    try {
      let payload: unknown;
      if (newD.type === 'permanent') {
        payload = { type: 'permanent', percentage: Number(newD.percentage) };
      } else if (newD.type === 'time_based') {
        payload = {
          type: 'time_based',
          percentage: Number(newD.percentage),
          startsAt: new Date(newD.startsAt).toISOString(),
          endsAt: new Date(newD.endsAt).toISOString(),
        };
      } else {
        payload = {
          type: 'quantity_based',
          tiers: newD.tiers.map((t) => ({
            minQuantity: Number(t.minQuantity),
            percentage: Number(t.percentage),
          })),
        };
      }
      const created = await apiClient.post<Discount>(
        `/v1/seller/products/${productId}/discounts`,
        payload,
      );
      setItems((prev) => [...prev, created]);
      show('İndirim eklendi', 'success');
      setType('permanent');
    } catch (e) {
      show(e instanceof ClientApiError ? e.message : 'Eklenemedi', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    try {
      await apiClient.delete(`/v1/seller/products/${productId}/discounts/${id}`);
      setItems((prev) => prev.filter((x) => x.id !== id));
      show('İndirim kaldırıldı', 'info');
    } catch (e) {
      show(e instanceof ClientApiError ? e.message : 'Silinemedi', 'error');
    }
  }

  return (
    <div className="bg-canvas border border-hairline rounded-lg p-6 space-y-4">
      <h2 className="text-lg font-semibold">Aktif indirimler</h2>

      {items.length === 0 ? (
        <p className="text-sm text-ink-muted80">Aktif indirim yok.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((d) => (
            <li
              key={d.id}
              className="flex items-center justify-between gap-3 p-3 border border-hairline rounded-md"
            >
              <div>
                <p className="font-medium capitalize">
                  {d.type === 'permanent'
                    ? `Kalıcı %${d.percentage}`
                    : d.type === 'time_based'
                      ? `Süreli %${d.percentage} (${d.startsAt?.slice(0, 10)} → ${d.endsAt?.slice(0, 10)})`
                      : `Miktar bazlı (${d.tiers?.length ?? 0} kademe)`}
                </p>
                {d.type === 'quantity_based' && d.tiers && (
                  <p className="text-xs text-ink-muted80">
                    {d.tiers.map((t) => `${t.minQuantity}+ → %${t.percentage}`).join(' · ')}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => remove(d.id)}
                className="text-sm text-red-700 hover:underline"
              >
                Sil
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="border-t border-hairline pt-4 space-y-3">
        <h3 className="text-sm font-medium">Yeni indirim</h3>
        <select
          value={newD.type}
          onChange={(e) => setType(e.target.value as NewDiscount['type'])}
          className="px-3 py-2 border border-hairline rounded-md text-sm"
        >
          <option value="permanent">Kalıcı yüzde</option>
          <option value="time_based">Süreli (kampanya)</option>
          <option value="quantity_based">Miktar bazlı kademeli</option>
        </select>

        {newD.type === 'permanent' && (
          <div className="grid grid-cols-2 gap-3">
            <input
              type="number"
              step="0.01"
              min="0"
              max="95"
              value={newD.percentage}
              onChange={(e) => setNewD({ ...newD, percentage: e.target.value })}
              placeholder="Yüzde (örn. 10)"
              className="px-3 py-2 border border-hairline rounded-md text-sm"
            />
          </div>
        )}

        {newD.type === 'time_based' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              type="number"
              step="0.01"
              min="0"
              max="95"
              value={newD.percentage}
              onChange={(e) => setNewD({ ...newD, percentage: e.target.value })}
              placeholder="Yüzde"
              className="px-3 py-2 border border-hairline rounded-md text-sm"
            />
            <input
              type="datetime-local"
              value={newD.startsAt}
              onChange={(e) => setNewD({ ...newD, startsAt: e.target.value })}
              className="px-3 py-2 border border-hairline rounded-md text-sm"
            />
            <input
              type="datetime-local"
              value={newD.endsAt}
              onChange={(e) => setNewD({ ...newD, endsAt: e.target.value })}
              className="px-3 py-2 border border-hairline rounded-md text-sm"
            />
          </div>
        )}

        {newD.type === 'quantity_based' && (
          <div className="space-y-2">
            {newD.tiers.map((t, i) => (
              <div key={i} className="grid grid-cols-2 gap-3">
                <input
                  type="number"
                  step="1"
                  min="1"
                  value={t.minQuantity}
                  onChange={(e) => {
                    const tiers = [...newD.tiers];
                    tiers[i] = { ...tiers[i]!, minQuantity: e.target.value };
                    setNewD({ ...newD, tiers });
                  }}
                  placeholder="Min miktar"
                  className="px-3 py-2 border border-hairline rounded-md text-sm"
                />
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="95"
                  value={t.percentage}
                  onChange={(e) => {
                    const tiers = [...newD.tiers];
                    tiers[i] = { ...tiers[i]!, percentage: e.target.value };
                    setNewD({ ...newD, tiers });
                  }}
                  placeholder="Yüzde"
                  className="px-3 py-2 border border-hairline rounded-md text-sm"
                />
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                setNewD({
                  ...newD,
                  tiers: [...newD.tiers, { minQuantity: '', percentage: '' }],
                })
              }
              className="text-sm text-primary hover:underline"
            >
              + Kademe ekle
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={create}
          disabled={busy}
          className="px-4 py-2 rounded-pill bg-primary text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
        >
          {busy ? 'Ekleniyor…' : 'İndirim ekle'}
        </button>
      </div>
    </div>
  );
}

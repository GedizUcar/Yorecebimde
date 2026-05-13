'use client';

import { useState } from 'react';
import { apiClient, ClientApiError } from '@/lib/api-client';
import { useToast } from '@/components/toast';

type VariationDraft = {
  id?: string;
  label: string;
  quantity: string;
  priceOverride: string | null;
  sku: string | null;
  sortOrder: number;
  isActive: boolean;
};

type Props = {
  productId: string;
  variationMode: 'none' | 'discrete' | 'stepper';
  initial: VariationDraft[];
};

export function VariationEditor({ productId, variationMode, initial }: Props) {
  const { show } = useToast();
  const [items, setItems] = useState<VariationDraft[]>(initial);
  const [newItem, setNewItem] = useState<VariationDraft>({
    label: '',
    quantity: '',
    priceOverride: null,
    sku: null,
    sortOrder: 0,
    isActive: true,
  });
  const [busy, setBusy] = useState(false);

  if (variationMode !== 'discrete') {
    return (
      <div className="bg-canvas border border-hairline rounded-lg p-6 text-sm text-ink-muted80">
        {variationMode === 'none'
          ? 'Varyasyon eklemek için önce Genel sekmesinden modu "Sabit seçenekler" yapın.'
          : 'Stepper modu varyasyon kaydı kullanmaz — min/max/step Genel sekmesinde tanımlıdır.'}
      </div>
    );
  }

  async function addVariation() {
    if (!newItem.label || !newItem.quantity) {
      show('Etiket ve miktar zorunlu', 'error');
      return;
    }
    setBusy(true);
    try {
      const created = await apiClient.post<VariationDraft & { id: string }>(
        `/v1/seller/products/${productId}/variations`,
        {
          label: newItem.label,
          quantity: Number(newItem.quantity),
          ...(newItem.priceOverride
            ? { priceOverride: Number(newItem.priceOverride) }
            : {}),
          ...(newItem.sku ? { sku: newItem.sku } : {}),
          sortOrder: items.length,
        },
      );
      setItems((prev) => [...prev, created]);
      setNewItem({
        label: '',
        quantity: '',
        priceOverride: null,
        sku: null,
        sortOrder: 0,
        isActive: true,
      });
      show('Varyasyon eklendi', 'success');
    } catch (e) {
      show(e instanceof ClientApiError ? e.message : 'Eklenemedi', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function removeVariation(id: string) {
    try {
      await apiClient.delete(`/v1/seller/products/${productId}/variations/${id}`);
      setItems((prev) => prev.filter((x) => x.id !== id));
      show('Varyasyon silindi', 'info');
    } catch (e) {
      show(e instanceof ClientApiError ? e.message : 'Silinemedi', 'error');
    }
  }

  return (
    <div className="bg-canvas border border-hairline rounded-lg p-6 space-y-4">
      <h2 className="text-lg font-semibold">Sabit seçenekler</h2>

      {items.length === 0 ? (
        <p className="text-sm text-ink-muted80">Henüz seçenek yok. Aşağıdan ekleyin.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((v) => (
            <li
              key={v.id}
              className="flex items-center justify-between gap-3 p-3 border border-hairline rounded-md"
            >
              <div>
                <p className="font-medium">{v.label}</p>
                <p className="text-xs text-ink-muted80">
                  {v.quantity} birim
                  {v.priceOverride && ` · ${v.priceOverride} ₺ override`}
                  {v.sku && ` · SKU: ${v.sku}`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => v.id && removeVariation(v.id)}
                className="text-sm text-red-700 hover:underline"
              >
                Sil
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="border-t border-hairline pt-4 space-y-3">
        <h3 className="text-sm font-medium">Yeni seçenek</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input
            type="text"
            value={newItem.label}
            onChange={(e) => setNewItem({ ...newItem, label: e.target.value })}
            placeholder="Etiket (ör. 1 kg)"
            className="px-3 py-2 border border-hairline rounded-md text-sm"
          />
          <input
            type="number"
            step="0.001"
            value={newItem.quantity}
            onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })}
            placeholder="Miktar"
            className="px-3 py-2 border border-hairline rounded-md text-sm"
          />
          <input
            type="number"
            step="0.01"
            value={newItem.priceOverride ?? ''}
            onChange={(e) =>
              setNewItem({ ...newItem, priceOverride: e.target.value || null })
            }
            placeholder="Override fiyat (ops.)"
            className="px-3 py-2 border border-hairline rounded-md text-sm"
          />
          <input
            type="text"
            value={newItem.sku ?? ''}
            onChange={(e) => setNewItem({ ...newItem, sku: e.target.value || null })}
            placeholder="SKU (ops.)"
            className="px-3 py-2 border border-hairline rounded-md text-sm"
          />
        </div>
        <button
          type="button"
          onClick={addVariation}
          disabled={busy}
          className="px-4 py-2 rounded-pill bg-primary text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
        >
          {busy ? 'Ekleniyor…' : '+ Seçenek ekle'}
        </button>
      </div>
    </div>
  );
}

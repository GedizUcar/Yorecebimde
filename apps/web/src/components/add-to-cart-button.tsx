'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { addToCart } from '@/lib/cart-store';
import { ClientApiError } from '@/lib/api-client';
import { useToast } from '@/components/toast';

type Props = {
  productId: string;
  variationId?: string;
  unit: string;
  stockQuantity: number;
  disabled?: boolean;
};

export function AddToCartButton({ productId, variationId, unit, stockQuantity, disabled }: Props) {
  const router = useRouter();
  const { show } = useToast();
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState(false);

  const max = Math.max(0, Math.floor(stockQuantity));
  const noStock = max === 0;

  async function handleAdd() {
    if (busy || noStock) return;
    setBusy(true);
    try {
      await addToCart({
        productId,
        ...(variationId ? { variationId } : {}),
        quantity: qty,
      });
      show(`Sepete eklendi (${qty} ${unit})`, 'success');
      router.refresh();
    } catch (e) {
      show(e instanceof ClientApiError ? e.message : 'Eklenemedi', 'error');
    } finally {
      setBusy(false);
    }
  }

  if (noStock) {
    return (
      <button
        type="button"
        disabled
        className="btn-primary w-full opacity-60 cursor-not-allowed"
      >
        Stokta yok
      </button>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="text-sm text-ink-muted80">Miktar:</span>
        <div className="flex items-center border border-hairline rounded-pill overflow-hidden">
          <button
            type="button"
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            className="w-9 h-9 hover:bg-canvas-parchment transition-colors"
            aria-label="Azalt"
          >
            −
          </button>
          <span className="w-12 text-center text-sm font-medium">{qty}</span>
          <button
            type="button"
            onClick={() => setQty((q) => Math.min(max, q + 1))}
            className="w-9 h-9 hover:bg-canvas-parchment transition-colors"
            aria-label="Artır"
          >
            +
          </button>
        </div>
        <span className="text-xs text-ink-muted80">/ {unit}</span>
      </div>
      <button
        type="button"
        onClick={handleAdd}
        disabled={busy || disabled}
        className="btn-primary w-full disabled:opacity-60"
      >
        {busy ? 'Ekleniyor…' : 'Sepete Ekle'}
      </button>
    </div>
  );
}

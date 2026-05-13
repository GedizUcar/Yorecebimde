'use client';

import { useState } from 'react';
import { apiClient, ClientApiError } from '@/lib/api-client';

type ValidationResult = {
  couponId: string;
  code: string;
  discountCents: number;
  description: string | null;
};

export function CouponInput({
  cartSubtotalCents,
  onApply,
}: {
  cartSubtotalCents: number;
  onApply?: (result: ValidationResult | null) => void;
}) {
  const [code, setCode] = useState('');
  const [applied, setApplied] = useState<ValidationResult | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function apply() {
    if (!code.trim()) return;
    setErr(null);
    setBusy(true);
    try {
      const res = await apiClient.post<ValidationResult>('/v1/coupons/validate', {
        code: code.trim(),
        cartSubtotalCents,
      });
      setApplied(res);
      onApply?.(res);
    } catch (e) {
      setErr(e instanceof ClientApiError ? e.message : 'Kupon doğrulanamadı');
      setApplied(null);
      onApply?.(null);
    } finally {
      setBusy(false);
    }
  }

  function remove() {
    setApplied(null);
    setCode('');
    setErr(null);
    onApply?.(null);
  }

  if (applied) {
    return (
      <div className="rounded-md bg-green-50 border border-green-200 p-3 space-y-1">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-green-700">Kupon uygulandı:</p>
            <p className="text-sm font-mono font-semibold">{applied.code}</p>
            {applied.description && (
              <p className="text-xs text-ink-muted80">{applied.description}</p>
            )}
          </div>
          <div className="text-right">
            <p className="text-xs text-ink-muted80">İndirim:</p>
            <p className="text-sm font-semibold text-green-700">
              −{(applied.discountCents / 100).toFixed(2)} ₺
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={remove}
          className="text-xs text-red-700 hover:underline"
        >
          Kaldır
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-ink-muted80">Kupon kodu</label>
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="KODU GİRİN"
          maxLength={50}
          className="flex-1 px-3 py-2 border border-hairline rounded-md text-sm font-mono"
        />
        <button
          type="button"
          onClick={apply}
          disabled={busy || !code.trim()}
          className="px-4 py-2 rounded-pill border border-primary text-primary text-sm font-medium hover:bg-primary hover:text-white disabled:opacity-60"
        >
          {busy ? '…' : 'Uygula'}
        </button>
      </div>
      {err && <p className="text-xs text-red-700">{err}</p>}
    </div>
  );
}

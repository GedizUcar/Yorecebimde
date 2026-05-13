'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';

type Balance = {
  balance: number;
  redeemPerLira: number;
};

/**
 * Checkout sırasında puan kullanma slider'ı. Kullanıcı X puan seçer, X/100 ₺
 * indirim sepetin toplamına yansır. Backend order create sırasında validate eder.
 */
export function LoyaltyRedeemSlider({
  cartTotalCents,
  onChange,
}: {
  cartTotalCents: number;
  onChange: (points: number, discountCents: number) => void;
}) {
  const [balance, setBalance] = useState<Balance | null>(null);
  const [points, setPoints] = useState(0);

  useEffect(() => {
    apiClient.get<Balance>('/v1/loyalty/balance').then(setBalance).catch(() => setBalance(null));
  }, []);

  if (!balance || balance.balance === 0) {
    return null;
  }

  const maxByBalance = balance.balance;
  const maxByCart = Math.floor((cartTotalCents / 100) * balance.redeemPerLira);
  const max = Math.min(maxByBalance, maxByCart);

  function update(p: number) {
    const clamped = Math.max(0, Math.min(max, p));
    setPoints(clamped);
    const cents = Math.floor((clamped / balance!.redeemPerLira) * 100);
    onChange(clamped, cents);
  }

  const discountLiras = (points / balance.redeemPerLira).toFixed(2);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-ink-muted80">
          Puanımdan kullan ({balance.balance.toLocaleString('tr-TR')} mevcut)
        </label>
        {points > 0 && (
          <button
            type="button"
            onClick={() => update(0)}
            className="text-xs text-red-700 hover:underline"
          >
            Kaldır
          </button>
        )}
      </div>
      <input
        type="range"
        min={0}
        max={max}
        step={balance.redeemPerLira}
        value={points}
        onChange={(e) => update(Number(e.target.value))}
        className="w-full accent-primary"
      />
      <div className="flex justify-between text-xs">
        <span className="text-ink-muted80">
          {points.toLocaleString('tr-TR')} puan
        </span>
        <span className="text-green-700 font-medium">
          −{discountLiras} ₺ indirim
        </span>
      </div>
    </div>
  );
}

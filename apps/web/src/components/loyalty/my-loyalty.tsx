'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';

type Balance = {
  balance: number;
  lifetimeEarned: number;
  lifetimeRedeemed: number;
  lirasFromPoints: number;
  redeemPerLira: number;
};

type Tx = {
  id: string;
  type: 'earn' | 'redeem' | 'expire' | 'refund_revoke' | 'admin_adjust';
  points: number;
  orderId: string | null;
  note: string | null;
  createdAt: string;
  expiresAt: string | null;
};

const TYPE_LABELS: Record<Tx['type'], string> = {
  earn: 'Kazanım',
  redeem: 'Kullanım',
  expire: 'Süresi Dolan',
  refund_revoke: 'İade Geri Alımı',
  admin_adjust: 'Admin Düzeltme',
};

export function MyLoyalty() {
  const [balance, setBalance] = useState<Balance | null>(null);
  const [txs, setTxs] = useState<Tx[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      apiClient.get<Balance>('/v1/loyalty/balance'),
      apiClient.get<Tx[]>('/v1/loyalty/transactions'),
    ])
      .then(([b, t]) => {
        setBalance(b);
        setTxs(t);
      })
      .catch((e) => setErr(e instanceof Error ? e.message : 'Hata'));
  }, []);

  if (err) return <p className="text-sm text-red-700">{err}</p>;
  if (!balance || !txs) return <p className="text-sm text-ink-muted80">Yükleniyor…</p>;

  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-canvas border border-hairline p-6">
        <p className="text-sm text-ink-muted80">Mevcut puan bakiyesi</p>
        <p className="text-4xl font-bold text-primary mt-2">
          {balance.balance.toLocaleString('tr-TR')}
        </p>
        <p className="text-sm text-ink-muted80 mt-2">
          ≈ <strong>{balance.lirasFromPoints.toLocaleString('tr-TR')} ₺</strong> indirim hakkı
          ({balance.redeemPerLira} puan = 1 ₺)
        </p>
        <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-hairline">
          <div>
            <p className="text-xs text-ink-muted80">Toplam Kazanılan</p>
            <p className="text-lg font-semibold">
              {balance.lifetimeEarned.toLocaleString('tr-TR')}
            </p>
          </div>
          <div>
            <p className="text-xs text-ink-muted80">Toplam Kullanılan</p>
            <p className="text-lg font-semibold">
              {balance.lifetimeRedeemed.toLocaleString('tr-TR')}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-lg bg-canvas border border-hairline overflow-hidden">
        <h2 className="px-4 py-3 font-semibold bg-canvas-parchment">Hareketler</h2>
        {txs.length === 0 ? (
          <p className="p-6 text-sm text-ink-muted80 text-center">
            Henüz puan hareketiniz yok. İlk siparişinizden sonra burada görünecek.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-canvas-parchment text-xs">
              <tr>
                <th className="px-4 py-2 text-left">Tarih</th>
                <th className="px-4 py-2 text-left">İşlem</th>
                <th className="px-4 py-2 text-right">Puan</th>
                <th className="px-4 py-2 text-left">Açıklama</th>
              </tr>
            </thead>
            <tbody>
              {txs.map((tx) => (
                <tr key={tx.id} className="border-t border-hairline">
                  <td className="px-4 py-3 text-xs">
                    {new Date(tx.createdAt).toLocaleString('tr-TR')}
                  </td>
                  <td className="px-4 py-3 text-xs">{TYPE_LABELS[tx.type]}</td>
                  <td
                    className={`px-4 py-3 text-right font-mono ${
                      tx.points > 0 ? 'text-green-700' : 'text-red-700'
                    }`}
                  >
                    {tx.points > 0 ? '+' : ''}
                    {tx.points.toLocaleString('tr-TR')}
                  </td>
                  <td className="px-4 py-3 text-xs text-ink-muted80">{tx.note ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

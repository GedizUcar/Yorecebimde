'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';

type Code = { code: string; totalRedemptions: number };
type Referral = {
  id: string;
  refereeUserId: string;
  status: 'pending' | 'completed' | 'cancelled';
  rewardedAt: string | null;
  createdAt: string;
};

const STATUS_LABEL: Record<Referral['status'], string> = {
  pending: 'Beklemede',
  completed: 'Tamamlandı',
  cancelled: 'İptal',
};

export function MyReferral() {
  const [code, setCode] = useState<Code | null>(null);
  const [referrals, setReferrals] = useState<Referral[] | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    Promise.all([
      apiClient.get<Code>('/v1/referrals/my-code'),
      apiClient.get<Referral[]>('/v1/referrals/my-referrals'),
    ]).then(([c, r]) => {
      setCode(c);
      setReferrals(r);
    });
  }, []);

  if (!code || !referrals) return <p className="text-sm text-ink-muted80">Yükleniyor…</p>;

  const shareUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/kayit?ref=${code.code}`;

  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-canvas border border-hairline p-6 space-y-3">
        <p className="text-sm text-ink-muted80">Sizin davet kodunuz</p>
        <div className="flex items-center gap-3">
          <code className="text-3xl font-bold text-primary tracking-wider">{code.code}</code>
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard.writeText(code.code);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
            className="px-4 py-2 rounded-pill border border-hairline text-sm hover:bg-canvas-parchment"
          >
            {copied ? '✓ Kopyalandı' : 'Kopyala'}
          </button>
        </div>
        <div className="pt-3 border-t border-hairline">
          <p className="text-xs text-ink-muted80 mb-2">Paylaşım linki:</p>
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={shareUrl}
              className="flex-1 px-3 py-2 border border-hairline rounded-md text-xs font-mono"
            />
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard.writeText(shareUrl);
              }}
              className="px-3 py-2 rounded-pill border border-hairline text-xs hover:bg-canvas-parchment whitespace-nowrap"
            >
              Linki Kopyala
            </button>
          </div>
        </div>
        <p className="text-xs text-ink-muted80 pt-2">
          Toplam tamamlanan davet: <strong>{code.totalRedemptions}</strong>
        </p>
      </div>

      <div className="rounded-lg bg-canvas border border-hairline overflow-hidden">
        <h2 className="px-4 py-3 font-semibold bg-canvas-parchment">Davet Geçmişi</h2>
        {referrals.length === 0 ? (
          <p className="p-6 text-sm text-ink-muted80 text-center">
            Henüz kimseyi davet etmediniz.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-canvas-parchment text-xs">
              <tr>
                <th className="px-4 py-2 text-left">Tarih</th>
                <th className="px-4 py-2 text-left">Durum</th>
                <th className="px-4 py-2 text-left">Ödül</th>
              </tr>
            </thead>
            <tbody>
              {referrals.map((r) => (
                <tr key={r.id} className="border-t border-hairline">
                  <td className="px-4 py-3 text-xs">
                    {new Date(r.createdAt).toLocaleString('tr-TR')}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <span
                      className={`px-2 py-1 rounded-pill text-xs ${
                        r.status === 'completed'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-canvas-parchment'
                      }`}
                    >
                      {STATUS_LABEL[r.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {r.rewardedAt ? '✓ 100 puan kazandınız' : 'İlk sipariş bekleniyor'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

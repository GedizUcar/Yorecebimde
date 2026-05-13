'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';

type Report = {
  summary: {
    totalImpressions: number;
    totalClicks: number;
    totalSpentCents: number;
    activeCount: number;
  };
  items: Array<{
    id: string;
    productName: string | null;
    packageName: string | null;
    startsAt: string;
    endsAt: string;
    cancelledAt: string | null;
    impressions: number;
    clicks: number;
    pricePaidCents: number;
    ctr: number;
    status: 'active' | 'expired' | 'cancelled';
  }>;
};

const STATUS_LABEL: Record<Report['items'][number]['status'], string> = {
  active: 'Aktif',
  expired: 'Süresi Doldu',
  cancelled: 'İptal',
};

const STATUS_COLOR: Record<Report['items'][number]['status'], string> = {
  active: 'bg-green-100 text-green-700',
  expired: 'bg-canvas-parchment text-ink-muted80',
  cancelled: 'bg-red-100 text-red-700',
};

function formatLiras(cents: number): string {
  return `${(cents / 100).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺`;
}

export function BoostReports() {
  const [data, setData] = useState<Report | null>(null);

  useEffect(() => {
    apiClient.get<Report>('/v1/boost/reports').then(setData).catch(() => setData(null));
  }, []);

  if (!data) return <p className="text-sm text-ink-muted80">Yükleniyor…</p>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Kpi label="Aktif Boost" value={data.summary.activeCount.toString()} />
        <Kpi label="Toplam Gösterim" value={data.summary.totalImpressions.toLocaleString('tr-TR')} />
        <Kpi label="Toplam Tıklama" value={data.summary.totalClicks.toLocaleString('tr-TR')} />
        <Kpi label="Toplam Harcama" value={formatLiras(data.summary.totalSpentCents)} />
      </div>

      <div className="rounded-lg bg-canvas border border-hairline overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-canvas-parchment text-xs">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Ürün</th>
              <th className="px-4 py-3 text-left font-medium">Paket</th>
              <th className="px-4 py-3 text-left font-medium">Tarih</th>
              <th className="px-4 py-3 text-right font-medium">Gösterim</th>
              <th className="px-4 py-3 text-right font-medium">Tıklama</th>
              <th className="px-4 py-3 text-right font-medium">CTR</th>
              <th className="px-4 py-3 text-right font-medium">Ücret</th>
              <th className="px-4 py-3 text-center font-medium">Durum</th>
            </tr>
          </thead>
          <tbody>
            {data.items.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-ink-muted80 text-sm">
                  Henüz boost satın almadınız.
                </td>
              </tr>
            ) : (
              data.items.map((i) => (
                <tr key={i.id} className="border-t border-hairline">
                  <td className="px-4 py-3">{i.productName ?? '-'}</td>
                  <td className="px-4 py-3 text-xs">{i.packageName ?? '-'}</td>
                  <td className="px-4 py-3 text-xs whitespace-nowrap">
                    {new Date(i.startsAt).toLocaleDateString('tr-TR')} →{' '}
                    {new Date(i.endsAt).toLocaleDateString('tr-TR')}
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    {i.impressions.toLocaleString('tr-TR')}
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    {i.clicks.toLocaleString('tr-TR')}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs">
                    %{i.ctr.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right text-xs">
                    {formatLiras(i.pricePaidCents)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`px-2 py-1 rounded-pill text-xs ${STATUS_COLOR[i.status]}`}
                    >
                      {STATUS_LABEL[i.status]}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-canvas border border-hairline p-4">
      <p className="text-xs text-ink-muted80">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  );
}

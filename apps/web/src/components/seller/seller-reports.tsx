'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';

type Kpi = { count: number; gmvCents: number };
type KpiResponse = {
  today: Kpi;
  week: Kpi;
  month: Kpi;
  pending: Kpi;
};

function formatCents(n: number): string {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(n / 100);
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://yorecebimde-staging.gkteches.com';

export function SellerReports() {
  const [kpis, setKpis] = useState<KpiResponse | null>(null);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  useEffect(() => {
    apiClient.get<KpiResponse>('/v1/seller/reports/kpis').then(setKpis);
  }, []);

  function downloadCsv() {
    const qs = new URLSearchParams();
    if (from) qs.set('from', from);
    if (to) qs.set('to', to);
    const url = `${API_BASE}/v1/seller/reports/sales/export.csv?${qs}`;
    window.open(url, '_blank');
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Bugün" data={kpis?.today} />
        <KpiCard label="Son 7 gün" data={kpis?.week} />
        <KpiCard label="Son 30 gün" data={kpis?.month} />
        <KpiCard label="Bekleyen sipariş" data={kpis?.pending} accent />
      </div>

      <section className="rounded-lg bg-canvas border border-hairline p-6 space-y-4">
        <h2 className="text-lg font-semibold">Satış CSV Export</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Başlangıç tarihi</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-full px-3 py-2 border border-hairline rounded-md text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Bitiş tarihi</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full px-3 py-2 border border-hairline rounded-md text-sm"
            />
          </div>
        </div>
        <button type="button" onClick={downloadCsv} className="btn-primary">
          CSV İndir
        </button>
        <p className="text-xs text-ink-muted80">
          Boş bırakılırsa son 12 ayın iptalsiz tüm siparişleri export edilir. Her ürün satırı için tek
          row. Faz 4.3'te recharts ile grafik gelecek.
        </p>
      </section>
    </div>
  );
}

function KpiCard({
  label,
  data,
  accent,
}: {
  label: string;
  data: Kpi | undefined;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-lg p-4 border ${
        accent ? 'bg-primary/5 border-primary/30' : 'bg-canvas border-hairline'
      }`}
    >
      <p className="text-xs text-ink-muted80 uppercase tracking-wide">{label}</p>
      <p className="mt-2 text-2xl font-bold">{data ? data.count : '—'}</p>
      <p className="text-xs text-ink-muted80 mt-1">
        {data ? formatCents(data.gmvCents) : ''}
      </p>
    </div>
  );
}

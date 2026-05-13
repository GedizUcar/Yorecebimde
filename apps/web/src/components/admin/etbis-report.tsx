'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';

type Row = {
  month: string;
  totalOrders: number;
  paidOrders: number;
  totalGmvCents: number;
  paidGmvCents: number;
  activeSellers: number;
  newSellersInMonth: number;
};

function formatTL(cents: number): string {
  return `${(cents / 100).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺`;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '';

export function EtbisReport() {
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    apiClient.get<Row[]>('/v1/admin/etbis/last-12-months').then(setRows).catch(() => setRows([]));
  }, []);

  if (!rows) return <p className="text-sm text-ink-muted80">Yükleniyor…</p>;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <a
          href={`${API_BASE}/v1/admin/etbis/export.csv`}
          target="_blank"
          rel="noopener"
          className="px-4 py-2 rounded-pill border border-hairline text-sm hover:bg-canvas-parchment"
        >
          ⬇ CSV İndir
        </a>
      </div>

      <div className="rounded-lg bg-canvas border border-hairline overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-canvas-parchment text-xs">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Ay</th>
              <th className="px-4 py-3 text-right font-medium">Toplam Sipariş</th>
              <th className="px-4 py-3 text-right font-medium">Ödenen Sipariş</th>
              <th className="px-4 py-3 text-right font-medium">Toplam GMV</th>
              <th className="px-4 py-3 text-right font-medium">Ödenen GMV</th>
              <th className="px-4 py-3 text-right font-medium">Aktif Satıcı</th>
              <th className="px-4 py-3 text-right font-medium">Yeni Satıcı</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.month} className="border-t border-hairline">
                <td className="px-4 py-3 font-mono text-xs">{r.month}</td>
                <td className="px-4 py-3 text-right">{r.totalOrders.toLocaleString('tr-TR')}</td>
                <td className="px-4 py-3 text-right">{r.paidOrders.toLocaleString('tr-TR')}</td>
                <td className="px-4 py-3 text-right">{formatTL(r.totalGmvCents)}</td>
                <td className="px-4 py-3 text-right">{formatTL(r.paidGmvCents)}</td>
                <td className="px-4 py-3 text-right">{r.activeSellers}</td>
                <td className="px-4 py-3 text-right">{r.newSellersInMonth}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

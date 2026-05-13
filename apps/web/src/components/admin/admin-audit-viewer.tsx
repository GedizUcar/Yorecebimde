'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';

type Log = {
  id: string;
  actorUserId: string | null;
  actorRole: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? 'https://yorecebimde-staging.gkteches.com';

export function AdminAuditViewer() {
  const [items, setItems] = useState<Log[] | null>(null);
  const [filters, setFilters] = useState({
    action: '',
    targetType: '',
    from: '',
    to: '',
    limit: '100',
  });
  const [expanded, setExpanded] = useState<string | null>(null);

  function buildQs(includeLimit = true) {
    const qs = new URLSearchParams();
    if (filters.action) qs.set('action', filters.action);
    if (filters.targetType) qs.set('targetType', filters.targetType);
    if (filters.from) qs.set('from', new Date(filters.from).toISOString());
    if (filters.to) qs.set('to', new Date(filters.to).toISOString());
    if (includeLimit) qs.set('limit', filters.limit);
    return qs;
  }

  async function load() {
    const qs = buildQs();
    setItems(await apiClient.get<Log[]>(`/v1/admin/audit?${qs}`));
  }

  function downloadCsv() {
    const qs = buildQs(false);
    window.open(`${API_BASE}/v1/admin/audit/export.csv?${qs}`, '_blank');
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!items) return <p className="text-sm text-ink-muted80">Yükleniyor…</p>;

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-canvas border border-hairline p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input
            type="text"
            value={filters.action}
            onChange={(e) => setFilters({ ...filters, action: e.target.value })}
            placeholder="action (örn. seller.suspended)"
            className="px-3 py-2 border border-hairline rounded-md text-sm"
          />
          <input
            type="text"
            value={filters.targetType}
            onChange={(e) => setFilters({ ...filters, targetType: e.target.value })}
            placeholder="targetType (örn. seller, category)"
            className="px-3 py-2 border border-hairline rounded-md text-sm"
          />
          <input
            type="date"
            value={filters.from}
            onChange={(e) => setFilters({ ...filters, from: e.target.value })}
            placeholder="from"
            className="px-3 py-2 border border-hairline rounded-md text-sm"
          />
          <input
            type="date"
            value={filters.to}
            onChange={(e) => setFilters({ ...filters, to: e.target.value })}
            placeholder="to"
            className="px-3 py-2 border border-hairline rounded-md text-sm"
          />
        </div>
        <div className="flex items-center gap-3">
          <select
            value={filters.limit}
            onChange={(e) => setFilters({ ...filters, limit: e.target.value })}
            className="px-3 py-2 border border-hairline rounded-md text-sm"
          >
            <option value="50">Son 50</option>
            <option value="100">Son 100</option>
            <option value="500">Son 500</option>
            <option value="1000">Son 1000 (max)</option>
          </select>
          <button type="button" onClick={load} className="btn-primary text-sm">
            Filtrele
          </button>
          <button
            type="button"
            onClick={downloadCsv}
            className="px-4 py-2 rounded-pill border border-hairline text-sm hover:bg-canvas-parchment"
          >
            CSV İndir
          </button>
        </div>
      </div>

      <p className="text-xs text-ink-muted80">{items.length} kayıt</p>

      <div className="rounded-lg bg-canvas border border-hairline overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-canvas-parchment">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Tarih</th>
              <th className="px-4 py-3 text-left font-medium">Action</th>
              <th className="px-4 py-3 text-left font-medium">Target</th>
              <th className="px-4 py-3 text-left font-medium">Actor</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {items.map((l) => (
              <>
                <tr key={l.id} className="border-t border-hairline">
                  <td className="px-4 py-3 text-xs whitespace-nowrap">
                    {new Date(l.createdAt).toLocaleString('tr-TR')}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{l.action}</td>
                  <td className="px-4 py-3 text-xs">
                    {l.targetType}
                    {l.targetId && (
                      <span className="text-ink-muted80"> · {l.targetId.substring(0, 8)}…</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {l.actorRole ?? '-'}{' '}
                    {l.actorUserId && (
                      <span className="text-ink-muted80">{l.actorUserId.substring(0, 8)}…</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {l.metadata && Object.keys(l.metadata).length > 0 && (
                      <button
                        type="button"
                        onClick={() => setExpanded(expanded === l.id ? null : l.id)}
                        className="text-primary hover:underline text-xs"
                      >
                        {expanded === l.id ? 'Gizle' : 'Detay'}
                      </button>
                    )}
                  </td>
                </tr>
                {expanded === l.id && (
                  <tr className="bg-canvas-parchment">
                    <td colSpan={5} className="px-4 py-3">
                      <pre className="text-xs whitespace-pre-wrap font-mono">
                        {JSON.stringify(l.metadata, null, 2)}
                      </pre>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { apiClient, ClientApiError } from '@/lib/api-client';
import { useToast } from '@/components/toast';

type Seller = {
  id: string;
  slug: string;
  displayName: string;
  type: 'individual' | 'company';
  status: string;
  contactEmail: string;
  ratingAvg: string;
  ratingCount: number;
  totalSalesCount: number;
  createdAt: string;
};

const STATUS_LABELS: Record<string, string> = {
  approved: 'Aktif',
  suspended: 'Askıda',
  closed: 'Kapalı',
  pending: 'Bekliyor',
};

export function AdminSellersList() {
  const { show } = useToast();
  const [items, setItems] = useState<Seller[] | null>(null);
  const [statusFilter, setStatusFilter] = useState('');

  async function load() {
    const qs = statusFilter ? `?status=${statusFilter}` : '';
    const data = await apiClient.get<Seller[]>(`/v1/admin/sellers${qs}`);
    setItems(data);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  async function action(id: string, action: 'suspend' | 'reinstate' | 'close', confirmMsg: string) {
    if (!confirm(confirmMsg)) return;
    const reason = action === 'close' ? prompt('Kapatma sebebi:') : undefined;
    if (action === 'close' && !reason) return;
    try {
      await apiClient.post(`/v1/admin/sellers/${id}/${action}`, {
        ...(reason ? { reason } : {}),
      });
      show('İşlem başarılı', 'success');
      void load();
    } catch (e) {
      show(e instanceof ClientApiError ? e.message : 'İşlem başarısız', 'error');
    }
  }

  async function revealPii(id: string, name: string) {
    const reason = prompt(`${name} için IBAN reveal sebebi (audit'lenecek):`);
    if (!reason || reason.length < 10) return show('Sebep en az 10 karakter', 'error');
    try {
      const result = await apiClient.post<{ field: string; value: string }>(
        `/v1/admin/sellers/${id}/pii-reveal`,
        { field: 'iban', reason },
      );
      alert(`IBAN: ${result.value}\n\n(Audit log'a kayıt atıldı)`);
    } catch (e) {
      show(e instanceof ClientApiError ? e.message : 'Reveal başarısız', 'error');
    }
  }

  async function setCommissionOverride(id: string, name: string) {
    const input = prompt(`${name} için komisyon oran override (0-50 % veya boş bırak = default):`);
    if (input === null) return;
    const rate = input.trim() === '' ? null : Number(input);
    if (rate !== null && (isNaN(rate) || rate < 0 || rate > 50)) {
      return show('Geçersiz oran', 'error');
    }
    const reason = prompt('Override sebebi (audit):');
    if (!reason || reason.length < 10) return show('Sebep en az 10 karakter', 'error');
    try {
      await apiClient.post(`/v1/admin/sellers/${id}/commission-override`, { rate, reason });
      show('Override kaydedildi', 'success');
    } catch (e) {
      show(e instanceof ClientApiError ? e.message : 'Başarısız', 'error');
    }
  }

  if (!items) return <p className="text-sm text-ink-muted80">Yükleniyor…</p>;

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {['', 'approved', 'suspended', 'closed'].map((s) => (
          <button
            key={s || 'all'}
            type="button"
            onClick={() => setStatusFilter(s)}
            className={`px-4 py-1.5 rounded-pill text-sm border ${
              statusFilter === s
                ? 'bg-primary text-white border-primary'
                : 'border-hairline hover:border-primary'
            }`}
          >
            {s ? STATUS_LABELS[s] : 'Hepsi'}
          </button>
        ))}
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-ink-muted80 p-8 text-center bg-canvas-parchment rounded-lg">
          Satıcı yok.
        </p>
      ) : (
        <div className="rounded-lg bg-canvas border border-hairline overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-canvas-parchment">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Mağaza</th>
                <th className="px-4 py-3 text-left font-medium">Tür</th>
                <th className="px-4 py-3 text-left font-medium">Durum</th>
                <th className="px-4 py-3 text-left font-medium">Rating</th>
                <th className="px-4 py-3 text-left font-medium">Satış</th>
                <th className="px-4 py-3 text-right" />
              </tr>
            </thead>
            <tbody>
              {items.map((s) => (
                <tr key={s.id} className="border-t border-hairline">
                  <td className="px-4 py-3">
                    <p className="font-medium">{s.displayName}</p>
                    <p className="text-xs text-ink-muted80">/{s.slug}</p>
                  </td>
                  <td className="px-4 py-3 text-xs">{s.type === 'company' ? '🏢' : '👨‍🌾'}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded-pill text-xs ${
                        s.status === 'approved'
                          ? 'bg-green-100 text-green-800'
                          : s.status === 'suspended'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {STATUS_LABELS[s.status] ?? s.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    ⭐ {s.ratingAvg} ({s.ratingCount})
                  </td>
                  <td className="px-4 py-3 text-xs">{s.totalSalesCount}</td>
                  <td className="px-4 py-3 text-right text-xs space-x-2">
                    <button
                      type="button"
                      onClick={() => revealPii(s.id, s.displayName)}
                      className="text-ink-muted80 hover:text-ink hover:underline"
                    >
                      🔓 IBAN
                    </button>
                    <button
                      type="button"
                      onClick={() => setCommissionOverride(s.id, s.displayName)}
                      className="text-ink-muted80 hover:text-ink hover:underline"
                    >
                      Komisyon
                    </button>
                    {s.status === 'approved' && (
                      <button
                        type="button"
                        onClick={() => action(s.id, 'suspend', `${s.displayName} askıya alınsın mı?`)}
                        className="text-amber-700 hover:underline"
                      >
                        Askıya al
                      </button>
                    )}
                    {s.status === 'suspended' && (
                      <button
                        type="button"
                        onClick={() => action(s.id, 'reinstate', `${s.displayName} geri açılsın mı?`)}
                        className="text-green-700 hover:underline"
                      >
                        Geri aç
                      </button>
                    )}
                    {s.status !== 'closed' && (
                      <button
                        type="button"
                        onClick={() => action(s.id, 'close', `${s.displayName} KALICI olarak kapatılsın mı?`)}
                        className="text-red-700 hover:underline"
                      >
                        Kapat
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

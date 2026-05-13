'use client';

import { useEffect, useState } from 'react';
import { apiClient, ClientApiError } from '@/lib/api-client';
import { useToast } from '@/components/toast';

type Pkg = {
  id: string;
  name: string;
  durationDays: number;
  priceCents: number;
  weight: number;
  isActive: boolean;
  sortOrder: number;
};

function formatCents(n: number) {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(n / 100);
}

export function AdminBoostPackages() {
  const { show } = useToast();
  const [items, setItems] = useState<Pkg[] | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', durationDays: '', priceCents: '', weight: '1', sortOrder: '0' });

  async function load() {
    setItems(await apiClient.get<Pkg[]>('/v1/admin/boost-packages'));
  }
  useEffect(() => {
    void load();
  }, []);

  async function create() {
    if (!form.name || !form.durationDays || !form.priceCents)
      return show('Tüm zorunlu alanlar gerekli', 'error');
    try {
      await apiClient.post('/v1/admin/boost-packages', {
        name: form.name,
        durationDays: Number(form.durationDays),
        priceCents: Math.round(Number(form.priceCents) * 100),
        weight: Number(form.weight),
        sortOrder: Number(form.sortOrder),
      });
      show('Paket eklendi', 'success');
      setShowAdd(false);
      setForm({ name: '', durationDays: '', priceCents: '', weight: '1', sortOrder: '0' });
      void load();
    } catch (e) {
      show(e instanceof ClientApiError ? e.message : 'Eklenemedi', 'error');
    }
  }

  async function toggle(p: Pkg) {
    try {
      await apiClient.patch(`/v1/admin/boost-packages/${p.id}`, {
        isActive: !p.isActive,
      });
      show('Güncellendi', 'success');
      void load();
    } catch (e) {
      show(e instanceof ClientApiError ? e.message : 'Güncellenemedi', 'error');
    }
  }

  async function remove(p: Pkg) {
    if (!confirm(`${p.name} pasif yapılsın mı?`)) return;
    try {
      await apiClient.delete(`/v1/admin/boost-packages/${p.id}`);
      show('Pasif yapıldı', 'info');
      void load();
    } catch (e) {
      show(e instanceof ClientApiError ? e.message : 'Silinemedi', 'error');
    }
  }

  if (!items) return <p className="text-sm text-ink-muted80">Yükleniyor…</p>;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setShowAdd((v) => !v)}
          className="px-4 py-2 rounded-pill bg-primary text-white text-sm font-medium hover:bg-primary-700"
        >
          {showAdd ? 'İptal' : '+ Yeni paket'}
        </button>
      </div>

      {showAdd && (
        <div className="rounded-lg bg-canvas border border-hairline p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Paket adı"
              className="px-3 py-2 border border-hairline rounded-md text-sm"
            />
            <input
              type="number"
              value={form.durationDays}
              onChange={(e) => setForm({ ...form, durationDays: e.target.value })}
              placeholder="Süre (gün)"
              className="px-3 py-2 border border-hairline rounded-md text-sm"
            />
            <input
              type="number"
              step="0.01"
              value={form.priceCents}
              onChange={(e) => setForm({ ...form, priceCents: e.target.value })}
              placeholder="Fiyat (TL)"
              className="px-3 py-2 border border-hairline rounded-md text-sm"
            />
          </div>
          <button type="button" onClick={create} className="btn-primary text-sm">
            Ekle
          </button>
        </div>
      )}

      <div className="rounded-lg bg-canvas border border-hairline overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-canvas-parchment">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Ad</th>
              <th className="px-4 py-3 text-left font-medium">Süre</th>
              <th className="px-4 py-3 text-left font-medium">Fiyat</th>
              <th className="px-4 py-3 text-left font-medium">Durum</th>
              <th className="px-4 py-3 text-right" />
            </tr>
          </thead>
          <tbody>
            {items.map((p) => (
              <tr key={p.id} className="border-t border-hairline">
                <td className="px-4 py-3 font-medium">{p.name}</td>
                <td className="px-4 py-3">{p.durationDays} gün</td>
                <td className="px-4 py-3">{formatCents(p.priceCents)}</td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => toggle(p)}
                    className={`px-2 py-1 rounded-pill text-xs ${
                      p.isActive ? 'bg-green-100 text-green-800' : 'bg-canvas-parchment text-ink-muted80'
                    }`}
                  >
                    {p.isActive ? 'Aktif' : 'Pasif'}
                  </button>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => remove(p)}
                    className="text-red-700 hover:underline text-xs"
                  >
                    Pasif yap
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

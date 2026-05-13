'use client';

import { useEffect, useState } from 'react';
import { apiClient, ClientApiError } from '@/lib/api-client';
import { useToast } from '@/components/toast';

type Admin = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  status: string;
  lastLoginAt: string | null;
  createdAt: string;
};

export function AdminTeam() {
  const { show } = useToast();
  const [items, setItems] = useState<Admin[] | null>(null);

  async function load() {
    setItems(await apiClient.get<Admin[]>('/v1/admin/team'));
  }
  useEffect(() => {
    void load();
  }, []);

  async function changeRole(a: Admin, role: 'admin' | 'super_admin' | 'customer') {
    const reason = prompt(`${a.email} role'ünü ${role} yap. Sebep:`);
    if (!reason || reason.length < 10) return show('Sebep en az 10 karakter', 'error');
    try {
      await apiClient.post(`/v1/admin/team/${a.id}/role`, { role, reason });
      show('Role güncellendi', 'success');
      void load();
    } catch (e) {
      show(e instanceof ClientApiError ? e.message : 'Başarısız', 'error');
    }
  }

  async function suspend(a: Admin) {
    const reason = prompt(`${a.email} suspend edilecek. Sebep:`);
    if (!reason || reason.length < 10) return show('Sebep en az 10 karakter', 'error');
    try {
      await apiClient.post(`/v1/admin/team/${a.id}/suspend`, { reason });
      show('Suspend edildi', 'info');
      void load();
    } catch (e) {
      show(e instanceof ClientApiError ? e.message : 'Başarısız', 'error');
    }
  }

  if (!items) return <p className="text-sm text-ink-muted80">Yükleniyor…</p>;

  return (
    <div className="rounded-lg bg-canvas border border-hairline overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-canvas-parchment">
          <tr>
            <th className="px-4 py-3 text-left font-medium">Email</th>
            <th className="px-4 py-3 text-left font-medium">Ad Soyad</th>
            <th className="px-4 py-3 text-left font-medium">Role</th>
            <th className="px-4 py-3 text-left font-medium">Durum</th>
            <th className="px-4 py-3 text-left font-medium">Son Giriş</th>
            <th className="px-4 py-3 text-right" />
          </tr>
        </thead>
        <tbody>
          {items.map((a) => (
            <tr key={a.id} className="border-t border-hairline">
              <td className="px-4 py-3">{a.email}</td>
              <td className="px-4 py-3 text-xs">
                {a.firstName} {a.lastName}
              </td>
              <td className="px-4 py-3">
                <span
                  className={`px-2 py-1 rounded-pill text-xs ${
                    a.role === 'super_admin'
                      ? 'bg-primary text-white'
                      : 'bg-canvas-parchment'
                  }`}
                >
                  {a.role}
                </span>
              </td>
              <td className="px-4 py-3 text-xs">{a.status}</td>
              <td className="px-4 py-3 text-xs">
                {a.lastLoginAt ? new Date(a.lastLoginAt).toLocaleString('tr-TR') : '—'}
              </td>
              <td className="px-4 py-3 text-right text-xs space-x-2">
                {a.role === 'admin' && (
                  <button
                    type="button"
                    onClick={() => changeRole(a, 'super_admin')}
                    className="text-primary hover:underline"
                  >
                    → super_admin
                  </button>
                )}
                {a.role === 'super_admin' && (
                  <button
                    type="button"
                    onClick={() => changeRole(a, 'admin')}
                    className="text-amber-700 hover:underline"
                  >
                    → admin
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => suspend(a)}
                  className="text-red-700 hover:underline"
                >
                  Suspend
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

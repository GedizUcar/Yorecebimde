'use client';

import { useEffect, useState } from 'react';
import { apiClient, ClientApiError } from '@/lib/api-client';
import { useToast } from '@/components/toast';

type Application = {
  id: string;
  email: string;
  phone: string;
  contactName: string;
  displayName: string;
  type: 'individual' | 'company';
  legalName: string | null;
  status: string;
  reviewedAt: string | null;
  reviewNotes: string | null;
  inviteToken: string | null;
  sellerId: string | null;
  createdAt: string;
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Bekliyor',
  approved: 'Onaylandı',
  rejected: 'Reddedildi',
  info_requested: 'Ek bilgi istendi',
};
const STATUS_FILTERS = ['', 'pending', 'approved', 'rejected'];

export function AdminApplicationsList() {
  const { show } = useToast();
  const [status, setStatus] = useState('pending');
  const [items, setItems] = useState<Application[] | null>(null);
  const [activeApp, setActiveApp] = useState<Application | null>(null);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);

  async function load() {
    const qs = status ? `?status=${status}` : '';
    const data = await apiClient.get<Application[]>(`/v1/admin/sellers/applications${qs}`);
    setItems(data);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  async function approve() {
    if (!activeApp) return;
    setBusy(true);
    try {
      const result = await apiClient.post<{ inviteToken: string; inviteUrl: string }>(
        `/v1/admin/sellers/applications/${activeApp.id}/approve`,
        { notes: notes || undefined },
      );
      show('Başvuru onaylandı, davet linki üretildi', 'success');
      setInviteUrl(result.inviteUrl);
      setActiveApp(null);
      setNotes('');
      void load();
    } catch (e) {
      show(e instanceof ClientApiError ? e.message : 'Onaylanamadı', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function reject() {
    if (!activeApp) return;
    if (notes.length < 10) {
      show('Red sebebi en az 10 karakter olmalı', 'error');
      return;
    }
    setBusy(true);
    try {
      await apiClient.post(`/v1/admin/sellers/applications/${activeApp.id}/reject`, {
        notes,
      });
      show('Başvuru reddedildi', 'info');
      setActiveApp(null);
      setNotes('');
      void load();
    } catch (e) {
      show(e instanceof ClientApiError ? e.message : 'Reddedilemedi', 'error');
    } finally {
      setBusy(false);
    }
  }

  if (!items) return <p className="text-sm text-ink-muted80">Yükleniyor…</p>;

  return (
    <div className="space-y-4">
      {inviteUrl && (
        <div className="rounded-md bg-green-50 border border-green-200 p-4 space-y-2">
          <p className="text-sm font-medium text-green-900">Davet bağlantısı üretildi:</p>
          <code className="block text-xs bg-canvas p-2 rounded border border-green-200 break-all">
            {inviteUrl}
          </code>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(inviteUrl);
              show('Kopyalandı', 'success');
            }}
            className="text-sm text-green-800 hover:underline"
          >
            Panoya kopyala
          </button>
          <button
            type="button"
            onClick={() => setInviteUrl(null)}
            className="ml-3 text-sm text-ink-muted80 hover:underline"
          >
            Kapat
          </button>
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s || 'all'}
            type="button"
            onClick={() => setStatus(s)}
            className={`px-4 py-1.5 rounded-pill text-sm border ${
              status === s
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
          Bu filtrede başvuru yok.
        </p>
      ) : (
        <div className="rounded-lg bg-canvas border border-hairline overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-canvas-parchment">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Mağaza</th>
                <th className="px-4 py-3 text-left font-medium">Tür</th>
                <th className="px-4 py-3 text-left font-medium">Email</th>
                <th className="px-4 py-3 text-left font-medium">Durum</th>
                <th className="px-4 py-3 text-left font-medium">Tarih</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {items.map((a) => (
                <tr key={a.id} className="border-t border-hairline">
                  <td className="px-4 py-3 font-medium">{a.displayName}</td>
                  <td className="px-4 py-3 text-xs">
                    {a.type === 'company' ? '🏢 Şirket' : '👨‍🌾 Şahıs'}
                  </td>
                  <td className="px-4 py-3 text-xs">{a.email}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 rounded-pill bg-canvas-parchment text-xs">
                      {STATUS_LABELS[a.status] ?? a.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-ink-muted80">
                    {new Date(a.createdAt).toLocaleString('tr-TR')}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {a.status === 'pending' && (
                      <button
                        type="button"
                        onClick={() => {
                          setActiveApp(a);
                          setNotes('');
                        }}
                        className="text-primary hover:underline text-sm"
                      >
                        İncele
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail modal */}
      {activeApp && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          onClick={() => setActiveApp(null)}
        >
          <div
            className="bg-canvas rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-semibold">{activeApp.displayName}</h2>
                <p className="text-sm text-ink-muted80">
                  {activeApp.type === 'company' ? 'Şirket' : 'Şahıs'} ·{' '}
                  {new Date(activeApp.createdAt).toLocaleString('tr-TR')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveApp(null)}
                className="text-ink-muted80 hover:text-ink"
              >
                ✕
              </button>
            </div>

            <dl className="grid grid-cols-2 gap-3 text-sm border-t border-hairline pt-4">
              <Detail label="İletişim Kişisi" value={activeApp.contactName} />
              <Detail label="Email" value={activeApp.email} />
              <Detail label="Telefon" value={activeApp.phone} />
              {activeApp.legalName && <Detail label="Ticari Ünvan" value={activeApp.legalName} />}
            </dl>

            <div className="rounded-md bg-canvas-parchment p-3 text-xs text-ink-muted80">
              <p className="font-medium text-ink mb-1">PII alanları</p>
              <p>TC/Vergi No ve IBAN şifreli. Reveal butonu Faz 5.2'de eklenecek (audit'li).</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">İnceleme notu</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Karar gerekçesi (red için zorunlu, onay için opsiyonel)"
                className="w-full px-3 py-2 border border-hairline rounded-md text-sm"
              />
            </div>

            <div className="flex gap-2 pt-4 border-t border-hairline">
              <button
                type="button"
                onClick={approve}
                disabled={busy}
                className="btn-primary flex-1 disabled:opacity-60"
              >
                {busy ? '…' : '✓ Onayla'}
              </button>
              <button
                type="button"
                onClick={reject}
                disabled={busy || notes.length < 10}
                className="px-4 py-2 rounded-pill bg-red-600 text-white text-sm font-medium flex-1 disabled:opacity-60"
              >
                ✕ Reddet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-ink-muted80">{label}</dt>
      <dd className="text-sm">{value}</dd>
    </div>
  );
}

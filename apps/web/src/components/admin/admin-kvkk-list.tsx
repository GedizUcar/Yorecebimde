'use client';

import { useEffect, useState } from 'react';
import { apiClient, ClientApiError } from '@/lib/api-client';
import { useToast } from '@/components/toast';

type Request = {
  id: string;
  email: string;
  contactName: string;
  phone: string | null;
  type: string;
  requestText: string;
  status: string;
  response: string | null;
  handledAt: string | null;
  dueBy: string;
  createdAt: string;
};

const TYPE_LABELS: Record<string, string> = {
  access: 'Erişim',
  deletion: 'Silme',
  rectification: 'Düzeltme',
  portability: 'Veri taşınabilirliği',
  objection: 'İtiraz',
};
const STATUS_LABELS: Record<string, string> = {
  pending: 'Bekliyor',
  in_progress: 'İşleniyor',
  completed: 'Tamamlandı',
  rejected: 'Reddedildi',
};

export function AdminKvkkList() {
  const { show } = useToast();
  const [items, setItems] = useState<Request[] | null>(null);
  const [status, setStatus] = useState('pending');
  const [active, setActive] = useState<Request | null>(null);
  const [respondStatus, setRespondStatus] = useState<'in_progress' | 'completed' | 'rejected'>('completed');
  const [response, setResponse] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    const qs = status ? `?status=${status}` : '';
    setItems(await apiClient.get<Request[]>(`/v1/admin/kvkk${qs}`));
  }
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  async function submit() {
    if (!active) return;
    if (response.length < 10) return show('Cevap en az 10 karakter', 'error');
    setBusy(true);
    try {
      await apiClient.post(`/v1/admin/kvkk/${active.id}/respond`, {
        status: respondStatus,
        response,
      });
      show('Cevap kaydedildi', 'success');
      setActive(null);
      setResponse('');
      void load();
    } catch (e) {
      show(e instanceof ClientApiError ? e.message : 'Kaydedilemedi', 'error');
    } finally {
      setBusy(false);
    }
  }

  if (!items) return <p className="text-sm text-ink-muted80">Yükleniyor…</p>;

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {['', 'pending', 'in_progress', 'completed', 'rejected'].map((s) => (
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
          Bu filtrede KVKK talebi yok.
        </p>
      ) : (
        <ul className="space-y-3">
          {items.map((r) => {
            const dueIn = Math.ceil(
              (new Date(r.dueBy).getTime() - Date.now()) / (24 * 60 * 60 * 1000),
            );
            const urgent = dueIn < 7 && r.status === 'pending';
            return (
              <li
                key={r.id}
                className={`rounded-lg border p-4 ${
                  urgent ? 'border-red-300 bg-red-50' : 'border-hairline bg-canvas'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{TYPE_LABELS[r.type] ?? r.type}</p>
                    <p className="text-xs text-ink-muted80">
                      {r.contactName} ({r.email}) ·{' '}
                      {new Date(r.createdAt).toLocaleString('tr-TR')}
                    </p>
                    {r.status === 'pending' && (
                      <p
                        className={`text-xs mt-1 ${urgent ? 'text-red-700 font-semibold' : 'text-ink-muted80'}`}
                      >
                        Deadline: {dueIn}g sonra
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="px-2 py-1 rounded-pill bg-canvas-parchment text-xs">
                      {STATUS_LABELS[r.status] ?? r.status}
                    </span>
                    {r.status !== 'completed' && r.status !== 'rejected' && (
                      <button
                        type="button"
                        onClick={() => {
                          setActive(r);
                          setResponse('');
                          setRespondStatus('completed');
                        }}
                        className="block mt-2 text-sm text-primary hover:underline"
                      >
                        Cevap ver →
                      </button>
                    )}
                  </div>
                </div>
                <div className="rounded-md bg-canvas-parchment p-3 mt-3 text-sm whitespace-pre-line">
                  {r.requestText}
                </div>
                {r.response && (
                  <div className="rounded-md bg-green-50 border border-green-200 p-3 mt-3 text-sm whitespace-pre-line">
                    <p className="text-xs text-green-800 mb-1">Cevap:</p>
                    {r.response}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {active && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          onClick={() => setActive(null)}
        >
          <div
            className="bg-canvas rounded-lg max-w-xl w-full p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between">
              <h2 className="text-xl font-semibold">KVKK Cevabı</h2>
              <button type="button" onClick={() => setActive(null)} className="text-ink-muted80">
                ✕
              </button>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Durum</label>
              <div className="grid grid-cols-3 gap-2">
                {(['in_progress', 'completed', 'rejected'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setRespondStatus(s)}
                    className={`px-3 py-2 rounded-md border-2 text-sm font-medium ${
                      respondStatus === s
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-hairline'
                    }`}
                  >
                    {STATUS_LABELS[s]}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Cevap metni</label>
              <textarea
                value={response}
                onChange={(e) => setResponse(e.target.value)}
                rows={5}
                placeholder="Talep sahibine iletilecek cevap"
                className="w-full px-3 py-2 border border-hairline rounded-md text-sm"
              />
            </div>
            <button
              type="button"
              onClick={submit}
              disabled={busy || response.length < 10}
              className="btn-primary w-full disabled:opacity-60"
            >
              {busy ? '…' : 'Cevabı Gönder'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

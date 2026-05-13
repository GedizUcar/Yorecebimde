'use client';

import { useEffect, useState } from 'react';
import { apiClient, ClientApiError } from '@/lib/api-client';
import { useToast } from '@/components/toast';

type Template = {
  id: string;
  triggerKey: string;
  channel: string;
  locale: string;
  subject: string | null;
  body: string;
  isActive: string;
};

const TRIGGER_KEYS = [
  'order.paid',
  'order.paid.seller',
  'order.confirmed',
  'order.shipped',
  'order.delivered',
  'order.completed',
  'order.cancelled',
  'order.cancelled.seller',
  'low_stock.seller',
];
const CHANNELS = ['email', 'sms', 'push', 'in_app'];

export function AdminTemplates() {
  const { show } = useToast();
  const [items, setItems] = useState<Template[] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    triggerKey: 'order.paid',
    channel: 'email',
    locale: 'tr',
    subject: '',
    body: '',
    isActive: true,
  });

  async function load() {
    setItems(await apiClient.get<Template[]>('/v1/admin/templates'));
  }
  useEffect(() => {
    void load();
  }, []);

  async function save() {
    if (form.body.length < 5) return show('Body en az 5 karakter', 'error');
    try {
      await apiClient.put('/v1/admin/templates', {
        triggerKey: form.triggerKey,
        channel: form.channel,
        locale: form.locale,
        subject: form.subject || undefined,
        body: form.body,
        isActive: form.isActive,
      });
      show('Şablon kaydedildi', 'success');
      setShowForm(false);
      setForm({
        triggerKey: 'order.paid',
        channel: 'email',
        locale: 'tr',
        subject: '',
        body: '',
        isActive: true,
      });
      void load();
    } catch (e) {
      show(e instanceof ClientApiError ? e.message : 'Kaydedilemedi', 'error');
    }
  }

  function startEdit(t: Template) {
    setForm({
      triggerKey: t.triggerKey,
      channel: t.channel,
      locale: t.locale,
      subject: t.subject ?? '',
      body: t.body,
      isActive: t.isActive === 'true',
    });
    setShowForm(true);
  }

  if (!items) return <p className="text-sm text-ink-muted80">Yükleniyor…</p>;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="px-4 py-2 rounded-pill bg-primary text-white text-sm font-medium hover:bg-primary-700"
        >
          {showForm ? 'İptal' : '+ Şablon ekle/düzenle'}
        </button>
      </div>

      {showForm && (
        <div className="rounded-lg bg-canvas border border-hairline p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <select
              value={form.triggerKey}
              onChange={(e) => setForm({ ...form, triggerKey: e.target.value })}
              className="px-3 py-2 border border-hairline rounded-md text-sm font-mono"
            >
              {TRIGGER_KEYS.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
            <select
              value={form.channel}
              onChange={(e) => setForm({ ...form, channel: e.target.value })}
              className="px-3 py-2 border border-hairline rounded-md text-sm"
            >
              {CHANNELS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <select
              value={form.locale}
              onChange={(e) => setForm({ ...form, locale: e.target.value })}
              className="px-3 py-2 border border-hairline rounded-md text-sm"
            >
              <option value="tr">TR</option>
              <option value="en">EN</option>
            </select>
          </div>
          {form.channel === 'email' && (
            <input
              type="text"
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              placeholder="Email konusu"
              className="w-full px-3 py-2 border border-hairline rounded-md text-sm"
            />
          )}
          <textarea
            value={form.body}
            onChange={(e) => setForm({ ...form, body: e.target.value })}
            rows={8}
            placeholder="Body — Merhaba {{recipientName}}, {{orderNo}} siparişiniz..."
            className="w-full px-3 py-2 border border-hairline rounded-md text-sm font-mono"
          />
          <p className="text-xs text-ink-muted80">
            Kullanılabilir: <code>{`{{orderNo}}, {{total}}, {{recipientName}}, {{sellerName}}, {{baseUrl}}, {{trackingNo}}`}</code>
          </p>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
            />
            Aktif (kapalıysa hardcoded fallback kullanılır)
          </label>
          <button type="button" onClick={save} className="btn-primary text-sm">
            Kaydet
          </button>
        </div>
      )}

      {items.length === 0 ? (
        <p className="text-sm text-ink-muted80 p-8 text-center bg-canvas-parchment rounded-lg">
          Henüz şablon yok — hardcoded fallback çalışıyor. Yukarıdan ekleyebilirsiniz.
        </p>
      ) : (
        <div className="rounded-lg bg-canvas border border-hairline overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-canvas-parchment">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Trigger</th>
                <th className="px-4 py-3 text-left font-medium">Kanal</th>
                <th className="px-4 py-3 text-left font-medium">Locale</th>
                <th className="px-4 py-3 text-left font-medium">Subject</th>
                <th className="px-4 py-3 text-left font-medium">Aktif</th>
                <th className="px-4 py-3 text-right" />
              </tr>
            </thead>
            <tbody>
              {items.map((t) => (
                <tr key={t.id} className="border-t border-hairline">
                  <td className="px-4 py-3 font-mono text-xs">{t.triggerKey}</td>
                  <td className="px-4 py-3 text-xs">{t.channel}</td>
                  <td className="px-4 py-3 text-xs">{t.locale}</td>
                  <td className="px-4 py-3 text-xs">{t.subject ?? '—'}</td>
                  <td className="px-4 py-3 text-xs">{t.isActive === 'true' ? '✓' : '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => startEdit(t)}
                      className="text-primary hover:underline text-xs"
                    >
                      Düzenle
                    </button>
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

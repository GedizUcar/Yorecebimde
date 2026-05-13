'use client';

import { useEffect, useState } from 'react';
import { apiClient, ClientApiError } from '@/lib/api-client';
import { useToast } from '@/components/toast';

type Setting = {
  id: string;
  key: string;
  value: unknown;
  description: string | null;
  category: string;
  isSecret: string;
  updatedAt: string;
};

const CATEGORIES = ['general', 'commerce', 'payments', 'shipping', 'notifications', 'ai', 'security'];

export function AdminSettings() {
  const { show } = useToast();
  const [items, setItems] = useState<Setting[] | null>(null);
  const [activeCategory, setActiveCategory] = useState('general');
  const [form, setForm] = useState({
    key: '',
    value: '',
    category: 'general',
    description: '',
    isSecret: false,
  });
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  async function load() {
    setItems(await apiClient.get<Setting[]>('/v1/admin/settings'));
  }
  useEffect(() => {
    void load();
  }, []);

  async function saveNew() {
    if (!form.key || !form.value) return show('Key ve value zorunlu', 'error');
    try {
      let parsedValue: unknown = form.value;
      try {
        parsedValue = JSON.parse(form.value);
      } catch {
        // not JSON, save as string
      }
      await apiClient.put('/v1/admin/settings', {
        key: form.key,
        value: parsedValue,
        category: form.category,
        description: form.description || undefined,
        isSecret: form.isSecret,
      });
      show('Kaydedildi', 'success');
      setForm({ key: '', value: '', category: 'general', description: '', isSecret: false });
      void load();
    } catch (e) {
      show(e instanceof ClientApiError ? e.message : 'Kaydedilemedi', 'error');
    }
  }

  async function saveEdit(s: Setting) {
    try {
      let parsedValue: unknown = editValue;
      try {
        parsedValue = JSON.parse(editValue);
      } catch {}
      await apiClient.put('/v1/admin/settings', {
        key: s.key,
        value: parsedValue,
        category: s.category,
        description: s.description ?? undefined,
        isSecret: s.isSecret === 'true',
      });
      show('Güncellendi', 'success');
      setEditingKey(null);
      void load();
    } catch (e) {
      show(e instanceof ClientApiError ? e.message : 'Güncellenemedi', 'error');
    }
  }

  async function deleteSetting(key: string) {
    if (!confirm(`${key} silinsin mi?`)) return;
    try {
      await apiClient.delete(`/v1/admin/settings/${encodeURIComponent(key)}`);
      show('Silindi', 'info');
      void load();
    } catch (e) {
      show(e instanceof ClientApiError ? e.message : 'Silinemedi', 'error');
    }
  }

  if (!items) return <p className="text-sm text-ink-muted80">Yükleniyor…</p>;

  const filtered = items.filter((s) => s.category === activeCategory);

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap border-b border-hairline pb-3">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setActiveCategory(c)}
            className={`px-4 py-1.5 rounded-pill text-sm border ${
              activeCategory === c
                ? 'bg-primary text-white border-primary'
                : 'border-hairline hover:border-primary'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-ink-muted80 p-8 text-center bg-canvas-parchment rounded-lg">
          Bu kategoride ayar yok.
        </p>
      ) : (
        <div className="rounded-lg bg-canvas border border-hairline overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-canvas-parchment">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Key</th>
                <th className="px-4 py-3 text-left font-medium">Value</th>
                <th className="px-4 py-3 text-left font-medium">Tür</th>
                <th className="px-4 py-3 text-right" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id} className="border-t border-hairline">
                  <td className="px-4 py-3 font-mono text-xs">{s.key}</td>
                  <td className="px-4 py-3 text-xs">
                    {editingKey === s.key ? (
                      <input
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="w-full px-2 py-1 border border-hairline rounded text-xs font-mono"
                      />
                    ) : (
                      <code className="text-xs">
                        {s.isSecret === 'true' ? '***' : JSON.stringify(s.value)}
                      </code>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs">{s.isSecret === 'true' ? '🔒 Secret' : 'Public'}</td>
                  <td className="px-4 py-3 text-right text-xs space-x-2">
                    {editingKey === s.key ? (
                      <>
                        <button
                          type="button"
                          onClick={() => saveEdit(s)}
                          className="text-green-700 hover:underline"
                        >
                          Kaydet
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingKey(null)}
                          className="text-ink-muted80 hover:underline"
                        >
                          İptal
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingKey(s.key);
                            setEditValue(JSON.stringify(s.value));
                          }}
                          className="text-primary hover:underline"
                        >
                          Düzenle
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteSetting(s.key)}
                          className="text-red-700 hover:underline"
                        >
                          Sil
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <details className="rounded-lg bg-canvas border border-hairline p-4">
        <summary className="cursor-pointer font-semibold text-sm">+ Yeni ayar ekle</summary>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
          <input
            type="text"
            value={form.key}
            onChange={(e) => setForm({ ...form, key: e.target.value })}
            placeholder="key (örn. commerce.escrow_release_days)"
            className="px-3 py-2 border border-hairline rounded-md text-sm font-mono"
          />
          <select
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            className="px-3 py-2 border border-hairline rounded-md text-sm"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={form.value}
            onChange={(e) => setForm({ ...form, value: e.target.value })}
            placeholder='value (örn. 14 veya "production" veya {"x":1})'
            className="px-3 py-2 border border-hairline rounded-md text-sm font-mono col-span-1 md:col-span-2"
          />
          <input
            type="text"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Açıklama (ops.)"
            className="px-3 py-2 border border-hairline rounded-md text-sm col-span-1 md:col-span-2"
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.isSecret}
              onChange={(e) => setForm({ ...form, isSecret: e.target.checked })}
            />
            🔒 Secret (mask in UI)
          </label>
        </div>
        <button type="button" onClick={saveNew} className="btn-primary mt-3 text-sm">
          Kaydet
        </button>
      </details>
    </div>
  );
}

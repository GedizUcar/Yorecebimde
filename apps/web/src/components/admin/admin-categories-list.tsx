'use client';

import { useEffect, useState } from 'react';
import { apiClient, ClientApiError } from '@/lib/api-client';
import { useToast } from '@/components/toast';

type Category = {
  id: string;
  parentId: string | null;
  slug: string;
  nameTr: string;
  nameEn: string | null;
  depth: number;
  path: string;
  defaultKdvRate: string;
  isActive: boolean;
};

export function AdminCategoriesList() {
  const { show } = useToast();
  const [items, setItems] = useState<Category[] | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    slug: '',
    nameTr: '',
    nameEn: '',
    parentId: '',
    defaultKdvRate: '8.00',
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{
    nameTr: string;
    nameEn: string;
    defaultKdvRate: string;
    isActive: boolean;
  }>({
    nameTr: '',
    nameEn: '',
    defaultKdvRate: '',
    isActive: true,
  });

  async function load() {
    const data = await apiClient.get<Category[]>('/v1/categories');
    setItems(data);
  }

  useEffect(() => {
    void load();
  }, []);

  async function create() {
    if (!form.slug || !form.nameTr) return show('Slug ve ad zorunlu', 'error');
    try {
      await apiClient.post('/v1/admin/categories', {
        slug: form.slug,
        nameTr: form.nameTr,
        nameEn: form.nameEn || undefined,
        parentId: form.parentId || undefined,
        defaultKdvRate: form.defaultKdvRate ? Number(form.defaultKdvRate) : undefined,
      });
      show('Kategori eklendi', 'success');
      setShowAdd(false);
      setForm({ slug: '', nameTr: '', nameEn: '', parentId: '', defaultKdvRate: '8.00' });
      void load();
    } catch (e) {
      show(e instanceof ClientApiError ? e.message : 'Eklenemedi', 'error');
    }
  }

  function startEdit(c: Category) {
    setEditingId(c.id);
    setEditForm({
      nameTr: c.nameTr,
      nameEn: c.nameEn ?? '',
      defaultKdvRate: c.defaultKdvRate,
      isActive: c.isActive,
    });
  }

  async function saveEdit() {
    if (!editingId) return;
    try {
      await apiClient.patch(`/v1/admin/categories/${editingId}`, {
        nameTr: editForm.nameTr,
        nameEn: editForm.nameEn || undefined,
        defaultKdvRate: Number(editForm.defaultKdvRate),
        isActive: editForm.isActive,
      });
      show('Güncellendi', 'success');
      setEditingId(null);
      void load();
    } catch (e) {
      show(e instanceof ClientApiError ? e.message : 'Güncellenemedi', 'error');
    }
  }

  async function remove(id: string, name: string) {
    if (!confirm(`${name} silinsin mi? (alt kategorisi olan kategoriler silinemez)`)) return;
    try {
      await apiClient.delete(`/v1/admin/categories/${id}`);
      show('Silindi', 'info');
      void load();
    } catch (e) {
      show(e instanceof ClientApiError ? e.message : 'Silinemedi', 'error');
    }
  }

  if (!items) return <p className="text-sm text-ink-muted80">Yükleniyor…</p>;

  // Ağaç yapısı için path'e göre sıralama yeterli
  const sorted = [...items].sort((a, b) => a.path.localeCompare(b.path));

  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <p className="text-sm text-ink-muted80">{items.length} kategori</p>
        <button
          type="button"
          onClick={() => setShowAdd((v) => !v)}
          className="px-4 py-2 rounded-pill bg-primary text-white text-sm font-medium hover:bg-primary-700"
        >
          {showAdd ? 'İptal' : '+ Kategori ekle'}
        </button>
      </div>

      {showAdd && (
        <div className="rounded-lg bg-canvas border border-hairline p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              type="text"
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
              placeholder="slug (örn. peynir-cesitleri)"
              className="px-3 py-2 border border-hairline rounded-md text-sm"
            />
            <input
              type="text"
              value={form.nameTr}
              onChange={(e) => setForm({ ...form, nameTr: e.target.value })}
              placeholder="Türkçe ad"
              className="px-3 py-2 border border-hairline rounded-md text-sm"
            />
            <input
              type="text"
              value={form.nameEn}
              onChange={(e) => setForm({ ...form, nameEn: e.target.value })}
              placeholder="İngilizce ad (ops.)"
              className="px-3 py-2 border border-hairline rounded-md text-sm"
            />
            <select
              value={form.parentId}
              onChange={(e) => setForm({ ...form, parentId: e.target.value })}
              className="px-3 py-2 border border-hairline rounded-md text-sm"
            >
              <option value="">— Üst kategori (root) —</option>
              {sorted.map((c) => (
                <option key={c.id} value={c.id}>
                  {'  '.repeat(c.depth)}
                  {c.nameTr}
                </option>
              ))}
            </select>
            <input
              type="number"
              step="0.01"
              value={form.defaultKdvRate}
              onChange={(e) => setForm({ ...form, defaultKdvRate: e.target.value })}
              placeholder="KDV oranı (%)"
              className="px-3 py-2 border border-hairline rounded-md text-sm"
            />
          </div>
          <button type="button" onClick={create} className="btn-primary">
            Ekle
          </button>
        </div>
      )}

      <div className="rounded-lg bg-canvas border border-hairline overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-canvas-parchment">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Ad (TR)</th>
              <th className="px-4 py-3 text-left font-medium">Slug</th>
              <th className="px-4 py-3 text-left font-medium">KDV %</th>
              <th className="px-4 py-3 text-left font-medium">Durum</th>
              <th className="px-4 py-3 text-right" />
            </tr>
          </thead>
          <tbody>
            {sorted.map((c) => (
              <tr key={c.id} className="border-t border-hairline">
                <td className="px-4 py-3" style={{ paddingLeft: `${1 + c.depth * 1.5}rem` }}>
                  {editingId === c.id ? (
                    <input
                      type="text"
                      value={editForm.nameTr}
                      onChange={(e) => setEditForm({ ...editForm, nameTr: e.target.value })}
                      className="px-2 py-1 border border-hairline rounded text-sm w-full"
                    />
                  ) : (
                    <>
                      {c.depth > 0 && <span className="text-ink-muted80">└─ </span>}
                      {c.nameTr}
                    </>
                  )}
                </td>
                <td className="px-4 py-3 font-mono text-xs">{c.slug}</td>
                <td className="px-4 py-3 text-xs">
                  {editingId === c.id ? (
                    <input
                      type="number"
                      step="0.01"
                      value={editForm.defaultKdvRate}
                      onChange={(e) => setEditForm({ ...editForm, defaultKdvRate: e.target.value })}
                      className="px-2 py-1 border border-hairline rounded text-sm w-20"
                    />
                  ) : (
                    c.defaultKdvRate
                  )}
                </td>
                <td className="px-4 py-3">
                  {editingId === c.id ? (
                    <label className="text-xs">
                      <input
                        type="checkbox"
                        checked={editForm.isActive}
                        onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                      />{' '}
                      Aktif
                    </label>
                  ) : c.isActive ? (
                    <span className="text-green-700 text-xs">Aktif</span>
                  ) : (
                    <span className="text-ink-muted80 text-xs">Pasif</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right text-xs space-x-2">
                  {editingId === c.id ? (
                    <>
                      <button type="button" onClick={saveEdit} className="text-green-700 hover:underline">
                        ✓ Kaydet
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="text-ink-muted80 hover:underline"
                      >
                        İptal
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => startEdit(c)}
                        className="text-primary hover:underline"
                      >
                        Düzenle
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(c.id, c.nameTr)}
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
    </div>
  );
}

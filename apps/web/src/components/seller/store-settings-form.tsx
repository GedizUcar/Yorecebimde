'use client';

import { useEffect, useState } from 'react';
import { apiClient, ClientApiError } from '@/lib/api-client';
import { useToast } from '@/components/toast';

type Store = {
  slug: string;
  displayName: string;
  bio: string | null;
  logoUrl: string | null;
  coverUrl: string | null;
  contactEmail: string;
  contactPhone: string;
  addressProvince: string | null;
  addressDistrict: string | null;
};

export function StoreSettingsForm() {
  const { show } = useToast();
  const [store, setStore] = useState<Store | null>(null);
  const [form, setForm] = useState({
    bio: '',
    logoUrl: '',
    coverUrl: '',
    contactEmail: '',
    contactPhone: '',
    addressProvince: '',
    addressDistrict: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiClient
      .get<Store>('/v1/seller/store')
      .then((s) => {
        setStore(s);
        setForm({
          bio: s.bio ?? '',
          logoUrl: s.logoUrl ?? '',
          coverUrl: s.coverUrl ?? '',
          contactEmail: s.contactEmail,
          contactPhone: s.contactPhone,
          addressProvince: s.addressProvince ?? '',
          addressDistrict: s.addressDistrict ?? '',
        });
      })
      .catch(() => show('Mağaza bilgileri yüklenemedi', 'error'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function update<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function save() {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {};
      if (form.bio) payload.bio = form.bio;
      if (form.logoUrl) payload.logoUrl = form.logoUrl;
      if (form.coverUrl) payload.coverUrl = form.coverUrl;
      payload.contactEmail = form.contactEmail;
      payload.contactPhone = form.contactPhone;
      if (form.addressProvince) payload.addressProvince = form.addressProvince;
      if (form.addressDistrict) payload.addressDistrict = form.addressDistrict;
      await apiClient.patch('/v1/seller/store', payload);
      show('Mağaza bilgileri kaydedildi', 'success');
    } catch (e) {
      show(e instanceof ClientApiError ? e.message : 'Kaydedilemedi', 'error');
    } finally {
      setSaving(false);
    }
  }

  if (!store) return <p className="text-sm text-ink-muted80">Yükleniyor…</p>;

  return (
    <div className="space-y-6 bg-canvas border border-hairline rounded-lg p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4 border-b border-hairline">
        <div>
          <p className="text-sm text-ink-muted80">Mağaza adı</p>
          <p className="font-semibold">{store.displayName}</p>
        </div>
        <div>
          <p className="text-sm text-ink-muted80">Mağaza slug</p>
          <p className="font-mono text-sm">/magaza/{store.slug}</p>
        </div>
      </div>

      <Field label="Hakkında (bio)">
        <textarea
          value={form.bio}
          onChange={(e) => update('bio', e.target.value)}
          rows={4}
          maxLength={2000}
          placeholder="Mağazanızı kısaca tanıtın…"
          className="w-full px-3 py-2 border border-hairline rounded-md text-sm"
        />
      </Field>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Logo URL">
          <input
            type="url"
            value={form.logoUrl}
            onChange={(e) => update('logoUrl', e.target.value)}
            placeholder="https://…"
            className="w-full px-3 py-2 border border-hairline rounded-md text-sm"
          />
        </Field>
        <Field label="Kapak görseli URL">
          <input
            type="url"
            value={form.coverUrl}
            onChange={(e) => update('coverUrl', e.target.value)}
            placeholder="https://…"
            className="w-full px-3 py-2 border border-hairline rounded-md text-sm"
          />
        </Field>
      </div>
      <p className="text-xs text-ink-muted80 -mt-3">
        Faz 4.2'de görseller MinIO presigned upload ile yüklenecek. Şu an dış URL kabul ediliyor.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="İletişim email">
          <input
            type="email"
            value={form.contactEmail}
            onChange={(e) => update('contactEmail', e.target.value)}
            className="w-full px-3 py-2 border border-hairline rounded-md text-sm"
          />
        </Field>
        <Field label="İletişim telefon">
          <input
            type="tel"
            value={form.contactPhone}
            onChange={(e) => update('contactPhone', e.target.value)}
            className="w-full px-3 py-2 border border-hairline rounded-md text-sm"
          />
        </Field>
        <Field label="İl">
          <input
            type="text"
            value={form.addressProvince}
            onChange={(e) => update('addressProvince', e.target.value)}
            className="w-full px-3 py-2 border border-hairline rounded-md text-sm"
          />
        </Field>
        <Field label="İlçe">
          <input
            type="text"
            value={form.addressDistrict}
            onChange={(e) => update('addressDistrict', e.target.value)}
            className="w-full px-3 py-2 border border-hairline rounded-md text-sm"
          />
        </Field>
      </div>

      <div className="pt-4 border-t border-hairline">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="btn-primary disabled:opacity-60"
        >
          {saving ? 'Kaydediliyor…' : 'Kaydet'}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1">{label}</label>
      {children}
    </div>
  );
}

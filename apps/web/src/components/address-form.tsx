'use client';

import { useState } from 'react';
import { apiClient, ClientApiError } from '@/lib/api-client';
import { useToast } from '@/components/toast';

export function AddressForm({
  onSuccess,
  onCancel,
}: {
  onSuccess: () => void;
  onCancel?: () => void;
}) {
  const { show } = useToast();
  const [form, setForm] = useState({
    label: 'Ev',
    recipientName: '',
    phone: '',
    province: '',
    district: '',
    neighborhood: '',
    postalCode: '',
    addressLine: '',
    isDefault: false,
  });
  const [busy, setBusy] = useState(false);

  function update<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function save() {
    if (form.recipientName.length < 2) return show('Alıcı adı eksik', 'error');
    if (form.phone.length < 10) return show('Telefon eksik', 'error');
    if (!form.province || !form.district || !form.addressLine) {
      return show('İl, ilçe ve adres satırı zorunlu', 'error');
    }
    setBusy(true);
    try {
      await apiClient.post('/v1/addresses', {
        label: form.label,
        recipientName: form.recipientName,
        phone: form.phone,
        country: 'TR',
        province: form.province,
        district: form.district,
        ...(form.neighborhood ? { neighborhood: form.neighborhood } : {}),
        ...(form.postalCode ? { postalCode: form.postalCode } : {}),
        addressLine: form.addressLine,
        isDefault: form.isDefault,
      });
      show('Adres eklendi', 'success');
      onSuccess();
    } catch (e) {
      show(e instanceof ClientApiError ? e.message : 'Eklenemedi', 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <input
          type="text"
          value={form.label}
          onChange={(e) => update('label', e.target.value)}
          placeholder="Adres etiketi (Ev, İş…)"
          className="px-3 py-2 border border-hairline rounded-md text-sm"
        />
        <input
          type="text"
          value={form.recipientName}
          onChange={(e) => update('recipientName', e.target.value)}
          placeholder="Alıcı adı soyadı"
          className="px-3 py-2 border border-hairline rounded-md text-sm"
        />
        <input
          type="tel"
          value={form.phone}
          onChange={(e) => update('phone', e.target.value)}
          placeholder="Telefon (örn. 0555…)"
          className="px-3 py-2 border border-hairline rounded-md text-sm"
        />
        <input
          type="text"
          value={form.postalCode}
          onChange={(e) => update('postalCode', e.target.value)}
          placeholder="Posta kodu (opsiyonel)"
          className="px-3 py-2 border border-hairline rounded-md text-sm"
        />
        <input
          type="text"
          value={form.province}
          onChange={(e) => update('province', e.target.value)}
          placeholder="İl"
          className="px-3 py-2 border border-hairline rounded-md text-sm"
        />
        <input
          type="text"
          value={form.district}
          onChange={(e) => update('district', e.target.value)}
          placeholder="İlçe"
          className="px-3 py-2 border border-hairline rounded-md text-sm"
        />
      </div>
      <input
        type="text"
        value={form.neighborhood}
        onChange={(e) => update('neighborhood', e.target.value)}
        placeholder="Mahalle (opsiyonel)"
        className="w-full px-3 py-2 border border-hairline rounded-md text-sm"
      />
      <textarea
        value={form.addressLine}
        onChange={(e) => update('addressLine', e.target.value)}
        rows={2}
        placeholder="Açık adres (sokak, bina, daire no…)"
        className="w-full px-3 py-2 border border-hairline rounded-md text-sm"
      />
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={form.isDefault}
          onChange={(e) => update('isDefault', e.target.checked)}
        />
        Varsayılan adres olarak ayarla
      </label>
      <div className="flex gap-2 pt-2">
        <button
          type="button"
          onClick={save}
          disabled={busy}
          className="px-4 py-2 rounded-pill bg-primary text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
        >
          {busy ? 'Kaydediliyor…' : 'Kaydet'}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-pill border border-hairline text-sm font-medium hover:bg-canvas-parchment"
          >
            İptal
          </button>
        )}
      </div>
    </div>
  );
}

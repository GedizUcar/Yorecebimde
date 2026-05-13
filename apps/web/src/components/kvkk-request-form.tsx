'use client';

import { useState } from 'react';
import { apiClient, ClientApiError } from '@/lib/api-client';
import { useToast } from '@/components/toast';

export function KvkkRequestForm() {
  const { show } = useToast();
  const [form, setForm] = useState({
    email: '',
    phone: '',
    contactName: '',
    type: 'access' as 'access' | 'deletion' | 'rectification' | 'portability' | 'objection',
    requestText: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function submit() {
    if (form.contactName.length < 2 || !form.email || form.requestText.length < 20) {
      show('Tüm zorunlu alanları doldurun (talep en az 20 karakter)', 'error');
      return;
    }
    setSubmitting(true);
    try {
      await apiClient.post('/v1/kvkk/requests', {
        email: form.email,
        phone: form.phone || undefined,
        contactName: form.contactName,
        type: form.type,
        requestText: form.requestText,
      });
      setDone(true);
    } catch (e) {
      show(e instanceof ClientApiError ? e.message : 'Gönderilemedi', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-lg bg-canvas border border-hairline p-8 text-center space-y-3">
        <div className="text-5xl">✓</div>
        <h2 className="text-2xl font-semibold">Talebiniz alındı</h2>
        <p className="text-sm text-ink-muted80">
          KVKK kapsamında 30 gün içinde size cevap vereceğiz. Onay e-postası gönderildi (Faz 4.3
          gerçek email entegre olunca).
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 bg-canvas border border-hairline rounded-lg p-6">
      <div>
        <label className="block text-sm font-medium mb-2">Talep türü</label>
        <select
          value={form.type}
          onChange={(e) => setForm({ ...form, type: e.target.value as typeof form.type })}
          className="w-full px-3 py-2 border border-hairline rounded-md text-sm"
        >
          <option value="access">Verilerime erişim talep ediyorum</option>
          <option value="rectification">Verilerimin düzeltilmesini istiyorum</option>
          <option value="deletion">Verilerimin silinmesini istiyorum</option>
          <option value="portability">Verilerimin başka kuruma aktarılmasını istiyorum</option>
          <option value="objection">İşlenmesine itiraz ediyorum</option>
        </select>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Ad Soyad *"
          value={form.contactName}
          onChange={(v) => setForm({ ...form, contactName: v })}
        />
        <Input
          label="Email *"
          type="email"
          value={form.email}
          onChange={(v) => setForm({ ...form, email: v })}
        />
        <Input
          label="Telefon (opsiyonel)"
          type="tel"
          value={form.phone}
          onChange={(v) => setForm({ ...form, phone: v })}
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Talep detayı *</label>
        <textarea
          value={form.requestText}
          onChange={(e) => setForm({ ...form, requestText: e.target.value })}
          rows={6}
          maxLength={5000}
          placeholder="Talebinizi detaylı yazın (min 20 karakter)"
          className="w-full px-3 py-2 border border-hairline rounded-md text-sm"
        />
      </div>
      <button
        type="button"
        onClick={submit}
        disabled={submitting}
        className="btn-primary w-full disabled:opacity-60"
      >
        {submitting ? 'Gönderiliyor…' : 'Talebi Gönder'}
      </button>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-hairline rounded-md text-sm"
      />
    </div>
  );
}

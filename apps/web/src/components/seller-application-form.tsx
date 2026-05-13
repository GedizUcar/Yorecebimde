'use client';

import { useState } from 'react';
import { apiClient, ClientApiError } from '@/lib/api-client';
import { useToast } from '@/components/toast';

type Form = {
  type: 'individual' | 'company';
  email: string;
  phone: string;
  contactName: string;
  displayName: string;
  legalName: string;
  taxId: string;
  iban: string;
  tcKimlik: string;
  tradeRegistryNo: string;
  foodBusinessRegNo: string;
};

export function SellerApplicationForm() {
  const { show } = useToast();
  const [form, setForm] = useState<Form>({
    type: 'individual',
    email: '',
    phone: '',
    contactName: '',
    displayName: '',
    legalName: '',
    taxId: '',
    iban: '',
    tcKimlik: '',
    tradeRegistryNo: '',
    foodBusinessRegNo: '',
  });
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ id: string; status: string } | null>(null);

  function update<K extends keyof Form>(k: K, v: Form[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit() {
    if (!agreed) {
      show('KVKK ve satıcı sözleşmesini onaylayın', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        type: form.type,
        email: form.email,
        phone: form.phone,
        contactName: form.contactName,
        displayName: form.displayName,
        iban: form.iban,
      };
      if (form.type === 'individual') {
        payload.tcKimlik = form.tcKimlik;
      } else {
        payload.legalName = form.legalName;
        payload.taxId = form.taxId;
        if (form.tradeRegistryNo) payload.tradeRegistryNo = form.tradeRegistryNo;
      }
      if (form.foodBusinessRegNo) payload.foodBusinessRegNo = form.foodBusinessRegNo;
      const data = await apiClient.post<{ id: string; status: string }>(
        '/v1/sellers/applications',
        payload,
      );
      setResult(data);
      show('Başvurunuz alındı', 'success');
    } catch (e) {
      show(e instanceof ClientApiError ? e.message : 'Başvuru alınamadı', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <div className="rounded-lg bg-canvas border border-hairline p-8 text-center space-y-4">
        <div className="inline-block w-16 h-16 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-3xl">
          ✓
        </div>
        <h2 className="text-2xl font-semibold">Başvurunuz alındı</h2>
        <p className="text-sm text-ink-muted80">
          Başvuru numaranız: <span className="font-mono">{result.id.substring(0, 8)}</span>
          <br />
          Belgeleriniz incelendikten sonra email adresinize davet bağlantısı gönderilecektir.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 bg-canvas border border-hairline rounded-lg p-6">
      <div>
        <label className="block text-sm font-medium mb-2">Başvuru Türü</label>
        <div className="grid grid-cols-2 gap-3">
          {(['individual', 'company'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => update('type', t)}
              className={`px-4 py-3 rounded-md border-2 text-sm font-medium transition-colors ${
                form.type === t
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-hairline hover:border-primary'
              }`}
            >
              {t === 'individual' ? '👨‍🌾 Şahıs' : '🏢 Şirket'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input label="Mağaza Adı *" value={form.displayName} onChange={(v) => update('displayName', v)} />
        <Input label="İletişim Kişisi *" value={form.contactName} onChange={(v) => update('contactName', v)} />
        <Input label="Email *" type="email" value={form.email} onChange={(v) => update('email', v)} />
        <Input label="Telefon *" type="tel" value={form.phone} onChange={(v) => update('phone', v)} />
      </div>

      {form.type === 'individual' ? (
        <Input label="TC Kimlik No * (şifreli saklanır)" value={form.tcKimlik} onChange={(v) => update('tcKimlik', v)} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Ticari Ünvan *" value={form.legalName} onChange={(v) => update('legalName', v)} />
          <Input label="Vergi No *" value={form.taxId} onChange={(v) => update('taxId', v)} />
          <Input label="Ticaret Sicil No" value={form.tradeRegistryNo} onChange={(v) => update('tradeRegistryNo', v)} />
        </div>
      )}

      <Input label="IBAN * (şifreli saklanır)" value={form.iban} onChange={(v) => update('iban', v.toUpperCase())} placeholder="TR..." />

      <Input
        label="Gıda İşletme Kayıt No (Tarım Bakanlığı)"
        value={form.foodBusinessRegNo}
        onChange={(v) => update('foodBusinessRegNo', v)}
        placeholder="TR-XX-XXX-YYYY"
      />

      <label className="flex items-start gap-2 text-sm border-t border-hairline pt-4">
        <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-1" />
        <span>
          KVKK Aydınlatma Metni'ni ve Satıcı Sözleşmesi'ni okudum, onaylıyorum.
          <span className="text-xs text-ink-muted80 block mt-1">
            (Faz 4'te belge yükleme adımı eklenecek — şu an MVP)
          </span>
        </span>
      </label>

      <button
        type="button"
        onClick={submit}
        disabled={submitting || !agreed}
        className="btn-primary w-full disabled:opacity-60"
      >
        {submitting ? 'Gönderiliyor…' : 'Başvuruyu Gönder'}
      </button>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-hairline rounded-md text-sm"
      />
    </div>
  );
}

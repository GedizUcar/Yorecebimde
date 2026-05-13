'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { apiClient, ClientApiError } from '@/lib/api-client';
import { emitCartUpdate } from '@/lib/cart-store';
import { useToast } from '@/components/toast';

type Props = {
  token: string;
  paymentRef: string;
  amountCents: number;
};

function formatCents(n: number): string {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(n / 100);
}

export function IyzicoMockClient({ token, paymentRef, amountCents }: Props) {
  const router = useRouter();
  const { show } = useToast();
  const [processing, setProcessing] = useState(false);

  async function submit(success: boolean) {
    if (processing) return;
    setProcessing(true);
    const finalToken = success ? token : token + '-decline';
    try {
      const result = await apiClient.post<{ success: boolean; orderNos: string[] }>(
        '/v1/webhooks/iyzico/callback',
        { token: finalToken },
      );
      emitCartUpdate();
      if (result.success && result.orderNos[0]) {
        show('Ödeme alındı', 'success');
        router.push(`/hesabim/siparislerim/${result.orderNos[0]}`);
      } else {
        show('Ödeme reddedildi', 'error');
        router.push('/sepet');
      }
    } catch (e) {
      show(e instanceof ClientApiError ? e.message : 'Beklenmedik hata', 'error');
      setProcessing(false);
    }
  }

  return (
    <div className="rounded-lg bg-canvas border border-hairline p-8 space-y-6">
      <div className="text-center">
        <div className="inline-block px-3 py-1 rounded-pill bg-amber-100 text-amber-900 text-xs font-medium mb-3">
          [MOCK] Iyzico 3DS Test Sayfası
        </div>
        <h1 className="text-2xl font-semibold">Ödemeyi Onayla</h1>
        <p className="text-sm text-ink-muted80 mt-2">
          Gerçek Iyzico entegrasyonu Faz 4'te aktif olacak. Bu sayfa test akışını simüle eder.
        </p>
      </div>

      <dl className="space-y-2 text-sm border-t border-hairline pt-4">
        <div className="flex justify-between">
          <dt className="text-ink-muted80">Ödeme referansı</dt>
          <dd className="font-mono text-xs">{paymentRef}</dd>
        </div>
        <div className="flex justify-between text-lg font-bold">
          <dt>Tutar</dt>
          <dd>{formatCents(amountCents)}</dd>
        </div>
      </dl>

      <div className="rounded-md bg-canvas-parchment p-4 space-y-2 text-sm">
        <p className="font-medium">Test Kartı (Iyzico sandbox eşdeğeri)</p>
        <p className="text-ink-muted80">5528790000000008 · 12/30 · CVV 123</p>
      </div>

      <div className="grid grid-cols-2 gap-3 pt-2">
        <button
          type="button"
          onClick={() => submit(false)}
          disabled={processing}
          className="px-4 py-3 rounded-pill border border-red-300 text-red-700 font-medium hover:bg-red-50 disabled:opacity-60"
        >
          ✕ Reddet
        </button>
        <button
          type="button"
          onClick={() => submit(true)}
          disabled={processing}
          className="btn-primary disabled:opacity-60"
        >
          {processing ? 'İşleniyor…' : '✓ Onayla'}
        </button>
      </div>
    </div>
  );
}

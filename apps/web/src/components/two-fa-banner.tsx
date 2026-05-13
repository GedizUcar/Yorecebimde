'use client';

import { useEffect, useState } from 'react';

type Status = {
  enabled: boolean;
  enforced: boolean;
  role: string;
  gracePeriodDays: number;
};

/**
 * Seller + admin layout'larda gösterilir. 2FA enforce edilen kullanıcı
 * 2FA açmamışsa kalıcı banner gösterilir. Setup linki Faz 8'de aktive olur.
 */
export function TwoFaBanner() {
  const [status, setStatus] = useState<Status | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
    void fetch(`${base}/v1/2fa/status`, { credentials: 'include' })
      .then((r) => r.json())
      .then((j) => {
        if (j?.data) setStatus(j.data);
      })
      .catch(() => {});
  }, []);

  if (!status || !status.enforced || status.enabled || dismissed) return null;

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-sm flex items-center justify-between">
      <p className="text-amber-900">
        ⚠ <strong>2FA henüz aktif değil.</strong>{' '}
        {status.role === 'seller'
          ? 'Satıcı paneline güvenli erişim için 2 faktörlü doğrulamayı aktive edin.'
          : 'Admin paneline güvenli erişim için 2 faktörlü doğrulamayı aktive edin.'}{' '}
        ({status.gracePeriodDays} gün içinde zorunlu olacak.)
      </p>
      <div className="flex items-center gap-2">
        <a
          href="/hesabim/2fa-kurulum"
          className="px-3 py-1 rounded-pill bg-amber-700 text-white text-xs hover:bg-amber-800 whitespace-nowrap"
        >
          Şimdi Kur
        </a>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="text-amber-700 hover:underline text-xs"
        >
          Gizle
        </button>
      </div>
    </div>
  );
}

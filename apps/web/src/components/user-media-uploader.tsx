'use client';

import { useState } from 'react';
import { ClientApiError } from '@/lib/api-client';

type UploadResult = {
  storageKey: string;
  publicUrl: string;
};

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

type Context = 'review' | 'question_attachment' | 'profile_avatar';

/**
 * Müşteri-side resim uploader. Presigned PUT → MinIO. Sonuçta `publicUrl` callback
 * ile parent component'e iletilir; parent kendi state'inde `photos: string[]` tutar.
 */
export function UserMediaUploader({
  context,
  max = 6,
  onUploaded,
  current = [],
  onRemove,
}: {
  context: Context;
  max?: number;
  onUploaded: (url: string) => void;
  current?: string[];
  onRemove?: (url: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleFile(file: File) {
    setErr(null);
    if (current.length >= max) {
      setErr(`En fazla ${max} fotoğraf yükleyebilirsin`);
      return;
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setErr('JPEG, PNG veya WebP yükleyin');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErr('Maksimum 5 MB');
      return;
    }
    setBusy(true);
    try {
      const form = new FormData();
      form.append('context', context);
      form.append('file', file);
      const res = await fetch(`${BASE_URL}/v1/user-media/upload`, {
        method: 'POST',
        body: form,
        credentials: 'include',
        headers: { 'Accept-Language': 'tr' },
      });
      const json = await res.json();
      if (!res.ok || 'error' in json) {
        const errBody = 'error' in json ? json.error : { code: 'UNKNOWN', message: res.statusText };
        throw new ClientApiError(res.status, errBody);
      }
      const result = json.data as UploadResult;
      onUploaded(result.publicUrl);
    } catch (e) {
      setErr(e instanceof ClientApiError ? e.message : 'Yükleme başarısız');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {current.map((url) => (
          <div key={url} className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt=""
              className="w-20 h-20 object-cover rounded-md border border-hairline"
            />
            {onRemove && (
              <button
                type="button"
                onClick={() => onRemove(url)}
                className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-700 text-white text-xs flex items-center justify-center"
                aria-label="Kaldır"
              >
                ×
              </button>
            )}
          </div>
        ))}
        {current.length < max && (
          <label
            className={`w-20 h-20 rounded-md border-2 border-dashed border-hairline flex items-center justify-center cursor-pointer hover:border-primary text-2xl text-ink-muted80 ${
              busy ? 'opacity-50 cursor-wait' : ''
            }`}
          >
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleFile(f);
                e.target.value = '';
              }}
              disabled={busy}
              className="hidden"
            />
            {busy ? '…' : '+'}
          </label>
        )}
      </div>
      {err && <p className="text-xs text-red-700">{err}</p>}
      <p className="text-xs text-ink-muted80">
        JPEG/PNG/WebP · max 5 MB · max {max} fotoğraf
      </p>
    </div>
  );
}

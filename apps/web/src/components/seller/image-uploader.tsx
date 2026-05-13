'use client';

import { useState } from 'react';
import { apiClient, ClientApiError, uploadToPresignedUrl } from '@/lib/api-client';

type ImageItem = {
  imageId: string;
  status: 'uploading' | 'processing' | 'ready' | 'failed';
  fileName: string;
  preview?: string;
  error?: string;
};

type PresignResponse = {
  uploadUrl: string;
  imageId: string;
  storageKey: string;
  expiresInSec: number;
  maxFileSizeBytes: number;
};

const MAX_IMAGES = 3;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];

export function ImageUploader({ productId }: { productId: string }) {
  const [items, setItems] = useState<ImageItem[]>([]);
  const [busy, setBusy] = useState(false);

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (files.length === 0) return;
    setBusy(true);
    for (const file of files) {
      if (items.length + 1 > MAX_IMAGES) break;
      await handleUpload(file);
    }
    setBusy(false);
  }

  async function handleUpload(file: File) {
    if (!ALLOWED_TYPES.includes(file.type)) {
      addItem({
        imageId: `err-${Date.now()}`,
        status: 'failed',
        fileName: file.name,
        error: 'Desteklenmeyen format',
      });
      return;
    }

    const preview = URL.createObjectURL(file);
    let placeholderId = `tmp-${Date.now()}`;
    addItem({ imageId: placeholderId, status: 'uploading', fileName: file.name, preview });

    try {
      const presign = await apiClient.post<PresignResponse>(
        `/v1/uploads/products/${productId}/presign`,
        { contentType: file.type, fileName: file.name },
      );

      updateItem(placeholderId, { imageId: presign.imageId });
      placeholderId = presign.imageId;

      await uploadToPresignedUrl(presign.uploadUrl, file);

      updateItem(presign.imageId, { status: 'processing' });

      await apiClient.post(
        `/v1/uploads/products/${productId}/images/${presign.imageId}/complete`,
      );

      // Naive polling — production'da SSE/WS olabilir
      void pollStatus(presign.imageId);
    } catch (e) {
      const msg = e instanceof ClientApiError ? e.message : 'Yükleme başarısız';
      updateItem(placeholderId, { status: 'failed', error: msg });
    }
  }

  async function pollStatus(imageId: string) {
    // Worker'ı bekleyen basit poll — 8 deneme × 1.5s = 12s tavan
    for (let i = 0; i < 8; i++) {
      await new Promise((r) => setTimeout(r, 1500));
      try {
        const img = await apiClient.get<{
          id: string;
          processingStatus: 'pending' | 'processing' | 'ready' | 'failed';
          thumbnailUrl: string | null;
          processingError: string | null;
        }>(`/v1/uploads/images/${imageId}`);
        if (img.processingStatus === 'ready') {
          updateItem(imageId, { status: 'ready' });
          return;
        }
        if (img.processingStatus === 'failed') {
          updateItem(imageId, {
            status: 'failed',
            error: img.processingError ?? 'İşlenemedi',
          });
          return;
        }
      } catch {
        // sessiz geç — yine deneyeceğiz
      }
    }
  }

  function addItem(item: ImageItem) {
    setItems((prev) => [...prev, item]);
  }

  function updateItem(id: string, patch: Partial<ImageItem>) {
    setItems((prev) => prev.map((x) => (x.imageId === id ? { ...x, ...patch } : x)));
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        {items.map((item) => (
          <div
            key={item.imageId}
            className="aspect-square rounded-lg border border-hairline bg-canvas-parchment relative overflow-hidden"
          >
            {item.preview && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.preview}
                alt={item.fileName}
                className="absolute inset-0 w-full h-full object-cover"
              />
            )}
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              {item.status === 'uploading' && <span className="text-white text-xs">Yükleniyor…</span>}
              {item.status === 'processing' && (
                <span className="text-white text-xs">İşleniyor…</span>
              )}
              {item.status === 'ready' && <span className="text-white text-xs">Hazır ✓</span>}
              {item.status === 'failed' && (
                <span className="text-white text-xs px-2 text-center">
                  ✕ {item.error ?? 'Hata'}
                </span>
              )}
            </div>
          </div>
        ))}
        {items.length < MAX_IMAGES && (
          <label className="aspect-square rounded-lg border-2 border-dashed border-hairline hover:border-primary transition-colors flex items-center justify-center cursor-pointer">
            <input
              type="file"
              multiple
              accept={ALLOWED_TYPES.join(',')}
              onChange={onFileChange}
              disabled={busy}
              className="hidden"
            />
            <div className="text-center text-sm text-ink-muted80">
              <div className="text-2xl">+</div>
              <div>Görsel ekle</div>
            </div>
          </label>
        )}
      </div>
    </div>
  );
}

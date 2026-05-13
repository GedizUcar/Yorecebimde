'use client';

import { useEffect, useState } from 'react';
import { apiClient, ClientApiError } from '@/lib/api-client';
import { getDeviceId } from '@/lib/device-id';
import { useToast } from '@/components/toast';

type Props = {
  productId: string;
  size?: 'sm' | 'md';
  className?: string;
};

let cachedIds: Set<string> | null = null;
let inflight: Promise<Set<string>> | null = null;

async function fetchWishlistIds(): Promise<Set<string>> {
  if (cachedIds) return cachedIds;
  if (inflight) return inflight;
  const deviceId = getDeviceId();
  inflight = apiClient
    .get<string[]>('/v1/wishlist/ids', { headers: { 'x-device-id': deviceId } as Record<string, string> })
    .then((ids) => {
      cachedIds = new Set(ids);
      inflight = null;
      return cachedIds;
    })
    .catch(() => {
      inflight = null;
      cachedIds = new Set();
      return cachedIds;
    });
  return inflight;
}

export function WishlistButton({ productId, size = 'md', className = '' }: Props) {
  const { show } = useToast();
  const [liked, setLiked] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetchWishlistIds().then((ids) => setLiked(ids.has(productId)));
  }, [productId]);

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;
    setBusy(true);
    const deviceId = getDeviceId();
    const headers = { 'x-device-id': deviceId };
    try {
      if (liked) {
        await apiClient.delete(`/v1/wishlist/${productId}`, { headers });
        setLiked(false);
        cachedIds?.delete(productId);
        show('Beğendiklerimden çıkarıldı', 'info');
      } else {
        await apiClient.post('/v1/wishlist', { productId }, { headers });
        setLiked(true);
        cachedIds?.add(productId);
        show('Beğendiklerime eklendi', 'success');
      }
    } catch (e) {
      show(e instanceof ClientApiError ? e.message : 'İşlem başarısız', 'error');
    } finally {
      setBusy(false);
    }
  }

  const dim = size === 'sm' ? 'w-8 h-8 text-sm' : 'w-10 h-10 text-base';

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={liked ? 'Beğendiklerimden çıkar' : 'Beğen'}
      aria-pressed={liked}
      className={`${dim} rounded-full flex items-center justify-center transition-all border ${
        liked
          ? 'bg-primary text-white border-primary'
          : 'bg-canvas text-ink border-hairline hover:border-primary hover:text-primary'
      } ${className}`}
    >
      {liked ? '♥' : '♡'}
    </button>
  );
}

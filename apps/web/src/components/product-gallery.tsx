'use client';

import { useState } from 'react';
import { PlaceholderImage } from '@/components/placeholder-image';

type GalleryImage = {
  id: string;
  full: string;
  thumb: string;
  alt: string;
};

export function ProductGallery({
  images,
  fallbackLabel,
}: {
  images: GalleryImage[];
  fallbackLabel: string;
}) {
  const [activeIdx, setActiveIdx] = useState(0);

  if (images.length === 0) {
    return (
      <PlaceholderImage
        seed={fallbackLabel}
        category={fallbackLabel}
        size="lg"
        className="aspect-square rounded-lg"
      />
    );
  }

  const active = images[activeIdx] ?? images[0]!;

  return (
    <div className="space-y-4">
      <div className="aspect-square rounded-lg bg-canvas-parchment overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={active.full}
          alt={active.alt}
          className="w-full h-full object-cover"
        />
      </div>
      {images.length > 1 && (
        <div className="grid grid-cols-4 gap-2">
          {images.map((img, i) => (
            <button
              key={img.id}
              type="button"
              onClick={() => setActiveIdx(i)}
              className={`aspect-square rounded-md overflow-hidden border-2 transition-colors ${
                i === activeIdx ? 'border-primary' : 'border-transparent hover:border-hairline'
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.thumb} alt={img.alt} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

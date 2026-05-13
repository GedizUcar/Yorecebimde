'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { apiClient } from '@/lib/api-client';

type Suggestion = {
  id: string;
  slug: string;
  nameTr: string;
  sellerSlug: string;
  sellerName: string;
  thumbnailUrl: string | null;
  baseUnitPrice: number;
  unit: string;
};

export function SearchBar({ defaultValue = '' }: { defaultValue?: string }) {
  const router = useRouter();
  const [query, setQuery] = useState(defaultValue);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setSuggestions([]);
      return;
    }
    const handle = setTimeout(async () => {
      try {
        const data = await apiClient.get<Suggestion[]>(
          `/v1/search/autocomplete?q=${encodeURIComponent(q)}&limit=5`,
        );
        setSuggestions(data);
        setOpen(true);
      } catch {
        setSuggestions([]);
      }
    }, 200);
    return () => clearTimeout(handle);
  }, [query]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  function go(target: string) {
    setOpen(false);
    router.push(target);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (q.length === 0) return;
    if (activeIdx >= 0 && suggestions[activeIdx]) {
      const s = suggestions[activeIdx];
      go(`/urun/${s.sellerSlug}/${s.slug}`);
      return;
    }
    go(`/arama?q=${encodeURIComponent(q)}`);
  }

  function handleKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => (i + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  return (
    <div ref={wrapperRef} className="flex-1 w-full relative">
      <form onSubmit={handleSubmit}>
        <div className="relative">
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIdx(-1);
            }}
            onFocus={() => suggestions.length > 0 && setOpen(true)}
            onKeyDown={handleKey}
            placeholder="Yöresel ürün ara…"
            className="w-full h-9 pl-9 pr-3 rounded-pill text-sm bg-white/10 text-white placeholder:text-white/50 border border-white/20 focus:bg-white focus:text-ink focus:placeholder:text-ink-muted80 focus:outline-none focus:border-white transition-colors"
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60 pointer-events-none">
            🔍
          </span>
        </div>
      </form>

      {open && suggestions.length > 0 && (
        <div className="absolute top-full mt-2 left-0 right-0 bg-canvas rounded-lg shadow-xl border border-hairline overflow-hidden z-50">
          {suggestions.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => go(`/urun/${s.sellerSlug}/${s.slug}`)}
              onMouseEnter={() => setActiveIdx(i)}
              className={`w-full px-3 py-2 flex items-center gap-3 text-left text-ink transition-colors ${
                i === activeIdx ? 'bg-canvas-parchment' : 'hover:bg-canvas-parchment'
              }`}
            >
              <div className="w-10 h-10 rounded-md bg-canvas-parchment flex-shrink-0 overflow-hidden">
                {s.thumbnailUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={s.thumbnailUrl}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium line-clamp-1">{s.nameTr}</p>
                <p className="text-xs text-ink-muted80 line-clamp-1">{s.sellerName}</p>
              </div>
              <span className="text-xs text-ink-muted80 whitespace-nowrap">
                {s.baseUnitPrice} ₺/{s.unit}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

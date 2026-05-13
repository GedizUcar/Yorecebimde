'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { authClient } from '@/lib/auth-client';
import { useToast } from '@/components/toast';
import { useCart, cartItemCount } from '@/lib/cart-store';

export function HeaderAuth() {
  const router = useRouter();
  const { show } = useToast();
  const { data, isPending } = authClient.useSession();
  const { cart } = useCart();
  const count = cartItemCount(cart);
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  if (isPending) {
    return <div className="h-6 w-24 rounded bg-white/10 animate-pulse" aria-hidden />;
  }

  if (!data?.user) {
    return (
      <div className="flex items-center gap-5 whitespace-nowrap">
        <Link href="/giris" className="opacity-80 hover:opacity-100">
          Giriş Yap
        </Link>
        <Link href="/kayit" className="opacity-80 hover:opacity-100">
          Üye Ol
        </Link>
        <CartIcon count={count} />
      </div>
    );
  }

  const user = data.user;
  const initial =
    user.name?.trim().charAt(0).toUpperCase() ?? user.email.charAt(0).toUpperCase();

  async function handleLogout() {
    try {
      await authClient.signOut();
      show('Çıkış yapıldı', 'info');
      router.refresh();
      router.push('/');
    } catch {
      show('Çıkış başarısız', 'error');
    }
  }

  return (
    <div className="flex items-center gap-5 whitespace-nowrap">
      <Link href="/begendiklerim" className="opacity-80 hover:opacity-100" aria-label="Beğendiklerim">
        ♡
      </Link>
      <CartIcon count={count} />
      <div ref={wrapperRef} className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 opacity-90 hover:opacity-100"
          aria-haspopup="menu"
          aria-expanded={open}
        >
          <span className="w-7 h-7 rounded-full bg-white text-black flex items-center justify-center text-xs font-semibold">
            {initial}
          </span>
          <span className="hidden md:inline">{user.name ?? user.email}</span>
          <span className="text-xs opacity-70">▾</span>
        </button>
        {open && (
          <div
            className="absolute right-0 top-full mt-2 w-56 bg-canvas text-ink rounded-lg shadow-xl border border-hairline overflow-hidden z-50"
            role="menu"
          >
            <div className="px-4 py-3 border-b border-hairline">
              <p className="text-sm font-medium truncate">{user.name ?? 'Kullanıcı'}</p>
              <p className="text-xs text-ink-muted80 truncate">{user.email}</p>
            </div>
            <MenuLink href="/seller/dashboard" label="Satıcı Paneli" onClick={() => setOpen(false)} />
            <MenuLink href="/begendiklerim" label="Beğendiklerim" onClick={() => setOpen(false)} />
            <MenuLink href="/hesabim/siparislerim" label="Siparişlerim" onClick={() => setOpen(false)} />
            <MenuLink href="/hesabim/iadelerim" label="İade Taleplerim" onClick={() => setOpen(false)} />
            <MenuLink href="/hesabim/mesajlarim" label="Mesajlarım" onClick={() => setOpen(false)} />
            <MenuLink href="/hesabim" label="Hesap Ayarları" onClick={() => setOpen(false)} />
            <button
              type="button"
              onClick={handleLogout}
              className="w-full px-4 py-2 text-left text-sm text-red-700 hover:bg-canvas-parchment transition-colors border-t border-hairline"
              role="menuitem"
            >
              Çıkış Yap
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function CartIcon({ count }: { count: number }) {
  return (
    <Link
      href="/sepet"
      className="relative opacity-90 hover:opacity-100 flex items-center gap-1"
      aria-label="Sepet"
    >
      <span>Sepet</span>
      {count > 0 && (
        <span className="ml-1 inline-flex items-center justify-center min-w-[20px] h-[20px] px-1.5 rounded-full bg-primary text-white text-[10px] font-bold leading-none">
          {count}
        </span>
      )}
    </Link>
  );
}

function MenuLink({
  href,
  label,
  onClick,
}: {
  href: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="block px-4 py-2 text-sm hover:bg-canvas-parchment transition-colors"
      role="menuitem"
    >
      {label}
    </Link>
  );
}

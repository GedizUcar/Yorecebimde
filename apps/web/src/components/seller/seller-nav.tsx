'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { authClient } from '@/lib/auth-client';
import { useToast } from '@/components/toast';

const items: { href: string; label: string }[] = [
  { href: '/seller/dashboard', label: 'Genel Bakış' },
  { href: '/seller/products', label: 'Ürünler' },
  { href: '/seller/orders', label: 'Siparişler' },
  { href: '/seller/disputes', label: 'İadeler' },
  { href: '/seller/messages', label: 'Mesajlar' },
  { href: '/seller/questions', label: 'Sorular' },
  { href: '/seller/reports', label: 'Raporlar' },
  { href: '/seller/boost', label: 'Boost' },
  { href: '/seller/settings/store', label: 'Mağaza' },
  { href: '/seller/settings/account', label: 'Hesap' },
];

export function SellerNav() {
  const router = useRouter();
  const pathname = usePathname();
  const { show } = useToast();
  const { data } = authClient.useSession();

  async function logout() {
    try {
      await authClient.signOut();
      show('Çıkış yapıldı', 'info');
      router.push('/');
    } catch {
      show('Çıkış başarısız', 'error');
    }
  }

  return (
    <header className="bg-canvas border-b border-hairline sticky top-0 z-20">
      <div className="max-w-content mx-auto flex items-center justify-between px-6 py-4">
        <Link href="/seller/dashboard" className="font-semibold text-lg">
          Yörecebimde · Satıcı
        </Link>
        <nav className="flex items-center gap-6 text-sm">
          {items.map((item) => {
            const active = pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={
                  active
                    ? 'text-primary font-medium'
                    : 'text-ink hover:text-primary transition-colors'
                }
              >
                {item.label}
              </Link>
            );
          })}
          <Link href="/" className="text-ink-muted80 hover:text-primary">
            Mağazama git ↗
          </Link>
          {data?.user && (
            <div className="flex items-center gap-2 pl-4 border-l border-hairline">
              <span className="text-xs text-ink-muted80 hidden md:inline">
                {data.user.name ?? data.user.email}
              </span>
              <button
                type="button"
                onClick={logout}
                className="text-sm text-red-700 hover:underline"
              >
                Çıkış
              </button>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}

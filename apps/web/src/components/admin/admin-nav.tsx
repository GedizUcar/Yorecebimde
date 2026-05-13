'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { authClient } from '@/lib/auth-client';
import { useToast } from '@/components/toast';

const items: { href: string; label: string; icon: string }[] = [
  { href: '/admin/dashboard', label: 'Genel Bakış', icon: '◫' },
  { href: '/admin/applications', label: 'Satıcı Başvuruları', icon: '⊕' },
  { href: '/admin/sellers', label: 'Satıcılar', icon: '◉' },
  { href: '/admin/categories', label: 'Kategoriler', icon: '☷' },
  { href: '/admin/disputes', label: 'İadeler', icon: '⚠' },
  { href: '/admin/reviews', label: 'Yorumlar', icon: '★' },
  { href: '/admin/boost-packages', label: 'Boost Paketleri', icon: '☼' },
  { href: '/admin/kvkk', label: 'KVKK Talepleri', icon: '⚖' },
  { href: '/admin/templates', label: 'Bildirim Şablonları', icon: '✉' },
  { href: '/admin/settings', label: 'Sistem Ayarları', icon: '⚙' },
  { href: '/admin/team', label: 'Admin Ekibi', icon: '◍' },
  { href: '/admin/etbis', label: 'ETBİS', icon: '◰' },
  { href: '/admin/audit', label: 'Audit Log', icon: '◴' },
];

export function AdminNav() {
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
    <aside className="w-60 bg-canvas border-r border-hairline min-h-screen flex flex-col sticky top-0">
      <div className="px-6 py-5 border-b border-hairline">
        <p className="font-semibold">Yörecebimde</p>
        <p className="text-xs text-ink-muted80">Süper Admin Paneli</p>
      </div>
      <nav className="flex-1 py-3">
        {items.map((item) => {
          const active = pathname?.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-6 py-2.5 text-sm transition-colors ${
                active
                  ? 'text-primary font-semibold bg-primary/5 border-r-2 border-primary'
                  : 'text-ink hover:bg-canvas-parchment'
              }`}
            >
              <span className="text-base text-ink-muted80">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
      {data?.user && (
        <div className="px-6 py-4 border-t border-hairline">
          <p className="text-xs text-ink-muted80 truncate">{data.user.email}</p>
          <button
            type="button"
            onClick={logout}
            className="mt-2 text-sm text-red-700 hover:underline"
          >
            Çıkış Yap
          </button>
        </div>
      )}
    </aside>
  );
}

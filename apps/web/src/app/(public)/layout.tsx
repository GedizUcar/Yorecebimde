import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { SearchBar } from '@/components/search-bar';
import { HeaderAuth } from '@/components/header-auth';
import { BotWidget } from '@/components/bot/bot-widget';
import { CookieBanner } from '@/components/cookie-banner';

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations('common');

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-50 bg-black text-white">
        <nav className="max-w-content mx-auto flex items-center justify-between gap-4 md:gap-8 px-4 md:px-6 h-14 text-xs">
          <Link href="/" className="font-semibold tracking-tight whitespace-nowrap text-sm">
            {t('appName')}
          </Link>
          <div className="hidden md:flex flex-1 justify-center max-w-2xl">
            <SearchBar />
          </div>
          <HeaderAuth />
        </nav>
        {/* Mobile arama bar — header'ın altında ayrı satır */}
        <div className="md:hidden border-t border-white/10 bg-black px-4 py-2">
          <SearchBar />
        </div>
      </header>

      <div className="flex-1">{children}</div>

      <BotWidget />
      <CookieBanner />

      <footer className="bg-canvas-parchment text-ink-muted80 py-16 px-6">
        <div className="max-w-content mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-sm">
          <div>
            <h4 className="font-semibold mb-3 text-ink">Yörecebimde</h4>
            <ul className="space-y-2">
              <li><Link href="/hakkimizda">Hakkımızda</Link></li>
              <li><Link href="/iletisim">İletişim</Link></li>
              <li><Link href="/satici-ol">Satıcı Ol</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-3 text-ink">Yardım</h4>
            <ul className="space-y-2">
              <li><Link href="/sss">SSS</Link></li>
              <li><Link href="/iade-iptal">İade & İptal</Link></li>
              <li><Link href="/kargo">Kargo</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-3 text-ink">Yasal</h4>
            <ul className="space-y-2">
              <li><Link href="/kvkk">KVKK</Link></li>
              <li><Link href="/cerez-politikasi">Çerez Politikası</Link></li>
              <li><Link href="/mesafeli-satis">Mesafeli Satış</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-3 text-ink">Hesap</h4>
            <ul className="space-y-2">
              <li><Link href="/giris">{t('login')}</Link></li>
              <li><Link href="/kayit">{t('register')}</Link></li>
              <li><Link href="/hesabim/siparislerim">{t('orders')}</Link></li>
            </ul>
          </div>
        </div>
        <p className="max-w-content mx-auto mt-12 text-xs text-ink-muted48">
          © {new Date().getFullYear()} Yörecebimde. Tüm hakları saklıdır.
        </p>
      </footer>
    </div>
  );
}

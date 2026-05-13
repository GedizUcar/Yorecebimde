import Link from 'next/link';
import { WishlistGrid } from '@/components/wishlist-grid';

export default function BegendiklerimPage() {
  return (
    <main className="tile-light">
      <div className="max-w-content mx-auto space-y-6">
        <nav className="text-sm text-ink-muted80">
          <ol className="flex flex-wrap items-center gap-2">
            <li>
              <Link href="/" className="hover:text-primary">
                Anasayfa
              </Link>
            </li>
            <li>›</li>
            <li className="text-ink font-medium">Beğendiklerim</li>
          </ol>
        </nav>

        <div>
          <h1>Beğendiklerim</h1>
          <p className="text-sm text-ink-muted80">
            Beğendiğiniz ürünler — sayfayı kapatsanız bile saklanır.
          </p>
        </div>

        <WishlistGrid />
      </div>
    </main>
  );
}

export const metadata = {
  title: 'Beğendiklerim',
  robots: { index: false },
};

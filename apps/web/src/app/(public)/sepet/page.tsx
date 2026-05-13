import Link from 'next/link';
import { CartView } from '@/components/cart-view';

export default function SepetPage() {
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
            <li className="text-ink font-medium">Sepet</li>
          </ol>
        </nav>

        <div>
          <h1>Sepetim</h1>
        </div>

        <CartView />
      </div>
    </main>
  );
}

export const metadata = {
  title: 'Sepet',
  robots: { index: false },
};

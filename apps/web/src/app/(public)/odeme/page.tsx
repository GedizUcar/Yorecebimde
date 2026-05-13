import Link from 'next/link';
import { CheckoutFlow } from '@/components/checkout-flow';

export default function OdemePage() {
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
            <li>
              <Link href="/sepet" className="hover:text-primary">
                Sepet
              </Link>
            </li>
            <li>›</li>
            <li className="text-ink font-medium">Ödeme</li>
          </ol>
        </nav>

        <div>
          <h1>Ödeme</h1>
          <p className="text-sm text-ink-muted80">
            Faz 3.1 — Iyzico entegrasyonu Faz 3.2'de aktif. Şimdilik sipariş "ödendi" olarak kaydedilir.
          </p>
        </div>

        <CheckoutFlow />
      </div>
    </main>
  );
}

export const metadata = {
  title: 'Ödeme',
  robots: { index: false },
};

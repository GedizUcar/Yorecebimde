import Link from 'next/link';
import { AccountSummary } from '@/components/account-summary';

export default function HesabimPage() {
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
            <li className="text-ink font-medium">Hesabım</li>
          </ol>
        </nav>

        <div>
          <h1>Hesabım</h1>
        </div>

        <AccountSummary />
      </div>
    </main>
  );
}

export const metadata = {
  title: 'Hesabım',
  robots: { index: false },
};

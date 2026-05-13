import Link from 'next/link';
import { CustomerDisputesList } from '@/components/customer-disputes-list';

export default function CustomerDisputesPage() {
  return (
    <main className="tile-light">
      <div className="max-w-content mx-auto space-y-6">
        <nav className="text-sm text-ink-muted80">
          <ol className="flex flex-wrap items-center gap-2">
            <li><Link href="/" className="hover:text-primary">Anasayfa</Link></li>
            <li>›</li>
            <li><Link href="/hesabim" className="hover:text-primary">Hesabım</Link></li>
            <li>›</li>
            <li className="text-ink font-medium">İade Taleplerim</li>
          </ol>
        </nav>
        <h1>İade Taleplerim</h1>
        <CustomerDisputesList />
      </div>
    </main>
  );
}

export const metadata = { title: 'İade Taleplerim', robots: { index: false } };

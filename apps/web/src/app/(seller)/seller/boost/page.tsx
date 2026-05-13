import Link from 'next/link';
import { BoostView } from '@/components/seller/boost-view';

export default function SellerBoostPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1>Boost (Sponsorlu Reklam)</h1>
          <p className="text-sm text-ink-muted80">
            Ürünlerinizi öne çıkararak listelerde daha sık görünmelerini sağlayın.
          </p>
        </div>
        <Link
          href={'/seller/boost/reports'}
          className="px-4 py-2 rounded-pill border border-hairline text-sm hover:bg-canvas-parchment whitespace-nowrap"
        >
          📊 Performans Raporu
        </Link>
      </div>
      <BoostView />
    </div>
  );
}

export const metadata = { title: 'Boost', robots: { index: false } };

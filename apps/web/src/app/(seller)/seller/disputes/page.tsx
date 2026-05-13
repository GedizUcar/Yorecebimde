import { SellerDisputesList } from '@/components/seller/disputes-list';

export default function SellerDisputesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1>İade Talepleri</h1>
        <p className="text-sm text-ink-muted80">Müşterilerin açtığı iade/şikayet taleplerini buradan yönetin.</p>
      </div>
      <SellerDisputesList />
    </div>
  );
}

export const metadata = { title: 'İade Talepleri', robots: { index: false } };

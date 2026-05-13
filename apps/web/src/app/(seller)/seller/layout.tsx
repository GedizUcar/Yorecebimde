import { SellerNav } from '@/components/seller/seller-nav';
import { TwoFaBanner } from '@/components/two-fa-banner';

export default function SellerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-canvas-parchment">
      <TwoFaBanner />
      <SellerNav />
      <main className="max-w-content mx-auto px-6 py-8">{children}</main>
    </div>
  );
}

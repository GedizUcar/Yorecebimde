import { AdminNav } from '@/components/admin/admin-nav';
import { TwoFaBanner } from '@/components/two-fa-banner';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-canvas-parchment">
      <TwoFaBanner />
      <div className="flex">
        <AdminNav />
        <main className="flex-1 px-6 py-8 overflow-x-auto">{children}</main>
      </div>
    </div>
  );
}

import { apiServer, ApiClientError } from '@/lib/api';
import { AdminDashboardClient } from '@/components/admin/admin-dashboard-client';

type Dashboard = {
  gmv: { today: number; week: number; month: number; total: number };
  counts: {
    ordersToday: number;
    ordersWeek: number;
    ordersMonth: number;
    activeSellers: number;
    pendingApplications: number;
    openDisputes: number;
    escalatedDisputes: number;
  };
};

export default async function AdminDashboardPage() {
  let data: Dashboard | null = null;
  let unauthorized = false;
  try {
    data = await apiServer.get<Dashboard>('/v1/admin/dashboard');
  } catch (e) {
    if (e instanceof ApiClientError && (e.status === 401 || e.status === 403)) {
      unauthorized = true;
    } else {
      throw e;
    }
  }

  if (unauthorized) {
    return (
      <div className="rounded-lg bg-canvas p-12 text-center border border-hairline">
        <p className="text-ink-muted80">Admin yetkisi gerekli.</p>
        <a href="/giris" className="inline-block mt-4 text-primary hover:underline">
          Giriş Yap →
        </a>
      </div>
    );
  }

  return <AdminDashboardClient data={data} />;
}

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Admin · Genel Bakış', robots: { index: false } };

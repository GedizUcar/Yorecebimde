import Link from 'next/link';
import { apiServer, ApiClientError } from '@/lib/api';

type OrderRow = {
  id: string;
  orderNo: string;
  status: string;
  totalCents: number;
  createdAt: string;
};

const STATUS_LABELS: Record<string, string> = {
  created: 'Oluşturuldu',
  pending_payment: 'Ödeme bekleniyor',
  paid: 'Ödendi',
  confirmed: 'Onaylandı',
  preparing: 'Hazırlanıyor',
  shipped: 'Kargoda',
  delivered: 'Teslim edildi',
  completed: 'Tamamlandı',
  cancelled: 'İptal edildi',
  return_requested: 'İade talep edildi',
  returned: 'İade alındı',
  refunded: 'Para iade edildi',
  disputed: 'İhtilaflı',
  resolved: 'Çözüldü',
};

function formatCents(n: number) {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(n / 100);
}

export default async function SiparislerimPage() {
  let orders: OrderRow[] = [];
  let unauthorized = false;
  try {
    orders = await apiServer.get<OrderRow[]>('/v1/orders?limit=50');
  } catch (e) {
    if (e instanceof ApiClientError && e.status === 401) unauthorized = true;
    else throw e;
  }

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
              <Link href="/hesabim" className="hover:text-primary">
                Hesabım
              </Link>
            </li>
            <li>›</li>
            <li className="text-ink font-medium">Siparişlerim</li>
          </ol>
        </nav>

        <h1>Siparişlerim</h1>

        {unauthorized ? (
          <div className="rounded-lg bg-canvas-parchment p-12 text-center">
            <p className="text-ink-muted80 mb-4">Siparişleri görmek için giriş yapın.</p>
            <Link href="/giris" className="text-primary hover:underline">
              Giriş Yap →
            </Link>
          </div>
        ) : orders.length === 0 ? (
          <div className="rounded-lg bg-canvas-parchment p-12 text-center">
            <p className="text-ink-muted80">Henüz siparişiniz yok.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {orders.map((o) => (
              <li key={o.id}>
                <Link
                  href={`/hesabim/siparislerim/${o.orderNo}`}
                  className="flex items-center justify-between gap-4 p-4 rounded-lg border border-hairline bg-canvas hover:border-primary transition-colors"
                >
                  <div>
                    <p className="font-medium">{o.orderNo}</p>
                    <p className="text-xs text-ink-muted80">
                      {new Date(o.createdAt).toLocaleString('tr-TR')}
                    </p>
                  </div>
                  <span className="px-2 py-1 rounded-pill bg-canvas-parchment text-xs font-medium">
                    {STATUS_LABELS[o.status] ?? o.status}
                  </span>
                  <p className="font-semibold">{formatCents(o.totalCents)}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Siparişlerim', robots: { index: false } };

import Link from 'next/link';
import { apiServer, ApiClientError } from '@/lib/api';
import type { Product } from '@/lib/api-types';

type Stats = {
  totalProducts: number;
  activeProducts: number;
  draftProducts: number;
  totalStockUnits: number;
  recentProducts: Product[];
};

async function loadStats(): Promise<Stats | { unauthorized: true }> {
  try {
    const products = await apiServer.get<Product[]>('/v1/seller/products?limit=100');
    return {
      totalProducts: products.length,
      activeProducts: products.filter((p) => p.isActive).length,
      draftProducts: products.filter((p) => !p.isActive).length,
      totalStockUnits: products.reduce((sum, p) => sum + Number(p.stockQuantity), 0),
      recentProducts: products.slice(0, 5),
    };
  } catch (e) {
    if (e instanceof ApiClientError && e.status === 401) {
      return { unauthorized: true };
    }
    throw e;
  }
}

export default async function SellerDashboard() {
  const data = await loadStats();

  if ('unauthorized' in data) {
    return (
      <div className="rounded-lg bg-canvas p-12 text-center border border-hairline">
        <h1>Satıcı Paneli</h1>
        <p className="mt-3 text-ink-muted80">
          Bu sayfayı görüntülemek için satıcı hesabıyla giriş yapın.
        </p>
        <Link
          href="/giris"
          className="inline-block mt-6 px-6 py-2 rounded-pill bg-primary text-white font-medium hover:bg-primary-700"
        >
          Giriş Yap
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1>Genel Bakış</h1>
        <p className="text-sm text-ink-muted80">Mağazanızın güncel durumu</p>
      </div>

      {/* İstatistik kartları */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Toplam ürün" value={String(data.totalProducts)} />
        <StatCard label="Yayında" value={String(data.activeProducts)} accent="primary" />
        <StatCard label="Taslak" value={String(data.draftProducts)} />
        <StatCard
          label="Toplam stok"
          value={data.totalStockUnits.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}
          suffix="birim"
        />
      </div>

      {/* Hızlı aksiyon */}
      <div className="rounded-lg bg-canvas border border-hairline p-6 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Yeni ürün eklemek ister misiniz?</h2>
          <p className="text-sm text-ink-muted80 mt-1">
            3 adımda ürününüzü mağazaya alın: bilgiler, görseller, yayına alma.
          </p>
        </div>
        <Link
          href="/seller/products/new"
          className="px-6 py-2 rounded-pill bg-primary text-white font-medium hover:bg-primary-700 transition-colors whitespace-nowrap"
        >
          + Yeni ürün
        </Link>
      </div>

      {/* Son ürünler */}
      <div className="rounded-lg bg-canvas border border-hairline overflow-hidden">
        <div className="px-6 py-4 border-b border-hairline flex items-center justify-between">
          <h2 className="text-lg font-semibold">Son eklenen ürünler</h2>
          <Link href="/seller/products" className="text-sm text-primary hover:underline">
            Hepsini gör →
          </Link>
        </div>
        {data.recentProducts.length === 0 ? (
          <p className="p-12 text-center text-ink-muted80">Henüz ürün eklemediniz.</p>
        ) : (
          <ul className="divide-y divide-hairline">
            {data.recentProducts.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/seller/products/${p.id}`}
                  className="flex items-center justify-between gap-4 px-6 py-4 hover:bg-canvas-parchment transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{p.nameTr}</p>
                    <p className="text-xs text-ink-muted80">
                      {p.baseUnitPrice} ₺/{p.unit} · Stok {p.stockQuantity}
                    </p>
                  </div>
                  {p.isActive ? (
                    <span className="px-2 py-1 rounded-pill bg-green-100 text-green-800 text-xs">
                      Yayında
                    </span>
                  ) : (
                    <span className="px-2 py-1 rounded-pill bg-canvas-parchment text-ink-muted80 text-xs">
                      Taslak
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Faz 3 placeholder'ları */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <PlaceholderCard
          title="Siparişler"
          description="Faz 3'te aktif olacak — gelen siparişleri burada yöneteceksiniz."
        />
        <PlaceholderCard
          title="Kazanç & Ödemeler"
          description="Faz 3'te aktif olacak — Iyzico escrow durumu ve hak edişler."
        />
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  suffix,
  accent,
}: {
  label: string;
  value: string;
  suffix?: string;
  accent?: 'primary';
}) {
  return (
    <div className="rounded-lg bg-canvas border border-hairline p-4">
      <p className="text-xs text-ink-muted80 uppercase tracking-wide">{label}</p>
      <p className={`mt-2 text-3xl font-bold ${accent === 'primary' ? 'text-primary' : ''}`}>
        {value}
        {suffix && <span className="text-sm text-ink-muted80 font-normal ml-1">{suffix}</span>}
      </p>
    </div>
  );
}

function PlaceholderCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-lg bg-canvas-parchment border border-hairline p-6">
      <h3 className="font-semibold text-ink-muted80">{title}</h3>
      <p className="text-sm text-ink-muted80 mt-1">{description}</p>
    </div>
  );
}

export const dynamic = 'force-dynamic';

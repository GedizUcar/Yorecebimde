'use client';

import { useEffect, useState } from 'react';
import { apiClient, ClientApiError } from '@/lib/api-client';
import { useToast } from '@/components/toast';

type Pkg = {
  id: string;
  name: string;
  durationDays: number;
  priceCents: number;
};

type Boost = {
  id: string;
  productId: string;
  packageId: string;
  startsAt: string;
  endsAt: string;
  paidAt: string | null;
  cancelledAt: string | null;
  impressions: number;
  clicks: number;
};

type Product = { id: string; nameTr: string };

function formatCents(n: number) {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(n / 100);
}

export function BoostView() {
  const { show } = useToast();
  const [packages, setPackages] = useState<Pkg[]>([]);
  const [boosts, setBoosts] = useState<Boost[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [selectedPkg, setSelectedPkg] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Promise.all([
      apiClient.get<Pkg[]>('/v1/boost/packages'),
      apiClient.get<Boost[]>('/v1/boost/mine'),
      apiClient.get<Product[]>('/v1/seller/products?limit=100'),
    ]).then(([p, b, pr]) => {
      setPackages(p);
      setBoosts(b);
      setProducts(pr);
    });
  }, []);

  async function purchase() {
    if (!selectedProduct || !selectedPkg) {
      show('Ürün ve paket seçin', 'error');
      return;
    }
    setBusy(true);
    try {
      const result = await apiClient.post<{ redirectUrl: string }>('/v1/boost/purchase', {
        productId: selectedProduct,
        packageId: selectedPkg,
      });
      window.location.href = result.redirectUrl;
    } catch (e) {
      show(e instanceof ClientApiError ? e.message : 'Satın alınamadı', 'error');
      setBusy(false);
    }
  }

  async function cancel(id: string) {
    if (!confirm('Bu boost iptal edilsin mi? (kalan süre yanar, iade yok)')) return;
    try {
      await apiClient.delete(`/v1/boost/${id}`);
      setBoosts((bs) => bs.map((b) => (b.id === id ? { ...b, cancelledAt: new Date().toISOString() } : b)));
      show('Boost iptal edildi', 'info');
    } catch (e) {
      show(e instanceof ClientApiError ? e.message : 'İptal edilemedi', 'error');
    }
  }

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Aktif Boost'larım</h2>
        {boosts.length === 0 ? (
          <p className="text-sm text-ink-muted80">Henüz aktif boost'unuz yok.</p>
        ) : (
          <ul className="space-y-2">
            {boosts.map((b) => {
              const product = products.find((p) => p.id === b.productId);
              const pkg = packages.find((p) => p.id === b.packageId);
              const ended = new Date(b.endsAt) < new Date();
              const cancelled = !!b.cancelledAt;
              return (
                <li
                  key={b.id}
                  className="flex items-center justify-between gap-4 p-4 rounded-lg bg-canvas border border-hairline"
                >
                  <div>
                    <p className="font-medium">{product?.nameTr ?? b.productId.substring(0, 8)}</p>
                    <p className="text-xs text-ink-muted80">
                      {pkg?.name} · bitiş: {new Date(b.endsAt).toLocaleDateString('tr-TR')} ·{' '}
                      gösterim {b.impressions}, tıklama {b.clicks}
                    </p>
                  </div>
                  <span className="text-sm px-2 py-1 rounded-pill bg-canvas-parchment">
                    {cancelled ? 'İptal' : ended ? 'Süresi doldu' : !b.paidAt ? 'Ödeme bekleniyor' : 'Aktif'}
                  </span>
                  {!cancelled && !ended && (
                    <button
                      type="button"
                      onClick={() => cancel(b.id)}
                      className="text-xs text-red-700 hover:underline"
                    >
                      İptal
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="space-y-3 border-t border-hairline pt-6">
        <h2 className="text-lg font-semibold">Yeni Boost Satın Al</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Ürün</label>
            <select
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
              className="w-full px-3 py-2 border border-hairline rounded-md text-sm"
            >
              <option value="">Ürün seçin</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nameTr}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Paket</label>
            <div className="grid grid-cols-1 gap-2">
              {packages.map((p) => (
                <label
                  key={p.id}
                  className={`p-3 border rounded-md cursor-pointer transition-colors ${
                    selectedPkg === p.id ? 'border-primary bg-primary/5' : 'border-hairline hover:border-primary'
                  }`}
                >
                  <input
                    type="radio"
                    name="pkg"
                    checked={selectedPkg === p.id}
                    onChange={() => setSelectedPkg(p.id)}
                    className="sr-only"
                  />
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{p.name}</p>
                      <p className="text-xs text-ink-muted80">{p.durationDays} gün</p>
                    </div>
                    <p className="font-semibold">{formatCents(p.priceCents)}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={purchase}
          disabled={busy || !selectedProduct || !selectedPkg}
          className="btn-primary disabled:opacity-60"
        >
          {busy ? 'Yönlendiriliyor…' : 'Satın Al (Iyzico ile öde)'}
        </button>
      </section>
    </div>
  );
}

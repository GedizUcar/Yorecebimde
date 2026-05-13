import Link from 'next/link';
import { apiServer } from '@/lib/api';
import type { Product } from '@/lib/api-types';

export default async function SellerProductsPage() {
  const products = await apiServer
    .get<Product[]>('/v1/seller/products?limit=50')
    .catch(() => [] as Product[]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1>Ürünlerim</h1>
        <Link
          href="/seller/products/new"
          className="px-4 py-2 rounded-pill bg-primary text-white text-sm font-medium hover:bg-primary-700 transition-colors"
        >
          + Yeni ürün
        </Link>
      </div>

      {products.length === 0 ? (
        <div className="rounded-lg bg-canvas p-12 text-center border border-hairline">
          <p className="text-ink-muted80">Henüz ürün eklemediniz.</p>
          <Link
            href="/seller/products/new"
            className="inline-block mt-4 text-sm font-medium text-primary hover:underline"
          >
            İlk ürünü ekle →
          </Link>
        </div>
      ) : (
        <div className="rounded-lg bg-canvas border border-hairline overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-canvas-parchment">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Ürün</th>
                <th className="px-4 py-3 text-left font-medium">Fiyat</th>
                <th className="px-4 py-3 text-left font-medium">Stok</th>
                <th className="px-4 py-3 text-left font-medium">Durum</th>
                <th className="px-4 py-3 text-right font-medium" />
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-t border-hairline">
                  <td className="px-4 py-3">
                    <div className="font-medium">{p.nameTr}</div>
                    <div className="text-xs text-ink-muted80">{p.slug}</div>
                  </td>
                  <td className="px-4 py-3">
                    {p.baseUnitPrice} ₺ / {p.unit}
                  </td>
                  <td className="px-4 py-3">{p.stockQuantity}</td>
                  <td className="px-4 py-3">
                    {p.isActive ? (
                      <span className="px-2 py-1 rounded-pill bg-green-100 text-green-800 text-xs">
                        Yayında
                      </span>
                    ) : (
                      <span className="px-2 py-1 rounded-pill bg-canvas-parchment text-ink-muted80 text-xs">
                        Taslak
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/seller/products/${p.id}`}
                      className="text-primary hover:underline text-sm"
                    >
                      Düzenle
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

import { apiServer } from '@/lib/api';
import type { Category } from '@/lib/api-types';
import { NewProductForm } from '@/components/seller/new-product-form';

export default async function NewProductPage() {
  const categories = await apiServer
    .get<Category[]>('/v1/categories')
    .catch(() => [] as Category[]);

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1>Yeni ürün ekle</h1>
        <p className="text-ink-muted80 text-sm">
          Üç adımda ürününüzü mağazanıza ekleyin: bilgiler, görseller, yayına alma.
        </p>
      </div>
      <NewProductForm categories={categories} />
    </div>
  );
}

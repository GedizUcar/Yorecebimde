import { notFound } from 'next/navigation';
import { apiServer, ApiClientError } from '@/lib/api';
import type { ProductWithRelations } from '@/lib/api-types';
import { EditProductForm } from '@/components/seller/edit-product-form';

type Props = { params: Promise<{ id: string }> };

export default async function EditProductPage({ params }: Props) {
  const { id } = await params;

  let product: ProductWithRelations;
  try {
    product = await apiServer.get<ProductWithRelations>(`/v1/seller/products/${id}`);
  } catch (e) {
    if (e instanceof ApiClientError && e.status === 404) notFound();
    if (e instanceof ApiClientError && e.status === 401) {
      return (
        <div className="rounded-lg bg-canvas-parchment p-12 text-center">
          <p className="text-ink-muted80">
            Bu sayfayı görüntülemek için satıcı hesabıyla giriş yapmalısınız.
          </p>
          <a href="/giris" className="inline-block mt-4 text-primary hover:underline">
            Giriş yap →
          </a>
        </div>
      );
    }
    throw e;
  }

  return <EditProductForm product={product} />;
}

export const dynamic = 'force-dynamic';

import type { MetadataRoute } from 'next';
import { apiServer } from '@/lib/api';
import type { Category, ListingProduct } from '@/lib/api-types';

const BASE_URL = process.env.NEXT_PUBLIC_WEB_URL ?? 'https://yorecebimde-staging.gkteches.com';

type SellerSummary = {
  slug: string;
  displayName: string;
};

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/`, lastModified: now, changeFrequency: 'daily', priority: 1.0 },
    { url: `${BASE_URL}/arama`, lastModified: now, changeFrequency: 'daily', priority: 0.5 },
  ];

  const [categories, products, sellers] = await Promise.all([
    apiServer.get<Category[]>('/v1/categories').catch(() => [] as Category[]),
    apiServer
      .get<ListingProduct[]>('/v1/products?limit=100')
      .catch(() => [] as ListingProduct[]),
    apiServer
      .get<SellerSummary[]>('/v1/sellers?limit=100')
      .catch(() => [] as SellerSummary[]),
  ]);

  const categoryUrls: MetadataRoute.Sitemap = categories
    .filter((c) => c.isActive && !c.deletedAt)
    .map((c) => ({
      url: `${BASE_URL}/kategori/${c.slug}`,
      lastModified: new Date(c.updatedAt),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }));

  const productUrls: MetadataRoute.Sitemap = products.map((p) => ({
    url: `${BASE_URL}/urun/${p.seller.slug}/${p.slug}`,
    lastModified: new Date(p.updatedAt),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  const sellerUrls: MetadataRoute.Sitemap = sellers.map((s) => ({
    url: `${BASE_URL}/magaza/${s.slug}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }));

  return [...staticRoutes, ...categoryUrls, ...productUrls, ...sellerUrls];
}

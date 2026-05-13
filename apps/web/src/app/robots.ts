import type { MetadataRoute } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_WEB_URL ?? 'https://yorecebimde-staging.gkteches.com';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/'],
        disallow: ['/seller/', '/admin/', '/giris', '/kayit', '/api/'],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}

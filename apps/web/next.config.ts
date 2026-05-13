import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const config: NextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    typedRoutes: true,
    optimizePackageImports: ['@yorecebimde/ui', 'lucide-react'],
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost' },
      { protocol: 'https', hostname: 'storage.yorecebimde.com' },
      { protocol: 'https', hostname: '**.gkteches.com' },
    ],
  },
  transpilePackages: ['@yorecebimde/ui', '@yorecebimde/shared', '@yorecebimde/auth', '@yorecebimde/config'],
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'geolocation=(self), camera=(), microphone=(), payment=(self)' },
        ],
      },
    ];
  },
};

export default withNextIntl(config);

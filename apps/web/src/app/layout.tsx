import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import { ToastProvider } from '@/components/toast';
import './globals.css';

const inter = Inter({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-text',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://yorecebimde.com'),
  title: {
    default: 'Yörecebimde — Yöresel Gıdanın Yeni Adresi',
    template: '%s · Yörecebimde',
  },
  description: 'Yöresel ve niş gıda ürünlerini doğrudan üreticisinden alın.',
  openGraph: {
    type: 'website',
    siteName: 'Yörecebimde',
    locale: 'tr_TR',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} className={inter.variable}>
      <body>
        <NextIntlClientProvider messages={messages}>
          <ToastProvider>{children}</ToastProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

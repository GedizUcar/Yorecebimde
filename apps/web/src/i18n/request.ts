import { getRequestConfig } from 'next-intl/server';
import type { AbstractIntlMessages } from 'next-intl';

const SUPPORTED = ['tr', 'en'] as const;
type Locale = (typeof SUPPORTED)[number];
const DEFAULT_LOCALE: Locale = 'tr';

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale: Locale = (SUPPORTED as readonly string[]).includes(requested ?? '')
    ? (requested as Locale)
    : DEFAULT_LOCALE;
  const messages = (await import(`../messages/${locale}.json`)).default as AbstractIntlMessages;
  return {
    locale,
    messages,
    timeZone: 'Europe/Istanbul',
  };
});

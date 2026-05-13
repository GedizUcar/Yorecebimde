import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // DESIGN.md'den çıkacak Yörecebimde tokenları gelecek; şimdilik
        // referans pattern'inden esinli, ürün-fotoğraf-merkezli minimalist sistem.
        primary: {
          DEFAULT: '#0066cc',
          focus: '#0071e3',
          onDark: '#2997ff',
        },
        canvas: {
          DEFAULT: '#ffffff',
          parchment: '#f5f5f7',
          pearl: '#fafafc',
        },
        ink: {
          DEFAULT: '#1d1d1f',
          muted80: '#333333',
          muted48: '#7a7a7a',
        },
        hairline: '#e0e0e0',
        divider: '#f0f0f0',
      },
      fontFamily: {
        display: ['var(--font-display)', 'system-ui', '-apple-system', 'sans-serif'],
        text: ['var(--font-text)', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        xs: '5px',
        sm: '8px',
        md: '11px',
        lg: '18px',
        pill: '9999px',
      },
      boxShadow: {
        product: '3px 5px 30px 0 rgba(0, 0, 0, 0.22)',
      },
      maxWidth: {
        content: '1440px',
        narrow: '980px',
      },
    },
  },
  plugins: [],
};

export default config;

import { baseConfig } from './base.js';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

/**
 * Next.js (apps/web) için ESLint config — React rules dahil.
 */
export default [
  ...baseConfig,
  {
    files: ['**/*.{ts,tsx,js,jsx}'],
    languageOptions: {
      globals: {
        ...globals.browser,
      },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      react,
      'react-hooks': reactHooks,
    },
    rules: {
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,

      // Next.js: JSX uses React in scope artık gerekmez (React 17+)
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',

      // Server components — useState/useEffect hook'ları client only
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
    settings: {
      react: { version: 'detect' },
    },
  },
];

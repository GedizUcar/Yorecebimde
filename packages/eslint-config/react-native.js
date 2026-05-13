import { baseConfig } from './base.js';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';

/**
 * Expo (apps/mobile) — React Native için ESLint config.
 * Browser global'leri YOK, React Native primitiveleri kullanılır.
 */
export default [
  ...baseConfig,
  {
    files: ['**/*.{ts,tsx,js,jsx}'],
    languageOptions: {
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
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
    settings: {
      react: { version: 'detect' },
    },
  },
];

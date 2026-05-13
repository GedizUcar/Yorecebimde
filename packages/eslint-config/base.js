import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import importPlugin from 'eslint-plugin-import';
import unusedImports from 'eslint-plugin-unused-imports';
import globals from 'globals';

/**
 * Yörecebimde temel ESLint config — workspace genelinde paylaşılır.
 * Next.js + React Native uzantıları ayrı dosyalarda extend eder.
 *
 * Felsefe:
 * - TS strict ile uyumlu, type-aware kurallar opsiyonel (perf)
 * - No `any` — sadece sınırlı warning, error değil (workaround'lar var)
 * - Import order — external → @yorecebimde/* → relative
 * - Unused imports → otomatik remove
 */
export const baseConfig = tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.es2024,
      },
    },
    plugins: {
      import: importPlugin,
      'unused-imports': unusedImports,
    },
    rules: {
      // Unused imports — auto-fix ile sil
      '@typescript-eslint/no-unused-vars': 'off',
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': [
        'warn',
        {
          vars: 'all',
          varsIgnorePattern: '^_',
          args: 'after-used',
          argsIgnorePattern: '^_',
        },
      ],

      // any kullanımı — workaround'lar için warn, error değil
      '@typescript-eslint/no-explicit-any': 'warn',

      // Boş function — explicit boş gereklidir bazen
      '@typescript-eslint/no-empty-function': 'off',

      // Const enum kullanma — TS5+ uyumsuz olabilir
      'no-empty-pattern': 'warn',

      // Console — info+ allow (pino kullanmak şart değil dev'de)
      'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],

      // Import order — external → workspace → relative
      'import/order': [
        'warn',
        {
          groups: [
            'builtin',
            'external',
            ['internal', 'parent', 'sibling', 'index'],
          ],
          pathGroups: [
            { pattern: '@yorecebimde/**', group: 'internal' },
            { pattern: '@/**', group: 'internal' },
          ],
          'newlines-between': 'never',
        },
      ],

      // Cycle detection
      'import/no-cycle': ['warn', { maxDepth: 3 }],
    },
    settings: {
      'import/resolver': {
        typescript: true,
        node: true,
      },
    },
  },
  {
    // Test dosyalarında any + unused warn
    files: ['**/*.test.ts', '**/*.test.tsx', '**/__tests__/**'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      'unused-imports/no-unused-vars': 'off',
    },
  },
  {
    ignores: [
      '**/dist/**',
      '**/.next/**',
      '**/node_modules/**',
      '**/coverage/**',
      '**/.expo/**',
      '**/playwright-report/**',
      '**/test-results/**',
    ],
  },
);

export default baseConfig;

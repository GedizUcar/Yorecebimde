import { baseConfig } from './base.js';
import globals from 'globals';

/**
 * NestJS / Node.js API için ESLint config.
 */
export default [
  ...baseConfig,
  {
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    rules: {
      // NestJS DI için empty constructor body bazen olabilir
      'no-empty': ['warn', { allowEmptyCatch: true }],
      // process.env direct usage uyarısı — packages/config kullanılmalı
      // (ama dev'de runtime check'ler için lazım, warn)
      'no-process-env': 'off',
    },
  },
];

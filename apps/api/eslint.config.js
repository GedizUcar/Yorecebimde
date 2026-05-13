import config from '@yorecebimde/eslint-config/node';

export default [
  ...config,
  {
    rules: {
      // NestJS decorator'lar reflect-metadata kullanır — DI cleanup tamamlanmamış
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
];

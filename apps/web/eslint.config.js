import config from '@yorecebimde/eslint-config/next';

export default [
  ...config,
  {
    rules: {
      // Next.js Server Components ile bazı kuralları gevşet
    },
  },
];

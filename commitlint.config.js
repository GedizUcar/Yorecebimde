/**
 * Conventional Commits — Yörecebimde commit message format.
 *
 * Format:
 *   <type>(<scope>): <description>
 *
 * Types: feat, fix, chore, docs, refactor, test, ci, perf, style, revert
 * Scopes: catalog, checkout, seller, admin, bot, mobile, infra, db, vs.
 *
 * Örnek:
 *   feat(catalog): add stepper variation mode to products
 *   fix(seller): correct iban encryption migration
 *   chore(infra): bump postgres to 16.2
 */
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',
        'fix',
        'chore',
        'docs',
        'refactor',
        'test',
        'ci',
        'perf',
        'style',
        'revert',
        'build',
      ],
    ],
    'subject-case': [0],
    'header-max-length': [2, 'always', 100],
    'body-max-line-length': [1, 'always', 120],
  },
};

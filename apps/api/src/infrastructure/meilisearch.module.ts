import { Global, Module } from '@nestjs/common';
import { Meilisearch } from 'meilisearch';
import { env } from '@yorecebimde/config/api';

export const MEILI_TOKEN = Symbol('MEILI_CLIENT');
export const MEILI_INDEXES = Symbol('MEILI_INDEXES');

export type MeiliIndexes = {
  products: string;
  sellers: string;
  categories: string;
};

@Global()
@Module({
  providers: [
    {
      provide: MEILI_TOKEN,
      useFactory: () =>
        new Meilisearch({
          host: env.MEILISEARCH_HOST,
          apiKey: env.MEILISEARCH_API_KEY,
        }),
    },
    {
      provide: MEILI_INDEXES,
      useValue: {
        products: `${env.MEILISEARCH_INDEX_PREFIX}products`,
        sellers: `${env.MEILISEARCH_INDEX_PREFIX}sellers`,
        categories: `${env.MEILISEARCH_INDEX_PREFIX}categories`,
      } satisfies MeiliIndexes,
    },
  ],
  exports: [MEILI_TOKEN, MEILI_INDEXES],
})
export class MeilisearchModule {}

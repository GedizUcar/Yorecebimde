import { Module } from '@nestjs/common';
import { CategoriesController } from './categories.controller.js';
import { CategoriesRepository } from './categories.repository.js';

@Module({
  controllers: [CategoriesController],
  providers: [CategoriesRepository],
  exports: [CategoriesRepository],
})
export class CategoriesModule {}

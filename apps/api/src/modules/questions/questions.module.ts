import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { SessionGuard } from '../../common/guards/session.guard.js';
import {
  QuestionsController,
  SellerQuestionsController,
} from './questions.controller.js';
import { QuestionsService } from './questions.service.js';

@Module({
  imports: [AuthModule],
  controllers: [QuestionsController, SellerQuestionsController],
  providers: [QuestionsService, SessionGuard],
  exports: [QuestionsService],
})
export class QuestionsModule {}

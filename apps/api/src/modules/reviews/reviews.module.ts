import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { SessionGuard } from '../../common/guards/session.guard.js';
import {
  AdminReviewsController,
  ReviewsController,
  SellerReviewsController,
} from './reviews.controller.js';
import { ReviewsService } from './reviews.service.js';

@Module({
  imports: [AuthModule],
  controllers: [ReviewsController, SellerReviewsController, AdminReviewsController],
  providers: [ReviewsService, SessionGuard],
  exports: [ReviewsService],
})
export class ReviewsModule {}

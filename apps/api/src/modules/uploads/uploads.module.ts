import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { SearchModule } from '../search/search.module.js';
import { SessionGuard, SellerGuard } from '../../common/guards/session.guard.js';
import { UploadsController } from './uploads.controller.js';
import { UploadsService } from './uploads.service.js';
import { UploadsRepository } from './uploads.repository.js';
import { ImageProcessorWorker } from './image-processor.worker.js';

@Module({
  imports: [AuthModule, SearchModule],
  controllers: [UploadsController],
  providers: [
    UploadsService,
    UploadsRepository,
    ImageProcessorWorker,
    SessionGuard,
    SellerGuard,
  ],
  exports: [UploadsService, UploadsRepository],
})
export class UploadsModule {}

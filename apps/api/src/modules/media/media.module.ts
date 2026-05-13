import { Module } from '@nestjs/common';
import { MinioModule } from '../../infrastructure/minio.module.js';
import { MediaController } from './media.controller.js';

@Module({
  imports: [MinioModule],
  controllers: [MediaController],
})
export class MediaModule {}

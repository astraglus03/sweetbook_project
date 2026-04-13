import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { BullModule } from '@nestjs/bull';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { memoryStorage } from 'multer';
import { Photo } from './entities/photo.entity';
import { PhotoFace } from './entities/photo-face.entity';
import { PhotosController } from './photos.controller';
import { PhotosService } from './photos.service';
import { FaceDetectionStatusController } from './face-detection-status.controller';
import { ActivitiesModule } from '../activities/activities.module';
import { bullConfig, QUEUE_NAMES } from '../../config/bull.config';

@Module({
  imports: [
    TypeOrmModule.forFeature([Photo, PhotoFace]),
    MulterModule.register({ storage: memoryStorage() }),
    BullModule.registerQueueAsync({
      name: QUEUE_NAMES.PHOTO_FACE,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: bullConfig,
    }),
    ActivitiesModule,
  ],
  controllers: [PhotosController, FaceDetectionStatusController],
  providers: [PhotosService],
  exports: [PhotosService],
})
export class PhotosModule {}

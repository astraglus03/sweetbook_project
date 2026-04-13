import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { BullModule } from '@nestjs/bull';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { memoryStorage } from 'multer';
import { Photo } from './entities/photo.entity';
import { PhotoFace } from './entities/photo-face.entity';
import { UserFaceAnchor } from './entities/user-face-anchor.entity';
import { UserFaceAnchorSample } from './entities/user-face-anchor-sample.entity';
import { PhotosController } from './photos.controller';
import { PhotosService } from './photos.service';
import { FaceDetectionStatusController } from './face-detection-status.controller';
import { FaceAnchorController } from './face-anchor.controller';
import { FaceAnchorService } from './face-anchor.service';
import { PhotoFaceDetectionService } from './photo-face-detection.service';
import { PhotoFaceProcessor } from './photo-face.processor';
import { ActivitiesModule } from '../activities/activities.module';
import { bullConfig, QUEUE_NAMES } from '../../config/bull.config';

@Module({
  imports: [
    TypeOrmModule.forFeature([Photo, PhotoFace, UserFaceAnchor, UserFaceAnchorSample]),
    MulterModule.register({ storage: memoryStorage() }),
    BullModule.registerQueueAsync({
      name: QUEUE_NAMES.PHOTO_FACE,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: bullConfig,
    }),
    ActivitiesModule,
  ],
  controllers: [PhotosController, FaceDetectionStatusController, FaceAnchorController],
  providers: [PhotosService, FaceAnchorService, PhotoFaceDetectionService, PhotoFaceProcessor],
  exports: [PhotosService, PhotoFaceDetectionService],
})
export class PhotosModule {}

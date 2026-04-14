import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Photo } from '../photos/entities/photo.entity';
import { KakaoImportController } from './kakao-import.controller';
import { KakaoImportService } from './kakao-import.service';
import { ActivitiesModule } from '../activities/activities.module';
import { PhotosModule } from '../photos/photos.module';

@Module({
  imports: [TypeOrmModule.forFeature([Photo]), ActivitiesModule, PhotosModule],
  controllers: [KakaoImportController],
  providers: [KakaoImportService],
})
export class KakaoImportModule {}

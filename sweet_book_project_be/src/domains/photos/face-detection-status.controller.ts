import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QUEUE_NAMES } from '../../config/bull.config';
import { Photo } from './entities/photo.entity';
import { PhotoFace } from './entities/photo-face.entity';
import { FaceApiService } from '../../external/face-api/face-api.service';

@ApiTags('face-detection')
@ApiBearerAuth()
@Controller()
export class FaceDetectionStatusController {
  constructor(
    @InjectQueue(QUEUE_NAMES.PHOTO_FACE)
    private readonly queue: Queue,
    @InjectRepository(Photo)
    private readonly photoRepo: Repository<Photo>,
    @InjectRepository(PhotoFace)
    private readonly photoFaceRepo: Repository<PhotoFace>,
    private readonly faceApi: FaceApiService,
  ) {}

  @Get('groups/:groupId/face-detection-status')
  @ApiOperation({ summary: '그룹 얼굴 감지 진행 상태 조회' })
  async getStatus(@Param('groupId', ParseIntPipe) groupId: number) {
    const counts = await this.queue.getJobCounts();
    const total = await this.photoRepo.count({ where: { groupId } });
    const analyzedPhotoIds = await this.photoFaceRepo
      .createQueryBuilder('pf')
      .select('DISTINCT pf.photoId', 'photoId')
      .where('pf.groupId = :groupId', { groupId })
      .getRawMany<{ photoId: number }>();

    return {
      totalPhotos: total,
      photosWithFaces: analyzedPhotoIds.length,
      queue: {
        waiting: counts.waiting,
        active: counts.active,
        delayed: counts.delayed,
      },
      inProgress: counts.waiting + counts.active > 0,
    };
  }

  @Get('face-model/health')
  @ApiOperation({ summary: '얼굴 인식 모델 준비 상태 조회' })
  @ApiResponse({
    status: 200,
    description: '모델 준비 여부',
    schema: { example: { ready: true } },
  })
  getModelHealth() {
    return { ready: this.faceApi.isReady() };
  }
}

import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QUEUE_NAMES } from '../../config/bull.config';
import { Photo } from './entities/photo.entity';
import { PhotoFace } from './entities/photo-face.entity';

@ApiTags('face-detection')
@ApiBearerAuth()
@Controller('groups/:groupId/face-detection-status')
export class FaceDetectionStatusController {
  constructor(
    @InjectQueue(QUEUE_NAMES.PHOTO_FACE)
    private readonly queue: Queue,
    @InjectRepository(Photo)
    private readonly photoRepo: Repository<Photo>,
    @InjectRepository(PhotoFace)
    private readonly photoFaceRepo: Repository<PhotoFace>,
  ) {}

  @Get()
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
}

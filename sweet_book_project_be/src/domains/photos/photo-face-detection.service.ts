import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { PhotoFace } from './entities/photo-face.entity';
import { FaceApiService } from '../../external/face-api/face-api.service';
import { QUEUE_NAMES } from '../../config/bull.config';

const MIN_CONFIDENCE = 0.7;

@Injectable()
export class PhotoFaceDetectionService {
  private readonly logger = new Logger(PhotoFaceDetectionService.name);

  constructor(
    @InjectRepository(PhotoFace)
    private readonly photoFaceRepo: Repository<PhotoFace>,
    private readonly faceApi: FaceApiService,
    @InjectQueue(QUEUE_NAMES.PHOTO_FACE)
    private readonly queue: Queue,
  ) {}

  async enqueue(
    photoId: number,
    groupId: number,
    imagePath: string,
  ): Promise<void> {
    await this.queue.add('detect', { photoId, groupId, imagePath });
  }

  async detectAndStore(
    photoId: number,
    groupId: number,
    imagePath: string,
  ): Promise<number> {
    if (!this.faceApi.isReady()) {
      this.logger.debug(`FaceApi 미준비 상태 — 사진 ${photoId} 얼굴 감지 스킵`);
      return 0;
    }

    try {
      const faces = await this.faceApi.detectAll(imagePath);
      const kept = faces.filter((f) => f.confidence >= MIN_CONFIDENCE);

      if (kept.length === 0) return 0;

      const entities = kept.map((f) =>
        this.photoFaceRepo.create({
          photoId,
          groupId,
          embedding: f.embedding,
          bboxX: f.bbox.x,
          bboxY: f.bbox.y,
          bboxWidth: f.bbox.width,
          bboxHeight: f.bbox.height,
          confidence: f.confidence,
        }),
      );
      await this.photoFaceRepo.save(entities);

      this.logger.log(
        `사진 ${photoId}: 얼굴 ${kept.length}개 감지 (총 ${faces.length})`,
      );
      return kept.length;
    } catch (error) {
      this.logger.error(
        `얼굴 감지 실패 photoId=${photoId}: ${(error as Error).message}`,
      );
      return 0;
    }
  }

  fireAndForget(photoId: number, groupId: number, imagePath: string): void {
    void this.enqueue(photoId, groupId, imagePath).catch((err) => {
      this.logger.error(`큐 enqueue 실패: ${(err as Error).message}`);
    });
  }
}

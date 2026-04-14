import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import type { Job } from 'bull';
import { QUEUE_NAMES } from '../../config/bull.config';
import { PhotoFaceDetectionService } from './photo-face-detection.service';

export interface PhotoFaceJob {
  photoId: number;
  groupId: number;
  objectPath: string;
}

@Processor(QUEUE_NAMES.PHOTO_FACE)
export class PhotoFaceProcessor {
  private readonly logger = new Logger(PhotoFaceProcessor.name);

  constructor(private readonly faceDetection: PhotoFaceDetectionService) {}

  @Process('detect')
  async handleDetect(job: Job<PhotoFaceJob>) {
    const { photoId, groupId, objectPath } = job.data;
    const count = await this.faceDetection.detectAndStore(
      photoId,
      groupId,
      objectPath,
    );
    this.logger.log(`[job ${job.id}] photo=${photoId} faces=${count}`);
    return { photoId, detected: count };
  }
}

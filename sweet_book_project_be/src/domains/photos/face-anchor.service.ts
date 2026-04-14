import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { UserFaceAnchor } from './entities/user-face-anchor.entity';
import { UserFaceAnchorSample } from './entities/user-face-anchor-sample.entity';
import { FaceApiService } from '../../external/face-api/face-api.service';
import { StorageService } from '../../common/storage/storage.service';
import {
  ValidationException,
  NotFoundException,
} from '../../common/exceptions';

@Injectable()
export class FaceAnchorService {
  private readonly logger = new Logger(FaceAnchorService.name);

  constructor(
    @InjectRepository(UserFaceAnchor)
    private readonly anchorRepo: Repository<UserFaceAnchor>,
    @InjectRepository(UserFaceAnchorSample)
    private readonly sampleRepo: Repository<UserFaceAnchorSample>,
    private readonly faceApi: FaceApiService,
    private readonly storageService: StorageService,
    private readonly dataSource: DataSource,
  ) {}

  async registerAnchor(
    userId: number,
    groupId: number,
    files: Express.Multer.File[],
  ): Promise<{ anchorId: number; sampleCount: number }> {
    if (!this.faceApi.isReady()) {
      throw new ValidationException(
        'FACE_API_NOT_READY',
        '얼굴 인식 모델이 준비되지 않았어요 (models/face-api/ 확인)',
      );
    }

    if (files.length < 3 || files.length > 5) {
      throw new ValidationException(
        'FACE_ANCHOR_SAMPLE_COUNT',
        '얼굴 등록은 3~5장의 사진이 필요해요',
      );
    }

    const embeddings: number[][] = [];
    const savedSamples: {
      embedding: number[];
      sourcePath: string;
      confidence: number;
    }[] = [];

    for (const file of files) {
      const faces = await this.faceApi.detectAll(file.buffer);
      if (faces.length === 0) {
        throw new ValidationException(
          'FACE_ANCHOR_NO_FACE',
          `얼굴이 감지되지 않았어요: ${file.originalname}`,
        );
      }
      if (faces.length > 1) {
        throw new ValidationException(
          'FACE_ANCHOR_MULTIPLE_FACES',
          `얼굴이 여러 개 감지됐어요. 본인만 나온 사진을 사용해주세요: ${file.originalname}`,
        );
      }

      const fname = `${userId}-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}.jpg`;
      const objectPath = `face-anchors/${fname}`;
      await this.storageService.upload(
        objectPath,
        file.buffer,
        file.mimetype || 'image/jpeg',
      );

      embeddings.push(faces[0].embedding);
      savedSamples.push({
        embedding: faces[0].embedding,
        sourcePath: objectPath,
        confidence: faces[0].confidence,
      });
    }

    const avg = this.faceApi.averageEmbedding(embeddings);

    return await this.dataSource.transaction(async (mgr) => {
      const existing = await mgr.findOne(UserFaceAnchor, {
        where: { userId, groupId },
      });

      let anchor: UserFaceAnchor;
      if (existing) {
        existing.embedding = avg;
        existing.sampleCount = embeddings.length;
        anchor = await mgr.save(existing);
        const oldSamples = await mgr.find(UserFaceAnchorSample, {
          where: { anchorId: existing.id },
        });
        const oldPaths = oldSamples
          .map((s) => s.sourcePath)
          .filter((p): p is string => Boolean(p));
        if (oldPaths.length > 0) {
          await this.storageService.remove(oldPaths);
        }
        await mgr.delete(UserFaceAnchorSample, { anchorId: existing.id });
      } else {
        anchor = await mgr.save(
          mgr.create(UserFaceAnchor, {
            userId,
            groupId,
            embedding: avg,
            sampleCount: embeddings.length,
            threshold: 0.6,
          }),
        );
      }

      for (const s of savedSamples) {
        await mgr.save(
          mgr.create(UserFaceAnchorSample, {
            anchorId: anchor.id,
            embedding: s.embedding,
            sourcePath: s.sourcePath,
            confidence: s.confidence,
          }),
        );
      }

      this.logger.log(
        `얼굴 앵커 등록: user=${userId}, group=${groupId}, samples=${embeddings.length}`,
      );

      return { anchorId: anchor.id, sampleCount: embeddings.length };
    });
  }

  async getMyAnchor(
    userId: number,
    groupId: number,
  ): Promise<{
    anchorId: number;
    sampleCount: number;
    threshold: number;
  } | null> {
    const anchor = await this.anchorRepo.findOne({
      where: { userId, groupId },
    });
    if (!anchor) return null;
    return {
      anchorId: anchor.id,
      sampleCount: anchor.sampleCount,
      threshold: anchor.threshold,
    };
  }

  async deleteAnchor(userId: number, groupId: number): Promise<void> {
    const anchor = await this.anchorRepo.findOne({
      where: { userId, groupId },
    });
    if (!anchor) {
      throw new NotFoundException(
        'FACE_ANCHOR_NOT_FOUND',
        '등록된 얼굴 앵커가 없어요',
      );
    }

    const samples = await this.sampleRepo.find({
      where: { anchorId: anchor.id },
    });
    const paths = samples
      .map((s) => s.sourcePath)
      .filter((p): p is string => Boolean(p));
    if (paths.length > 0) {
      await this.storageService.remove(paths);
    }
    await this.anchorRepo.remove(anchor);
  }
}

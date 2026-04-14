import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import AdmZip from 'adm-zip';
import * as path from 'path';
import sharp from 'sharp';
import { Photo } from '../photos/entities/photo.entity';
import { ValidationException } from '../../common/exceptions';
import { StorageService } from '../../common/storage/storage.service';
import { ActivitiesService } from '../activities/activities.service';
import { photoObjectPath } from '../photos/photos.service';
import { PhotoFaceDetectionService } from '../photos/photo-face-detection.service';

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);
const MAX_ZIP_SIZE = 100 * 1024 * 1024; // 100MB
const MAX_IMAGE_SIZE = 20 * 1024 * 1024; // 20MB per image

export interface ImportResult {
  totalPhotos: number;
  savedPhotos: number;
}

@Injectable()
export class KakaoImportService {
  private readonly logger = new Logger(KakaoImportService.name);

  constructor(
    @InjectRepository(Photo)
    private readonly photoRepository: Repository<Photo>,
    private readonly storageService: StorageService,
    private readonly activitiesService: ActivitiesService,
    private readonly photoFaceDetection: PhotoFaceDetectionService,
  ) {}

  async importZip(
    groupId: number,
    importerId: number,
    file: Express.Multer.File,
  ): Promise<ImportResult> {
    this.validateZipFile(file);

    const zip = new AdmZip(file.buffer);
    const imageEntries = zip.getEntries().filter((e) => {
      if (e.isDirectory) return false;
      if (e.entryName.includes('..')) return false;
      const ext = path.extname(e.entryName).toLowerCase();
      return IMAGE_EXTENSIONS.has(ext);
    });

    if (imageEntries.length === 0) {
      throw new ValidationException(
        'KAKAO_NO_IMAGES',
        'zip 안에 사진이 없습니다. 안드로이드 카톡의 "모든 대화 내보내기"로 생성된 zip을 올려주세요.',
      );
    }

    let savedCount = 0;
    for (const entry of imageEntries) {
      try {
        const buffer = entry.getData();
        if (buffer.length > MAX_IMAGE_SIZE) {
          this.logger.warn(`Skipping oversized image: ${entry.entryName}`);
          continue;
        }
        await this.saveImage(groupId, entry.entryName, buffer);
        savedCount++;
      } catch (err) {
        this.logger.error(
          `Failed to save image ${entry.entryName}: ${String(err)}`,
        );
      }
    }

    this.logger.log(
      `Kakao import done: group=${groupId}, importer=${importerId}, total=${imageEntries.length}, saved=${savedCount}`,
    );

    await this.activitiesService.record({
      groupId,
      actorUserId: importerId,
      type: 'KAKAO_IMPORTED',
      payload: { count: savedCount },
    });

    return {
      totalPhotos: imageEntries.length,
      savedPhotos: savedCount,
    };
  }

  // ────── private ──────

  private validateZipFile(file: Express.Multer.File): void {
    if (!file) {
      throw new ValidationException('KAKAO_NO_FILE', '파일이 없습니다');
    }
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.txt') {
      throw new ValidationException(
        'KAKAO_TXT_ONLY',
        'iOS/PC 카톡의 txt 파일은 사진이 없어 사용할 수 없습니다. 안드로이드 카톡에서 "모든 대화 내보내기"로 생성된 zip을 올려주세요.',
      );
    }
    if (ext !== '.zip') {
      throw new ValidationException(
        'KAKAO_INVALID_FORMAT',
        'zip 파일만 업로드 가능합니다',
      );
    }
    if (file.size > MAX_ZIP_SIZE) {
      throw new ValidationException(
        'KAKAO_FILE_TOO_LARGE',
        `파일 크기가 100MB를 초과합니다`,
      );
    }
  }

  private async saveImage(
    groupId: number,
    originalFilename: string,
    buffer: Buffer,
  ): Promise<void> {
    const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.webp`;
    const base = sharp(buffer).rotate().webp({ quality: 85 });
    const metadata = await sharp(buffer).metadata();

    const [originalBuf, mediumBuf, thumbnailBuf] = await Promise.all([
      base.clone().resize(1200, null, { withoutEnlargement: true }).toBuffer(),
      base.clone().resize(600, null, { withoutEnlargement: true }).toBuffer(),
      base.clone().resize(200, 200, { fit: 'cover' }).toBuffer(),
    ]);

    const originalPath = photoObjectPath(groupId, 'original', uniqueName);
    await Promise.all([
      this.storageService.upload(originalPath, originalBuf, 'image/webp'),
      this.storageService.upload(
        photoObjectPath(groupId, 'medium', uniqueName),
        mediumBuf,
        'image/webp',
      ),
      this.storageService.upload(
        photoObjectPath(groupId, 'thumbnail', uniqueName),
        thumbnailBuf,
        'image/webp',
      ),
    ]);

    const photo = this.photoRepository.create({
      groupId,
      uploaderId: null,
      filename: uniqueName,
      originalFilename: originalFilename.split('/').pop() ?? originalFilename,
      mimetype: 'image/webp',
      size: buffer.length,
      width: metadata.width ?? null,
      height: metadata.height ?? null,
    });
    const saved = await this.photoRepository.save(photo);

    this.photoFaceDetection.fireAndForget(saved.id, groupId, originalPath);
  }
}

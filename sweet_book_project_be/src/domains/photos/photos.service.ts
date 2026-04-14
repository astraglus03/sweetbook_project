import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import sharp from 'sharp';
import { Photo } from './entities/photo.entity';
import { PhotoResponseDto } from './dto/photo-response.dto';
import { PhotoListQueryDto } from './dto/photo-list-query.dto';
import { UpdatePhotoDto } from './dto/update-photo.dto';
import {
  NotFoundException,
  ForbiddenException,
  ValidationException,
} from '../../common/exceptions';
import { StorageService } from '../../common/storage/storage.service';
import { ActivitiesService } from '../activities/activities.service';

const ALLOWED_MIMETYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function photoObjectPath(
  groupId: number,
  variant: 'original' | 'medium' | 'thumbnail',
  filename: string,
): string {
  return `photos/${groupId}/${variant}/${filename}`;
}

@Injectable()
export class PhotosService {
  private readonly logger = new Logger(PhotosService.name);
  private readonly publicBase: string;

  constructor(
    @InjectRepository(Photo)
    private readonly photoRepository: Repository<Photo>,
    private readonly storageService: StorageService,
    private readonly activitiesService: ActivitiesService,
  ) {
    this.publicBase = this.storageService.getPublicBase();
  }

  async uploadPhotos(
    groupId: number,
    uploaderId: number,
    files: Express.Multer.File[],
  ): Promise<PhotoResponseDto[]> {
    const results: PhotoResponseDto[] = [];

    for (const file of files) {
      if (!ALLOWED_MIMETYPES.includes(file.mimetype)) {
        throw new ValidationException(
          'PHOTO_INVALID_MIMETYPE',
          `지원하지 않는 파일 형식입니다: ${file.originalname}`,
        );
      }
      if (file.size > MAX_FILE_SIZE) {
        throw new ValidationException(
          'PHOTO_FILE_TOO_LARGE',
          `파일 크기가 10MB를 초과합니다: ${file.originalname}`,
        );
      }
    }

    for (const file of files) {
      const photo = await this.processAndSave(groupId, uploaderId, file);
      results.push(PhotoResponseDto.from(photo, this.publicBase));
    }

    await this.activitiesService.record({
      groupId,
      actorUserId: uploaderId,
      type: 'PHOTO_UPLOADED',
      payload: { count: results.length },
    });

    return results;
  }

  async getPhotos(
    groupId: number,
    query: PhotoListQueryDto,
  ): Promise<{
    photos: PhotoResponseDto[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const qb = this.photoRepository
      .createQueryBuilder('photo')
      .leftJoinAndSelect('photo.uploader', 'uploader')
      .where('photo.groupId = :groupId', { groupId })
      .orderBy('photo.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (query.chapter) {
      qb.andWhere('photo.chapter = :chapter', { chapter: query.chapter });
    }
    if (query.uploaderId) {
      qb.andWhere('photo.uploaderId = :uploaderId', {
        uploaderId: query.uploaderId,
      });
    }

    const [photos, total] = await qb.getManyAndCount();

    return {
      photos: photos.map((p) => PhotoResponseDto.from(p, this.publicBase)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getPhoto(photoId: number): Promise<PhotoResponseDto> {
    const photo = await this.photoRepository.findOne({
      where: { id: photoId },
      relations: ['uploader'],
    });
    if (!photo) {
      throw new NotFoundException('PHOTO_NOT_FOUND', '사진을 찾을 수 없습니다');
    }
    return PhotoResponseDto.from(photo, this.publicBase);
  }

  async updatePhoto(
    photoId: number,
    userId: number,
    dto: UpdatePhotoDto,
  ): Promise<PhotoResponseDto> {
    const photo = await this.photoRepository.findOne({
      where: { id: photoId },
      relations: ['uploader'],
    });
    if (!photo) {
      throw new NotFoundException('PHOTO_NOT_FOUND', '사진을 찾을 수 없습니다');
    }
    if (photo.uploaderId !== userId) {
      throw new ForbiddenException(
        'PHOTO_UPDATE_FORBIDDEN',
        '본인이 업로드한 사진만 수정할 수 있습니다',
      );
    }

    if (dto.chapter !== undefined) {
      photo.chapter = dto.chapter;
    }
    const saved = await this.photoRepository.save(photo);
    return PhotoResponseDto.from(saved, this.publicBase);
  }

  async deletePhoto(photoId: number, userId: number): Promise<void> {
    const photo = await this.photoRepository.findOne({
      where: { id: photoId },
    });
    if (!photo) {
      throw new NotFoundException('PHOTO_NOT_FOUND', '사진을 찾을 수 없습니다');
    }
    if (photo.uploaderId !== userId) {
      throw new ForbiddenException(
        'PHOTO_DELETE_FORBIDDEN',
        '본인이 업로드한 사진만 삭제할 수 있습니다',
      );
    }

    await this.storageService.remove([
      photoObjectPath(photo.groupId, 'original', photo.filename),
      photoObjectPath(photo.groupId, 'medium', photo.filename),
      photoObjectPath(photo.groupId, 'thumbnail', photo.filename),
    ]);
    await this.photoRepository.remove(photo);
  }

  async getChapters(
    groupId: number,
  ): Promise<{ chapter: string; count: number }[]> {
    const result = await this.photoRepository
      .createQueryBuilder('photo')
      .select('photo.chapter', 'chapter')
      .addSelect('COUNT(photo.id)', 'count')
      .where('photo.groupId = :groupId', { groupId })
      .groupBy('photo.chapter')
      .orderBy('count', 'DESC')
      .getRawMany<{ chapter: string | null; count: string }>();

    return result.map((r) => ({
      chapter: r.chapter ?? '미분류',
      count: Number(r.count),
    }));
  }

  async getUploaderRanking(
    groupId: number,
    limit = 10,
  ): Promise<
    { userId: number; name: string; avatarUrl: string | null; count: number }[]
  > {
    const result = await this.photoRepository
      .createQueryBuilder('photo')
      .leftJoin('photo.uploader', 'uploader')
      .select('uploader.id', 'userId')
      .addSelect('uploader.name', 'name')
      .addSelect('uploader.avatarUrl', 'avatarUrl')
      .addSelect('COUNT(photo.id)', 'count')
      .where('photo.groupId = :groupId', { groupId })
      .andWhere('uploader.id IS NOT NULL')
      .groupBy('uploader.id')
      .addGroupBy('uploader.name')
      .addGroupBy('uploader.avatarUrl')
      .orderBy('count', 'DESC')
      .limit(limit)
      .getRawMany<{
        userId: number;
        name: string;
        avatarUrl: string | null;
        count: string;
      }>();

    return result.map((r) => ({
      userId: Number(r.userId),
      name: r.name ?? '알 수 없음',
      avatarUrl: r.avatarUrl ?? null,
      count: Number(r.count),
    }));
  }

  private async processAndSave(
    groupId: number,
    uploaderId: number,
    file: Express.Multer.File,
  ): Promise<Photo> {
    const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.webp`;

    // rotate(): EXIF orientation 반영 후 Sharp는 기본적으로 모든 메타데이터(EXIF GPS 포함)를 제거한다.
    const base = sharp(file.buffer).rotate().webp({ quality: 85 });
    const metadata = await sharp(file.buffer).metadata();

    const [originalBuf, mediumBuf, thumbnailBuf] = await Promise.all([
      base
        .clone()
        .resize(1200, null, { withoutEnlargement: true })
        .toBuffer(),
      base
        .clone()
        .resize(600, null, { withoutEnlargement: true })
        .toBuffer(),
      base.clone().resize(200, 200, { fit: 'cover' }).toBuffer(),
    ]);

    await Promise.all([
      this.storageService.upload(
        photoObjectPath(groupId, 'original', uniqueName),
        originalBuf,
        'image/webp',
      ),
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
      uploaderId,
      filename: uniqueName,
      originalFilename: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      width: metadata.width ?? null,
      height: metadata.height ?? null,
    });

    const saved = await this.photoRepository.save(photo);
    saved.uploader = { name: '' } as Photo['uploader'];
    this.logger.log(
      `Photo uploaded: ${saved.id} (group=${groupId}, user=${uploaderId})`,
    );
    return saved;
  }
}

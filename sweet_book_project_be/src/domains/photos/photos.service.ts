import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import * as fs from 'fs/promises';
import * as path from 'path';
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
import { ActivitiesService } from '../activities/activities.service';

const UPLOAD_BASE = path.join(process.cwd(), 'uploads', 'photos');
const ALLOWED_MIMETYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

@Injectable()
export class PhotosService {
  private readonly logger = new Logger(PhotosService.name);
  private readonly baseUrl: string;

  constructor(
    @InjectRepository(Photo)
    private readonly photoRepository: Repository<Photo>,
    private readonly configService: ConfigService,
    private readonly activitiesService: ActivitiesService,
  ) {
    this.baseUrl = this.configService.get<string>(
      'BASE_URL',
      'http://localhost:3000',
    );
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
      results.push(PhotoResponseDto.from(photo, this.baseUrl));
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
      photos: photos.map((p) => PhotoResponseDto.from(p, this.baseUrl)),
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
    return PhotoResponseDto.from(photo, this.baseUrl);
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
    return PhotoResponseDto.from(saved, this.baseUrl);
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

    await this.deleteFiles(photo.groupId, photo.filename);
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

  private async processAndSave(
    groupId: number,
    uploaderId: number,
    file: Express.Multer.File,
  ): Promise<Photo> {
    const ext = '.webp';
    const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;

    const groupDir = path.join(UPLOAD_BASE, String(groupId));
    const dirs = ['original', 'medium', 'thumbnail'].map((d) =>
      path.join(groupDir, d),
    );
    await Promise.all(dirs.map((d) => fs.mkdir(d, { recursive: true })));

    const base = sharp(file.buffer).rotate().webp({ quality: 85 });
    const metadata = await sharp(file.buffer).metadata();

    await Promise.all([
      base
        .clone()
        .resize(1200, null, { withoutEnlargement: true })
        .toFile(path.join(groupDir, 'original', uniqueName)),
      base
        .clone()
        .resize(600, null, { withoutEnlargement: true })
        .toFile(path.join(groupDir, 'medium', uniqueName)),
      base
        .clone()
        .resize(200, 200, { fit: 'cover' })
        .toFile(path.join(groupDir, 'thumbnail', uniqueName)),
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

  private async deleteFiles(groupId: number, filename: string): Promise<void> {
    const groupDir = path.join(UPLOAD_BASE, String(groupId));
    const variants = ['original', 'medium', 'thumbnail'];
    await Promise.all(
      variants.map((v) =>
        fs.unlink(path.join(groupDir, v, filename)).catch(() => {
          /* file may not exist */
        }),
      ),
    );
  }
}

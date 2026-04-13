import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import AdmZip from 'adm-zip';
import * as path from 'path';
import * as fs from 'fs/promises';
import sharp from 'sharp';
import { Photo } from '../photos/entities/photo.entity';
import { GroupMember } from '../groups/entities/group-member.entity';
import { User } from '../users/entities/user.entity';
import {
  parseKakaoTxt,
  extractImageTimestamp,
  normalizeKakaoName,
  ParsedPhotoMessage,
} from './kakao-parser';
import { ValidationException } from '../../common/exceptions';
import { ActivitiesService } from '../activities/activities.service';

const UPLOAD_BASE = path.join(process.cwd(), 'uploads', 'photos');
const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);
const MAX_ZIP_SIZE = 100 * 1024 * 1024; // 100MB (MVP)
const MAX_IMAGE_SIZE = 20 * 1024 * 1024; // 20MB per image

export interface ImportResult {
  totalPhotos: number;
  savedPhotos: number;
  matchedPhotos: number;
  unmatchedNames: never[];
}

@Injectable()
export class KakaoImportService {
  private readonly logger = new Logger(KakaoImportService.name);
  private readonly baseUrl: string;

  constructor(
    @InjectRepository(Photo)
    private readonly photoRepository: Repository<Photo>,
    @InjectRepository(GroupMember)
    private readonly groupMemberRepository: Repository<GroupMember>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly configService: ConfigService,
    private readonly activitiesService: ActivitiesService,
  ) {
    this.baseUrl = this.configService.getOrThrow<string>('BASE_URL');
  }

  async importZip(
    groupId: number,
    importerId: number,
    file: Express.Multer.File,
  ): Promise<ImportResult> {
    this.validateZipFile(file);

    const zip = new AdmZip(file.buffer);
    const entries = zip.getEntries();

    // txt + 이미지 엔트리 수집
    const txtEntries = entries.filter(
      (e) => !e.isDirectory && e.entryName.toLowerCase().endsWith('.txt'),
    );
    const imageEntries = entries.filter((e) => {
      if (e.isDirectory) return false;
      if (e.entryName.includes('..')) return false; // path traversal 방지
      const ext = path.extname(e.entryName).toLowerCase();
      return IMAGE_EXTENSIONS.has(ext);
    });

    if (imageEntries.length === 0) {
      throw new ValidationException(
        'KAKAO_NO_IMAGES',
        'zip 안에 사진이 없습니다. 안드로이드 카톡의 "모든 대화 내보내기"로 생성된 zip을 올려주세요.',
      );
    }

    // txt 파싱
    let messages: ParsedPhotoMessage[] = [];
    if (txtEntries.length > 0) {
      const txtContent = txtEntries[0].getData().toString('utf-8');
      messages = parseKakaoTxt(txtContent);
    } else {
      this.logger.warn(
        `No txt in zip — uploading ${imageEntries.length} images without uploader match`,
      );
    }

    // 이미지-메시지 매칭
    const imagesWithName = this.matchImagesToMessages(imageEntries, messages);

    // 그룹 멤버 로드 (이름 기반 자동 매칭용)
    const members = await this.groupMemberRepository.find({
      where: { groupId },
      relations: ['user'],
    });

    const memberByUserId = new Map(members.map((m) => [m.userId, m]));
    const memberByNormalized = new Map(
      members.map((m) => [normalizeKakaoName(m.user?.name ?? ''), m.userId]),
    );

    // 각 사진 저장
    const groupDir = path.join(UPLOAD_BASE, String(groupId));
    await Promise.all(
      ['original', 'medium', 'thumbnail'].map((d) =>
        fs.mkdir(path.join(groupDir, d), { recursive: true }),
      ),
    );

    let savedCount = 0;
    let matchedCount = 0;

    for (const img of imagesWithName) {
      try {
        const buffer = img.entry.getData();
        if (buffer.length > MAX_IMAGE_SIZE) {
          this.logger.warn(`Skipping oversized image: ${img.entry.entryName}`);
          continue;
        }

        // 자동 매칭: 멤버 이름과 정확 일치
        let uploaderId: number | null = null;
        const kakaoName = img.kakaoName ?? null;
        if (kakaoName) {
          const normalized = normalizeKakaoName(kakaoName);
          const memberUserId = memberByNormalized.get(normalized);
          if (memberUserId !== undefined && memberByUserId.has(memberUserId)) {
            uploaderId = memberUserId;
          }
        }

        if (uploaderId) matchedCount++;

        await this.saveImage(
          groupId,
          uploaderId,
          kakaoName,
          img.entry.entryName,
          buffer,
          groupDir,
        );
        savedCount++;
      } catch (err) {
        this.logger.error(
          `Failed to save image ${img.entry.entryName}: ${String(err)}`,
        );
      }
    }

    this.logger.log(
      `Kakao import done: group=${groupId}, importer=${importerId}, total=${imagesWithName.length}, saved=${savedCount}, matched=${matchedCount}`,
    );

    await this.activitiesService.record({
      groupId,
      actorUserId: importerId,
      type: 'KAKAO_IMPORTED',
      payload: { count: savedCount },
    });

    return {
      totalPhotos: imagesWithName.length,
      savedPhotos: savedCount,
      matchedPhotos: matchedCount,
      unmatchedNames: [],
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

  private matchImagesToMessages(
    imageEntries: AdmZip.IZipEntry[],
    messages: ParsedPhotoMessage[],
  ): Array<{ entry: AdmZip.IZipEntry; kakaoName: string | null }> {
    // 이미지를 timestamp로 정렬 (파일명 기반, 실패 시 header time)
    const imagesSorted = [...imageEntries].sort((a, b) => {
      const ta = extractImageTimestamp(a.entryName) ?? a.header.time.getTime();
      const tb = extractImageTimestamp(b.entryName) ?? b.header.time.getTime();
      return ta - tb;
    });

    // 메시지는 이미 시간순 (파서가 순회 순서대로 push). 혹시 모르니 정렬.
    const messagesSorted = [...messages].sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
    );

    // 순서 매칭: 1:1로 맞춤
    return imagesSorted.map((entry, idx) => {
      const msg = messagesSorted[idx];
      return {
        entry,
        kakaoName: msg?.uploaderName ?? null,
      };
    });
  }

  private async saveImage(
    groupId: number,
    uploaderId: number | null,
    kakaoName: string | null,
    originalFilename: string,
    buffer: Buffer,
    groupDir: string,
  ): Promise<void> {
    const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.webp`;
    const base = sharp(buffer).rotate().webp({ quality: 85 });
    const metadata = await sharp(buffer).metadata();

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
      kakaoName,
      filename: uniqueName,
      originalFilename: originalFilename.split('/').pop() ?? originalFilename,
      mimetype: 'image/webp',
      size: buffer.length,
      width: metadata.width ?? null,
      height: metadata.height ?? null,
    });
    await this.photoRepository.save(photo);
  }
}

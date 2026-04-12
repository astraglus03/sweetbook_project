import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository, IsNull } from 'typeorm';
import AdmZip from 'adm-zip';
import * as path from 'path';
import * as fs from 'fs/promises';
import sharp from 'sharp';
import { Photo } from '../photos/entities/photo.entity';
import { GroupMember } from '../groups/entities/group-member.entity';
import { User } from '../users/entities/user.entity';
import { KakaoNameMapping } from './entities/kakao-name-mapping.entity';
import {
  parseKakaoTxt,
  extractImageTimestamp,
  normalizeKakaoName,
  ParsedPhotoMessage,
} from './kakao-parser';
import { ValidationException } from '../../common/exceptions';
import { KakaoNameMappingItemDto } from './dto/save-mappings.dto';

const UPLOAD_BASE = path.join(process.cwd(), 'uploads', 'photos');
const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);
const MAX_ZIP_SIZE = 100 * 1024 * 1024; // 100MB (MVP)
const MAX_IMAGE_SIZE = 20 * 1024 * 1024; // 20MB per image

export interface UnmatchedName {
  kakaoName: string;
  photoCount: number;
  suggestions: Array<{ userId: number; name: string }>;
}

export interface ImportResult {
  totalPhotos: number;
  savedPhotos: number;
  matchedPhotos: number;
  unmatchedNames: UnmatchedName[];
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
    @InjectRepository(KakaoNameMapping)
    private readonly mappingRepository: Repository<KakaoNameMapping>,
    private readonly configService: ConfigService,
  ) {
    this.baseUrl = this.configService.get<string>(
      'BASE_URL',
      'http://localhost:3000',
    );
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
      this.logger.warn(`No txt in zip — uploading ${imageEntries.length} images without uploader match`);
    }

    // 이미지-메시지 매칭
    const imagesWithName = this.matchImagesToMessages(imageEntries, messages);

    // 그룹 멤버 + 기존 매핑 로드
    const members = await this.groupMemberRepository.find({
      where: { groupId },
      relations: ['user'],
    });
    const existingMappings = await this.mappingRepository.find({ where: { groupId } });

    const memberByUserId = new Map(members.map((m) => [m.userId, m]));
    const mappingByNormalized = new Map(
      existingMappings.map((m) => [normalizeKakaoName(m.kakaoName), m.userId]),
    );
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
    const unmatchedCounter = new Map<string, number>();

    for (const img of imagesWithName) {
      try {
        const buffer = img.entry.getData();
        if (buffer.length > MAX_IMAGE_SIZE) {
          this.logger.warn(`Skipping oversized image: ${img.entry.entryName}`);
          continue;
        }

        // 매칭 시도
        let uploaderId: number | null = null;
        const kakaoName = img.kakaoName ?? null;
        if (kakaoName) {
          const normalized = normalizeKakaoName(kakaoName);
          const existingMapUserId = mappingByNormalized.get(normalized);
          if (existingMapUserId !== undefined) {
            uploaderId = existingMapUserId;
          } else {
            const memberUserId = memberByNormalized.get(normalized);
            if (memberUserId !== undefined && memberByUserId.has(memberUserId)) {
              uploaderId = memberUserId;
            }
          }
        }
        // fallback: 매칭 실패 시 importer (null 대신 importer 유지 옵션이지만, 여기선 null로 두고 매핑 UI에서 해결)

        if (uploaderId) matchedCount++;
        else if (kakaoName) {
          unmatchedCounter.set(kakaoName, (unmatchedCounter.get(kakaoName) ?? 0) + 1);
        }

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

    // unmatched 이름 집계 + 제안 계산
    const unmatchedNames: UnmatchedName[] = [];
    for (const [kakaoName, count] of unmatchedCounter.entries()) {
      unmatchedNames.push({
        kakaoName,
        photoCount: count,
        suggestions: this.suggestMatches(kakaoName, members),
      });
    }
    unmatchedNames.sort((a, b) => b.photoCount - a.photoCount);

    this.logger.log(
      `Kakao import done: group=${groupId}, importer=${importerId}, total=${imagesWithName.length}, saved=${savedCount}, matched=${matchedCount}, unmatched=${unmatchedNames.length}`,
    );

    return {
      totalPhotos: imagesWithName.length,
      savedPhotos: savedCount,
      matchedPhotos: matchedCount,
      unmatchedNames,
    };
  }

  async saveMappings(
    groupId: number,
    mappings: KakaoNameMappingItemDto[],
  ): Promise<{ updatedPhotos: number }> {
    let updatedPhotos = 0;

    for (const item of mappings) {
      // 매핑 저장 (upsert)
      const existing = await this.mappingRepository.findOne({
        where: { groupId, kakaoName: item.kakaoName },
      });
      if (existing) {
        existing.userId = item.userId;
        await this.mappingRepository.save(existing);
      } else {
        await this.mappingRepository.save(
          this.mappingRepository.create({
            groupId,
            kakaoName: item.kakaoName,
            userId: item.userId,
          }),
        );
      }

      // 해당 카톡 이름을 가진 사진들 uploaderId 일괄 업데이트
      if (item.userId !== null) {
        const result = await this.photoRepository.update(
          { groupId, kakaoName: item.kakaoName, uploaderId: IsNull() },
          { uploaderId: item.userId },
        );
        updatedPhotos += result.affected ?? 0;
      }
    }

    this.logger.log(
      `Saved ${mappings.length} kakao mappings for group ${groupId}, updated ${updatedPhotos} photos`,
    );
    return { updatedPhotos };
  }

  async getUnmatched(groupId: number): Promise<UnmatchedName[]> {
    const rows = (await this.photoRepository
      .createQueryBuilder('p')
      .select('p.kakaoName', 'kakaoName')
      .addSelect('COUNT(p.id)', 'photoCount')
      .where('p.groupId = :groupId', { groupId })
      .andWhere('p.kakaoName IS NOT NULL')
      .andWhere('p.uploaderId IS NULL')
      .groupBy('p.kakaoName')
      .getRawMany()) as Array<{ kakaoName: string; photoCount: string }>;

    const members = await this.groupMemberRepository.find({
      where: { groupId },
      relations: ['user'],
    });

    return rows.map((row) => ({
      kakaoName: row.kakaoName,
      photoCount: Number(row.photoCount),
      suggestions: this.suggestMatches(row.kakaoName, members),
    }));
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

  private suggestMatches(
    kakaoName: string,
    members: GroupMember[],
  ): Array<{ userId: number; name: string }> {
    const normalizedKakao = normalizeKakaoName(kakaoName);
    // 이름 완전/부분 일치 순
    const scored = members
      .filter((m) => m.user)
      .map((m) => {
        const memberName = m.user!.name ?? '';
        const normalizedMember = normalizeKakaoName(memberName);
        let score = 0;
        if (normalizedMember && normalizedKakao === normalizedMember) score = 3;
        else if (normalizedMember && normalizedKakao.includes(normalizedMember))
          score = 2;
        else if (normalizedMember && normalizedMember.includes(normalizedKakao))
          score = 1;
        return { userId: m.userId, name: memberName, score };
      })
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    return scored.map(({ userId, name }) => ({ userId, name }));
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

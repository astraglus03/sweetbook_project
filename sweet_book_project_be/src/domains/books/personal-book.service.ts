import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { Book } from './entities/book.entity';
import { BookPage } from './entities/book-page.entity';
import { PersonalBookMatch } from './entities/personal-book-match.entity';
import { Photo } from '../photos/entities/photo.entity';
import { PhotoFace } from '../photos/entities/photo-face.entity';
import { UserFaceAnchor } from '../photos/entities/user-face-anchor.entity';
import { GroupMember } from '../groups/entities/group-member.entity';
import { FaceApiService } from '../../external/face-api/face-api.service';
import { SweetbookApiService } from '../../external/sweetbook/sweetbook.service';
import {
  NotFoundException,
  ForbiddenException,
  ValidationException,
} from '../../common/exceptions';
import { ActivitiesService } from '../activities/activities.service';
import { StorageService } from '../../common/storage/storage.service';
import { PhotoResponseDto } from '../photos/dto/photo-response.dto';

// TEMP_TEST_THRESHOLD: 테스트용 완화값. 원복 시 MIN_PAGES = 12 로 되돌릴 것
const MIN_PAGES = 12;
const MAX_PHOTOS = 130;
const DEFAULT_BOOK_SPEC = 'SQUAREBOOK_HC';

export interface PersonalBookGenResult {
  userId: number;
  userName: string;
  status: 'GENERATED' | 'SKIPPED_NO_ANCHOR' | 'SKIPPED_TOO_FEW_PHOTOS';
  bookId?: number;
  matchedPhotoCount?: number;
}

@Injectable()
export class PersonalBookService {
  private readonly logger = new Logger(PersonalBookService.name);

  constructor(
    @InjectRepository(Book)
    private readonly bookRepo: Repository<Book>,
    @InjectRepository(BookPage)
    private readonly pageRepo: Repository<BookPage>,
    @InjectRepository(PersonalBookMatch)
    private readonly matchRepo: Repository<PersonalBookMatch>,
    @InjectRepository(Photo)
    private readonly photoRepo: Repository<Photo>,
    @InjectRepository(PhotoFace)
    private readonly photoFaceRepo: Repository<PhotoFace>,
    @InjectRepository(UserFaceAnchor)
    private readonly anchorRepo: Repository<UserFaceAnchor>,
    @InjectRepository(GroupMember)
    private readonly memberRepo: Repository<GroupMember>,
    private readonly dataSource: DataSource,
    private readonly faceApi: FaceApiService,
    private readonly sweetbookApi: SweetbookApiService,
    private readonly activitiesService: ActivitiesService,
    private readonly storageService: StorageService,
  ) {}

  /**
   * 기본 테마/템플릿 + 사진 바인딩 파라미터 키까지 Sweetbook에서 해석.
   * 검수 직후에도 제대로 된 "책 모양" (표지 + 내지 템플릿)으로 생성하기 위함.
   */
  private async resolveDefaults(bookSpecUid: string): Promise<{
    theme: string;
    coverTemplateUid: string;
    contentTemplateUid: string;
    coverBindingKey: string;
    contentBindingKey: string;
  }> {
    const all = await this.sweetbookApi.getTemplates(bookSpecUid);
    const list = (Array.isArray(all) ? all : []) as Array<
      Record<string, unknown>
    >;
    const themeKinds = new Map<string, Set<string>>();
    for (const t of list) {
      const theme = String(t.theme ?? '');
      if (!theme || theme === '공용' || /알림장/.test(theme)) continue;
      if (!themeKinds.has(theme)) themeKinds.set(theme, new Set());
      themeKinds.get(theme)!.add(String(t.templateKind ?? ''));
    }
    let pickedTheme: string | null = null;
    for (const [theme, kinds] of themeKinds) {
      if (kinds.has('cover') && kinds.has('content')) {
        pickedTheme = theme;
        break;
      }
    }
    if (!pickedTheme) {
      throw new ForbiddenException(
        'PERSONAL_BOOK_NO_THEME_AVAILABLE',
        '사용 가능한 테마가 없습니다',
      );
    }
    const byKind = (kind: string) =>
      list.find(
        (t) =>
          String(t.theme ?? '') === pickedTheme &&
          String(t.templateKind ?? '').toLowerCase() === kind,
      );
    const coverTpl = byKind('cover')!;
    const contentTpl = byKind('content')!;

    const isFileBinding = (binding: string) => {
      const b = binding.toLowerCase();
      return (
        b.includes('file') ||
        b.includes('photo') ||
        b.includes('image') ||
        b.includes('collage') ||
        b.includes('gallery')
      );
    };
    const fetchFirstFileKey = async (
      templateUid: string,
      fallback: string,
    ): Promise<string> => {
      try {
        const detail = (await this.sweetbookApi.getTemplateDetail(
          templateUid,
        )) as {
          parameters?: {
            definitions?: Record<string, { binding: string }>;
          };
        };
        const defs = detail?.parameters?.definitions ?? {};
        const found = Object.entries(defs).find(([, v]) =>
          isFileBinding(v.binding),
        );
        return found ? found[0] : fallback;
      } catch {
        return fallback;
      }
    };
    const coverBindingKey = await fetchFirstFileKey(
      String(coverTpl.templateUid),
      'coverPhoto',
    );
    const contentBindingKey = await fetchFirstFileKey(
      String(contentTpl.templateUid),
      'photo',
    );

    return {
      theme: pickedTheme,
      coverTemplateUid: String(coverTpl.templateUid),
      contentTemplateUid: String(contentTpl.templateUid),
      coverBindingKey,
      contentBindingKey,
    };
  }

  async assertOwner(groupId: number, userId: number): Promise<void> {
    const member = await this.memberRepo.findOne({
      where: { groupId, userId },
    });
    if (!member || member.role !== 'OWNER') {
      throw new ForbiddenException(
        'PERSONAL_BOOK_OWNER_ONLY',
        '방장만 일괄 생성할 수 있어요',
      );
    }
  }

  async generateForMember(
    groupId: number,
    userId: number,
  ): Promise<PersonalBookGenResult> {
    const anchor = await this.anchorRepo.findOne({
      where: { userId, groupId },
    });
    if (!anchor) {
      return {
        userId,
        userName: '',
        status: 'SKIPPED_NO_ANCHOR',
      };
    }

    const allFaces = await this.photoFaceRepo.find({
      where: { groupId },
      select: ['id', 'photoId', 'embedding'],
    });

    const matched = new Map<number, { similarity: number; faceId: number }>();
    for (const face of allFaces) {
      const sim = this.faceApi.cosineSimilarity(
        anchor.embedding,
        face.embedding,
      );
      if (sim >= anchor.threshold) {
        const prev = matched.get(face.photoId);
        if (!prev || sim > prev.similarity) {
          matched.set(face.photoId, { similarity: sim, faceId: face.id });
        }
      }
    }

    if (matched.size < MIN_PAGES) {
      return {
        userId,
        userName: '',
        status: 'SKIPPED_TOO_FEW_PHOTOS',
        matchedPhotoCount: matched.size,
      };
    }

    const photoIds = Array.from(matched.keys()).slice(0, MAX_PHOTOS);
    const photos = await this.photoRepo.find({
      where: { id: In(photoIds) },
      order: { createdAt: 'ASC' },
    });

    // 기존 개인 포토북이 없을 때만 Sweetbook 책 신규 등록
    const preExisting = await this.bookRepo.findOne({
      where: { groupId, ownerUserId: userId, bookType: 'PERSONAL' },
    });

    // 테마 + 템플릿 + 바인딩 키 해석 (트랜잭션 밖에서)
    const defaults = await this.resolveDefaults(DEFAULT_BOOK_SPEC);

    let resolvedTheme: string = preExisting?.theme ?? defaults.theme;
    let resolvedSweetbookUid: string | null =
      preExisting?.sweetbookBookUid ?? null;
    let resolvedExternalRef: string | null = preExisting?.externalRef ?? null;
    const resolvedCoverTemplateUid: string =
      preExisting?.coverTemplateUid ?? defaults.coverTemplateUid;

    if (!resolvedSweetbookUid) {
      resolvedExternalRef = `personal-${groupId}-${userId}-${Date.now()}`;
      const result = await this.sweetbookApi.createBook({
        title: '나의 포토북',
        bookSpecUid: DEFAULT_BOOK_SPEC,
        externalRef: resolvedExternalRef,
        idempotencyKey: resolvedExternalRef,
      });
      resolvedSweetbookUid = result.bookUid;
    }

    // 표지 바인딩: 매칭된 첫 사진을 표지로 자동 바인딩 (사용자가 추후 변경 가능)
    const firstPhotoId = photos[0]?.id ?? null;
    const resolvedCoverParams: Record<string, string> | null =
      preExisting?.coverParams ??
      (firstPhotoId !== null
        ? { [defaults.coverBindingKey]: String(firstPhotoId) }
        : null);

    return await this.dataSource.transaction(async (mgr) => {
      const existing = await mgr.findOne(Book, {
        where: {
          groupId,
          ownerUserId: userId,
          bookType: 'PERSONAL',
        },
      });
      if (existing) {
        const BLOCKED_STATUSES = ['ORDERED', 'READY', 'PROCESSING', 'UPLOADING'];
        if (BLOCKED_STATUSES.includes(existing.status)) {
          throw new ForbiddenException(
            'PERSONAL_BOOK_ALREADY_FINALIZED',
            '이미 확정된 개인 포토북은 다시 매칭할 수 없어요',
          );
        }
        if (!['AUTO_GENERATING', 'READY_TO_REVIEW'].includes(existing.status)) {
          throw new ValidationException(
            'PERSONAL_BOOK_STATE_INVALID',
            '현재 상태에서는 재매칭할 수 없어요',
          );
        }
      }

      let book: Book;
      if (existing) {
        existing.status = 'AUTO_GENERATING';
        existing.pageCount = photos.length;
        if (!existing.theme) existing.theme = resolvedTheme;
        if (!existing.sweetbookBookUid)
          existing.sweetbookBookUid = resolvedSweetbookUid;
        if (!existing.externalRef) existing.externalRef = resolvedExternalRef;
        if (!existing.coverTemplateUid)
          existing.coverTemplateUid = resolvedCoverTemplateUid;
        if (!existing.coverParams) existing.coverParams = resolvedCoverParams;
        book = await mgr.save(existing);
        await mgr.delete(BookPage, { bookId: existing.id });
        await mgr.delete(PersonalBookMatch, { bookId: existing.id });
      } else {
        book = await mgr.save(
          mgr.create(Book, {
            groupId,
            title: '나의 포토북',
            bookType: 'PERSONAL',
            ownerUserId: userId,
            createdById: userId,
            bookSpecUid: DEFAULT_BOOK_SPEC,
            theme: resolvedTheme,
            sweetbookBookUid: resolvedSweetbookUid,
            externalRef: resolvedExternalRef,
            coverTemplateUid: resolvedCoverTemplateUid,
            coverParams: resolvedCoverParams,
            status: 'AUTO_GENERATING',
            pageCount: photos.length,
          }),
        );
      }

      const matchRows = photos.map((p) => {
        const info = matched.get(p.id);
        return mgr.create(PersonalBookMatch, {
          bookId: book.id,
          photoId: p.id,
          photoFaceId: info?.faceId ?? null,
          similarity: info?.similarity ?? 0,
        });
      });
      await mgr.save(matchRows);

      // book_pages는 자동 생성하지 않음 — 사용자가 편집기에서 직접 추가
      // (매칭된 사진은 편집기의 "내 사진" 탭에서 선택)
      book.status = 'READY_TO_REVIEW';
      book.pageCount = 0;
      await mgr.save(book);

      this.logger.log(
        `개인 포토북 생성: book=${book.id}, user=${userId}, photos=${photos.length}`,
      );

      await this.activitiesService.record({
        groupId,
        actorUserId: userId,
        type: 'PERSONAL_BOOK_READY',
      });

      return {
        userId,
        userName: '',
        status: 'GENERATED',
        bookId: book.id,
        matchedPhotoCount: photos.length,
      };
    });
  }

  async getMyPersonalBook(
    groupId: number,
    userId: number,
  ): Promise<Book | null> {
    return this.bookRepo.findOne({
      where: { groupId, ownerUserId: userId, bookType: 'PERSONAL' },
      relations: ['pages', 'coverPhoto'],
    });
  }

  async getMatchedPhotos(
    bookId: number,
    userId: number,
  ): Promise<PhotoResponseDto[]> {
    const book = await this.bookRepo.findOne({ where: { id: bookId } });
    if (!book) {
      throw new NotFoundException(
        'PERSONAL_BOOK_NOT_FOUND',
        '개인 포토북을 찾을 수 없어요',
      );
    }
    if (book.bookType !== 'PERSONAL' || book.ownerUserId !== userId) {
      throw new ForbiddenException(
        'PERSONAL_BOOK_NOT_OWNER',
        '본인의 개인 포토북만 조회할 수 있어요',
      );
    }
    const matches = await this.matchRepo.find({
      where: { bookId, excludedByUser: false },
    });
    if (matches.length === 0) return [];
    const photoIds = matches.map((m) => m.photoId);
    const photos = await this.photoRepo.find({ where: { id: In(photoIds) } });
    const publicBase = this.storageService.getPublicBase();
    return photos.map((p) => PhotoResponseDto.from(p, publicBase));
  }

  async excludeMatch(
    bookId: number,
    photoId: number,
    userId: number,
  ): Promise<{
    excluded: true;
    thresholdAdjusted: boolean;
    threshold: number;
  }> {
    const book = await this.bookRepo.findOne({ where: { id: bookId } });
    if (!book) {
      throw new NotFoundException(
        'PERSONAL_BOOK_NOT_FOUND',
        '개인 포토북을 찾을 수 없어요',
      );
    }
    if (book.bookType !== 'PERSONAL' || book.ownerUserId !== userId) {
      throw new ForbiddenException(
        'PERSONAL_BOOK_NOT_OWNER',
        '본인의 개인 포토북만 수정할 수 있어요',
      );
    }

    await this.matchRepo.update({ bookId, photoId }, { excludedByUser: true });
    await this.pageRepo.delete({ bookId, photoId });

    return this.adjustThresholdOnExclusion(book.groupId, userId);
  }

  /**
   * 오탐 교정 피드백 루프: 사용자가 ✕로 제외한 사진이 누적되면
   * 해당 사용자의 anchor threshold를 상향 조정해 다음 생성 시 정확도를 높인다.
   * — 3장마다 +0.03 (최대 0.8)
   */
  private async adjustThresholdOnExclusion(
    groupId: number,
    userId: number,
  ): Promise<{
    excluded: true;
    thresholdAdjusted: boolean;
    threshold: number;
  }> {
    const anchor = await this.anchorRepo.findOne({
      where: { userId, groupId },
    });
    if (!anchor) {
      return { excluded: true, thresholdAdjusted: false, threshold: 0.6 };
    }

    const excludedCount = await this.matchRepo
      .createQueryBuilder('m')
      .innerJoin('books', 'b', 'b.id = m.bookId')
      .where('b.ownerUserId = :userId', { userId })
      .andWhere('b.groupId = :groupId', { groupId })
      .andWhere('m.excludedByUser = true')
      .getCount();

    const targetThreshold = Math.min(
      0.8,
      0.6 + Math.floor(excludedCount / 3) * 0.03,
    );

    if (targetThreshold > anchor.threshold) {
      anchor.threshold = targetThreshold;
      await this.anchorRepo.save(anchor);
      this.logger.log(
        `threshold 상향 조정: user=${userId}, group=${groupId}, ${anchor.threshold.toFixed(2)} (excluded=${excludedCount})`,
      );
      return {
        excluded: true,
        thresholdAdjusted: true,
        threshold: targetThreshold,
      };
    }

    return {
      excluded: true,
      thresholdAdjusted: false,
      threshold: anchor.threshold,
    };
  }
}

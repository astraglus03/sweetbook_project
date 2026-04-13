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
import {
  NotFoundException,
  ForbiddenException,
  ValidationException,
} from '../../common/exceptions';
import { ActivitiesService } from '../activities/activities.service';

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
    private readonly activitiesService: ActivitiesService,
  ) {}

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

    return await this.dataSource.transaction(async (mgr) => {
      const existing = await mgr.findOne(Book, {
        where: {
          groupId,
          ownerUserId: userId,
          bookType: 'PERSONAL',
        },
      });
      if (
        existing &&
        !['AUTO_GENERATING', 'READY_TO_REVIEW'].includes(existing.status)
      ) {
        throw new ValidationException(
          'PERSONAL_BOOK_ALREADY_EDITING',
          '이미 편집 중인 개인 포토북이 있어요',
        );
      }

      let book: Book;
      if (existing) {
        existing.status = 'AUTO_GENERATING';
        existing.pageCount = photos.length;
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

      const pages = photos.map((p, idx) =>
        mgr.create(BookPage, {
          bookId: book.id,
          pageNumber: idx + 1,
          photoId: p.id,
        }),
      );
      await mgr.save(pages);

      book.status = 'READY_TO_REVIEW';
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

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';
import { SweetbookApiService } from '../../external/sweetbook/sweetbook.service';
import {
  ForbiddenException,
  NotFoundException,
} from '../../common/exceptions';
import { Book } from './entities/book.entity';
import { BookPage } from './entities/book-page.entity';
import { Photo } from '../photos/entities/photo.entity';
import { GroupMember } from '../groups/entities/group-member.entity';
import { CreateBookDto } from './dto/create-book.dto';
import { AddPagesDto } from './dto/add-pages.dto';
import { UpdatePageDto } from './dto/update-page.dto';
import { UpdateCoverDto } from './dto/update-cover.dto';
import { BookResponseDto } from './dto/book-response.dto';
import { NotificationsService } from '../notifications/notifications.service';

interface BookSpec {
  bookSpecUid: string;
  name: string;
  innerTrimWidthMm: number;
  innerTrimHeightMm: number;
  coverType: string;
  pageMin: number;
  pageMax: number;
  pageIncrement: number;
  sandboxPriceBase: number;
  priceBase: number;
  sandboxPricePerIncrement: number;
  pricePerIncrement: number;
  [key: string]: unknown;
}

const UPLOAD_BASE = path.join(process.cwd(), 'uploads', 'photos');

@Injectable()
export class BooksService {
  private readonly logger = new Logger(BooksService.name);

  constructor(
    @InjectRepository(Book)
    private readonly bookRepository: Repository<Book>,
    @InjectRepository(BookPage)
    private readonly bookPageRepository: Repository<BookPage>,
    @InjectRepository(Photo)
    private readonly photoRepository: Repository<Photo>,
    @InjectRepository(GroupMember)
    private readonly groupMemberRepository: Repository<GroupMember>,
    private readonly sweetbookApiService: SweetbookApiService,
    private readonly configService: ConfigService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async getBookSpecs() {
    const specs = (await this.sweetbookApiService.getBookSpecs()) as BookSpec[];
    const isSandbox =
      this.configService.getOrThrow<string>('SWEETBOOK_ENV') === 'sandbox';
    return specs.map((spec) => ({
      bookSpecUid: spec.bookSpecUid,
      name: spec.name,
      widthMm: spec.innerTrimWidthMm,
      heightMm: spec.innerTrimHeightMm,
      coverType: spec.coverType,
      pageMin: spec.pageMin,
      pageMax: spec.pageMax,
      pageIncrement: spec.pageIncrement,
      basePrice: isSandbox ? spec.sandboxPriceBase : spec.priceBase,
      pricePerIncrement: isSandbox
        ? spec.sandboxPricePerIncrement
        : spec.pricePerIncrement,
    }));
  }

  async getTemplates(bookSpecUid: string) {
    return this.sweetbookApiService.getTemplates(bookSpecUid);
  }

  async createBook(
    groupId: number,
    userId: number,
    dto: CreateBookDto,
  ): Promise<BookResponseDto> {
    const shareCode = crypto.randomBytes(4).toString('hex');
    const timestamp = Date.now();
    const externalRef = `book-group${groupId}-user${userId}-${timestamp}`;

    const book = this.bookRepository.create({
      groupId,
      title: dto.title,
      bookSpecUid: dto.bookSpecUid,
      templateUid: dto.templateUid ?? null,
      theme: dto.theme,
      createdById: userId,
      shareCode,
      status: 'DRAFT',
      bookType: 'SHARED',
    });
    const saved = await this.bookRepository.save(book);

    const idempotencyKey = `book-${saved.id}-${userId}-${timestamp}`;
    const result = await this.sweetbookApiService.createBook({
      title: dto.title,
      bookSpecUid: dto.bookSpecUid,
      externalRef,
      idempotencyKey,
    });

    saved.sweetbookBookUid = result.bookUid;
    saved.externalRef = externalRef;
    const updated = await this.bookRepository.save(saved);

    return BookResponseDto.from(updated);
  }

  async getBook(bookId: number): Promise<BookResponseDto> {
    const book = await this.findBookOrFail(bookId);
    return BookResponseDto.from(book);
  }

  async getGroupBooks(groupId: number): Promise<BookResponseDto[]> {
    const books = await this.bookRepository.find({
      where: { groupId },
      order: { createdAt: 'DESC' },
    });
    return books.map(BookResponseDto.from);
  }

  async getMyBooks(userId: number): Promise<BookResponseDto[]> {
    const books = await this.bookRepository.find({
      where: { createdById: userId },
      order: { createdAt: 'DESC' },
    });
    return books.map(BookResponseDto.from);
  }

  async addPages(
    bookId: number,
    userId: number,
    dto: AddPagesDto,
  ): Promise<void> {
    const book = await this.findBookOrFail(bookId);
    this.verifyCreator(book, userId);

    const existingCount = await this.bookPageRepository.count({
      where: { bookId },
    });

    const newPages = dto.pages.map((item, index) => {
      const page = this.bookPageRepository.create({
        bookId,
        pageNumber: existingCount + index + 1,
        photoId: item.photoId ?? null,
        contentTemplateUid: item.contentTemplateUid ?? null,
        chapterTitle: item.chapterTitle ?? null,
        caption: item.caption ?? null,
        templateParams: item.templateParams ?? null,
      });
      return page;
    });

    await this.bookPageRepository.save(newPages);

    book.pageCount = existingCount + dto.pages.length;
    await this.bookRepository.save(book);
  }

  async finalize(bookId: number, userId: number): Promise<void> {
    const book = await this.findBookOrFail(bookId);
    this.verifyCreator(book, userId);

    if (book.status !== 'DRAFT') {
      throw new ForbiddenException(
        'BOOK_NOT_DRAFT',
        `DRAFT 상태에서만 최종화할 수 있습니다 (현재: ${book.status})`,
      );
    }
    if (!book.sweetbookBookUid) {
      throw new NotFoundException(
        'BOOK_NOT_SYNCED',
        '포토북이 Sweetbook에 등록되지 않았습니다',
      );
    }
    if (!book.theme) {
      throw new ForbiddenException(
        'BOOK_NO_THEME',
        '포토북 테마가 설정되지 않았습니다',
      );
    }

    const pages = await this.bookPageRepository.find({
      where: { bookId },
      relations: ['photo'],
      order: { pageNumber: 'ASC' },
    });
    if (pages.length === 0) {
      throw new ForbiddenException(
        'BOOK_NO_PAGES',
        '최소 1개 이상의 페이지가 필요합니다',
      );
    }

    const spec = (await this.sweetbookApiService.getBookSpec(
      book.bookSpecUid,
    )) as BookSpec;

    // ── 1. 테마별 템플릿 해석 ──────────────────────────────
    const allTemplates = await this.sweetbookApiService.getTemplates(
      book.bookSpecUid,
    );
    const templateList = (Array.isArray(allTemplates) ? allTemplates : []) as Array<
      Record<string, unknown>
    >;

    const byThemeAndKind = (theme: string, kind: string) =>
      templateList.find(
        (t) =>
          String(t.theme ?? '') === theme &&
          String(t.templateKind ?? '').toLowerCase() === kind,
      );

    const theme = book.theme;
    const coverTpl = byThemeAndKind(theme, 'cover');
    const contentTpl = byThemeAndKind(theme, 'content');
    const blankTpl = templateList.find(
      (t) =>
        String(t.theme ?? '') === theme &&
        String(t.templateKind ?? '').toLowerCase() === 'content' &&
        /빈내지/.test(String(t.templateName ?? '')),
    ) ?? templateList.find(
      (t) =>
        String(t.templateKind ?? '').toLowerCase() === 'content' &&
        /빈내지/.test(String(t.templateName ?? '')) &&
        String(t.theme ?? '') === '공용',
    );
    const publishTpl = byThemeAndKind(theme, 'publish');

    if (!coverTpl || !contentTpl) {
      this.logger.error(
        `Theme "${theme}" templates not found for ${book.bookSpecUid}. cover=${!!coverTpl}, content=${!!contentTpl}`,
      );
      book.status = 'FAILED';
      await this.bookRepository.save(book);
      throw new ForbiddenException(
        'BOOK_TEMPLATE_NOT_FOUND',
        `테마 "${theme}"의 템플릿을 찾을 수 없습니다`,
      );
    }

    const uid = (t: Record<string, unknown>) => String(t.templateUid ?? '');

    // 템플릿 파라미터 정의 조회
    type ParamDef = { binding: string; required: boolean };
    const fetchDefs = async (templateUid: string): Promise<Record<string, ParamDef>> => {
      try {
        const detail = (await this.sweetbookApiService.getTemplateDetail(templateUid)) as {
          parameters?: { definitions?: Record<string, ParamDef> };
        };
        return detail?.parameters?.definitions ?? {};
      } catch {
        return {};
      }
    };

    const coverDefs = await fetchDefs(uid(coverTpl));
    const contentDefs = await fetchDefs(uid(contentTpl));

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
    const fileKeys = (defs: Record<string, ParamDef>) =>
      Object.entries(defs).filter(([, v]) => isFileBinding(v.binding)).map(([k]) => k);
    const isMultiFileBinding = (binding: string) => {
      const b = binding.toLowerCase();
      return (
        b === 'files' ||
        b === 'filelist' ||
        b === 'images' ||
        b === 'photos' ||
        b.includes('collage') ||
        b.includes('gallery') ||
        b.endsWith('list') ||
        b.endsWith('s')
      );
    };
    const coverFileKey = fileKeys(coverDefs)[0] ?? 'coverPhoto';
    const contentFileKey = fileKeys(contentDefs)[0] ?? 'photo';

    this.logger.log(
      `Theme="${theme}" | cover=${uid(coverTpl)} (file:${coverFileKey}) | content=${uid(contentTpl)} (file:${contentFileKey}) | blank=${blankTpl ? uid(blankTpl) : 'none'} | publish=${publishTpl ? uid(publishTpl) : 'none'}`,
    );

    // ── 2. 사진 업로드 ─────────────────────────────────────
    book.status = 'UPLOADING';
    await this.bookRepository.save(book);

    const uploadedFileNames: Map<number, string> = new Map();
    for (const page of pages) {
      if (!page.photo) continue;
      if (uploadedFileNames.has(page.photo.id)) continue;

      const filePath = path.join(
        UPLOAD_BASE,
        String(page.photo.groupId),
        'original',
        page.photo.filename,
      );
      try {
        const buffer = await fs.readFile(filePath);
        const result = await this.sweetbookApiService.uploadPhotoToBook(
          book.sweetbookBookUid,
          buffer,
          page.photo.filename,
        );
        uploadedFileNames.set(page.photo.id, result.fileName);
        this.logger.log(`Uploaded photo ${page.photo.id} → ${result.fileName}`);
      } catch (err) {
        this.logger.error(`Failed to upload photo ${page.photo.id}: ${err}`);
        book.status = 'FAILED';
        await this.bookRepository.save(book);
        throw err;
      }
    }

    // ── 3. 표지 + 내지 + 발행면 추가 ───────────────────────
    book.status = 'PROCESSING';
    await this.bookRepository.save(book);

    // 3-1. 표지 (사용자가 저장한 표지 params 우선 사용)
    const userCoverTplUid = book.coverTemplateUid || uid(coverTpl);
    const coverParams: Record<string, string> = book.coverParams
      ? { ...book.coverParams }
      : {};
    const coverFileKeys = fileKeys(coverDefs);
    // file 바인딩: 사용자가 지정한 photo ID를 Sweetbook에 업로드하고 fileName으로 치환
    for (const fk of coverFileKeys) {
      const raw = coverParams[fk];
      const photoId = raw && /^\d+$/.test(raw) ? Number(raw) : null;
      if (photoId === null) continue;

      const cached = uploadedFileNames.get(photoId);
      if (cached) {
        coverParams[fk] = cached;
        continue;
      }

      const photo = await this.photoRepository.findOne({ where: { id: photoId } });
      if (!photo) {
        this.logger.warn(`Cover photo id=${photoId} not found — skipping`);
        delete coverParams[fk];
        continue;
      }
      const filePath = path.join(
        UPLOAD_BASE,
        String(photo.groupId),
        'original',
        photo.filename,
      );
      const buffer = await fs.readFile(filePath);
      const uploaded = await this.sweetbookApiService.uploadPhotoToBook(
        book.sweetbookBookUid,
        buffer,
        photo.filename,
      );
      uploadedFileNames.set(photo.id, uploaded.fileName);
      coverParams[fk] = uploaded.fileName;
      this.logger.log(`Uploaded cover photo ${photo.id} → ${uploaded.fileName}`);
    }

    // 사용자가 표지 사진을 지정하지 않았으면 첫 번째 내지 사진으로 fallback
    const firstPhotoPage = pages.find((p) => p.photo);
    const fallbackCoverFileName = firstPhotoPage
      ? uploadedFileNames.get(firstPhotoPage.photo!.id)
      : undefined;
    if (fallbackCoverFileName) {
      for (const fk of coverFileKeys) {
        if (!coverParams[fk]) coverParams[fk] = fallbackCoverFileName;
      }
    }
    // 사용자 입력이 없는 텍스트 파라미터에 기본값
    for (const [key, def] of Object.entries(coverDefs)) {
      if (def.binding !== 'text') continue;
      if (coverParams[key]) continue;
      if (/title|spineTitle/i.test(key)) coverParams[key] = book.title;
      else if (/subtitle/i.test(key)) coverParams[key] = book.subtitle ?? ' ';
      else if (/dateRange/i.test(key)) coverParams[key] = new Date().getFullYear().toString();
      else coverParams[key] = ' ';
    }
    await this.sweetbookApiService.addCover(book.sweetbookBookUid, {
      templateUid: userCoverTplUid,
      parameters: coverParams,
    });

    // 3-2. 내지 (각 페이지의 contentTemplateUid 사용)
    // 페이지별 템플릿 파라미터 정의를 캐싱
    const defsCache = new Map<string, Record<string, ParamDef>>();
    defsCache.set(uid(contentTpl), contentDefs);

    let contentPageCount = 0;
    for (const page of pages) {
      const pageTemplateUid = page.contentTemplateUid || uid(contentTpl);

      // 해당 템플릿의 파라미터 정의 조회 (캐시)
      if (!defsCache.has(pageTemplateUid)) {
        defsCache.set(pageTemplateUid, await fetchDefs(pageTemplateUid));
      }
      const pageDefs = defsCache.get(pageTemplateUid)!;
      const pageFileKeys = fileKeys(pageDefs);

      this.logger.log(
        `Page ${page.id} template=${pageTemplateUid} defs=${JSON.stringify(
          Object.fromEntries(
            Object.entries(pageDefs).map(([k, v]) => [k, v.binding]),
          ),
        )} fileKeys=[${pageFileKeys.join(',')}]`,
      );

      const fileName = page.photo
        ? uploadedFileNames.get(page.photo.id)
        : undefined;
      const params: Record<string, string | string[]> = {};

      // 사용자가 입력한 templateParams 중 텍스트만 사용 (file 바인딩은 Sweetbook 파일명으로 강제)
      if (page.templateParams) {
        const fileKeySet = new Set(pageFileKeys);
        for (const [key, val] of Object.entries(page.templateParams)) {
          if (val && val.trim() && !fileKeySet.has(key)) params[key] = val;
        }
      }

      // file 바인딩 파라미터: 단일은 문자열, 다중은 배열로 설정
      // 페이지에 사진이 없으면 이미 업로드된 아무 사진(fallback)으로 채움
      const fallbackFileName = [...uploadedFileNames.values()][0];
      const effectiveFileName = fileName ?? fallbackFileName;
      if (effectiveFileName) {
        for (const fk of pageFileKeys) {
          const def = pageDefs[fk];
          params[fk] = isMultiFileBinding(def.binding)
            ? [effectiveFileName]
            : effectiveFileName;
        }
      } else {
        this.logger.warn(
          `Page ${page.id}: no photo available for file keys [${pageFileKeys.join(',')}] — request will likely fail`,
        );
      }

      // 필수 텍스트 파라미터에 기본값
      for (const [key, def] of Object.entries(pageDefs)) {
        if (def.binding !== 'text') continue;
        if (!params[key]) params[key] = ' ';
      }

      await this.sweetbookApiService.addContents(book.sweetbookBookUid, {
        templateUid: pageTemplateUid,
        parameters: params,
        breakBefore: 'page',
      });
      contentPageCount++;
    }

    // 3-3. 빈내지 패딩 (pageMin 충족)
    const targetPageCount = this.calcTargetPageCount(
      contentPageCount,
      spec.pageMin,
      spec.pageMax,
      spec.pageIncrement,
    );
    const blankUid = blankTpl ? uid(blankTpl) : uid(contentTpl);

    if (targetPageCount > contentPageCount) {
      this.logger.log(
        `Padding ${targetPageCount - contentPageCount} blank pages (${contentPageCount} → ${targetPageCount})`,
      );
      for (let i = contentPageCount; i < targetPageCount; i++) {
        await this.sweetbookApiService.addContents(book.sweetbookBookUid, {
          templateUid: blankUid,
          parameters: {},
          breakBefore: 'page',
        });
      }
    }

    // ── 4. 최종화 ──────────────────────────────────────────
    try {
      await this.sweetbookApiService.finalizeBook(book.sweetbookBookUid);
      book.status = 'READY';
      book.pageCount = targetPageCount;
      await this.bookRepository.save(book);
      this.logger.log(`Book ${bookId} finalized (${targetPageCount} pages, theme=${theme})`);

      // 그룹 멤버 전원에게 BOOK_READY 알림
      try {
        const members = await this.groupMemberRepository.find({
          where: { groupId: book.groupId },
        });
        for (const member of members) {
          await this.notificationsService.createNotification({
            userId: member.userId,
            groupId: book.groupId,
            type: 'BOOK_READY',
            title: '포토북이 완성되었습니다',
            message: `"${book.title}" 포토북이 인쇄 준비를 마쳤어요. 지금 주문할 수 있습니다.`,
          });
        }
      } catch (notifyErr) {
        this.logger.warn(`BOOK_READY notification failed: ${String(notifyErr)}`);
      }
    } catch (err) {
      this.logger.error(`Finalization failed: ${err}`);
      book.status = 'FAILED';
      await this.bookRepository.save(book);
      throw err;
    }
  }

  private calcTargetPageCount(
    current: number,
    pageMin: number,
    pageMax: number,
    pageIncrement: number,
  ): number {
    let target = Math.max(current, pageMin);
    // (target - pageMin) % pageIncrement == 0 을 만족하도록 올림
    const remainder = (target - pageMin) % pageIncrement;
    if (remainder !== 0) {
      target += pageIncrement - remainder;
    }
    return Math.min(target, pageMax);
  }

  async getBookPages(bookId: number) {
    const book = await this.findBookOrFail(bookId);
    const pages = await this.bookPageRepository.find({
      where: { bookId },
      relations: ['photo'],
      order: { pageNumber: 'ASC' },
    });
    const baseUrl = this.configService.getOrThrow<string>('BASE_URL');

    const photoUrls = (photo: { groupId: number; filename: string }) => ({
      thumbnailUrl: `${baseUrl}/uploads/photos/${photo.groupId}/thumbnail/${photo.filename}`,
      mediumUrl: `${baseUrl}/uploads/photos/${photo.groupId}/medium/${photo.filename}`,
    });

    // 표지 합성 페이지 생성 (coverPhotoId 또는 coverParams의 숫자형 photo id 활용)
    let coverPhotoId: number | null = book.coverPhotoId ?? null;
    if (!coverPhotoId && book.coverParams) {
      for (const val of Object.values(book.coverParams)) {
        if (typeof val === 'string' && /^\d+$/.test(val)) {
          coverPhotoId = Number(val);
          break;
        }
      }
    }
    const coverPseudo = coverPhotoId
      ? await this.photoRepository.findOne({ where: { id: coverPhotoId } })
      : null;

    const contentPages = pages.map((page) => {
      const urls = page.photo ? photoUrls(page.photo) : { thumbnailUrl: null, mediumUrl: null };
      return {
        id: page.id,
        bookId: page.bookId,
        pageNumber: page.pageNumber,
        photoId: page.photoId,
        chapterTitle: page.chapterTitle,
        caption: page.caption,
        createdAt: page.createdAt,
        thumbnailUrl: urls.thumbnailUrl,
        mediumUrl: urls.mediumUrl,
        contentTemplateUid: page.contentTemplateUid,
        templateParams: page.templateParams,
        isCover: false,
      };
    });

    if (coverPseudo) {
      const urls = photoUrls(coverPseudo);
      return [
        {
          id: -1,
          bookId,
          pageNumber: 0,
          photoId: coverPseudo.id,
          chapterTitle: null,
          caption: book.title,
          createdAt: book.createdAt,
          thumbnailUrl: urls.thumbnailUrl,
          mediumUrl: urls.mediumUrl,
          contentTemplateUid: book.coverTemplateUid,
          templateParams: book.coverParams,
          isCover: true,
        },
        ...contentPages,
      ];
    }

    return contentPages;
  }

  async updatePage(
    bookId: number,
    pageId: number,
    userId: number,
    dto: UpdatePageDto,
  ): Promise<void> {
    const book = await this.findBookOrFail(bookId);
    this.verifyCreator(book, userId);

    const page = await this.bookPageRepository.findOne({
      where: { id: pageId, bookId },
    });
    if (!page) {
      throw new NotFoundException('BOOK_PAGE_NOT_FOUND', '페이지를 찾을 수 없습니다');
    }

    if (dto.photoId !== undefined) page.photoId = dto.photoId;
    if (dto.contentTemplateUid !== undefined) page.contentTemplateUid = dto.contentTemplateUid;
    if (dto.chapterTitle !== undefined) page.chapterTitle = dto.chapterTitle;
    if (dto.caption !== undefined) page.caption = dto.caption;
    if (dto.templateParams !== undefined) page.templateParams = dto.templateParams;
    if (dto.pageNumber !== undefined) page.pageNumber = dto.pageNumber;

    await this.bookPageRepository.save(page);
  }

  async deletePage(
    bookId: number,
    pageId: number,
    userId: number,
  ): Promise<void> {
    const book = await this.findBookOrFail(bookId);
    this.verifyCreator(book, userId);

    const page = await this.bookPageRepository.findOne({
      where: { id: pageId, bookId },
    });
    if (!page) {
      throw new NotFoundException('BOOK_PAGE_NOT_FOUND', '페이지를 찾을 수 없습니다');
    }

    await this.bookPageRepository.remove(page);

    book.pageCount = Math.max(0, book.pageCount - 1);
    await this.bookRepository.save(book);
  }

  async getCover(bookId: number) {
    const book = await this.findBookOrFail(bookId);
    return {
      coverTemplateUid: book.coverTemplateUid ?? null,
      coverParams: book.coverParams ?? {},
    };
  }

  async updateCover(bookId: number, userId: number, dto: UpdateCoverDto) {
    const book = await this.findBookOrFail(bookId);
    this.verifyCreator(book, userId);
    book.coverTemplateUid = dto.templateUid;
    book.coverParams = dto.parameters ?? {};
    await this.bookRepository.save(book);
  }

  async toggleShare(
    bookId: number,
    userId: number,
  ): Promise<{ shareCode: string; isShared: boolean }> {
    const book = await this.findBookOrFail(bookId);
    this.verifyCreator(book, userId);

    book.isShared = !book.isShared;
    if (!book.shareCode) {
      book.shareCode = crypto.randomBytes(4).toString('hex');
    }

    const saved = await this.bookRepository.save(book);
    return { shareCode: saved.shareCode!, isShared: saved.isShared };
  }

  async getAvailableTemplates(bookId: number) {
    const book = await this.findBookOrFail(bookId);
    if (!book.theme) return { cover: [], content: [] };

    const allTemplates = await this.sweetbookApiService.getTemplates(book.bookSpecUid);
    const templateList = (Array.isArray(allTemplates) ? allTemplates : []) as Array<
      Record<string, unknown>
    >;

    const themeTemplates = templateList.filter(
      (t) => String(t.theme ?? '') === book.theme,
    );

    const buildInfo = async (t: Record<string, unknown>) => {
      const tUid = String(t.templateUid ?? '');
      const thumbs = t.thumbnails as Record<string, string> | undefined;
      try {
        const detail = (await this.sweetbookApiService.getTemplateDetail(tUid)) as {
          parameters?: {
            definitions?: Record<string, { binding: string; required: boolean; description: string }>;
          };
          layout?: {
            elements?: Array<{
              element_id: string;
              type: string;
              position: { x: number; y: number };
              width: number;
              height: number;
              fileName?: string;
              text?: string;
            }>;
            backgroundColor?: string;
          };
        };
        const defs = detail?.parameters?.definitions ?? {};
        const elements = (detail?.layout?.elements ?? []).map((el) => ({
          id: el.element_id,
          type: el.type,
          x: el.position?.x ?? 0,
          y: el.position?.y ?? 0,
          width: el.width ?? 0,
          height: el.height ?? 0,
          variable: this.extractVariable(el.fileName ?? el.text ?? ''),
        }));

        return {
          templateUid: tUid,
          templateName: String(t.templateName ?? ''),
          templateKind: String(t.templateKind ?? ''),
          thumbnail: thumbs?.layout ?? null,
          parameters: Object.fromEntries(
            Object.entries(defs).map(([k, v]) => [
              k,
              { binding: v.binding, required: v.required, description: v.description },
            ]),
          ),
          elements,
          bgColor: detail?.layout?.backgroundColor ?? '#FFFFFFFF',
        };
      } catch {
        return {
          templateUid: tUid,
          templateName: String(t.templateName ?? ''),
          templateKind: String(t.templateKind ?? ''),
          thumbnail: thumbs?.layout ?? null,
          parameters: {},
          elements: [],
          bgColor: '#FFFFFFFF',
        };
      }
    };

    const coverTemplates = themeTemplates.filter(
      (t) => String(t.templateKind ?? '') === 'cover',
    );
    const contentTemplates = themeTemplates.filter(
      (t) => String(t.templateKind ?? '') === 'content',
    );

    const [covers, contents] = await Promise.all([
      Promise.all(coverTemplates.map(buildInfo)),
      Promise.all(contentTemplates.map(buildInfo)),
    ]);

    return { cover: covers, content: contents };
  }

  private extractVariable(str: string): string | null {
    const match = str.match(/\$\$(\w+)\$\$/);
    return match ? match[1] : null;
  }

  async getTemplateLayout(bookId: number) {
    const book = await this.findBookOrFail(bookId);
    if (!book.theme) {
      return { cover: null, content: null };
    }

    const allTemplates = await this.sweetbookApiService.getTemplates(book.bookSpecUid);
    const templateList = (Array.isArray(allTemplates) ? allTemplates : []) as Array<
      Record<string, unknown>
    >;

    const findByThemeKind = (theme: string, kind: string) =>
      templateList.find(
        (t) => String(t.theme ?? '') === theme && String(t.templateKind ?? '') === kind,
      );

    const coverTpl = findByThemeKind(book.theme, 'cover');
    const contentTpl = findByThemeKind(book.theme, 'content');

    const fetchLayout = async (t: Record<string, unknown> | undefined) => {
      if (!t) return null;
      const uid = String(t.templateUid ?? '');
      const thumbs = t.thumbnails as Record<string, string> | undefined;
      try {
        const detail = (await this.sweetbookApiService.getTemplateDetail(uid)) as {
          parameters?: { definitions?: Record<string, { binding: string; required: boolean; description: string }> };
          layout?: { elements?: Array<{ element_id: string; type: string; position: { x: number; y: number }; width: number; height: number; fileName?: string; text?: string }> };
        };
        return {
          templateUid: uid,
          templateName: String(t.templateName ?? ''),
          thumbnail: thumbs?.layout ?? null,
          parameters: detail?.parameters?.definitions ?? {},
          elements: (detail?.layout?.elements ?? []).map((el) => ({
            id: el.element_id,
            type: el.type,
            x: el.position?.x ?? 0,
            y: el.position?.y ?? 0,
            width: el.width ?? 0,
            height: el.height ?? 0,
            isVariable: !!(el.fileName?.includes('$$') || el.text?.includes('$$')),
            variableName: (el.fileName ?? el.text ?? '').replace(/\$\$/g, ''),
          })),
        };
      } catch {
        return {
          templateUid: uid,
          templateName: String(t.templateName ?? ''),
          thumbnail: thumbs?.layout ?? null,
          parameters: {},
          elements: [],
        };
      }
    };

    const [cover, content] = await Promise.all([
      fetchLayout(coverTpl),
      fetchLayout(contentTpl),
    ]);

    return { cover, content };
  }

  async getThemes(bookSpecUid: string) {
    const allTemplates = await this.sweetbookApiService.getTemplates(bookSpecUid);
    const templateList = (Array.isArray(allTemplates) ? allTemplates : []) as Array<
      Record<string, unknown>
    >;

    // 테마별로 그룹핑, 알림장 제외 (유치원 전용)
    const themeMap = new Map<string, { kinds: Set<string>; thumbnail?: string }>();
    for (const t of templateList) {
      const theme = String(t.theme ?? '');
      if (!theme || theme === '공용' || /알림장/.test(theme)) continue;

      if (!themeMap.has(theme)) {
        themeMap.set(theme, { kinds: new Set() });
      }
      const entry = themeMap.get(theme)!;
      entry.kinds.add(String(t.templateKind ?? ''));
      if (
        String(t.templateKind ?? '') === 'cover' &&
        !entry.thumbnail
      ) {
        const thumbs = t.thumbnails as Record<string, string> | undefined;
        entry.thumbnail = thumbs?.layout ?? undefined;
      }
    }

    // cover + content 둘 다 있는 테마만 반환
    const themes: Array<{ theme: string; thumbnail?: string }> = [];
    for (const [theme, { kinds, thumbnail }] of themeMap) {
      if (kinds.has('cover') && kinds.has('content')) {
        themes.push({ theme, thumbnail });
      }
    }
    return themes;
  }

  async retryFinalize(bookId: number, userId: number): Promise<void> {
    const book = await this.findBookOrFail(bookId);
    this.verifyCreator(book, userId);

    if (book.status !== 'FAILED') {
      throw new ForbiddenException(
        'BOOK_NOT_FAILED',
        'FAILED 상태의 포토북만 재시도할 수 있습니다',
      );
    }

    // 기존 Sweetbook 책 삭제 후 재생성
    if (book.sweetbookBookUid) {
      try {
        await this.sweetbookApiService.deleteBook(book.sweetbookBookUid);
      } catch {
        this.logger.warn(`Failed to delete old Sweetbook book ${book.sweetbookBookUid}`);
      }
    }

    const timestamp = Date.now();
    const externalRef = `book-group${book.groupId}-user${userId}-${timestamp}`;
    const idempotencyKey = `book-${book.id}-${userId}-${timestamp}`;

    const result = await this.sweetbookApiService.createBook({
      title: book.title,
      bookSpecUid: book.bookSpecUid,
      externalRef,
      idempotencyKey,
    });

    book.sweetbookBookUid = result.bookUid;
    book.externalRef = externalRef;
    book.status = 'DRAFT';
    await this.bookRepository.save(book);

    this.logger.log(`Book ${bookId} reset to DRAFT → new bookUid: ${result.bookUid}`);
  }

  async getBookSpecInfo(bookId: number) {
    const book = await this.findBookOrFail(bookId);
    const spec = (await this.sweetbookApiService.getBookSpec(
      book.bookSpecUid,
    )) as BookSpec;
    const isSandbox =
      this.configService.getOrThrow<string>('SWEETBOOK_ENV') === 'sandbox';

    const currentPages = await this.bookPageRepository.count({
      where: { bookId },
    });

    return {
      bookSpecUid: spec.bookSpecUid,
      name: spec.name,
      pageMin: spec.pageMin,
      pageMax: spec.pageMax,
      pageIncrement: spec.pageIncrement,
      currentPages,
      isSufficient: currentPages >= spec.pageMin,
      shortfall: Math.max(0, spec.pageMin - currentPages),
      basePrice: isSandbox ? spec.sandboxPriceBase : spec.priceBase,
    };
  }

  private async findBookOrFail(bookId: number): Promise<Book> {
    const book = await this.bookRepository.findOne({ where: { id: bookId } });
    if (!book) {
      throw new NotFoundException('BOOK_NOT_FOUND', '포토북을 찾을 수 없습니다');
    }
    return book;
  }

  private verifyCreator(book: Book, userId: number): void {
    if (book.createdById !== userId) {
      throw new ForbiddenException(
        'BOOK_NOT_CREATOR',
        '포토북 제작자만 수행할 수 있습니다',
      );
    }
  }
}

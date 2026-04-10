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
import { CreateBookDto } from './dto/create-book.dto';
import { AddPagesDto } from './dto/add-pages.dto';
import { UpdatePageDto } from './dto/update-page.dto';
import { BookResponseDto } from './dto/book-response.dto';

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
    private readonly sweetbookApiService: SweetbookApiService,
    private readonly configService: ConfigService,
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
        photoId: item.photoId,
        chapterTitle: item.chapterTitle ?? null,
        caption: item.caption ?? null,
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

    if (!book.sweetbookBookUid) {
      throw new NotFoundException(
        'BOOK_NOT_SYNCED',
        '포토북이 Sweetbook에 등록되지 않았습니다',
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

    // 1. Sweetbook에 사진 업로드
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

    // 2. Sweetbook에 표지 추가 (첫 번째 사진)
    book.status = 'PROCESSING';
    await this.bookRepository.save(book);

    const templates = await this.sweetbookApiService.getTemplates(book.bookSpecUid);
    const templateList = (Array.isArray(templates) ? templates : []) as Array<{
      templateUid: string;
      templateKind: string;
      [key: string]: unknown;
    }>;
    const coverTemplate = templateList.find((t) => t.templateKind === 'cover');
    const contentTemplate = templateList.find((t) => t.templateKind === 'content');

    if (coverTemplate) {
      const firstPhotoPage = pages.find((p) => p.photo);
      const coverFileName = firstPhotoPage
        ? uploadedFileNames.get(firstPhotoPage.photo!.id)
        : undefined;

      await this.sweetbookApiService.addCover(book.sweetbookBookUid, {
        templateUid: coverTemplate.templateUid as string,
        parameters: coverFileName
          ? { image: coverFileName }
          : {},
      });
    }

    // 3. Sweetbook에 내지 추가
    if (contentTemplate) {
      for (const page of pages) {
        const fileName = page.photo
          ? uploadedFileNames.get(page.photo.id)
          : undefined;

        await this.sweetbookApiService.addContents(book.sweetbookBookUid, {
          templateUid: contentTemplate.templateUid as string,
          parameters: fileName
            ? { image: fileName }
            : {},
          breakBefore: 'page',
        });
      }
    }

    // 4. 최종화
    try {
      await this.sweetbookApiService.finalizeBook(book.sweetbookBookUid);
      book.status = 'READY';
      await this.bookRepository.save(book);
    } catch (err) {
      this.logger.error(`Finalization failed: ${err}`);
      book.status = 'FAILED';
      await this.bookRepository.save(book);
      throw err;
    }
  }

  async getBookPages(bookId: number) {
    await this.findBookOrFail(bookId);
    const pages = await this.bookPageRepository.find({
      where: { bookId },
      relations: ['photo'],
      order: { pageNumber: 'ASC' },
    });
    const baseUrl = this.configService.getOrThrow<string>('BASE_URL');
    return pages.map((page) => ({
      id: page.id,
      bookId: page.bookId,
      pageNumber: page.pageNumber,
      photoId: page.photoId,
      chapterTitle: page.chapterTitle,
      caption: page.caption,
      createdAt: page.createdAt,
      thumbnailUrl: page.photo
        ? `${baseUrl}/uploads/photos/${page.photo.groupId}/thumbnail/${page.photo.filename}`
        : null,
      mediumUrl: page.photo
        ? `${baseUrl}/uploads/photos/${page.photo.groupId}/medium/${page.photo.filename}`
        : null,
    }));
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
    if (dto.chapterTitle !== undefined) page.chapterTitle = dto.chapterTitle;
    if (dto.caption !== undefined) page.caption = dto.caption;

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

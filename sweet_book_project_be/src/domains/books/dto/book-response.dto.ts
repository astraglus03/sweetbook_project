import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { BookStatus, BookType } from '../entities/book.entity';
import { Book } from '../entities/book.entity';

export class BookResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  groupId: number;

  @ApiProperty()
  title: string;

  @ApiPropertyOptional()
  subtitle: string | null;

  @ApiProperty({ enum: ['SHARED', 'PERSONAL'] })
  bookType: BookType;

  @ApiPropertyOptional()
  ownerUserId: number | null;

  @ApiPropertyOptional()
  templateUid: string | null;

  @ApiProperty()
  bookSpecUid: string;

  @ApiPropertyOptional()
  theme: string | null;

  @ApiProperty({ enum: ['DRAFT', 'UPLOADING', 'PROCESSING', 'READY', 'ORDERED', 'FAILED'] })
  status: BookStatus;

  @ApiPropertyOptional()
  sweetbookBookUid: string | null;

  @ApiPropertyOptional()
  externalRef: string | null;

  @ApiPropertyOptional()
  coverPhotoId: number | null;

  @ApiProperty()
  pageCount: number;

  @ApiPropertyOptional()
  shareCode: string | null;

  @ApiProperty()
  isShared: boolean;

  @ApiProperty()
  createdById: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  static from(book: Book): BookResponseDto {
    const dto = new BookResponseDto();
    dto.id = book.id;
    dto.groupId = book.groupId;
    dto.title = book.title;
    dto.subtitle = book.subtitle;
    dto.bookType = book.bookType;
    dto.ownerUserId = book.ownerUserId;
    dto.templateUid = book.templateUid;
    dto.bookSpecUid = book.bookSpecUid;
    dto.theme = book.theme;
    dto.status = book.status;
    dto.sweetbookBookUid = book.sweetbookBookUid;
    dto.externalRef = book.externalRef;
    dto.coverPhotoId = book.coverPhotoId;
    dto.pageCount = book.pageCount;
    dto.shareCode = book.shareCode;
    dto.isShared = book.isShared;
    dto.createdById = book.createdById;
    dto.createdAt = book.createdAt;
    dto.updatedAt = book.updatedAt;
    return dto;
  }
}

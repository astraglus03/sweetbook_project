import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Photo } from '../entities/photo.entity';

export class PhotoResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  groupId: number;

  @ApiPropertyOptional()
  uploaderId: number | null;

  @ApiProperty()
  filename: string;

  @ApiProperty()
  originalFilename: string;

  @ApiProperty()
  mimetype: string;

  @ApiProperty()
  size: number;

  @ApiPropertyOptional()
  chapter: string | null;

  @ApiPropertyOptional()
  width: number | null;

  @ApiPropertyOptional()
  height: number | null;

  @ApiProperty()
  thumbnailUrl: string;

  @ApiProperty()
  mediumUrl: string;

  @ApiProperty()
  originalUrl: string;

  @ApiPropertyOptional()
  uploaderName?: string;

  @ApiProperty()
  createdAt: Date;

  static from(photo: Photo, publicBase: string): PhotoResponseDto {
    const dto = new PhotoResponseDto();
    dto.id = photo.id;
    dto.groupId = photo.groupId;
    dto.uploaderId = photo.uploaderId;
    dto.filename = photo.filename;
    dto.originalFilename = photo.originalFilename;
    dto.mimetype = photo.mimetype;
    dto.size = photo.size;
    dto.chapter = photo.chapter;
    dto.width = photo.width;
    dto.height = photo.height;
    dto.thumbnailUrl = `${publicBase}/photos/${photo.groupId}/thumbnail/${photo.filename}`;
    dto.mediumUrl = `${publicBase}/photos/${photo.groupId}/medium/${photo.filename}`;
    dto.originalUrl = `${publicBase}/photos/${photo.groupId}/original/${photo.filename}`;
    dto.uploaderName = photo.uploader?.name ?? undefined;
    dto.createdAt = photo.createdAt;
    return dto;
  }
}

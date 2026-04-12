import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString } from 'class-validator';

export class UpdatePageDto {
  @ApiPropertyOptional({ description: '사진 ID' })
  @IsOptional()
  @IsInt()
  photoId?: number;

  @ApiPropertyOptional({ description: '챕터 제목' })
  @IsOptional()
  @IsString()
  chapterTitle?: string;

  @ApiPropertyOptional({ description: '캡션' })
  @IsOptional()
  @IsString()
  caption?: string;

  @ApiPropertyOptional({ description: '내지 템플릿 UID' })
  @IsOptional()
  @IsString()
  contentTemplateUid?: string;

  @ApiPropertyOptional({ description: '템플릿 파라미터 (key-value)' })
  @IsOptional()
  templateParams?: Record<string, string>;

  @ApiPropertyOptional({ description: '페이지 순서 번호' })
  @IsOptional()
  @IsInt()
  pageNumber?: number;
}

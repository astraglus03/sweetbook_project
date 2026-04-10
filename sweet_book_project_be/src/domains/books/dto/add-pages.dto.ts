import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class PageItemDto {
  @ApiPropertyOptional({ description: '사진 ID' })
  @IsOptional()
  @IsInt()
  photoId?: number;

  @ApiPropertyOptional({ description: '사용할 내지 템플릿 UID' })
  @IsOptional()
  @IsString()
  contentTemplateUid?: string;

  @ApiPropertyOptional({ description: '챕터 제목' })
  @IsOptional()
  @IsString()
  chapterTitle?: string;

  @ApiPropertyOptional({ description: '캡션' })
  @IsOptional()
  @IsString()
  caption?: string;

  @ApiPropertyOptional({ description: '템플릿 파라미터 (key-value)' })
  @IsOptional()
  templateParams?: Record<string, string>;
}

export class AddPagesDto {
  @ApiProperty({ type: [PageItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PageItemDto)
  pages: PageItemDto[];
}

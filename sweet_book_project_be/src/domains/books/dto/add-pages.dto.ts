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
  @ApiProperty({ description: '사진 ID' })
  @IsInt()
  photoId: number;

  @ApiPropertyOptional({ description: '챕터 제목' })
  @IsOptional()
  @IsString()
  chapterTitle?: string;

  @ApiPropertyOptional({ description: '캡션' })
  @IsOptional()
  @IsString()
  caption?: string;
}

export class AddPagesDto {
  @ApiProperty({ type: [PageItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PageItemDto)
  pages: PageItemDto[];
}

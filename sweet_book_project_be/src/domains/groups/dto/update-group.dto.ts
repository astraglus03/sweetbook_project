import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateGroupDto {
  @ApiPropertyOptional({ description: '모임 이름', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ description: '모임 설명' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ description: '커버 이미지 URL' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  coverImage?: string;

  @ApiPropertyOptional({ description: '모임 날짜 (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  eventDate?: string;

  @ApiPropertyOptional({ description: '사진 업로드 마감일 (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  uploadDeadline?: string;

  @ApiPropertyOptional({ description: '모임 연도' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  year?: number;
}

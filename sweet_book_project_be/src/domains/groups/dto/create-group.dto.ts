import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateGroupDto {
  @ApiProperty({ description: '모임 이름', maxLength: 100 })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ description: '모임 설명' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

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

  @ApiPropertyOptional({ description: '반복 모임의 원본 그룹 ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  parentGroupId?: number;
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';
import type { TemplateKind } from '../entities/cover-candidate.entity';

export class CreateCoverCandidateDto {
  @ApiProperty({ description: '사진 ID' })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  photoId: number;

  @ApiProperty({ description: '표지 제목 (최대 60자)', maxLength: 60 })
  @IsString()
  @MaxLength(60)
  title: string;

  @ApiPropertyOptional({ description: '부제 (최대 60자)', maxLength: 60 })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  subtitle?: string;

  @ApiProperty({ description: '템플릿 종류', enum: ['CLASSIC', 'MINIMAL'] })
  @IsEnum(['CLASSIC', 'MINIMAL'])
  templateKind: TemplateKind;
}

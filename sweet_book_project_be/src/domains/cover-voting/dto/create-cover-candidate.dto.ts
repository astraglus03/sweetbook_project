import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';

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

  @ApiProperty({ description: 'Sweetbook 템플릿 UID', maxLength: 50 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  templateUid: string;

  @ApiProperty({ description: 'Sweetbook 판형 UID', maxLength: 50 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  bookSpecUid: string;
}

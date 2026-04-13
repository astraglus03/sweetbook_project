import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateCoverCandidateDto {
  @ApiProperty({
    description: 'Sweetbook 템플릿 UID',
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  templateUid: string;

  @ApiProperty({
    description: 'Sweetbook 판형 UID',
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  bookSpecUid: string;

  @ApiPropertyOptional({
    description: '템플릿 이름 스냅샷 (등록 시점 보존용)',
    maxLength: 120,
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  templateName?: string;

  @ApiPropertyOptional({
    description: '테마 스냅샷 (등록 시점 보존용)',
    maxLength: 60,
  })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  theme?: string;

  @ApiProperty({
    description: '슬롯별 파라미터: { [slotId]: photoId(number) | text(string) }',
    example: { slot_photo_0: 42, title: '2025 동창회' },
  })
  @IsObject()
  params: Record<string, string | number>;
}

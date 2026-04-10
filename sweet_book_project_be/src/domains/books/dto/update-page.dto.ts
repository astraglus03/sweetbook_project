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
}

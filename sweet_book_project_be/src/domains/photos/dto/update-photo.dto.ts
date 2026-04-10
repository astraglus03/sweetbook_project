import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdatePhotoDto {
  @ApiPropertyOptional({ description: '챕터' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  chapter?: string;
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateBookDto {
  @ApiProperty({ description: '포토북 제목', maxLength: 100 })
  @IsString()
  @MaxLength(100)
  title: string;

  @ApiProperty({ description: 'Sweetbook 판형 UID' })
  @IsString()
  bookSpecUid: string;

  @ApiPropertyOptional({ description: 'Sweetbook 템플릿 UID' })
  @IsOptional()
  @IsString()
  templateUid?: string;

  @ApiProperty({ description: '포토북 테마 (구글포토북C, 일기장B 등)' })
  @IsString()
  theme: string;
}

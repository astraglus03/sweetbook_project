import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateCoverDto {
  @ApiProperty({ description: '표지 템플릿 UID' })
  @IsNotEmpty()
  @IsString()
  templateUid: string;

  @ApiPropertyOptional({ description: '표지 파라미터 (key-value)' })
  @IsOptional()
  parameters?: Record<string, string>;
}

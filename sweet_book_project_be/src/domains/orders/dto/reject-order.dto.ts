import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RejectOrderDto {
  @ApiPropertyOptional({ description: '거절 사유', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  rejectReason?: string;
}

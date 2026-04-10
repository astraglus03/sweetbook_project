import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

export class CancelOrderDto {
  @ApiProperty({ description: '취소 사유', maxLength: 500 })
  @IsString()
  @MaxLength(500)
  cancelReason: string;
}

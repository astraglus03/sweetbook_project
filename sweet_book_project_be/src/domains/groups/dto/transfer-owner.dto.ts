import { ApiProperty } from '@nestjs/swagger';
import { IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class TransferOwnerDto {
  @ApiProperty({ description: '새 방장 사용자 ID' })
  @Type(() => Number)
  @IsInt()
  newOwnerId: number;
}

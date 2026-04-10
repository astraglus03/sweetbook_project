import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class CreateOrderGroupDto {
  @ApiProperty({ description: '포토북 ID' })
  @IsInt()
  bookId: number;
}

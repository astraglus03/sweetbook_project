import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class JoinGroupDto {
  @ApiProperty({ description: '초대 코드 (8자리)', minLength: 8, maxLength: 8 })
  @IsString()
  @Length(8, 8)
  inviteCode: string;
}

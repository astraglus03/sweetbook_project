import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({ description: '재설정 토큰' })
  @IsString()
  token: string;

  @ApiProperty({ description: '새 비밀번호 (8~64자)' })
  @IsString()
  @MinLength(8)
  @MaxLength(64)
  password: string;
}

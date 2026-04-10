import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'hong@example.com' })
  @IsEmail({}, { message: '이메일 형식이 올바르지 않습니다' })
  email: string;

  @ApiProperty({ example: 'p@ssword1!' })
  @IsString()
  @MinLength(1, { message: '비밀번호를 입력해 주세요' })
  password: string;
}

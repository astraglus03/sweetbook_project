import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class SignupDto {
  @ApiProperty({ example: 'hong@example.com' })
  @IsEmail({}, { message: '이메일 형식이 올바르지 않습니다' })
  email: string;

  @ApiProperty({ example: 'p@ssword1!', minLength: 8, maxLength: 64 })
  @IsString()
  @MinLength(8, { message: '비밀번호는 최소 8자 이상이어야 합니다' })
  @MaxLength(64, { message: '비밀번호는 최대 64자까지 가능합니다' })
  password: string;

  @ApiProperty({ example: '홍길동', minLength: 2, maxLength: 50 })
  @IsString()
  @MinLength(2, { message: '이름은 최소 2자 이상이어야 합니다' })
  @MaxLength(50, { message: '이름은 최대 50자까지 가능합니다' })
  name: string;
}

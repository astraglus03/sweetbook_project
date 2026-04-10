import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../users/entities/user.entity';

export class AuthUserDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'hong@example.com' })
  email: string;

  @ApiProperty({ example: '홍길동' })
  name: string;

  @ApiProperty({ example: 'https://...avatar.webp', nullable: true })
  avatarUrl: string | null;

  @ApiProperty({ example: 'local', enum: ['local', 'google', 'kakao'] })
  provider: string;

  static from(user: User): AuthUserDto {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      provider: user.provider,
    };
  }
}

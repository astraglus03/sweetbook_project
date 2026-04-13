import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { AuthProvider } from '../entities/user.entity';
import { User } from '../entities/user.entity';

export class ProfileResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  email: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  avatarUrl: string | null;

  @ApiProperty()
  provider: AuthProvider;

  @ApiProperty({ description: '비밀번호가 설정되어 있는지' })
  hasPassword: boolean;

  @ApiProperty()
  createdAt: Date;

  static from(user: User, hasPassword?: boolean): ProfileResponseDto {
    const dto = new ProfileResponseDto();
    dto.id = user.id;
    dto.email = user.email;
    dto.name = user.name;
    dto.avatarUrl = user.avatarUrl;
    dto.provider = user.provider;
    dto.hasPassword = hasPassword ?? !!user.passwordHash;
    dto.createdAt = user.createdAt;
    return dto;
  }
}

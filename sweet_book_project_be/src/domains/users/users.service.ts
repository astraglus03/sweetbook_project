import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import {
  ConflictException,
  NotFoundException,
  ValidationException,
} from '../../common/exceptions';
import { AuthProvider, User } from './entities/user.entity';
import { UsersRepository } from './users.repository';
import { UpdateProfileDto } from './dto/update-profile.dto';

const BCRYPT_ROUNDS = 10;

export interface OAuthProfileInput {
  provider: AuthProvider;
  providerUserId: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
}

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async findByIdOrFail(id: number): Promise<User> {
    const user = await this.usersRepository.findById(id);
    if (!user) {
      throw new NotFoundException(
        'USER_NOT_FOUND',
        '사용자를 찾을 수 없습니다',
      );
    }
    return user;
  }

  findById(id: number): Promise<User | null> {
    return this.usersRepository.findById(id);
  }

  findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findByEmail(email);
  }

  async createLocal(params: {
    email: string;
    passwordHash: string;
    name: string;
  }): Promise<User> {
    const existing = await this.usersRepository.findByEmail(params.email);
    if (existing) {
      throw new ConflictException(
        'USER_EMAIL_DUPLICATED',
        '이미 가입된 이메일입니다',
      );
    }
    const user = this.usersRepository.create({
      email: params.email,
      passwordHash: params.passwordHash,
      name: params.name,
      provider: 'local',
      providerUserId: null,
    });
    return this.usersRepository.save(user);
  }

  async upsertOAuthUser(profile: OAuthProfileInput): Promise<User> {
    const byProvider = await this.usersRepository.findByProvider(
      profile.provider,
      profile.providerUserId,
    );
    if (byProvider) {
      byProvider.name = profile.name;
      byProvider.avatarUrl = profile.avatarUrl ?? byProvider.avatarUrl;
      return this.usersRepository.save(byProvider);
    }

    const byEmail = await this.usersRepository.findByEmail(profile.email);
    if (byEmail) {
      byEmail.provider = profile.provider;
      byEmail.providerUserId = profile.providerUserId;
      byEmail.avatarUrl = profile.avatarUrl ?? byEmail.avatarUrl;
      return this.usersRepository.save(byEmail);
    }

    const created = this.usersRepository.create({
      email: profile.email,
      name: profile.name,
      avatarUrl: profile.avatarUrl ?? null,
      provider: profile.provider,
      providerUserId: profile.providerUserId,
      passwordHash: null,
    });
    return this.usersRepository.save(created);
  }

  save(user: User): Promise<User> {
    return this.usersRepository.save(user);
  }

  async updateProfile(userId: number, dto: UpdateProfileDto): Promise<User> {
    const user = await this.findByIdOrFail(userId);
    if (dto.name !== undefined) {
      user.name = dto.name;
    }
    return this.usersRepository.save(user);
  }

  async updateAvatar(userId: number, avatarUrl: string): Promise<User> {
    const user = await this.findByIdOrFail(userId);
    user.avatarUrl = avatarUrl;
    return this.usersRepository.save(user);
  }

  async changePassword(
    userId: number,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.usersRepository.findByIdWithPassword(userId);
    if (!user) {
      throw new NotFoundException(
        'USER_NOT_FOUND',
        '사용자를 찾을 수 없습니다',
      );
    }
    if (!user.passwordHash) {
      throw new ValidationException(
        'USER_NO_PASSWORD',
        '소셜 로그인 계정은 비밀번호를 변경할 수 없습니다',
      );
    }
    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      throw new ValidationException(
        'USER_WRONG_PASSWORD',
        '현재 비밀번호가 올바르지 않습니다',
      );
    }
    user.passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await this.usersRepository.save(user);
  }

  async withdraw(userId: number): Promise<void> {
    const user = await this.findByIdOrFail(userId);
    user.name = '탈퇴한 사용자';
    user.avatarUrl = null;
    user.email = `deleted_${crypto.randomUUID()}@withdrawn`;
    user.passwordHash = null;
    await this.usersRepository.save(user);
  }
}

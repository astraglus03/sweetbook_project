import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../../config/redis.provider';
import { EmailService } from '../../common/email/email.service';
import {
  NotFoundException,
  UnauthorizedException,
} from '../../common/exceptions';
import { User } from '../users/entities/user.entity';
import { OAuthProfileInput, UsersService } from '../users/users.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { JwtPayload, TokenService } from './token.service';

const BCRYPT_ROUNDS = 10;
const RESET_PREFIX = 'pw-reset:';
const RESET_TTL = 30 * 60; // 30 minutes

export interface AuthResult {
  user: User;
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly tokenService: TokenService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async signup(dto: SignupDto): Promise<AuthResult> {
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const user = await this.usersService.createLocal({
      email: dto.email,
      passwordHash,
      name: dto.name,
    });
    const tokens = await this.tokenService.issueTokens(this.toPayload(user));
    return { user, ...tokens };
  }

  async login(dto: LoginDto): Promise<AuthResult> {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException(
        'AUTH_INVALID_CREDENTIALS',
        '이메일 또는 비밀번호가 올바르지 않습니다',
      );
    }
    if (!user.passwordHash) {
      // 소셜 전용 계정 — 비밀번호 로그인 불가
      const providerName =
        user.provider === 'google' ? 'Google' :
        user.provider === 'kakao' ? '카카오' : user.provider;
      throw new UnauthorizedException(
        'AUTH_SOCIAL_ONLY',
        `이 계정은 ${providerName} 소셜 로그인으로 가입되었습니다. ${providerName}로 로그인해주세요.`,
      );
    }
    const matches = await bcrypt.compare(dto.password, user.passwordHash);
    if (!matches) {
      throw new UnauthorizedException(
        'AUTH_INVALID_CREDENTIALS',
        '이메일 또는 비밀번호가 올바르지 않습니다',
      );
    }
    const tokens = await this.tokenService.issueTokens(this.toPayload(user));
    return { user, ...tokens };
  }

  async loginWithOAuth(profile: OAuthProfileInput): Promise<AuthResult> {
    const user = await this.usersService.upsertOAuthUser(profile);
    const tokens = await this.tokenService.issueTokens(this.toPayload(user));
    return { user, ...tokens };
  }

  async refresh(refreshToken: string): Promise<AuthResult> {
    const payload = await this.tokenService.verifyRefreshToken(refreshToken);
    const user = await this.usersService.findByIdOrFail(payload.sub);
    const tokens = await this.tokenService.issueTokens(this.toPayload(user));
    return { user, ...tokens };
  }

  async logout(userId: number): Promise<void> {
    await this.tokenService.revokeRefreshToken(userId);
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      // 보안: 사용자 존재 여부 노출 방지, 조용히 리턴
      return;
    }
    if (!user.passwordHash) {
      // 소셜 전용 계정 — 비밀번호 자체가 없으므로 발송 불필요
      this.logger.log(
        `Skipping password reset for social-only user (email=${email}, provider=${user.provider})`,
      );
      return;
    }
    const token = crypto.randomBytes(32).toString('hex');
    await this.redis.set(`${RESET_PREFIX}${token}`, String(user.id), 'EX', RESET_TTL);
    const feUrl = this.configService.get<string>(
      'CORS_ORIGIN',
      'http://localhost:5173',
    );
    const resetLink = `${feUrl}/reset-password/${token}`;
    this.logger.log(`Password reset link: ${resetLink} (user=${user.id})`);
    // EmailService 연동 후 실제 발송
    await this.sendResetEmail(user.email, user.name, resetLink);
  }

  private async sendResetEmail(
    email: string,
    name: string,
    link: string,
  ): Promise<void> {
    await this.emailService.sendPasswordReset(email, name, link);
  }

  async validateResetToken(token: string): Promise<boolean> {
    const userId = await this.redis.get(`${RESET_PREFIX}${token}`);
    return !!userId;
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const userId = await this.redis.get(`${RESET_PREFIX}${token}`);
    if (!userId) {
      throw new NotFoundException(
        'AUTH_RESET_TOKEN_INVALID',
        '재설정 링크가 만료되었거나 유효하지 않습니다',
      );
    }
    const user = await this.usersService.findByIdOrFail(Number(userId));
    user.passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await this.usersService.save(user);
    await this.redis.del(`${RESET_PREFIX}${token}`);
  }

  private toPayload(user: User): JwtPayload {
    return { sub: user.id, email: user.email };
  }
}

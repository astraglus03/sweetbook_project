import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../../config/redis.provider';
import { UnauthorizedException } from '../../common/exceptions';

export interface JwtPayload {
  sub: number;
  email: string;
}

const REFRESH_KEY_PREFIX = 'refresh:';

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async issueTokens(payload: JwtPayload): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    const accessToken = await this.jwtService.signAsync(payload, {
      expiresIn: this.configService.get<string>(
        'JWT_ACCESS_EXPIRES',
        '15m',
      ) as `${number}${'s' | 'm' | 'h' | 'd'}`,
    });
    const refreshToken = await this.jwtService.signAsync(payload, {
      expiresIn: this.configService.get<string>(
        'JWT_REFRESH_EXPIRES',
        '7d',
      ) as `${number}${'s' | 'm' | 'h' | 'd'}`,
    });

    await this.storeRefreshToken(payload.sub, refreshToken);
    return { accessToken, refreshToken };
  }

  async verifyRefreshToken(token: string): Promise<JwtPayload> {
    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token);
      const stored = await this.redis.get(this.refreshKey(payload.sub));
      if (stored !== token) {
        throw new UnauthorizedException(
          'AUTH_REFRESH_TOKEN_INVALID',
          '리프레시 토큰이 유효하지 않습니다',
        );
      }
      return payload;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException(
        'AUTH_REFRESH_TOKEN_INVALID',
        '리프레시 토큰이 유효하지 않습니다',
      );
    }
  }

  async revokeRefreshToken(userId: number): Promise<void> {
    await this.redis.del(this.refreshKey(userId));
  }

  getRefreshTtlSeconds(): number {
    const raw = this.configService.get<string>('JWT_REFRESH_EXPIRES', '7d');
    return this.parseDurationToSeconds(raw);
  }

  getAccessTtlSeconds(): number {
    const raw = this.configService.get<string>('JWT_ACCESS_EXPIRES', '15m');
    return this.parseDurationToSeconds(raw);
  }

  private async storeRefreshToken(
    userId: number,
    token: string,
  ): Promise<void> {
    const ttl = this.getRefreshTtlSeconds();
    await this.redis.set(this.refreshKey(userId), token, 'EX', ttl);
  }

  private refreshKey(userId: number): string {
    return `${REFRESH_KEY_PREFIX}${userId}`;
  }

  private parseDurationToSeconds(duration: string): number {
    const match = /^(\d+)([smhd])$/.exec(duration);
    if (!match) {
      return 60 * 15;
    }
    const value = Number(match[1]);
    const unit = match[2];
    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 60 * 60;
      case 'd':
        return value * 60 * 60 * 24;
      default:
        return value;
    }
  }
}

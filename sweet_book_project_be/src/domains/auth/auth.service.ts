import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UnauthorizedException } from '../../common/exceptions';
import { User } from '../users/entities/user.entity';
import { OAuthProfileInput, UsersService } from '../users/users.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { JwtPayload, TokenService } from './token.service';

const BCRYPT_ROUNDS = 10;

export interface AuthResult {
  user: User;
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly tokenService: TokenService,
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
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException(
        'AUTH_INVALID_CREDENTIALS',
        '이메일 또는 비밀번호가 올바르지 않습니다',
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

  private toPayload(user: User): JwtPayload {
    return { sub: user.id, email: user.email };
  }
}

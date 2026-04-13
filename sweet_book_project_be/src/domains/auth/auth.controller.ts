import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { CookieOptions, Request, Response } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UnauthorizedException } from '../../common/exceptions';
import { User } from '../users/entities/user.entity';
import { OAuthProfileInput } from '../users/users.service';
import { AuthResult, AuthService } from './auth.service';
import { AuthUserDto } from './dto/auth-user.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { SignupDto } from './dto/signup.dto';
import { TokenService } from './token.service';

const ACCESS_COOKIE = 'accessToken';
const REFRESH_COOKIE = 'refreshToken';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly tokenService: TokenService,
    private readonly configService: ConfigService,
  ) {}

  @Public()
  @Post('signup')
  @ApiOperation({ summary: '이메일/비밀번호 회원가입' })
  @ApiOkResponse({ type: AuthUserDto })
  async signup(
    @Body() dto: SignupDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthUserDto> {
    const result = await this.authService.signup(dto);
    this.setAuthCookies(res, result);
    return AuthUserDto.from(result.user);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('login')
  @ApiOperation({ summary: '이메일/비밀번호 로그인' })
  @ApiOkResponse({ type: AuthUserDto })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthUserDto> {
    const result = await this.authService.login(dto);
    this.setAuthCookies(res, result);
    return AuthUserDto.from(result.user);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  @ApiOperation({ summary: 'Refresh token으로 Access token 재발급' })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthUserDto> {
    const token = (req.cookies as Record<string, string> | undefined)?.[
      REFRESH_COOKIE
    ];
    if (!token) {
      throw new UnauthorizedException(
        'AUTH_REFRESH_TOKEN_MISSING',
        '리프레시 토큰이 없습니다',
      );
    }
    const result = await this.authService.refresh(token);
    this.setAuthCookies(res, result);
    return AuthUserDto.from(result.user);
  }

  @HttpCode(HttpStatus.OK)
  @Post('logout')
  @ApiBearerAuth()
  @ApiOperation({ summary: '로그아웃 (쿠키 clear + Redis refresh 삭제)' })
  async logout(
    @CurrentUser() user: User,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ success: true }> {
    await this.authService.logout(user.id);
    this.clearAuthCookies(res);
    return { success: true };
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: '현재 로그인 유저 조회' })
  @ApiOkResponse({ type: AuthUserDto })
  me(@CurrentUser() user: User): AuthUserDto {
    return AuthUserDto.from(user);
  }

  // ---- Password Reset ----
  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('forgot-password')
  @ApiOperation({ summary: '비밀번호 재설정 요청 (이메일로 링크 전송)' })
  async forgotPassword(
    @Body() dto: ForgotPasswordDto,
  ): Promise<{ sent: true }> {
    await this.authService.forgotPassword(dto.email);
    return { sent: true };
  }

  @Public()
  @Get('reset-password/:token')
  @ApiOperation({ summary: '재설정 토큰 유효성 검증' })
  async validateResetToken(
    @Param('token') token: string,
  ): Promise<{ valid: boolean }> {
    const valid = await this.authService.validateResetToken(token);
    return { valid };
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('reset-password')
  @ApiOperation({ summary: '비밀번호 재설정 (토큰 + 새 비밀번호)' })
  async resetPassword(@Body() dto: ResetPasswordDto): Promise<{ reset: true }> {
    await this.authService.resetPassword(dto.token, dto.password);
    return { reset: true };
  }

  // ---- OAuth: Google ----
  @Public()
  @Get('oauth/google')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Google OAuth 로그인 진입' })
  googleAuth(): void {
    // passport-google-oauth20 redirects automatically
  }

  @Public()
  @Get('oauth/google/callback')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Google OAuth 콜백' })
  async googleCallback(
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    await this.handleOAuthCallback(req, res);
  }

  // ---- OAuth: Kakao ----
  @Public()
  @Get('oauth/kakao')
  @UseGuards(AuthGuard('kakao'))
  @ApiOperation({ summary: 'Kakao OAuth 로그인 진입' })
  kakaoAuth(): void {
    // passport-kakao redirects automatically
  }

  @Public()
  @Get('oauth/kakao/callback')
  @UseGuards(AuthGuard('kakao'))
  @ApiOperation({ summary: 'Kakao OAuth 콜백' })
  async kakaoCallback(
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    await this.handleOAuthCallback(req, res);
  }

  // ----
  private async handleOAuthCallback(
    req: Request,
    res: Response,
  ): Promise<void> {
    const profile = req.user as OAuthProfileInput | undefined;
    const failureRedirect = this.configService.getOrThrow<string>(
      'OAUTH_FAILURE_REDIRECT',
    );
    if (!profile) {
      res.redirect(failureRedirect);
      return;
    }
    try {
      const result = await this.authService.loginWithOAuth(profile);
      this.setAuthCookies(res, result);
      const successRedirect = this.configService.getOrThrow<string>(
        'OAUTH_SUCCESS_REDIRECT',
      );
      res.redirect(successRedirect);
    } catch {
      res.redirect(failureRedirect);
    }
  }

  private setAuthCookies(res: Response, result: AuthResult): void {
    const accessOptions = this.baseCookieOptions(
      this.tokenService.getAccessTtlSeconds(),
    );
    const refreshOptions = this.baseCookieOptions(
      this.tokenService.getRefreshTtlSeconds(),
    );
    res.cookie(ACCESS_COOKIE, result.accessToken, accessOptions);
    res.cookie(REFRESH_COOKIE, result.refreshToken, refreshOptions);
  }

  private clearAuthCookies(res: Response): void {
    const options = this.baseCookieOptions(0);
    res.clearCookie(ACCESS_COOKIE, options);
    res.clearCookie(REFRESH_COOKIE, options);
  }

  private baseCookieOptions(ttlSeconds: number): CookieOptions {
    const isProd = this.configService.get<string>('NODE_ENV') === 'production';
    return {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
      maxAge: ttlSeconds * 1000,
    };
  }
}

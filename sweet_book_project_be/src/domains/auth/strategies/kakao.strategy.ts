import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-kakao';
import { OAuthProfileInput } from '../../users/users.service';

interface KakaoProfile {
  id: string | number;
  username?: string;
  displayName?: string;
  _json?: {
    kakao_account?: {
      email?: string;
      profile?: { nickname?: string; profile_image_url?: string };
    };
  };
}

type DoneCallback = (error: Error | null, user?: OAuthProfileInput) => void;

@Injectable()
export class KakaoStrategy extends PassportStrategy(Strategy, 'kakao') {
  constructor(configService: ConfigService) {
    super({
      clientID: configService.getOrThrow<string>('KAKAO_CLIENT_ID'),
      clientSecret: configService.getOrThrow<string>('KAKAO_CLIENT_SECRET'),
      callbackURL: configService.getOrThrow<string>('KAKAO_CALLBACK_URL'),
    });
  }

  validate(
    _accessToken: string,
    _refreshToken: string,
    profile: KakaoProfile,
    done: DoneCallback,
  ): void {
    const kakaoAccount = profile._json?.kakao_account;
    const email = kakaoAccount?.email;
    if (!email) {
      done(new Error('KAKAO_EMAIL_MISSING'));
      return;
    }
    const name =
      kakaoAccount.profile?.nickname ||
      profile.displayName ||
      profile.username ||
      email.split('@')[0];

    const oauthProfile: OAuthProfileInput = {
      provider: 'kakao',
      providerUserId: String(profile.id),
      email,
      name,
      avatarUrl: kakaoAccount.profile?.profile_image_url ?? null,
    };
    done(null, oauthProfile);
  }
}

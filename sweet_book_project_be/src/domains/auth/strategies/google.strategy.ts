import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy, VerifyCallback } from 'passport-google-oauth20';
import { OAuthProfileInput } from '../../users/users.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(configService: ConfigService) {
    super({
      clientID: configService.get<string>('GOOGLE_CLIENT_ID', ''),
      clientSecret: configService.get<string>('GOOGLE_CLIENT_SECRET', ''),
      callbackURL: configService.get<string>(
        'GOOGLE_CALLBACK_URL',
        'http://localhost:3000/auth/oauth/google/callback',
      ),
      scope: ['email', 'profile'],
    });
  }

  validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): void {
    const email = profile.emails?.[0]?.value;
    if (!email) {
      done(new Error('GOOGLE_EMAIL_MISSING'), undefined);
      return;
    }
    const oauthProfile: OAuthProfileInput = {
      provider: 'google',
      providerUserId: profile.id,
      email,
      name: profile.displayName || email.split('@')[0],
      avatarUrl: profile.photos?.[0]?.value ?? null,
    };
    done(null, oauthProfile);
  }
}

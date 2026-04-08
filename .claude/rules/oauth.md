# 소셜 로그인 (OAuth) 규칙

## 지원 프로바이더
- **Google**: OAuth 2.0 (Authorization Code + PKCE)
- **Kakao**: OAuth 2.0 (Authorization Code)
- **Email**: 기본 이메일/비밀번호 인증

## 인증 플로우

### 소셜 로그인 시퀀스
```
1. FE → 소셜 로그인 버튼 클릭
2. FE → BE: GET /auth/oauth/:provider (google | kakao)
3. BE → 302 redirect to provider authorization URL
4. User → 소셜 계정 인증/동의
5. Provider → BE: GET /auth/oauth/:provider/callback?code=xxx
6. BE → Provider: code로 access_token 교환
7. BE → Provider: access_token으로 사용자 정보 조회
8. BE → DB: 사용자 조회/생성 (upsert by provider + providerUserId)
9. BE → FE: JWT Access Token (httpOnly Cookie) + Refresh Token (Redis + Cookie)
10. FE → redirect to /groups (대시보드)
```

### 계정 연동 전략
- 동일 이메일로 이미 가입된 경우: 자동 연동 (provider 필드 업데이트)
- 하나의 이메일에 여러 provider 연동 가능
- 소셜 로그인 사용자도 비밀번호 설정 가능 (선택)

## User 엔티티 변경사항
```typescript
@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  password: string; // 소셜 로그인 사용자는 null

  @Column()
  name: string;

  @Column({ nullable: true })
  profileImage: string;

  @Column({ type: 'enum', enum: AuthProvider, default: AuthProvider.EMAIL })
  provider: AuthProvider; // 'EMAIL' | 'GOOGLE' | 'KAKAO'

  @Column({ nullable: true })
  providerUserId: string; // 소셜 프로바이더의 고유 ID

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

## 환경변수 (.env)
```
# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/oauth/google/callback

# Kakao OAuth
KAKAO_CLIENT_ID=
KAKAO_CLIENT_SECRET=
KAKAO_CALLBACK_URL=http://localhost:3000/auth/oauth/kakao/callback

# OAuth 공통
OAUTH_SUCCESS_REDIRECT=http://localhost:5173/groups
OAUTH_FAILURE_REDIRECT=http://localhost:5173/login?error=oauth_failed
```

## API 엔드포인트
```
GET  /auth/oauth/:provider           → 소셜 인증 페이지 리다이렉트
GET  /auth/oauth/:provider/callback  → 콜백 처리 + JWT 발급
POST /auth/oauth/unlink              → 소셜 계정 연동 해제
```

## 보안 규칙
- `state` 파라미터 필수: CSRF 방지 (Redis에 저장, 5분 만료)
- Google: PKCE (code_verifier + code_challenge) 사용
- Kakao: client_secret은 BE 서버에서만 관리
- 콜백 URL 화이트리스트: 환경변수로 관리, 하드코딩 금지
- Provider에서 받은 access_token은 DB에 저장하지 않음 (사용자 정보 조회 후 폐기)
- 소셜 계정 연동 해제 시 비밀번호 설정 여부 확인 필수 (로그인 수단 0개 방지)

## NestJS 구현 패턴
```typescript
// Passport 전략 사용
@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private readonly configService: ConfigService) {
    super({
      clientID: configService.get('GOOGLE_CLIENT_ID'),
      clientSecret: configService.get('GOOGLE_CLIENT_SECRET'),
      callbackURL: configService.get('GOOGLE_CALLBACK_URL'),
      scope: ['email', 'profile'],
    });
  }
}

// Guard 사용
@Get('oauth/google')
@UseGuards(AuthGuard('google'))
googleAuth() {} // Passport가 리다이렉트 처리

@Get('oauth/google/callback')
@UseGuards(AuthGuard('google'))
googleAuthCallback(@Req() req) {
  return this.authService.socialLogin(req.user);
}
```

## 프론트엔드 규칙
- 소셜 로그인 버튼은 `window.location.href`로 BE의 OAuth URL로 이동 (SPA 라우팅 X)
- 콜백 후 리다이렉트: BE에서 쿠키 설정 후 FE로 302 리다이렉트
- 에러 처리: 쿼리 파라미터로 에러 코드 전달 (`?error=oauth_failed`)
- 로딩 상태: 소셜 인증 창 열린 동안 "인증 중..." 표시

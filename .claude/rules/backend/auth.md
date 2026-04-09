# BE 인증 규칙

## JWT + Redis + httpOnly Cookie
```
[로그인 성공]
BE → Access Token  → httpOnly Cookie (15분 만료)
BE → Refresh Token → httpOnly Cookie (7일 만료) + Redis 저장
                     key: refresh:{userId} / value: token

[API 요청]
FE → 쿠키 자동 전송 (credentials: 'include')
BE → Access Token 검증 (JwtAuthGuard)

[Access Token 만료]
FE → /auth/refresh 자동 호출
BE → Redis RT 검증 → 새 AT 발급 → 쿠키 갱신

[로그아웃]
BE → Redis RT 삭제 + 쿠키 clear
```

## 비로그인 접근
- 초대 링크 `/join/:code` → Public Guard로 열어둠
- 공유 뷰어 `/shared/:shareCode` → Public Guard
- read-only 조회만 허용, 업로드/주문은 로그인 후 redirect

## OAuth 소셜 로그인 (Google / Kakao)
```
FE → BE: GET /auth/oauth/:provider
BE → 302 redirect to provider authorization URL
Provider → BE: GET /auth/oauth/:provider/callback?code=xxx
BE → Provider: code로 access_token 교환 → 사용자 정보 조회
BE → DB: upsert (provider + providerUserId)
BE → FE: JWT 쿠키 설정 + 302 redirect to /groups
```

### 계정 연동
- 동일 이메일 기존 가입자 → 자동 연동 (provider 필드 업데이트)
- 소셜 연동 해제 시 비밀번호 설정 여부 확인 필수

### NestJS 패턴
```typescript
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
```

### 보안
- `state` 파라미터 필수 (CSRF 방지, Redis 5분 만료)
- Provider access_token은 DB 저장하지 않음 (조회 후 폐기)
- 콜백 URL 화이트리스트: 환경변수 관리

### OAuth 환경변수
```
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/oauth/google/callback
KAKAO_CLIENT_ID=
KAKAO_CLIENT_SECRET=
KAKAO_CALLBACK_URL=http://localhost:3000/auth/oauth/kakao/callback
OAUTH_SUCCESS_REDIRECT=http://localhost:5173/groups
OAUTH_FAILURE_REDIRECT=http://localhost:5173/login?error=oauth_failed
```

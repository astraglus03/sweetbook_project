# 보안 규칙

## SQL 인젝션 방지
- TypeORM 파라미터 바인딩 필수 사용
- Raw Query에서 문자열 결합 절대 금지 → `$1`, `$2` 플레이스홀더 사용
- QueryBuilder `where()`에 항상 파라미터 바인딩

## XSS 방지
- 사용자 입력값 이스케이프
- React는 기본 이스케이프하지만 `dangerouslySetInnerHTML` 사용 금지

## CORS
- 허용 도메인 명시적 설정 (와일드카드 `*` 금지)
- `credentials: true` 사용 시 origin 명시 필수
```typescript
// BE: main.ts
app.enableCors({
  origin: configService.get('CORS_ORIGIN'), // 'http://localhost:5173'
  credentials: true,
});
```

## Rate Limiting
- 인증 관련 API에 적용: `/auth/login`, `/auth/register`, `/auth/oauth/*`
- 기준: IP당 분당 10회
- 파일 업로드: IP당 분당 30회

## 파일 업로드
- 확장자 + MIME 타입 + 파일 크기 검증 필수
- 매직 바이트로 실제 파일 타입 확인
- 업로드 경로 traversal 방지 (`../` 거부)
- EXIF GPS 정보 제거 (개인정보 보호)

## 인증 토큰
- JWT secret은 환경변수로 관리, 최소 32자 이상
- Access Token: httpOnly Cookie, 15분 만료
- Refresh Token: httpOnly Cookie + Redis, 7일 만료
- Provider access_token은 DB에 저장하지 않음 (조회 후 폐기)

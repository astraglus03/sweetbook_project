# BE API 설계 규칙

## 공통 응답 형식 (ResponseInterceptor 자동 래핑)
```typescript
// 성공
{ "success": true, "data": { ... }, "message": "요청이 성공했습니다" }

// 실패
{ "success": false, "error": { "code": "GROUP_NOT_FOUND", "message": "모임을 찾을 수 없습니다" } }

// 페이지네이션
{ "success": true, "data": [...], "meta": { "page": 1, "limit": 20, "total": 150, "totalPages": 8 } }
```

## 에러 처리
- GlobalExceptionFilter에서 모든 에러 중앙 처리
- 커스텀 Exception 계층:
  - `AppException` (base, HTTP 500)
  - `NotFoundException` (404)
  - `UnauthorizedException` (401)
  - `ForbiddenException` (403)
  - `ValidationException` (400)
  - `ConflictException` (409)
  - `ExternalApiException` (502, Sweetbook/OpenAI API 실패)
- 에러 코드 네이밍: `{DOMAIN}_{ACTION}_{REASON}` (예: `GROUP_NOT_FOUND`, `ORDER_ALREADY_COMPLETED`)
- 에러 메시지는 한국어 (사용자 노출용)

## REST 설계
- URL은 복수형 명사: `/groups`, `/photos`, `/orders`
- 행위는 HTTP 메서드로: GET(조회), POST(생성), PATCH(수정), DELETE(삭제)
- 중첩 리소스: `/groups/:groupId/photos`
- 필터/정렬은 쿼리 파라미터: `?page=1&limit=20&sort=createdAt:desc`
- 상태 변경 액션: `POST /orders/:id/cancel` (동사 허용)

## Swagger 문서
- 모든 Controller에 `@ApiTags()` 데코레이터
- 모든 엔드포인트에 `@ApiOperation()`, `@ApiResponse()`
- DTO 필드에 `@ApiProperty()`
- 인증 필요 엔드포인트: `@ApiBearerAuth()`

# API 설계 규칙

## 공통 응답 형식
모든 API는 아래 형식을 따른다. ResponseInterceptor에서 자동 래핑.

```typescript
// 성공 응답
{
  "success": true,
  "data": { ... },        // 단건: 객체, 목록: 배열
  "message": "요청이 성공했습니다"
}

// 실패 응답
{
  "success": false,
  "error": {
    "code": "GROUP_NOT_FOUND",      // 대문자 스네이크케이스
    "message": "모임을 찾을 수 없습니다"
  }
}

// 페이지네이션 응답
{
  "success": true,
  "data": [...],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

## 에러 처리
- GlobalExceptionFilter에서 모든 에러 중앙 처리
- 커스텀 Exception 계층:
  - `AppException` (base, HTTP 500)
  - `NotFoundException` (HTTP 404)
  - `UnauthorizedException` (HTTP 401)
  - `ForbiddenException` (HTTP 403)
  - `ValidationException` (HTTP 400)
  - `ConflictException` (HTTP 409)
  - `ExternalApiException` (HTTP 502, Sweetbook API 실패)
- 에러 코드 네이밍: `{DOMAIN}_{ACTION}_{REASON}`
  - 예: `GROUP_NOT_FOUND`, `BOOK_CREATION_FAILED`, `ORDER_ALREADY_COMPLETED`
- 에러 메시지는 사용자에게 보여줄 수 있는 한국어로 작성

## REST API 설계
- URL은 복수형 명사: `/groups`, `/photos`, `/orders`
- 행위는 HTTP 메서드로: GET(조회), POST(생성), PATCH(수정), DELETE(삭제)
- 중첩 리소스: `/groups/:groupId/photos`
- 필터/정렬은 쿼리 파라미터: `?page=1&limit=20&sort=createdAt:desc`
- 상태 변경 액션: `POST /orders/:id/cancel` (동사 허용)

## Swagger 문서
- 모든 Controller에 `@ApiTags()` 데코레이터
- 모든 엔드포인트에 `@ApiOperation()`, `@ApiResponse()` 데코레이터
- DTO 필드에 `@ApiProperty()` 데코레이터
- 인증 필요 엔드포인트: `@ApiBearerAuth()` 표시

## Validation 규칙
- 모든 요청 DTO에 `class-validator` 데코레이터 필수
- optional 필드: `@IsOptional()` + 타입 데코레이터 세트로
- 쿼리스트링 숫자: `@Type(() => Number)` 반드시 추가
- 배열 검증: `@IsArray()` + `@ValidateNested({ each: true })`
- 문자열 길이 제한 항상 명시: `@Length(1, 100)`

## 트랜잭션 규칙
- DB write 2개 이상이면 무조건 QueryRunner 트랜잭션
- 외부 API 호출은 트랜잭션 밖에서 먼저 처리
- 트랜잭션 실패 시 롤백 + 에러 throw
- 트랜잭션 내부에서 try/catch/finally 패턴 사용

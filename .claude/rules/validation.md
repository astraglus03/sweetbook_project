# Validation 및 안전성 규칙

## DTO Validation
- 모든 요청 Body는 DTO 클래스로 정의
- `class-validator` 데코레이터 필수 적용
- optional 필드에 `@IsNumber()` 단독 사용 금지 → `@IsOptional() @IsNumber()` 세트
- 쿼리스트링 숫자 변환: `@Type(() => Number)` 반드시 추가
- DTO 명세에서 임의로 optional 처리 금지 → 명세 그대로 따를 것
- enum 타입은 `@IsEnum()` 사용
- 중첩 객체는 `@ValidateNested()` + `@Type()` 필수

## 트랜잭션
- DB write 2개 이상 → 무조건 QueryRunner 트랜잭션
- 패턴:
```typescript
const queryRunner = this.dataSource.createQueryRunner();
await queryRunner.connect();
await queryRunner.startTransaction();
try {
  // DB 작업들
  await queryRunner.commitTransaction();
} catch (error) {
  await queryRunner.rollbackTransaction();
  throw error;
} finally {
  await queryRunner.release();
}
```
- 외부 API 호출은 트랜잭션 시작 전에 먼저 처리
- 트랜잭션 안에서 외부 API 호출 금지 (롤백 불가능하므로)

## 외부 API 안전성
- Sweetbook API 응답은 반드시 타입 검증 후 사용
- API 실패를 raw throw하지 말고 `ExternalApiException`으로 래핑
- 외부 API 호출 시 timeout 설정 필수
- 재시도(retry) 로직은 멱등성 있는 GET 요청에만 적용

## 보안
- SQL 인젝션 방지: TypeORM 파라미터 바인딩 사용, raw query 최소화
- XSS 방지: 사용자 입력값 이스케이프
- CORS: 허용 도메인 명시적 설정 (와일드카드 금지)
- Rate Limiting: 인증 관련 API에 적용
- 파일 업로드: 확장자/MIME 타입/파일 크기 검증 필수
- JWT secret은 환경변수로 관리, 최소 32자 이상

## 타입 안전성
- `any` 타입 절대 금지
- `as` 타입 단언 최소화 → 타입 가드 함수 사용
- 외부 라이브러리 응답도 타입 정의 후 사용
- `null`과 `undefined` 명확히 구분

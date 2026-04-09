# BE 아키텍처 규칙

## SOLID 원칙
- **SRP**: 각 클래스는 단일 책임만 가진다
- **OCP**: 확장에는 열려있고 수정에는 닫혀있게 설계
- **DIP**: 구체 구현이 아닌 추상(인터페이스)에 의존

## 레이어 역할 분리

| 레이어 | 역할 | 금지 사항 |
|--------|------|----------|
| Controller | 요청 파싱 + 응답 변환 | 비즈니스 로직 금지 |
| Service | 비즈니스 로직 처리 | DB 쿼리 직접 작성 금지 |
| Repository | 쿼리 로직 분리 | 비즈니스 판단 금지 |
| Entity | 테이블 매핑만 | 비즈니스 로직 금지 (빈혈 모델) |

## 의존성 주입 (DI)
```typescript
// ❌ 직접 생성 금지
private repo = new BookRepository();

// ✅ 생성자 주입
constructor(
  @InjectRepository(Book)
  private readonly bookRepository: Repository<Book>,
  private readonly sweetbookApiService: SweetbookApiService,
) {}
```

## Repository 패턴
- TypeORM Repository를 Service에서 직접 사용하지 않음
- 커스텀 Repository 레이어를 추가하여 쿼리 로직 분리
- 복잡한 쿼리는 QueryBuilder로 Repository에서 처리

## DTO 규칙
- 요청/응답 DTO 각각 분리 (`CreateBookDto`, `BookResponseDto`)
- 모든 요청 Body는 DTO 클래스로 정의
- `class-validator` 데코레이터 필수 적용
- optional 필드: `@IsOptional()` + 타입 데코레이터 세트
- 쿼리스트링 숫자: `@Type(() => Number)` 반드시 추가
- DTO 명세에서 임의로 optional 처리 금지

## BE 코딩 규칙
- `any` 타입 사용 절대 금지 → `unknown` 사용 후 타입 가드
- `console.log` / `console.error` 금지 → NestJS `Logger` 사용
- `async/await` 사용, `.then()` 체인 금지
- 불필요한 `else` 금지 → early return 패턴
- 환경변수는 `ConfigService`로만 접근 (하드코딩 금지)
- TypeORM `synchronize: true` 프로덕션에서 절대 금지

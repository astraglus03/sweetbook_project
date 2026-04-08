# GroupBook — 모임 기록 포토북 서비스

## 서비스 개요

동창회/동호회/가족모임 등 그룹이 각자 찍은 사진을 한 곳에 모아, 클릭 몇 번으로 단체 포토북을 공동 제작/주문하는 협업 포토북 서비스.
스위트북(Sweetbook) Book Print API의 Books API + Orders API를 활용한다.

## 타겟 고객

- 1차: 동창회/동문회 (연 1회 모임, 기념품 수요)
- 2차: 등산/사진/독서 등 취미 동호회
- 3차: 가족 모임 (명절/여행/돌잔치)
- B2B 확장: 기업 워크샵, 유치원 졸업앨범

## 모노레포 구조

```
/sweet_book_project_be  → NestJS 백엔드 API 서버 (포트 3000)
/sweet_book_project_fe  → React + Vite 프론트엔드 (포트 5173)
/docs                   → ERD, API 명세, 도메인 문서
/docs/domains           → 도메인별 ERD 참조 문서
```

## 기술 스택

### Backend
- Runtime: Node.js 20+
- Framework: NestJS 11 + Express
- ORM: TypeORM (마이그레이션 파일 필수 생성)
- DB: PostgreSQL 15 (`sweetbook` / `sweetbook_user`)
- Cache/Token Store: Redis (refresh token, 세션 관리)
- 인증: JWT (Access Token + Refresh Token), httpOnly Cookie
- 유효성 검사: class-validator + class-transformer
- API 문서: Swagger (OpenAPI)
- 비동기 작업: Bull Queue (포토북 생성 비동기 처리)
- 파일 업로드: Multer + 로컬 스토리지
- 이미지 처리: Sharp (리사이징/최적화)
- 외부 API: Sweetbook Book Print API

### Frontend
- Framework: React 19 + Vite 8
- 언어: JSX (TypeScript 아님)
- 상태관리: Zustand
- 서버 상태: TanStack Query (React Query)
- 스타일: Tailwind CSS
- HTTP: Axios (credentials: 'include')
- 라우팅: React Router v6

### Infrastructure
- Docker Compose: PostgreSQL + Redis 로컬 환경 통일
- GitHub Actions CI: PR 시 자동 lint + test

## Common Commands

모든 명령은 해당 서브 프로젝트 디렉토리에서 실행.

### Backend (`sweet_book_project_be/`)
```bash
npm run start:dev      # Dev server with watch mode (port 3000)
npm run build          # Compile via nest build
npm run test           # Unit tests (Jest)
npm run test -- --testPathPattern=<pattern>  # 단일 테스트
npm run test:e2e       # E2E tests
npm run lint           # ESLint with auto-fix
npm run format         # Prettier formatting
```

### Frontend (`sweet_book_project_fe/`)
```bash
npm run dev            # Vite dev server with HMR
npm run build          # Production build
npm run lint           # ESLint
```

---

## 아키텍처 원칙 (반드시 준수)

### SOLID 원칙
- **SRP**: 각 클래스/컴포넌트는 단일 책임만 가진다
- **OCP**: 확장에는 열려있고 수정에는 닫혀있게 설계
- **LSP**: 인터페이스 구현체는 언제든 교체 가능하게
- **ISP**: 인터페이스는 최소화하여 불필요한 의존 금지
- **DIP**: 구체 구현이 아닌 추상(인터페이스)에 의존

### 의존성 주입 (DI/IoC) — 스프링 생성자 주입 방식
```typescript
// ❌ 잘못된 방식 — 직접 생성 금지
@Injectable()
export class BookService {
  private repo = new BookRepository();
}

// ✅ 올바른 방식 — 생성자 주입
@Injectable()
export class BookService {
  constructor(
    @InjectRepository(Book)
    private readonly bookRepository: Repository<Book>,
    private readonly sweetbookApiService: SweetbookApiService,
  ) {}
}
```

### 공통 API 응답 형식 (모든 API 동일)
```typescript
// 성공
{
  "success": true,
  "data": { ... },
  "message": "요청이 성공했습니다"
}

// 실패
{
  "success": false,
  "error": {
    "code": "GROUP_NOT_FOUND",
    "message": "모임을 찾을 수 없습니다"
  }
}
```

### 에러 처리 규칙
- GlobalExceptionFilter를 통해 모든 에러를 중앙 처리
- 커스텀 에러 클래스 계층 구조:
  - `AppException` (base)
    - `NotFoundException`
    - `UnauthorizedException`
    - `ForbiddenException`
    - `ValidationException`
    - `ExternalApiException` (Sweetbook API 실패)
- 에러 코드는 대문자 스네이크케이스: `GROUP_NOT_FOUND`, `BOOK_CREATION_FAILED`
- `console.error` 금지 → NestJS `Logger` 서비스 사용

### Repository 패턴
- TypeORM Repository를 직접 서비스에서 사용하지 않음
- 커스텀 Repository 레이어를 추가하여 쿼리 로직 분리

---

## 인증 전략 (Redis + httpOnly Cookie)

```
[로그인 성공]
BE → Access Token  → httpOnly Cookie (15분 만료)
BE → Refresh Token → httpOnly Cookie (7일 만료) + Redis 저장
                     key: refresh:{userId} / value: token

[API 요청]
FE → 쿠키 자동 전송 (credentials: 'include')
BE → Access Token 검증 (JwtAuthGuard)

[Access Token 만료]
FE → /auth/refresh 자동 호출 (쿠키에 RT 있음)
BE → Redis RT 검증 → 새 AT 발급 → 쿠키 갱신

[로그아웃]
BE → Redis RT 삭제 + 쿠키 clear
```

### 비로그인 접근
- 초대 링크 `/join/:code` → Public Guard로 열어둠
- 모임 기본 정보 + 사진 목록 read-only 조회만 허용
- 업로드/주문은 로그인 후 redirect

---

## BE 폴더구조 (도메인 기반)

```
sweet_book_project_be/src/
├── common/
│   ├── decorators/           # 커스텀 데코레이터
│   ├── filters/              # GlobalExceptionFilter
│   ├── interceptors/         # ResponseInterceptor (공통 응답)
│   ├── guards/               # JwtAuthGuard, PublicGuard
│   ├── dto/                  # 공통 ResponseDto
│   ├── exceptions/           # 커스텀 Exception 클래스들
│   └── pipes/                # 커스텀 Pipe
├── config/                   # ConfigModule, TypeORM, Redis 설정
├── domains/
│   ├── auth/                 # 인증 (JWT + Redis)
│   ├── users/                # 사용자
│   ├── groups/               # 모임
│   ├── photos/               # 사진 업로드/관리
│   ├── books/                # 포토북 (Sweetbook Books API)
│   └── orders/               # 주문 (Sweetbook Orders API)
├── external/
│   └── sweetbook/            # Sweetbook API 클라이언트
└── main.ts
```

## FE 폴더구조 (Feature 기반)

```
sweet_book_project_fe/src/
├── assets/                   # 이미지, 폰트
├── components/               # 공통 UI
│   ├── ui/                   # Button, Input, Modal 등
│   └── layout/               # Header, Footer, Sidebar
├── features/                 # 도메인별
│   ├── auth/
│   │   ├── components/
│   │   ├── hooks/            # useAuth (ViewModel 역할)
│   │   └── api/
│   ├── groups/
│   ├── photos/
│   ├── books/
│   └── orders/
├── stores/                   # Zustand stores
├── lib/                      # axios instance, utils
├── pages/                    # 라우트별 페이지
├── router/                   # React Router 설정
└── types/                    # 공통 타입 (JSDoc용)
```

---

## 코딩 컨벤션

### 공통
- 들여쓰기: 2 spaces
- 따옴표: single quote
- 세미콜론: 있음
- 파일명: kebab-case (`auth.service.ts`, `use-auth.js`)
- 클래스명: PascalCase
- 변수/함수명: camelCase
- 상수: UPPER_SNAKE_CASE
- BE에서 `any` 타입 사용 절대 금지

### BE 전용 규칙
- DTO는 요청/응답 각각 분리 (`CreateBookDto`, `BookResponseDto`)
- Entity에 비즈니스 로직 넣지 않음 (빈혈 도메인 모델)
- Service에서만 비즈니스 로직 처리
- Controller는 요청/응답 변환만 담당
- 환경변수는 `ConfigService`로만 접근 (하드코딩 금지)
- TypeORM `synchronize: true` 프로덕션에서 절대 금지

### FE 전용 규칙
- 함수형 컴포넌트만 사용
- 서버 상태는 React Query, 클라이언트 상태는 Zustand
- API 호출 함수는 `features/{domain}/api/`에 분리
- 커스텀 훅은 `use` 접두사 필수
- 페이지 컴포넌트는 `pages/`에만 배치

---

## AI 작업 시 필수 주의사항

### 트랜잭션
- DB write가 2개 이상이면 무조건 QueryRunner 트랜잭션으로 묶기
- 외부 API 호출은 트랜잭션 밖에서 먼저 처리 후, 결과를 트랜잭션 안에서 저장

### Validation
- `@IsNumber()`, `@IsString()` 등 validator는 빈값/undefined 케이스 반드시 검토
- optional 필드에 `@IsNumber()` 단독 사용 금지 → `@IsOptional() @IsNumber()` 세트로
- DTO 바디 양식에서 임의로 optional 처리 금지, 명세 그대로 따를 것
- `class-transformer`의 `@Type(() => Number)` 빠뜨리지 말 것 (쿼리스트링 숫자변환)

### 외부 API (Sweetbook)
- `SweetbookApiService`로 모든 외부 API 호출 캡슐화
- 외부 API 실패 시 `ExternalApiException`으로 래핑
- 외부 API 응답은 타입가드로 검증 후 사용
- 요청/응답 로깅 필수
- Sandbox 환경 사용 (실제 인쇄/배송 없음)

---

## Git 규칙
- 커밋 메시지: `feat/fix/chore/docs/refactor/test: 내용`
- 스코프 포함 시: `feat(auth): JWT refresh token 구현`
- main 브랜치 직접 커밋 금지
- API Key, 비밀번호 등 절대 커밋 금지
- `.env`는 `.gitignore`에 포함, `.env.example`은 커밋

## 환경변수 관리
- `sweet_book_project_be/.env`, `sweet_book_project_fe/.env` 분리
- `.env.example` 항상 최신화
- Sweetbook API Key는 BE 서버에서만 관리
- FE에서 API Key 직접 호출 절대 금지

## Sweetbook API 연동 규칙
- Books API, Orders API 필수 사용
- `SweetbookApiService`로 모든 외부 API 호출 캡슐화
- API 실패 시 `ExternalApiException` 발생
- Sandbox 환경 사용

## 도메인 ERD 참조
- 도메인별 ERD 문서는 `/docs/domains/` 디렉토리에 위치
- ERD 설계 시 해당 디렉토리의 문서를 반드시 참조할 것
- 새로운 도메인 추가 시 ERD 문서도 함께 생성

## README 요구사항 (마감 전 필수 작성)
- 서비스 소개 (한 문장 + 타겟 고객 + 주요 기능)
- 실행 방법 (복붙만으로 실행 가능하게)
- 사용한 API 목록 (표 형식)
- AI 도구 사용 내역
- 설계 의도
- 더미 데이터 포함 여부 명시

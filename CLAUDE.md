# GroupBook — 모임 기록 포토북 서비스

## 서비스 개요

동창회/동호회/가족모임 등 그룹이 각자 찍은 사진을 한 곳에 모아, 클릭 몇 번으로 단체 포토북을 공동 제작/주문하는 협업 포토북 서비스.
스위트북(Sweetbook) Book Print API의 Books API + Orders API를 활용한다.

## 🎯 플래그십 차별화 기능

1. **개인 포토북 자동 분배 (Personal Book)** — 얼굴 인식(face-api.js) 기반으로 **1개 모임 → 멤버 수만큼의 서로 다른 포토북** 자동 생성. 각자가 주인공인 포토북을 받는다. → 1모임 N권 매출.
2. **카카오톡 zip 일괄 업로드 (Kakao Import)** — Android 카톡 "대화 내보내기" zip을 드래그앤드롭 → 사진 전체 원본 화질로 일괄 업로드 + 업로더 자동 매칭. 진입 장벽 제로. (iOS는 내보내기 포맷 제약으로 차단 안내)

> 차별화 상세: [docs/domains/books/personal-book.md](./docs/domains/books/personal-book.md), [docs/domains/kakao_import.md](./docs/domains/kakao_import.md)

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
/docs/designs           → Pencil 스토리보드 (.pen 파일)
```

## 기술 스택

### Backend
- Runtime: Node.js 20+
- Framework: NestJS 11 + Express
- ORM: TypeORM (마이그레이션 파일 필수 생성)
- DB: PostgreSQL 15 (`sweetbook` / `sweetbook_user`)
- Cache/Token Store: Redis (refresh token, 세션 관리)
- 인증: JWT + OAuth (Google, Kakao), httpOnly Cookie
- 유효성 검사: class-validator + class-transformer
- API 문서: Swagger (OpenAPI)
- 비동기 작업: Bull Queue (포토북 생성, 얼굴 인식, 카톡 import 처리)
- 파일 업로드: Multer + Sharp (리사이징/최적화)
- 얼굴 인식: `@vladmandic/face-api` (face-api.js Node.js fork) + `@tensorflow/tfjs-node` + `canvas` — 128차원 embedding 로컬 추출, 비용 0원
- zip 파싱: `adm-zip` — 카카오톡 대화 내보내기 zip 파일 해제 (Android 전용)
- 외부 API: Sweetbook Book Print API, OpenAI GPT-4o-mini Vision

### Frontend
- Framework: React 19 + Vite 8
- 언어: JSX (TypeScript 아님)
- 상태관리: Zustand (클라이언트) + TanStack Query (서버)
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

## 폴더구조

### BE (도메인 기반)
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
│   ├── auth/                 # 인증 (JWT + OAuth + Redis)
│   ├── users/                # 사용자
│   ├── groups/               # 모임
│   ├── photos/               # 사진 업로드/관리
│   ├── books/                # 포토북 (Sweetbook Books API)
│   ├── orders/               # 주문 (Sweetbook Orders API)
│   └── notifications/        # 알림 (업로드 독려, 이벤트)
├── external/
│   ├── sweetbook/            # Sweetbook API 클라이언트
│   └── openai/               # OpenAI API 클라이언트
└── main.ts
```

### FE (Feature 기반)
```
sweet_book_project_fe/src/
├── assets/                   # 이미지, 폰트
├── components/
│   ├── ui/                   # Button, Input, Modal 등
│   └── layout/               # Header, Footer, BottomTab
├── features/
│   ├── auth/                 # components, hooks, api
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

## 개발 규칙 참조

세부 규칙은 `.claude/rules/` 하위 파일에 정의. 중복 작성하지 않음.

```
.claude/rules/
├── common/
│   ├── coding-style.md      # 포맷팅, 네이밍, 환경변수
│   ├── git.md               # 커밋 메시지, 브랜치 전략
│   └── security.md          # SQL 인젝션, XSS, CORS, Rate Limiting
├── backend/
│   ├── architecture.md      # SOLID, DI, 레이어 분리, DTO
│   ├── api-design.md        # 응답 형식, 에러 처리, REST, Swagger
│   ├── database.md          # 트랜잭션, N+1 방지, 인덱스, Redis 캐싱
│   ├── auth.md              # JWT + OAuth (Google/Kakao), Redis
│   ├── external-api.md      # Sweetbook/OpenAI 연동, Bull Queue
│   └── file-upload.md       # Multer, Sharp 파이프라인
└── frontend/
    ├── component.md         # 컴포넌트 구조, 네이밍, 에러 처리
    ├── state-management.md  # TanStack Query, Zustand, Axios
    └── responsive.md        # 브레이크포인트, 모바일 퍼스트, Tailwind
```

## 도메인 ERD 참조
- 도메인별 ERD 문서는 `/docs/domains/` 디렉토리에 위치
- ERD 설계 시 해당 디렉토리의 문서를 반드시 참조할 것
- 새로운 도메인 추가 시 ERD 문서도 함께 생성
- **도메인 개발 시 반드시 해당 ERD 문서를 먼저 읽고 엔티티/API 설계에 반영**

## UI 디자인 참조 (Pencil .pen 파일)
- 스토리보드: `docs/designs/roupbook-storyboard.pen`
- **.pen 파일은 반드시 Pencil MCP 도구(`batch_get`, `get_editor_state` 등)로 읽을 것** — `Read`/`Grep` 도구로 읽기 금지
- FE 페이지/컴포넌트 개발 시 pen 스토리보드의 해당 프레임을 먼저 확인하고 디자인을 맞출 것
- 디자인 시스템: brand `#D4916E`, warm-bg `#F8F5F0`, ink `#1A1A1A`, font-display `Playfair Display`, font-sans `Inter`
- 데스크톱 + 모바일 프레임이 각각 존재 — 반응형 구현 시 양쪽 모두 참조

## README 요구사항 (마감 전 필수 작성)
- 서비스 소개 (한 문장 + 타겟 고객 + 주요 기능)
- 실행 방법 (복붙만으로 실행 가능하게)
- 사용한 API 목록 (표 형식)
- AI 도구 사용 내역
- 설계 의도
- 더미 데이터 포함 여부 명시

# GroupBook — 모임 기록 포토북 서비스

동창회·동호회·가족 모임이 각자 찍은 사진을 한 곳에 모아, **클릭 몇 번으로 단체 포토북을 공동 제작/주문**하는 협업 포토북 서비스. 스위트북 Book Print API(Books + Orders)를 기반으로 **1 모임 → N권 자동 분배**와 **카톡 zip 일괄 업로드**로 진입 장벽을 낮춘다.

- **타겟 고객**: 동창회/동문회, 취미 동호회, 가족 모임, 기업 워크샵
- **주요 기능**: 모임 생성/초대 · 사진 공동 업로드 · 포토북 에디터 · 주문/배송 추적 · 개인 포토북 자동 분배(face-api.js) · 카카오톡 zip 일괄 업로드

## 플래그십 차별화

1. **개인 포토북 자동 분배 (Personal Book)** — 얼굴 인식으로 각 멤버가 주인공인 포토북을 자동 생성. 1 모임 → 멤버 수만큼의 서로 다른 포토북.
2. **카카오톡 zip 일괄 업로드 (Kakao Import)** — Android 카톡 "대화 내보내기" zip을 드래그앤드롭 → 원본 화질로 일괄 업로드 + 업로더 자동 매칭.

## 기술 스택

| 레이어 | 스택 |
|--------|------|
| Backend | Node.js 20, NestJS 11, TypeORM, PostgreSQL 15, Redis, Bull Queue, JWT + OAuth(Google/Kakao) |
| Frontend | React 19, Vite 8, Tailwind CSS, Zustand, TanStack Query, React Router v6 |
| 파일/이미지 | Multer, Sharp, face-api.js(@vladmandic/face-api) + @tensorflow/tfjs-node |
| 외부 API | Sweetbook Book Print API, OpenAI GPT-4o-mini Vision |
| Infra | Docker Compose (PostgreSQL + Redis), GitHub Actions CI |

## 실행 방법

### 1) 사전 준비

```bash
# 저장소 클론 후 루트에서
cp sweet_book_project_be/.env.example sweet_book_project_be/.env
cp sweet_book_project_fe/.env.example sweet_book_project_fe/.env
```

`.env` 필수 값:
- `JWT_SECRET` — 32자 이상 랜덤 문자열
- `SWEETBOOK_API_KEY` — `SB{prefix}.{secret}` 형식 (Sandbox 키)
- `GOOGLE_CLIENT_ID` / `KAKAO_CLIENT_ID` 등 OAuth 키 (소셜 로그인 테스트 시에만)

### 2) 인프라 기동

```bash
docker compose up -d   # PostgreSQL(5432) + Redis(6379)
```

### 3) Backend (포트 3000)

```bash
cd sweet_book_project_be
npm install
npm run migration:run
npm run start:dev
```

- Swagger: http://localhost:3000/api/docs

### 4) Frontend (포트 5173)

```bash
cd sweet_book_project_fe
npm install
npm run dev
```

- 접속: http://localhost:5173

## 사용한 API 목록

### Sweetbook Book Print API

| 엔드포인트 | 용도 |
|-----------|------|
| `GET /book-specs` | 판형(책 규격) 목록 조회 |
| `GET /templates?bookSpecUid=` | 템플릿 목록 조회 |
| `POST /books` | 포토북 생성 |
| `POST /books/{uid}/photos` | 사진 업로드 (50MB/장, 200장/책) |
| `POST /books/{uid}/cover` | 표지 추가 |
| `POST /books/{uid}/contents` | 내지 페이지 추가 |
| `POST /books/{uid}/finalization` | 최종화 |
| `GET /credits` · `GET /credits/transactions` | 충전금 조회/거래 내역 |
| `POST /credits/sandbox/charge` · `/deduct` | Sandbox 테스트 충전/차감 |
| `POST /orders/estimate` · `POST /orders` | 견적/주문 (Idempotency-Key 필수) |
| `GET /orders/{uid}` · `PATCH .../shipping` · `POST .../cancel` | 주문 조회/배송지 수정/취소 |
| `PUT/DELETE /webhooks/config` · `POST /webhooks/test` · `GET /webhooks/deliveries` | 웹훅 설정/테스트/이력 |
| Webhook 수신 8종 | `order.created/cancelled/restored`, `production.confirmed/started/completed`, `shipping.departed/delivered` |

### OpenAI API

| 모델 | 용도 |
|------|------|
| GPT-4o-mini Vision | 사진 품질 분석 (구도/조명/감정 점수) |
| GPT-4o-mini | 챕터 자동 네이밍 |

### 외부 OAuth

| Provider | 용도 |
|----------|------|
| Google OAuth | 소셜 로그인 |
| Kakao OAuth | 소셜 로그인 |

## AI 도구 사용 내역

- **Claude Code (Opus 4.6)** — 본 프로젝트 설계·구현 주요 도구. 스토리보드 해석(pencil MCP), 도메인 설계, 컨트롤러/서비스/엔티티 구현, FE 페이지 작성, 보안 감사(P0~P2) 반영.
- **oh-my-claudecode (OMC)** — 멀티 에이전트 오케스트레이션(executor / reviewer / verifier) 활용한 코드 리뷰·보안 감사 루프.
- **OpenAI GPT-4o-mini (서비스 내부)** — 사진 품질 분석 및 챕터 자동 네이밍에 런타임 사용.
- **face-api.js (로컬 추론)** — 개인 포토북 자동 분배용 얼굴 embedding 추출(외부 API 비용 0).

## 설계 의도

### 도메인 기반 모듈 분리 (BE)
`auth / users / groups / photos / books / orders / notifications / cover-voting / kakao-import / webhooks / activities` — NestJS 모듈 단위로 도메인 격리. 각 도메인은 Controller/Service/Repository/Entity 레이어를 명확히 분리해 SRP와 확장성을 확보.

### Feature 기반 구조 (FE)
`features/{domain}/{components,hooks,api}` — 페이지는 라우트에만, 재사용 컴포넌트는 도메인 feature 폴더로 격리. 공통 UI는 `components/ui`, 레이아웃은 `components/layout`.

### 상태 3분할
- **서버 상태 → TanStack Query** (캐시/무효화 중앙 집중)
- **UI 상태 → Zustand** (모달, 사이드바 등)
- **폼 상태 → 로컬 useState**

### 외부 API 안전성
- Sweetbook 돈/상태 변경 요청(`POST /books`, `POST /orders`, `/credits/sandbox/*`)은 **Idempotency-Key 필수** — 충전금 이중 차감 방지.
- API Key는 **BE 환경변수로만 관리**, FE 노출 금지. 로그는 `SB****.****` 마스킹.
- 웹훅 수신은 **HMAC-SHA256 서명 검증 + deliveryId 중복 체크(Redis 24h TTL)**. Sandbox `isTest`는 실사용자 알림 스킵.
- 외부 API 호출은 **트랜잭션 밖**에서 선처리 (롤백 불가능 이슈 회피).

### 비동기/성능
- 사진 업로드·리사이징(Sharp)·AI 분석·Sweetbook 업로드는 **Bull Queue 백그라운드 처리** → 사용자 응답은 즉시 반환.
- 목록 API는 **페이지네이션 강제**(default 20, max 100), 연관 로드는 `eager: true` 금지 + 명시적 `relations`/QueryBuilder로 N+1 방지.
- 자주 읽히는 데이터(`group:{id}:stats` 등)는 **Redis Cache-Aside**로 캐싱(1~10분 TTL).

### 인증/보안
- JWT **httpOnly Cookie + Redis refresh token store**로 XSS 내성 + 서버측 revoke 가능.
- OAuth는 `state` 파라미터(CSRF 방지, Redis 5분 TTL) + 콜백 URL 화이트리스트.
- 업로드 파일은 MIME + 확장자 + 크기 + 매직 바이트 4중 검증, EXIF GPS 제거.
- `synchronize: true` 금지 → 모든 스키마 변경은 마이그레이션 파일로.

## 더미 데이터 포함 여부

**미포함.** 현재 저장소에는 seed / fixture 데이터가 포함되어 있지 않으며, 마이그레이션 실행 후 빈 DB로 시작한다. 데모 시 회원가입 → 모임 생성 → 사진 업로드 플로우로 실제 데이터를 생성한다. (추후 제출 전 데모용 seed 스크립트 추가 예정.)

## 디렉토리 구조

```
/sweet_book_project_be    NestJS 백엔드 (포트 3000)
/sweet_book_project_fe    React + Vite 프론트엔드 (포트 5173)
/docs                     ERD, 도메인 문서, 진행 현황
/docs/designs             Pencil 스토리보드 (.pen)
/docker-compose.yml       PostgreSQL + Redis
```

## 상세 문서

- 구현 진행 현황: [docs/PROGRESS.md](./docs/PROGRESS.md)
- 도메인별 ERD: [docs/domains/](./docs/domains/)
- 개발 규칙: [.claude/rules/](./.claude/rules/)

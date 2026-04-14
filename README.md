# GroupBook

> **한 모임에서 각자 찍은 사진을 모아, 멤버 수만큼의 서로 다른 개인 포토북을 자동 제작·주문하는 협업 포토북 서비스.**
> 
- **배포 도메인**:https://sweetbook-project.vercel.app
- Swagger 문서: https://sweetbookproject-production.up.railway.app/api/docs

- **타겟 고객**: 동창회/동문회, 가족 모임, 취미 동호회(사진·등산·독서), 유치원·기업 워크샵
- **한 줄 차별화**: 1 모임 → N권 자동 분배 (얼굴 인식 기반) + 카카오톡 대화 zip 드래그앤드롭 일괄 업로드

## 주요 기능

| 분류 | 기능 |
|------|------|
| 모임 | 생성·초대 링크·QR, 멤버 관리(위임/강퇴), 커버 업로드, 활동 피드 |
| 사진 | 드래그앤드롭 업로드, 챕터 필터, 업로더 필터, 자동 리사이징 3단 |
| 포토북 | Sweetbook 템플릿 선택, WYSIWYG 에디터, 미리보기 모달, 표지 투표 |
| 개인 포토북 (플래그십) | face-api.js 얼굴 인식 → 멤버별 개인 포토북 자동 생성 (표지·내지 템플릿 자동 바인딩) + owner 개별 주문/삭제 |
| 카톡 import (플래그십) | Android 카톡 zip 드래그앤드롭 → 원본 화질 일괄 업로드 + 업로더 매칭 |
| 주문 | Sweetbook 견적·주문·배송 추적, 웹훅 8종 수신 알림 |
| 인증 | 이메일+비밀번호, Google/Kakao OAuth, 비밀번호 재설정 |

---

## 실행 방법

### 사전 요구

- Node.js 20+
- Docker (PostgreSQL + Redis 로컬 기동용)
- Sweetbook Sandbox API Key ([api.sweetbook.com](https://api.sweetbook.com) 가입 후 발급)

### 설치 & 실행 (복붙)

```bash
# 1) 저장소 루트에서 환경변수 파일 생성
cp sweet_book_project_be/.env.example sweet_book_project_be/.env
cp sweet_book_project_fe/.env.example sweet_book_project_fe/.env

# 2) sweet_book_project_be/.env 에서 필수 값 입력
#    - SWEETBOOK_API_KEY=SB{prefix}.{secret}   <- 본인 Sandbox Key
#    - SWEETBOOK_WEBHOOK_SECRET                <- PUT /webhooks/config 응답값
#    - JWT_SECRET=<32자 이상 랜덤 문자열>
#    - SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / SUPABASE_STORAGE_BUCKET
#      (사진·커버·아바타 저장소 — 무료 플랜으로 충분)
#    - GOOGLE_* / KAKAO_* OAuth 값 (소셜 로그인 쓸 경우만)

# 3) 인프라 기동 (PostgreSQL 5433 / Redis 6379)
docker compose up -d

# 4) Backend (포트 3000)
cd sweet_book_project_be
npm install
npm run migration:run
npm run start:dev

# 5) Frontend (포트 5173) — 새 터미널
cd sweet_book_project_fe
npm install
npm run dev
```

### 환경변수

API Key 등 민감값은 `.env.example` 템플릿만 커밋되며 실제 `.env`는 `.gitignore`로 제외. FE에는 API Key를 절대 노출하지 않고 BE에서만 관리.

---

## 배포 (Railway + Vercel)

### Backend — Railway
1. [railway.app](https://railway.app) → New Project → Deploy from GitHub → `sweet_book_project_be` 루트 지정
2. Plugin 추가: **PostgreSQL**, **Redis**
3. Variables: `sweet_book_project_be/.env.production.example` 참고하여 입력 (DB/Redis는 Railway 변수 참조 `${{Postgres.PGHOST}}` 등). 사진은 Supabase Storage로 외부화되므로 별도 Volume 마운트 불필요.
4. 도메인 발급: Settings > Networking > Generate Domain → `https://<your-be>.up.railway.app`
5. Dockerfile 기반 자동 빌드 → `migrationsRun: true`로 기동 시 자동 실행

### Frontend — Vercel
1. [vercel.com](https://vercel.com) → Import Git Repository → `sweet_book_project_fe` Root Directory 지정
2. Framework Preset: **Vite** (자동 감지)
3. Environment Variables: `VITE_API_URL=https://<your-be>.up.railway.app`
4. Deploy → `https://<your-fe>.vercel.app`

### 배포 후 설정
- **Google Cloud Console**: OAuth 2.0 클라이언트 > 승인된 리디렉션 URI에 `https://<your-be>.up.railway.app/auth/oauth/google/callback` 추가
- **Kakao Developers**: 내 애플리케이션 > 카카오 로그인 > Redirect URI에 `https://<your-be>.up.railway.app/auth/oauth/kakao/callback` 추가
- **Sweetbook Webhook**: `PUT /webhooks/config` 로 `https://<your-be>.up.railway.app/webhooks/sweetbook` 재등록 → 응답의 `secretKey`를 Railway `SWEETBOOK_WEBHOOK_SECRET`에 반영 (기존 ngrok secretKey는 폐기)
- **Railway CORS_ORIGIN**을 최종 Vercel URL로 업데이트

---

## 사용한 API 목록

### Sweetbook Book Print API (필수 사용 **Books + Orders** ✅)

| API | 용도 |
|-----|------|
| `GET /book-specs` | 판형(책 규격) 목록 조회 — 모임 생성 시 선택 |
| `GET /templates?bookSpecUid=` | 판형별 템플릿 목록 조회 |
| **`POST /books`** | **포토북 생성** (Idempotency-Key 필수) |
| `POST /books/{uid}/photos` | 사진 업로드 (50MB/장, 200장/책) |
| `POST /books/{uid}/cover` | 표지 페이지 추가 |
| `POST /books/{uid}/contents` | 내지 페이지 추가 |
| `POST /books/{uid}/finalization` | 페이지 규칙 검증 + 최종화 |
| `GET /credits` | 충전금 잔액 조회 (주문 전 402 방지) |
| `GET /credits/transactions` | 충전금 거래 내역 조회 |
| `POST /credits/sandbox/charge` | Sandbox 테스트 충전금 수동 충전 |
| `POST /orders/estimate` | 주문 가격 견적 |
| **`POST /orders`** | **주문 생성** (Idempotency-Key 필수, 충전금 차감) |
| `GET /orders/{orderUid}` | 주문 상태 조회 (상태 폴링 보정) |
| `PATCH /orders/{orderUid}/shipping` | 배송지 수정 (PAID~CONFIRMED 한정) |
| `POST /orders/{orderUid}/cancel` | 주문 취소 (PAID/PDF_READY 한정) |
| `PUT /webhooks/config` | 웹훅 수신 URL 등록 (secretKey 1회 수신) |
| `POST /webhooks/test` | 웹훅 테스트 이벤트 발송 |
| `GET /webhooks/deliveries` | 웹훅 전송 이력 조회 (실패 재처리) |

### Sweetbook 웹훅 수신 (서명 검증 구현)

| 이벤트 | 처리 |
|--------|------|
| `order.created` | 주문 확인 알림 |
| `order.cancelled` / `order.restored` | 환불/재차감 알림 + 상태 동기화 |
| `production.confirmed` / `started` / `completed` | 제작 단계 알림 |
| `shipping.departed` | 운송장 번호 알림 |
| `shipping.delivered` | 배송 완료 알림 |

### 외부 OAuth

| Provider | 용도 |
|----------|------|
| Google OAuth 2.0 | 소셜 로그인 |
| Kakao OAuth 2.0 | 소셜 로그인 |

### 서비스 내부 AI 추론 (로컬, 외부 API 비용 0)

| 모델 / 라이브러리 | 용도 |
|----------------|------|
| @vladmandic/face-api + @tensorflow/tfjs-node | 128차원 얼굴 embedding 로컬 추출 → 개인 포토북 자동 분배 |

> 초기 설계에는 OpenAI GPT-4o-mini 기반 사진 품질 분석/챕터 자동 네이밍이 포함돼 있었으나, 마감 일정상 **본 제출에서는 빠졌습니다** (서비스 클래스만 자리잡힌 상태). 핵심 기능에는 영향 없음 — graceful degradation 설계대로 빠지더라도 업로드/포토북/주문은 정상 동작.

---

## AI 도구 사용 내역

| AI 도구 | 활용 내용 |
|---------|----------|
| **Claude Code (Opus 4.6)** | 도메인 모델링(ERD), NestJS 모듈·서비스·컨트롤러 구현, React 페이지 작성, Sweetbook API 연동 로직, 웹훅 서명 검증 구현, 보안 감사(P0~P2) 패치 |
| **oh-my-claudecode (OMC)** | executor / code-reviewer / verifier 멀티 에이전트 파이프라인으로 코드 리뷰, 보안 점검, 회귀 테스트 루프 |
| **Pencil (MCP)** | 스토리보드 `.pen` 파일 해석 → 데스크톱+모바일 반응형 디자인을 프론트엔드 컴포넌트로 변환 |
| **face-api.js (로컬 추론)** | 개인 포토북 분배용 128차원 얼굴 embedding 로컬 추출 — 외부 API 비용 0. sharp → tf.tensor3d 직접 입력 방식으로 webp/heic 디코딩 호환성 확보 |

---

## 설계 의도

### 왜 이 서비스를 선택했는가

동창회·가족 모임처럼 **여러 사람이 각자 찍은 사진이 흩어지는 문제**는 누구나 겪지만, 기존 포토북 서비스는 "1인 → 1권" 구조라 그룹 모임 맥락을 전혀 지원하지 않는다. "모은 사진으로 모두에게 다른 결과물을 주는" 협업형 포토북은 Sweetbook API의 **`POST /books` 인스턴스 단위 설계**와 잘 맞았고, **1 모임 → N권 자동 분배**라는 매출 구조로도 전환된다. 단순 예시(개인 포토북)를 넘어 **협업 + AI + B2B 확장성**을 동시에 보여줄 수 있는 주제라 선택했다.

### 비즈니스 가능성

- **매출 구조**: 기존 1모임 1권 → N권 자동 분배로 LTV 수 배 증가. 10명 동창회에서 현재 시장은 1권 주문, 우리는 10권(멤버별 맞춤).
- **진입 장벽 제거**: 카카오톡 zip 일괄 업로드로 "사진 모으기"라는 가장 큰 진입 장벽 해결 → 전환율 상승.
- **B2B 확장 경로**: 기업 워크샵 → 유치원 졸업앨범 → 학교 행사. 동일 기술(얼굴 인식 + 그룹 분배)로 각 멤버 맞춤 결과물 생성이 유효.
- **재구매 트리거**: 모임은 반복된다(연 1회 동창회, 분기별 가족 모임). 첫 주문 만족 → 자동 재소환 구조.

### 더 시간이 있었다면

1. **OpenAI GPT-4o-mini Vision 연동 마무리** — 클래스 골격만 있고 실제 호출은 미구현. 사진 품질 점수(구도/조명/감정) + 챕터 자동 네이밍을 붙이면 큐레이션 가치 큼.
2. **결제·정산 연동** — 현재 Sandbox 충전금 차감만 구현. 실제 서비스에서는 카카오페이·토스 결제 후 관리자 충전 플로우 또는 멤버 분할 결제(1/N) 기능.
3. **실시간 협업 편집** — 여러 멤버가 동시에 포토북을 편집할 때 WebSocket 기반 CRDT로 충돌 해결.
4. **다국어 & 글로벌 확장** — 한국어 고정 메시지를 i18n으로, 해외 배송 판형(Letter/A4) 대응.
5. **테스트 커버리지** — 현재 통합 테스트가 핵심 도메인에 한정. E2E(Playwright) + 웹훅 통합 시나리오 테스트 보강.
6. **관리자 대시보드** — 전체 주문·충전금·웹훅 실패 모니터링 어드민. 현재는 Swagger로 확인.

---

## 더미 데이터 / 테스트 시나리오

심사자가 가장 빠르게 모든 기능을 확인할 수 있도록 **수동 입력 시나리오 문서**를 별도 제공합니다 — 👉 [`docs/test-scenarios.md`](./docs/test-scenarios.md)

문서에 포함된 내용:
- **8개 local 계정** (전부 비밀번호 `demo1234`) — Google/Kakao OAuth 없이 모든 핵심 기능 검증 가능
- **4개 모임 시나리오** (COLLECTING+표지투표 / EDITING / ORDERED+SHIPPED / 빈 모임) — 각 상태별 검증 포인트 명시
- **플래그십 기능 시나리오** — 카톡 zip import + 얼굴 anchor + 개인 포토북 자동 생성
- **알림 / 웹훅 시뮬레이션 / 에러 케이스 12개 / 반응형 UI** 검증 체크리스트
- **DB / Redis / Supabase Storage 초기화 SQL·명령어** 첨부 (테스트 시작 전 깨끗한 상태로)

> OAuth(Google/Kakao) 흐름은 시나리오 7-1에서 본인 계정으로 1회만 별도 검증하면 충분합니다. Sandbox 충전금은 `POST /credits/sandbox/charge` API 또는 파트너 포털에서 무료 충전 가능합니다.

### 빠른 점검 코스 (10분)

심사자가 짧은 시간에 핵심만 보고 싶다면:
1. `demo01` 로그인 → 모임 ① "2026 봄 동창회" 진입 → 사진 갤러리 + 표지 투표 진행 상태 확인
2. `demo05` 로그인 → 모임 ③ "가족 제주 여행" → 주문 페이지에 SHIPPED 운송장 표시 확인
3. `demo07` 로그인 → 모임 ④ "사진 동호회 1기" → 빈 모임 UI 확인
4. 임의 계정으로 모임 ②에서 포토북 편집 페이지 진입 → WYSIWYG 에디터 동작
5. 모임 ③에서 본인 셀카 3장 anchor 등록 → "개인 포토북 만들기" → 멤버별 자동 분배 확인

---

## 디렉토리 구조

```
sweet_book_project/
├── sweet_book_project_be/     # NestJS 백엔드 (포트 3000)
│   └── src/
│       ├── domains/           # auth, users, groups, photos, books, orders,
│       │                      #   cover-voting, kakao-import, notifications,
│       │                      #   activities, webhooks
│       ├── external/          # sweetbook, openai 클라이언트
│       ├── common/            # filters, interceptors, guards, exceptions
│       └── migrations/        # TypeORM 마이그레이션
├── sweet_book_project_fe/     # React + Vite 프론트엔드 (포트 5173)
│   └── src/
│       ├── pages/             # 27개 라우트
│       ├── features/{domain}/ # components, hooks, api (feature-scoped)
│       ├── components/        # ui, layout 공통
│       └── stores/            # Zustand (UI 상태만)
├── docs/                      # ERD, 도메인 문서, 진행 현황, Pencil 스토리보드
└── docker-compose.yml         # PostgreSQL 15 + Redis
```

## 상세 문서

- 구현 진행 현황: [docs/PROGRESS.md](./docs/PROGRESS.md)
- 도메인별 ERD: [docs/domains/](./docs/domains/)
- 개발 규칙(레이어·보안·API): [.claude/rules/](./.claude/rules/)
- 스토리보드: [docs/designs/groupbook-storyboard.pen](./docs/designs/) (Pencil 필요)

## 기술 스택

| 영역 | 스택 |
|------|------|
| Backend | Node.js 20, NestJS 11, TypeORM, PostgreSQL 15, Redis, Bull Queue, JWT, Passport(Google/Kakao) |
| Frontend | React 19, Vite 8, Tailwind CSS, Zustand, TanStack Query, React Router v6 |
| 파일/이미지 | Multer, Sharp (3단 리사이징), **Supabase Storage** (원본/썸네일 영속화), face-api.js(@vladmandic/face-api) + @tensorflow/tfjs-node |
| 외부 API | **Sweetbook Book Print API**, OpenAI GPT-4o-mini Vision |
| Infra | Docker Compose, GitHub Actions CI (lint + test) |

---

**라이선스**: 이 저장소는 스위트북 채용 과제 심사 목적으로 제출된 코드입니다.

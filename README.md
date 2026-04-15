# GroupBook

> **한 모임에서 각자 찍은 사진을 모아, 멤버 수만큼의 서로 다른 개인 포토북을 자동 제작·주문하는 협업 포토북 서비스.**

- 배포 도메인: https://sweetbook-project.vercel.app
- Swagger 문서: https://sweetbookproject-production.up.railway.app/api/docs
- 테스트 시나리오: [`docs/test-scenarios.md`](./docs/test-scenarios.md)

> ⚠️ **배포 환경 안내 (임시)** — 이미지 저장/처리를 AWS S3 + Lambda로 이관하지 못하고 Supabase Storage + Railway 컨테이너 내 Sharp 처리로 운영 중입니다. Railway 기본 플랜의 메모리(512MB~1GB)가 낮아 다량 사진 업로드/얼굴 인식/포토북 생성 시 OOM으로 컨테이너가 재시작되는 오류가 간헐적으로 발생합니다. 마감 일정상 이번 제출에서는 Railway 유지하며, 추후 **AWS(S3 + CloudFront + ECS/Lambda)로 전부 이관 후 재배포 예정**입니다. 심사 중 OOM으로 동작이 끊기면 잠시 뒤 재시도 부탁드립니다 🙏 또한 SMTP(이메일) 발송도 Railway가 아웃바운드 SMTP 포트를 차단하여 배포 환경에서는 비활성 상태이며, **AWS SES(HTTPS API)로 교체 예정**입니다.

---

## 1. 서비스 소개

### 한 줄 설명
동창회·가족·동호회 모임에서 멤버들이 각자 찍은 사진을 한 곳에 모아, 얼굴 인식으로 **1 모임 → 멤버 수만큼의 서로 다른 개인 포토북**을 자동 제작·주문하는 협업 포토북 서비스.

### 타겟 고객
- 1차: 동창회·동문회 (연 1회 모임, 기념품 수요)
- 2차: 등산·사진·독서 등 취미 동호회
- 3차: 가족 모임 (명절/여행/돌잔치)
- B2B 확장: 기업 워크샵, 유치원 졸업앨범

### 주요 기능

| 분류 | 기능 |
|------|------|
| 모임 | 생성·초대 링크·QR, 멤버 관리(위임/강퇴), 커버 업로드, 활동 피드 |
| 사진 | 드래그앤드롭 업로드, 챕터 필터, 업로더 필터, 자동 리사이징 3단(원본/중간/썸네일) |
| 포토북 | Sweetbook 템플릿 선택, WYSIWYG 에디터, 미리보기 모달, 표지 투표 |
| **개인 포토북 (플래그십)** | face-api.js 얼굴 인식 → 멤버별 개인 포토북 자동 생성 (표지·내지 템플릿 자동 바인딩) + owner 개별 주문/삭제 |
| **카톡 import (플래그십)** | Android 카톡 zip 드래그앤드롭 → 원본 화질 일괄 업로드 + 업로더 자동 매칭 |
| 주문 | Sweetbook 견적·주문·배송 추적, 웹훅 8종 수신 알림 |
| 인증 | 이메일+비밀번호, Google/Kakao OAuth, 비밀번호 재설정 |

---

## 2. 실행 방법

### 사전 요구
- **Node.js 20+** (`nvm use 20` 권장)
- **Docker Desktop** 실행 상태 (PostgreSQL + Redis 로컬 기동용)
- **Sweetbook Sandbox API Key** — 스위트북 내부 Sandbox Key 재사용 가능
- **Supabase 프로젝트 1개** (사진/커버/아바타 영속화 — 무료 플랜으로 충분). 없으면 로컬 실행은 스킵하고 배포 URL로 검증 권장
- **macOS Apple Silicon**: `@tensorflow/tfjs-node` + `canvas` 네이티브 빌드를 위해 다음 패키지 필요
  ```bash
  brew install pkg-config cairo pango libpng jpeg giflib librsvg
  ```
- **포트**: PostgreSQL `5433` (로컬 5432와 충돌 없음), Redis `6379`, BE `3000`, FE `5173`

### 설치 & 실행 (복붙)

```bash
# 1) BE 환경변수 파일 생성 (FE는 Vite 프록시 자동 — .env 불필요)
cp sweet_book_project_be/.env.example sweet_book_project_be/.env

# 2) sweet_book_project_be/.env 필수 값 입력
#    - JWT_SECRET=<32자 이상 랜덤 문자열>                    (필수)
#    - SWEETBOOK_API_KEY=SB{prefix}.{secret}                (필수, 내부 Sandbox Key)
#    - SWEETBOOK_WEBHOOK_SECRET=anything_for_first_boot     (초기엔 아무 문자열,
#                                                            웹훅 테스트 시 실제 값으로 교체)
#    - SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY             (필수 — 사진 저장소)
#    - SUPABASE_STORAGE_BUCKET=uploads                      (기본값 사용 가능)
#    - GOOGLE_* / KAKAO_*                                   (선택 — 소셜 로그인 사용 시만)

# 3) 인프라 기동 (PostgreSQL 5433 / Redis 6379)
docker compose up -d

# 4) Postgres 준비 대기 (수 초)
until docker exec groupbook-postgres pg_isready -U sweetbook_user -d sweetbook > /dev/null 2>&1; do \
  echo "waiting for postgres..."; sleep 1; done

# 5) Backend (포트 3000)
cd sweet_book_project_be
npm install                # Apple Silicon은 위 brew 의존성 먼저 설치
npm run migration:run      # 모든 스키마는 src/migrations/ 에 포함 (별도 seed 스크립트 없음)
npm run start:dev

# 6) Frontend (포트 5173) — 새 터미널
cd sweet_book_project_fe
npm install
npm run dev                # http://localhost:5173 — API는 Vite 프록시(/api → :3000)
```

### 웹훅 로컬 수신 (선택)

```bash
# 1) 공개 URL 획득
ngrok http 3000   # https://xxxxx.ngrok-free.app

# 2) Sweetbook에 수신 URL 등록 — 응답의 secretKey는 단 한 번만 노출
curl -X PUT https://api-sandbox.sweetbook.com/v1/webhooks/config \
  -H "Authorization: Bearer $SWEETBOOK_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://xxxxx.ngrok-free.app/webhooks/sweetbook"}'

# 3) 응답 secretKey를 .env 의 SWEETBOOK_WEBHOOK_SECRET 에 반영 후 서버 재시작
```

### 환경변수 관리 원칙
- API Key 등 민감값은 `.env.example` 템플릿만 커밋, 실제 `.env`는 `.gitignore` 제외
- FE에는 API Key 절대 노출하지 않고 BE에서만 관리
- FE 로컬은 `vite.config.js` 의 프록시로 `/api` → `http://localhost:3000` 자동 연결되므로 `.env` 불필요

### 배포 (참고)
- Backend: Railway (Dockerfile 자동 빌드, PostgreSQL/Redis 플러그인, `migrationsRun: true` 자동 실행)
- Frontend: Vercel (Vite 자동 감지, `vercel.json` rewrites로 BE 프록시 — `VITE_API_URL` 별도 설정 불필요)
- 배포 후: Google/Kakao OAuth Redirect URI 등록, `PUT /webhooks/config` 재등록, Railway `CORS_ORIGIN`을 Vercel URL로 업데이트

---

## 3. 사용한 API 목록

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

### 로컬 AI 추론 (외부 API 비용 0)

| 라이브러리 | 용도 |
|----------|------|
| `@vladmandic/face-api` + `@tensorflow/tfjs-node` | 128차원 얼굴 embedding 로컬 추출 → 개인 포토북 자동 분배 |

> 초기 설계에는 OpenAI GPT-4o-mini 기반 사진 품질 분석/챕터 자동 네이밍이 포함되어 있었으나, 마감 일정상 본 제출에서는 빠졌습니다(서비스 클래스만 자리잡힌 상태). 핵심 기능에는 영향 없음 — graceful degradation 설계상 OpenAI 미사용에도 업로드/포토북/주문 정상 동작.

---

## 4. AI 도구 사용 내역

| AI 도구 | 활용 내용 |
|---------|----------|
| **Claude Code (Opus 4.6)** | 도메인 모델링(ERD), NestJS 모듈·서비스·컨트롤러 구현, React 페이지 작성, Sweetbook API 연동 로직, 웹훅 서명 검증 구현, 보안 감사(P0~P2) 패치 |
| **oh-my-claudecode (OMC)** | executor / code-reviewer / verifier 멀티 에이전트 파이프라인으로 코드 리뷰, 보안 점검, 회귀 테스트 루프 |
| **Pencil (MCP)** | 스토리보드 `.pen` 파일 해석 → 데스크톱+모바일 반응형 디자인을 프론트엔드 컴포넌트로 변환 |
| **face-api.js (로컬 추론)** | 개인 포토북 분배용 128차원 얼굴 embedding 로컬 추출 — 외부 API 비용 0. sharp → tf.tensor3d 직접 입력 방식으로 webp/heic 디코딩 호환성 확보 |

---

## 5. 설계 의도

### 왜 이 서비스를 선택했는가
동창회·가족 모임처럼 **여러 사람이 각자 찍은 사진이 흩어지는 문제**는 누구나 겪지만, 기존 포토북 서비스는 "1인 → 1권" 구조라 그룹 모임 맥락을 전혀 지원하지 않습니다. "모은 사진으로 모두에게 다른 결과물을 주는" 협업형 포토북은 Sweetbook API의 **`POST /books` 인스턴스 단위 설계**와 잘 맞았고, **1 모임 → N권 자동 분배**라는 매출 구조로도 자연스럽게 전환됩니다. 단순 예시(개인 포토북)를 넘어 **협업 + AI + B2B 확장성**을 동시에 보여줄 수 있는 주제라 선택했습니다.

### 비즈니스 가능성
- **매출 구조**: 기존 1모임 1권 → N권 자동 분배로 LTV 수 배 증가. 10명 동창회에서 현재 시장은 1권 주문, 우리는 10권(멤버별 맞춤).
- **진입 장벽 제거**: 카카오톡 zip 일괄 업로드로 "사진 모으기"라는 가장 큰 진입 장벽 해결 → 전환율 상승.
- **B2B 확장 경로**: 기업 워크샵 → 유치원 졸업앨범 → 학교 행사. 동일 기술(얼굴 인식 + 그룹 분배)로 각 멤버 맞춤 결과물 생성이 유효.
- **재구매 트리거**: 모임은 반복됩니다(연 1회 동창회, 분기별 가족 모임). 첫 주문 만족 → 자동 재소환 구조.

### 더 시간이 있었다면
1. **OpenAI GPT-4o-mini Vision 연동 마무리** — 클래스 골격만 있고 실제 호출은 미구현. 사진 품질 점수(구도/조명/감정) + 챕터 자동 네이밍을 붙이면 큐레이션 가치 큼.
2. **AWS 인프라 전환** — S3 + CloudFront로 이미지 서빙 + Lambda로 Sharp/face-api 분리 → Railway OOM 해소 + 확장성 확보. SES로 메일 발송도 일원화.
3. **결제·정산 연동** — 현재 Sandbox 충전금 차감만 구현. 실제 서비스에서는 카카오페이·토스 결제 후 관리자 충전 또는 멤버 분할 결제(1/N) 기능.
4. **실시간 협업 편집** — 여러 멤버가 동시에 포토북을 편집할 때 WebSocket 기반 CRDT로 충돌 해결.
5. **다국어 & 글로벌 확장** — 한국어 고정 메시지를 i18n으로, 해외 배송 판형(Letter/A4) 대응.
6. **테스트 커버리지 보강** — 현재 통합 테스트가 핵심 도메인에 한정. E2E(Playwright) + 웹훅 통합 시나리오 테스트 추가.
7. **관리자 대시보드** — 전체 주문·충전금·웹훅 실패 모니터링 어드민 (현재는 Swagger로 확인).

---

## 부록

### 테스트 시나리오 (더미 데이터 미포함)

**자동 시드 스크립트**로 8개 계정·4개 모임·실제 Sweetbook 책/주문·얼굴 임베딩까지 한 번에 데모 환경이 박제됩니다. 심사자는 별도 가입·업로드 없이 바로 로그인해서 모든 화면 검증 가능.

```bash
cd sweet_book_project_be
npm run seed:demo -- --target=local --reset          # 로컬 검증
npm run seed:demo -- --target=production --reset     # Railway 시드
```

> 배포 환경(`https://sweetbook-project.vercel.app`)에는 이미 시드가 적용되어 있으니 바로 로그인만 하면 됩니다.
> 테스트 환경이 아니라 첫 로그인부터 직접 데이터를 추가하고 테스트하는것이 더 정확합니다.

### 🔑 시드된 데모 계정 (8명, 비밀번호 모두 `demo1234`)

| 이메일 | 이름 | 주요 역할 | 추천 검증 시나리오 |
|--------|------|-----------|-------------------|
| `demo01@groupbook.test` | 김지현 | 모임① owner | 표지 투표 진행 중 모임 |
| `demo02@groupbook.test` | 박서준 | 모임② owner | 포토북 편집 중 (EDITING) |
| `demo03@groupbook.test` | 이수민 | 모임①·② 멤버 | 멤버 시점에서 둘러보기 |
| `demo04@groupbook.test` | 최도윤 | 모임①·② 멤버 | 표지 투표 참여자 |
| **`demo05@groupbook.test`** | **정유나** | **모임③ owner** | **🌟 주문 + 개인 포토북 (가장 풍부한 시나리오)** |
| `demo06@groupbook.test` | 한재민 | 모임①·③ 멤버 | 개인 포토북 멤버 |
| `demo07@groupbook.test` | 윤서연 | 모임④ owner | 빈 모임 UI 확인 |
| `demo08@groupbook.test` | 오준호 | 모임③ 멤버 | 얼굴 anchor 매칭 확인 |

### 시나리오 상세
 [`docs/test-scenarios.md`](./docs/test-scenarios.md) 참조 — 카톡 zip import, 얼굴 anchor 새로 등록, 웹훅 시뮬레이션, 에러 케이스 12종, 반응형 UI 체크리스트.

### 디렉토리 구조

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

### 기술 스택

| 영역 | 스택 |
|------|------|
| Backend | Node.js 20, NestJS 11, TypeORM, PostgreSQL 15, Redis, Bull Queue, JWT, Passport(Google/Kakao) |
| Frontend | React 19, Vite 8, Tailwind CSS, Zustand, TanStack Query, React Router v6 |
| 파일/이미지 | Multer, Sharp (3단 리사이징), **Supabase Storage** (영속화), face-api.js(@vladmandic/face-api) + @tensorflow/tfjs-node |
| 외부 API | **Sweetbook Book Print API**, OpenAI GPT-4o-mini Vision (설계만) |
| Infra | Docker Compose, Railway(BE), Vercel(FE), GitHub Actions CI (lint + test) |

### 상세 문서
- 구현 진행 현황: [docs/PROGRESS.md](./docs/PROGRESS.md)
- 도메인별 ERD: [docs/domains/](./docs/domains/)
- 개발 규칙(레이어·보안·API): [.claude/rules/](./.claude/rules/)
- 스토리보드: [docs/designs/groupbook-storyboard.pen](./docs/designs/) (Pencil 필요)

---

**라이선스**: 이 저장소는 스위트북 채용 과제 심사 목적으로 제출된 코드입니다.

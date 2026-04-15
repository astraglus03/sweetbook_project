# GroupBook 데모 시드 스크립트

심사자가 로컬 또는 배포 URL에서 로그인하면 아래 데이터가 이미 준비되어 있도록 DB + Supabase Storage + Sweetbook Sandbox에 시드합니다.

---

## 준비물

### 1. 환경변수 (.env / .env.production)

다음 항목이 반드시 채워져 있어야 합니다.

```
# DB
DB_HOST=
DB_PORT=
DB_USER=
DB_PASSWORD=
DB_NAME=
DB_SSL=false          # Railway 등 원격 DB는 true

# Supabase
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_STORAGE_BUCKET=groupbook-photos

# Sweetbook Sandbox
SWEETBOOK_BASE_URL=https://api-sandbox.sweetbook.com/v1
SWEETBOOK_API_KEY=

# face-api 모델 경로 (기본: process.cwd()/models/face-api)
FACE_API_MODELS_DIR=

# FE URL (요약 출력용, 선택)
FRONTEND_URL=http://localhost:5173
```

### 2. Supabase Storage 버킷 생성

Supabase 대시보드 → Storage → 버킷 생성:
- 이름: `groupbook-photos` (또는 .env의 SUPABASE_STORAGE_BUCKET 값)
- Public: ON (공개 버킷)

### 3. face-api 모델 파일

```bash
cd sweet_book_project_be
bash scripts/download-face-models.sh
```

모델 파일이 없으면 `--skip-face` 플래그로 얼굴 인식 단계를 건너뜁니다.

---

## 실행 방법

### 로컬 시드

```bash
cd sweet_book_project_be
npm run seed:demo -- --target=local
```

### Railway(프로덕션) 시드

```bash
cd sweet_book_project_be
npm run seed:demo -- --target=production
```

### 리셋 후 재시드 (기존 데이터 전체 삭제)

```bash
npm run seed:demo -- --target=local --reset
```

### 옵션 플래그

| 플래그 | 설명 |
|--------|------|
| `--target=local` | `.env` 로드 (기본) |
| `--target=production` | `.env.production` 로드 |
| `--reset` | TRUNCATE 전체 테이블 후 재시드 |
| `--skip-face` | face-api 임베딩 단계 건너뜀 |
| `--skip-sweetbook` | Sweetbook API 호출 단계 건너뜀 |

### 사진 파일만 별도 생성

```bash
npm run seed:photos
```

---

## 생성되는 데이터 요약

### 계정 (8명, 비밀번호: `demo1234`)

| 이메일 | 이름 |
|--------|------|
| demo01@groupbook.test | 김지수 |
| demo02@groupbook.test | 이민준 |
| demo03@groupbook.test | 박서연 |
| demo04@groupbook.test | 최도윤 |
| demo05@groupbook.test | 정하은 |
| demo06@groupbook.test | 강준호 |
| demo07@groupbook.test | 윤채원 |
| demo08@groupbook.test | 임시우 |

**추천 진입 계정**: `demo01@groupbook.test` / `demo1234`

### 모임 4개

| 모임 | 상태 | 멤버 | 사진 | 특이사항 |
|------|------|------|------|----------|
| 2026 봄 동창회 | COLLECTING | 01,03,04,05,06 | 10장 | 표지 투표 진행 중 (후보 3개, 표 7개) |
| 등산 동호회 3월 정모 | EDITING | 02,03,04,07 | 15장 | 포토북 생성 완료, finalization 전 |
| 가족 제주 여행 | ORDERED | 05,06,08 | 20장 | 주문 2건 (1건 PAID, 1건 SHIPPED) |
| 사진 동호회 1기 | COLLECTING | 07 | 0장 | 빈 모임 |

### 모임③ 얼굴 인식 데이터 (face-api 실행 시)
- demo05/06/08의 `user_face_anchors` + `user_face_anchor_samples`
- 사진들의 `photo_faces` (128차원 embedding)
- 멤버별 개인 포토북 `books` (PERSONAL, READY_TO_REVIEW) + `personal_book_matches`

---

## 예상 런타임

| 단계 | 예상 시간 |
|------|-----------|
| 사진 파일 생성 (다운로드 포함) | 2~4분 |
| face-api 모델 로드 + 임베딩 | 1~3분 |
| Supabase 업로드 (45장) | 1~2분 |
| DB INSERT | 30초 |
| Sweetbook API 호출 | 1~3분 |
| **전체** | **약 6~12분** |

---

## 트러블슈팅

### `face-api 모델 디렉토리가 없습니다`
```bash
bash scripts/download-face-models.sh
```
또는 `--skip-face` 플래그 사용.

### `Supabase 업로드 실패`
- `.env`의 `SUPABASE_SERVICE_ROLE_KEY` 확인 (anon key가 아닌 service_role key)
- 버킷 이름 대소문자 확인
- 버킷이 Public으로 설정되어 있는지 확인

### `SWEETBOOK_API_ERROR`
- `SWEETBOOK_API_KEY` 환경변수 확인
- Sandbox URL 확인: `https://api-sandbox.sweetbook.com/v1`
- `--skip-sweetbook` 플래그로 Sweetbook 단계 스킵 가능

### `DB 연결 실패`
- Docker Compose가 실행 중인지 확인: `docker compose up -d`
- `DB_HOST`, `DB_PORT`, `DB_PASSWORD` 환경변수 확인

### 재실행 (멱등)
- 플래그 없이 재실행하면 이미 존재하는 데이터는 생성하지 않음 (findOne 체크)
- 완전히 초기화하려면 `--reset` 플래그 사용

### Railway 원격 DB 접속 시
```
DB_SSL=true
```
를 `.env.production`에 추가하세요.

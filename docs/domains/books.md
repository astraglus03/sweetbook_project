# Books 도메인 ERD

> **하위 문서:**
> - [books/personal-book.md](./books/personal-book.md) — 개인 포토북 (얼굴 인식 기반 자동 생성)
> - [books/book-specs.md](./books/book-specs.md) — 판형 3종 상세 스펙 + 디자인 참조

## books 테이블

| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|----------|------|
| id | UUID | PK, auto-generated | 포토북 고유 ID |
| group_id | UUID | FK → groups.id, NOT NULL | 소속 모임 ID |
| title | VARCHAR(100) | NOT NULL | 포토북 제목 |
| subtitle | VARCHAR(200) | NULLABLE | 포토북 부제 |
| book_type | ENUM | NOT NULL, DEFAULT 'SHARED' | 포토북 종류 (SHARED / PERSONAL) |
| owner_user_id | UUID | FK → users.id, NULLABLE | PERSONAL일 때 소유자 (SHARED는 NULL) |
| template_id | VARCHAR(50) | NOT NULL | Sweetbook 템플릿 ID |
| book_spec_uid | VARCHAR(50) | NOT NULL | Sweetbook 판형 UID |
| status | ENUM | NOT NULL, DEFAULT 'DRAFT' | 포토북 상태 |
| sweetbook_book_id | VARCHAR(100) | NULLABLE, UNIQUE | Sweetbook API 응답 book ID |
| sweetbook_external_ref | VARCHAR(100) | NULLABLE | Sweetbook POST /books의 externalRef (내부 book.id 전달) |
| cover_photo_id | UUID | FK → photos.id, NULLABLE | 표지 사진 ID (투표 결과 or owner 선택) |
| page_count | INTEGER | DEFAULT 0 | 총 페이지 수 |
| share_code | VARCHAR(20) | UNIQUE, NULLABLE | 디지털 공유 링크 코드 |
| is_shared | BOOLEAN | DEFAULT false | 디지털 공유 활성화 여부 |
| created_by | UUID | FK → users.id, NOT NULL | 생성한 사용자 ID |
| created_at | TIMESTAMP | DEFAULT NOW() | 생성일 |
| updated_at | TIMESTAMP | DEFAULT NOW() | 수정일 |

### book_type ENUM
- `SHARED` — 공동 포토북. 모임 전원이 열람, 방장(또는 공동 편집자)이 편집. `owner_user_id = NULL`. 기존 설계 그대로.
- `PERSONAL` — 개인 포토북. 얼굴 인식 기반 자동 생성. `owner_user_id` 필수. **본인만 열람/편집/주문/다운로드**.

> PERSONAL Book의 자동 생성 파이프라인, 권한 규칙, 상태 흐름은 [books/personal-book.md](./books/personal-book.md) 참조.

### status ENUM 값

**SHARED Book (공동 포토북):**
- `DRAFT` — 편집중 (페이지 구성 중)
- `VOTING` — 표지 투표 진행 중
- `UPLOADING` — 사진을 Sweetbook 서버에 업로드 중
- `PROCESSING` — 표지/내지 추가 + finalization 진행 중
- `READY` — finalization 완료 (주문 가능, 수정 불가)
- `ORDERED` — 주문됨
- `FAILED` — 생성 실패

**PERSONAL Book (개인 포토북, 얼굴 인식 기반):**
- `AUTO_GENERATING` — 얼굴 매칭 + 자동 배치 중 (Bull Queue)
- `READY_TO_REVIEW` — owner 리뷰 대기
- `EDITING` — owner 직접 수정 중
- `UPLOADING`, `PROCESSING`, `FINALIZED`, `ORDERED`, `FAILED` — SHARED와 공통

> PERSONAL 상세 흐름은 [books/personal-book.md](./books/personal-book.md) 참조.

### 판형 및 가격

판형 3종(`SQUAREBOOK_HC`, `PHOTOBOOK_A4_SC`, `PHOTOBOOK_A5_SC`)의 상세 스펙, 가격 공식, 변경 규칙, 템플릿 시스템은 [books/book-specs.md](./books/book-specs.md)에 분리되어 있다.

## book_pages 테이블

| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|----------|------|
| id | UUID | PK, auto-generated | 페이지 고유 ID |
| book_id | UUID | FK → books.id, NOT NULL | 소속 포토북 ID |
| page_number | INTEGER | NOT NULL | 페이지 번호 |
| photo_id | UUID | FK → photos.id, NULLABLE | 배치된 사진 ID |
| chapter_title | VARCHAR(100) | NULLABLE | 챕터 구분 제목 (챕터 첫 페이지) |
| caption | VARCHAR(200) | NULLABLE | 페이지 캡션 |
| created_at | TIMESTAMP | DEFAULT NOW() | 생성일 |

## cover_votes 테이블

| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|----------|------|
| id | UUID | PK, auto-generated | 투표 고유 ID |
| group_id | UUID | FK → groups.id, NOT NULL | 모임 ID |
| photo_id | UUID | FK → photos.id, NOT NULL | 투표 대상 사진 ID |
| user_id | UUID | FK → users.id, NOT NULL | 투표한 사용자 ID |
| created_at | TIMESTAMP | DEFAULT NOW() | 투표일 |

## 관계
- `Book` N:1 `Group` — 포토북이 속한 모임
- `Book` N:1 `User` (created_by) — 포토북 생성자
- `Book` N:1 `User` (owner_user_id) — PERSONAL Book 소유자 (SHARED는 NULL)
- `Book` N:1 `Photo` (cover_photo) — 표지 사진
- `Book` 1:N `BookPage` — 포토북 페이지들
- `BookPage` N:1 `Photo` — 페이지에 배치된 사진
- `Book` 1:1 `OrderGroup` — 포토북의 주문 묶음
- `CoverVote` N:1 `Group` — 투표가 속한 모임 (SHARED Book 전용)
- `CoverVote` N:1 `Photo` — 투표 대상 사진
- `CoverVote` N:1 `User` — 투표한 사용자

## 인덱스
- `idx_books_group_id` — group_id
- `idx_books_owner_user_id` — owner_user_id (PERSONAL Book 조회용)
- `idx_books_group_owner_type` — (group_id, owner_user_id, book_type) (그룹 내 특정 사용자 PERSONAL Book 조회)
- `idx_books_sweetbook_book_id` — sweetbook_book_id (UNIQUE)
- `idx_books_share_code` — share_code (UNIQUE)
- `idx_book_pages_book_id` — book_id
- `idx_cover_votes_group_photo` — (group_id, photo_id)
- `idx_cover_votes_group_user` — (group_id, user_id) UNIQUE (1인 1투표)

## 표지 투표 (Cover Democracy)
1. 방장이 그룹 상태를 `VOTING`으로 변경
2. 멤버 전원이 표지 후보 사진에 투표 (1인 1표)
3. 실시간 투표 현황 조회 (사진별 득표수)
4. 방장이 최종 확정 → `books.cover_photo_id` 설정
5. 투표 종료 후 그룹 상태 → `EDITING`

## 디지털 포토북 공유
- `share_code`: 랜덤 생성된 공유 링크 코드
- `/shared/:shareCode`로 비로그인 웹 뷰어 접근
- 페이지 넘기기 형태의 플립 뷰어 (FE)
- PDF 다운로드: 주문 완료(ORDERED 이상) 상태의 구매자만 가능
- `is_shared`로 공유 on/off 토글

### 공유 뷰어 접근 정책
- **제한 없음**: share_code만 있으면 누구나 열람 가능 (비로그인 OK)
- 별도 비밀번호/만료 설정 없음 (심플한 공유 경험 우선)
- 방장이 `is_shared = false`로 전환하면 뷰어 접근 차단 (404)
- 공유 뷰어에서는 읽기 전용 (댓글/다운로드 불가, 플립 뷰만)

### PDF 다운로드 규칙
- 주문 완료(status: ORDERED 이상) 상태에서만 활성화
- 해당 포토북의 주문자(orders.orderer_id)만 다운로드 가능
- 비로그인 공유 뷰어에서는 PDF 다운로드 버튼 미노출
- Book Preview(10)에서 로그인 사용자 + 주문자 조건 충족 시 버튼 표시

## Sweetbook Books API 연동 (필수 순서)
```
1. GET /book-specs → 판형 선택
2. GET /templates?bookSpecUid={uid} → 템플릿 선택
3. POST /books → 빈 책 생성 (DRAFT 상태, sweetbook_book_id 저장)
4. POST /books/{uid}/photos → 사진 사전 업로드 (반환된 fileName 저장)
5. POST /books/{uid}/cover → 표지 1회 추가 (templateUid + 파라미터)
6. POST /books/{uid}/contents → 내지 추가 (반복 호출)
7. POST /books/{uid}/finalization → 최종화 (DRAFT → FINALIZED)
```

### 🔑 DRAFT 전용 작업
4, 5, 6, 사진 삭제, 내지 초기화 등 **모든 편집 작업은 DRAFT 상태에서만** 허용된다. Finalized 책에 편집 API 호출 시 400 반환.

### 사진 사전 업로드: 공식 선택, 우리는 필수
공식 문서상 사진 업로드는 **선택** (cover/contents 호출 시 inline 파일 업로드도 가능). 하지만 우리 서비스는:
- 그룹당 200장 대량 처리
- `rowGallery` 타입 템플릿에서 동일 사진 여러 페이지 재참조
- Bull Queue로 업로드 병렬화

이 세 가지 이유로 **사전 업로드 필수**로 간주한다.

### Bull Queue 비동기 상태 전이
```
DRAFT → UPLOADING (사진 업로드 중)
      → PROCESSING (표지/내지 추가 + finalization 중)
      → READY (SHARED) / FINALIZED (PERSONAL)  ← 주문 가능
      → ORDERED
      → FAILED (어느 단계든 실패 시)
```

- finalize 전에는 주문 불가, finalize 후에는 편집 불가
- finalization 시 표지 spine 두께가 페이지 수 기반으로 자동 조정됨

### POST /books 요청 필드 (공식 문서 기반)
| 필드 | 필수 | 설명 |
|------|------|------|
| `title` | ✅ | 책 제목 (1~255자) |
| `bookSpecUid` | ✅ | 판형 UID (ex. `SQUAREBOOK_HC`) |
| `specProfileUid` | ⬜ | 판형 세부 프로필 (종이 재질 등, 미사용 시 기본) |
| `externalRef` | ⬜ | 우리 서비스의 내부 `books.id` UUID 전달 (최대 100자). 웹훅 상관 매칭 및 조회 필터에 활용 |

→ `externalRef`에 내부 `books.id`를 넣고, 응답의 `bookUid`를 `sweetbook_book_id` 컬럼에 저장. 양방향 추적 가능.

### GET /books 필터 파라미터
- `bookUid` — 단건 조회
- `status` — `draft` / `finalized` 필터
- `limit`, `offset` — 페이지네이션
- **용도:** 우리 DB와 Sweetbook 서버 상태 동기화 검증 (주기적 cron)

### POST /books/{uid}/photos — 사진 사전 업로드

**요청:** `multipart/form-data`, 파일 필드

**응답 (공식):**
```json
{
  "success": true,
  "data": { "fileName": "photo250105143052123.JPG" },
  "message": "Photo uploaded successfully"
}
```

| 항목 | 값 |
|------|---|
| 파일 크기 | 최대 **50MB/장** |
| 사진 수 | 최대 **200장/책** |
| 지원 형식 | JPEG, PNG, GIF, BMP, WebP, HEIC, HEIF |
| Rate Limit | **200 req/min** (업로드 전용, 일반 API와 별도) |
| 자동 변환 | GIF/WebP→PNG, BMP/HEIC/HEIF→JPG |
| EXIF | 기본 보존, `preserveExif` 파라미터로 제어 |
| 상태 제약 | **DRAFT에서만 가능**, FINALIZED에서 차단 |
| 중복 감지 | Sweetbook이 **MD5 해시**로 자동 dedup — 동일 파일 재업로드 시 기존 `fileName` 반환 |

- 응답의 `fileName`은 `photoNNNNNNNNNNNNNN.JPG` 형식(예: `photo250105143052123.JPG`)으로, 이후 `contents`/`cover`에서 `$upload` 또는 서버 파일명 참조로 사용.
- 우리 서버 `photos` 테이블에 `sweetbook_file_name` 컬럼으로 저장 권장.

> **참고**: 우리 서버 업로드 제한(10MB, jpg/png/webp)과 Sweetbook 업로드 제한은 별개.
> 사용자 → 우리 서버(10MB) → Sharp 처리 → Sweetbook 업로드(50MB)

> 템플릿 시스템(카테고리, 파라미터, bookSpecUid 매칭 규칙)은 [books/book-specs.md](./books/book-specs.md) 참조.

### POST /books/{uid}/cover — 표지 추가

**제약**: 책 1권당 **표지 1개만 허용** (중복 POST 시 에러). 바꾸려면 DRAFT 상태에서 새 책을 만들어야 함 (또는 cover DELETE 후 재추가 — 공식 엔드포인트 미확인).

**요청 파라미터**:
- `templateUid` (필수): `templateKind = cover`인 템플릿
- `parameters` (JSON): 템플릿의 `$$variableName$$` 바인딩 값
- 이미지 전달: 파일 업로드 / URL / 서버 파일명(`$upload` placeholder)

**응답 (201)**:
```json
{
  "success": true,
  "data": { "result": "inserted" },
  "message": "Cover created successfully"
}
```

### POST /books/{uid}/contents — 내지 추가

여러 번 호출로 페이지를 쌓는다.

**파라미터**:
- `templateUid` (필수): `templateKind = content | divider | publish`
- `parameters` (JSON): 템플릿 바인딩
- `breakBefore` (쿼리):
  - `page` — 새 페이지에서 시작 (divider/publish 기본값)
  - `column` — 새 컬럼에서 시작
  - `none` — 이전 내용에 이어서 (content 기본값)
- 이미지 전달: 파일, URL, 서버 파일명, 또는 `rowGallery` 배열 혼합

**응답 분기**:
| HTTP | `data.result` | 의미 |
|------|---------------|------|
| **201 Created** | `"inserted"` | 새 페이지 추가됨 |
| **200 OK** | `"updated"` | 같은 페이지의 기존 콘텐츠 업데이트 |

→ 코드에서 두 가지 응답 모두 성공으로 처리할 것. 200을 에러로 오인 금지.

### POST /books/{uid}/finalization — 최종화

**전제 조건 (모두 충족 필수)**:
1. Book status == DRAFT
2. **Cover 1개 + Contents 1개 이상** 둘 다 있어야 함
3. 페이지 수 검증 통과:
   - `actualPageCount >= pageMin`
   - `actualPageCount <= pageMax`
   - `(actualPageCount - pageMin) % pageIncrement == 0`

**idempotent 동작**: 이미 FINALIZED 상태인 책에 호출해도 **200 OK** 반환 (에러 아님). → 우리 Bull Queue 재시도 로직 설계 시 안전.

**실패 시**: 400 + 어느 조건 실패인지 `fieldErrors`로 안내.

**이후 금지**: cover/contents/photos 전부 수정 불가, 책 삭제만 가능 (`DELETE /books/{uid}`).

### 추가 Sweetbook API
- `GET /books` — 필터: `bookUid`, `status`(draft/finalized), `from`, `to`, `limit`, `offset` → Sweetbook↔DB 동기화 cron
- `DELETE /books/{uid}` — 책 소프트 삭제 (status → 9)
- `DELETE /books/{uid}/contents` — 내지 전체 초기화 (표지 유지, 테스트/복구용)
- `GET /books/{uid}/photos` — 업로드된 사진 목록 조회
- `DELETE /books/{uid}/photos/{fileName}` — 개별 사진 삭제 (DRAFT 전용)

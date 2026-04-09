# Books 도메인 ERD

## books 테이블

| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|----------|------|
| id | UUID | PK, auto-generated | 포토북 고유 ID |
| group_id | UUID | FK → groups.id, NOT NULL | 소속 모임 ID |
| title | VARCHAR(100) | NOT NULL | 포토북 제목 |
| subtitle | VARCHAR(200) | NULLABLE | 포토북 부제 |
| template_id | VARCHAR(50) | NOT NULL | Sweetbook 템플릿 ID |
| status | ENUM | NOT NULL, DEFAULT 'DRAFT' | 포토북 상태 |
| sweetbook_book_id | VARCHAR(100) | NULLABLE, UNIQUE | Sweetbook API 응답 book ID |
| cover_photo_id | UUID | FK → photos.id, NULLABLE | 표지 사진 ID (투표 결과) |
| page_count | INTEGER | DEFAULT 0 | 총 페이지 수 |
| share_code | VARCHAR(20) | UNIQUE, NULLABLE | 디지털 공유 링크 코드 |
| is_shared | BOOLEAN | DEFAULT false | 디지털 공유 활성화 여부 |
| created_by | UUID | FK → users.id, NOT NULL | 생성한 사용자 ID |
| created_at | TIMESTAMP | DEFAULT NOW() | 생성일 |
| updated_at | TIMESTAMP | DEFAULT NOW() | 수정일 |

### status ENUM 값
- `DRAFT` — 편집중 (페이지 구성 중)
- `UPLOADING` — 사진을 Sweetbook 서버에 업로드 중
- `PROCESSING` — 표지/내지 추가 + finalization 진행 중
- `READY` — finalization 완료 (주문 가능, 수정 불가)
- `ORDERED` — 주문됨
- `FAILED` — 생성 실패

### 판형별 최소 페이지 규칙
- SQUAREBOOK_HC: 최소 24페이지 (사진 부족 시 finalization 에러)
- LAYFLAT_HC: 최소 16페이지
- SLIMALBUM_HC: 최소 20페이지
- AI 큐레이션 시 이 규칙 반영하여 사진 수 부족 경고 필수

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
- `Book` N:1 `Photo` (cover_photo) — 표지 사진
- `Book` 1:N `BookPage` — 포토북 페이지들
- `BookPage` N:1 `Photo` — 페이지에 배치된 사진
- `Book` 1:1 `Order` — 포토북의 주문
- `CoverVote` N:1 `Group` — 투표가 속한 모임
- `CoverVote` N:1 `Photo` — 투표 대상 사진
- `CoverVote` N:1 `User` — 투표한 사용자

## 인덱스
- `idx_books_group_id` — group_id
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

## 판형 변경 규칙

### 변경 가능 시점
- `DRAFT` 상태에서만 판형 변경 가능
- `UPLOADING` 이후 변경 불가 (Sweetbook API에 이미 책이 생성된 상태)
- 변경 시도 시 status 검증 필수 → DRAFT 아니면 `ForbiddenException`

### 판형(Book Spec) 목록 및 최소 페이지
| 판형 ID | 이름 | 최소 페이지 | 비고 |
|---------|------|------------|------|
| SQUAREBOOK_HC | 정사각 하드커버 | 24p | 기본 추천 |
| LAYFLAT_HC | 레이플랫 하드커버 | 16p | 프리미엄 |
| SLIMALBUM_HC | 슬림앨범 하드커버 | 20p | 경제적 |

### 판형 변경 시 페이지 재구성 로직
```
1. 새 판형의 최소 페이지 수 확인
2. 현재 book_pages 수와 비교
   - 현재 페이지 ≥ 새 최소 → 기존 페이지 유지, 경고 없음
   - 현재 페이지 < 새 최소 → FE에서 경고 표시
     "현재 {N}페이지입니다. {판형}은 최소 {M}페이지가 필요합니다."
     (빈 페이지 자동 추가하지 않음, 사용자가 직접 사진 추가)
3. book_pages의 photo 배치는 그대로 유지 (사진 자체는 판형과 무관)
4. template_id만 업데이트
5. Sweetbook API에는 아직 전송하지 않으므로 재업로드 불필요
```

### 판형 변경 API
```
PATCH /books/:id/spec
Body: { "templateId": "LAYFLAT_HC" }
Response: { "success": true, "data": { "templateId": "LAYFLAT_HC", "minPages": 16, "currentPages": 20, "isPagesSufficient": true } }
```

### FE 판형 변경 UI
- Book Editor(09) 상단 툴바에 현재 판형 표시 + 변경 버튼
- 변경 클릭 → Book Templates(08) 화면 또는 모달로 판형 재선택
- 최소 페이지 부족 시 경고 배너 표시 (빨간색, 해제 불가)
- finalize 버튼은 최소 페이지 충족 시에만 활성화

## Sweetbook Books API 연동 (필수 순서)
```
1. GET /book-specs → 판형 선택
2. GET /templates → 템플릿 선택
3. POST /books → 빈 책 생성 (sweetbook_book_id 저장)
4. POST /books/{uid}/photos → 사진 업로드 (우리 서버 → Sweetbook)
5. POST /books/{uid}/cover → 표지 추가 (투표 결과 사진)
6. POST /books/{uid}/contents (반복) → 내지 페이지 추가
7. POST /books/{uid}/finalization → 최종화 (이후 수정 불가!)
```
- Bull Queue로 비동기 처리: DRAFT → UPLOADING → PROCESSING → READY/FAILED
- 사진 업로드 2단계: 우리 서버 사진 → Sweetbook에 재업로드 → 반환된 fileName으로 contents 구성
- finalize 전에는 주문 불가, finalize 후에는 수정 불가

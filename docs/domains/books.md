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
- `DRAFT` — 편집중
- `PROCESSING` — Sweetbook API 전송 중 (Bull Queue)
- `READY` — 생성 완료 (주문 가능)
- `ORDERED` — 주문됨
- `FAILED` — 생성 실패

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
- PDF 다운로드 지원
- `is_shared`로 공유 on/off 토글

## Sweetbook Books API 연동
- 포토북 생성 시 `SweetbookApiService.createBook()` 호출
- 응답의 `book_id`를 `sweetbook_book_id`에 저장
- Bull Queue로 비동기 처리: DRAFT → PROCESSING → READY/FAILED

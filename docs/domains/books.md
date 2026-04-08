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
| page_count | INTEGER | DEFAULT 0 | 총 페이지 수 |
| created_by | UUID | FK → users.id, NOT NULL | 생성한 사용자 ID |
| created_at | TIMESTAMP | DEFAULT NOW() | 생성일 |
| updated_at | TIMESTAMP | DEFAULT NOW() | 수정일 |

### status ENUM 값
- `DRAFT` — 편집중 (페이지 구성 중)
- `PROCESSING` — Sweetbook API로 전송 중 (Bull Queue)
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
| caption | VARCHAR(200) | NULLABLE | 페이지 캡션 |
| created_at | TIMESTAMP | DEFAULT NOW() | 생성일 |

## 관계
- `Book` N:1 `Group` — 포토북이 속한 모임
- `Book` N:1 `User` (created_by) — 포토북 생성자
- `Book` 1:N `BookPage` — 포토북의 페이지들
- `BookPage` N:1 `Photo` — 페이지에 배치된 사진
- `Book` 1:1 `Order` — 포토북의 주문

## 인덱스
- `idx_books_group_id` — group_id
- `idx_books_sweetbook_book_id` — sweetbook_book_id (UNIQUE)
- `idx_book_pages_book_id` — book_id

## Sweetbook Books API 연동
- 포토북 생성 시 `SweetbookApiService.createBook()` 호출
- 응답의 `book_id`를 `sweetbook_book_id`에 저장
- Bull Queue로 비동기 처리: DRAFT → PROCESSING → READY/FAILED

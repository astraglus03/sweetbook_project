# Photos 도메인 ERD

## photos 테이블

| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|----------|------|
| id | UUID | PK, auto-generated | 사진 고유 ID |
| group_id | UUID | FK → groups.id, NOT NULL | 소속 모임 ID |
| uploader_id | UUID | FK → users.id, NOT NULL | 업로드한 사용자 ID |
| original_url | VARCHAR(500) | NOT NULL | 원본 이미지 경로 |
| thumbnail_url | VARCHAR(500) | NOT NULL | 썸네일 이미지 경로 |
| file_name | VARCHAR(255) | NOT NULL | 원본 파일명 |
| file_size | INTEGER | NOT NULL | 파일 크기 (bytes) |
| mime_type | VARCHAR(50) | NOT NULL | MIME 타입 (image/jpeg 등) |
| width | INTEGER | NULLABLE | 이미지 너비 (px) |
| height | INTEGER | NULLABLE | 이미지 높이 (px) |
| taken_at | TIMESTAMP | NULLABLE | 촬영 날짜 (EXIF) |
| caption | VARCHAR(200) | NULLABLE | 사진 설명 |
| sort_order | INTEGER | DEFAULT 0 | 정렬 순서 |
| created_at | TIMESTAMP | DEFAULT NOW() | 업로드일 |

## 관계
- `Photo` N:1 `Group` — 사진이 속한 모임
- `Photo` N:1 `User` (uploader) — 사진을 올린 사용자
- `Photo` N:M `BookPage` — 포토북 페이지에 배치된 사진

## 인덱스
- `idx_photos_group_id` — group_id
- `idx_photos_uploader_id` — uploader_id
- `idx_photos_taken_at` — taken_at (촬영일 기준 정렬용)

## 파일 업로드 제약
- 허용 확장자: jpg, jpeg, png, webp
- 최대 파일 크기: 10MB
- 썸네일: Sharp로 300x300 리사이징 생성

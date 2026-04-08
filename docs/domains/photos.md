# Photos 도메인 ERD

## photos 테이블

| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|----------|------|
| id | UUID | PK, auto-generated | 사진 고유 ID |
| group_id | UUID | FK → groups.id, NOT NULL | 소속 모임 ID |
| uploader_id | UUID | FK → users.id, NOT NULL | 업로드한 사용자 ID |
| chapter_id | UUID | FK → photo_chapters.id, NULLABLE | 소속 챕터 ID |
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
| is_blurry | BOOLEAN | DEFAULT false | 흔들린 사진 여부 (Laplacian) |
| phash | VARCHAR(64) | NULLABLE | Perceptual Hash (중복 감지용) |
| ai_score | DECIMAL(3,1) | NULLABLE | AI 품질 종합 점수 (0.0~10.0) |
| ai_score_detail | JSONB | NULLABLE | AI 세부 점수 |
| ai_analyzed_at | TIMESTAMP | NULLABLE | AI 분석 완료 시각 |
| created_at | TIMESTAMP | DEFAULT NOW() | 업로드일 |

### ai_score_detail JSONB 구조
```json
{
  "composition": 8,
  "lighting": 7,
  "subject": 9,
  "emotion": 8,
  "reason": "인물이 선명하고 자연광이 좋음"
}
```

## photo_chapters 테이블

| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|----------|------|
| id | UUID | PK, auto-generated | 챕터 고유 ID |
| group_id | UUID | FK → groups.id, NOT NULL | 소속 모임 ID |
| chapter_index | INTEGER | NOT NULL | 챕터 순서 (0부터) |
| title | VARCHAR(100) | NOT NULL | 챕터 제목 (AI 생성) |
| subtitle | VARCHAR(200) | NULLABLE | 챕터 부제 (AI 생성) |
| start_time | TIMESTAMP | NULLABLE | 챕터 시작 시각 |
| end_time | TIMESTAMP | NULLABLE | 챕터 끝 시각 |
| photo_count | INTEGER | DEFAULT 0 | 챕터 내 사진 수 |
| created_at | TIMESTAMP | DEFAULT NOW() | 생성일 |

## 관계
- `Photo` N:1 `Group` — 사진이 속한 모임
- `Photo` N:1 `User` (uploader) — 사진을 올린 사용자
- `Photo` N:1 `PhotoChapter` — 사진이 속한 챕터
- `PhotoChapter` N:1 `Group` — 챕터가 속한 모임
- `Photo` 1:N `BookPage` — 포토북 페이지에 배치
- `Photo` 1:N `CoverVote` — 표지 투표 대상

## 인덱스
- `idx_photos_group_id` — group_id
- `idx_photos_uploader_id` — uploader_id
- `idx_photos_chapter_id` — chapter_id
- `idx_photos_taken_at` — taken_at
- `idx_photos_phash` — phash (중복 감지 조회용)
- `idx_photos_ai_score` — ai_score DESC (베스트 추천용)
- `idx_photo_chapters_group_id` — group_id

## 파일 업로드 제약
- 허용 확장자: jpg, jpeg, png, webp
- 최대 파일 크기: 10MB
- 썸네일: Sharp로 300x300 리사이징 생성

## AI 큐레이션 파이프라인

### 1. 블러 감지 (업로드 즉시, Sharp)
- 그레이스케일 → Laplacian 분산값 계산
- 분산 < 임계값 → `is_blurry = true`
- 비용: 0원

### 2. 중복 감지 (업로드 즉시, pHash)
- 8x8 리사이징 → 64비트 해시 생성
- 같은 group 내 해밍 거리 < 10 → 중복 경고
- 비용: 0원

### 3. 베스트 사진 추천 (비동기, OpenAI Vision)
- Bull Queue로 비동기 처리
- GPT-4o-mini Vision → 0~10 점수화
- `ai_score`, `ai_score_detail`에 저장
- 비용: 100장 ≈ 300원

### 4. 챕터 자동 분류
- 1단계: 촬영 시간 기준 클러스터링 (1시간 간격)
- 2단계: GPT-4o-mini (텍스트)로 챕터 이름 생성
- `photo_chapters`에 저장, 각 photo에 `chapter_id` 연결
- 비용: 거의 0원

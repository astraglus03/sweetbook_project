# Photos 도메인 ERD

## MVP 구현 현황 (2026-04-10)

현재 구현된 Photo 엔티티는 MVP 단순화 버전입니다.

| 계획 컬럼 | MVP 구현 | 비고 |
|-----------|:--------:|------|
| id (PK) | O | `number` (auto-increment) |
| group_id (FK) | O | |
| uploader_id (FK) | O | |
| filename | O | `{timestamp}-{random}.webp` |
| original_filename | O | 원본 파일명 보존 |
| mimetype | O | |
| size (bytes) | O | |
| chapter | O | `string` (chapter_id FK 대신 단순 문자열) |
| width, height | O | Sharp metadata에서 추출 |
| original_url / thumbnail_url | O | 동적 생성 (`/uploads/photos/{groupId}/{variant}/{filename}`) |
| taken_at | - | EXIF 파싱 미구현 |
| caption | - | |
| sort_order | - | |
| is_blurry / phash | - | 블러/중복 감지 미구현 |
| ai_score / ai_score_detail | - | OpenAI Vision 미연동 |
| photo_faces 테이블 | - | 얼굴 인식 미구현 |
| photo_chapters 테이블 | - | 챕터를 단순 문자열로 처리 중 |

### MVP API 엔드포인트 (구현 완료)
```
POST   /photos/groups/:groupId          사진 업로드 (다중, multipart)
GET    /photos/groups/:groupId          사진 목록 (페이지네이션, 챕터/업로더 필터)
GET    /photos/groups/:groupId/chapters 챕터 목록 (집계)
GET    /photos/:photoId                 사진 상세
PATCH  /photos/:photoId                 사진 수정 (챕터 등)
DELETE /photos/:photoId                 사진 삭제
```

### 이미지 처리 (Sharp, 동기 처리)
- 원본 → WebP 변환 (quality 85)
- original: 1200px (withoutEnlargement)
- medium: 600px
- thumbnail: 200x200 (cover crop)
- EXIF rotation 자동 보정

> Bull Queue 비동기 처리는 향후 전환 예정 (AI 분석, 얼굴 인식 추가 시)

---

## photos 테이블 (전체 계획)

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

## photo_faces 테이블 (얼굴 인식)

| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|----------|------|
| id | UUID | PK, auto-generated | 얼굴 고유 ID |
| photo_id | UUID | FK → photos.id, NOT NULL | 소속 사진 ID |
| face_index | INTEGER | NOT NULL | 한 사진 내 얼굴 순번 (0부터) |
| bbox | JSONB | NOT NULL | 얼굴 영역 `{x,y,w,h}` (0~1 정규화) |
| embedding | FLOAT[] | NOT NULL | 128차원 face embedding (face-api.js) |
| matched_user_id | UUID | FK → users.id, NULLABLE | 매칭된 사용자 (nullable) |
| match_confidence | DECIMAL(3,2) | NULLABLE | 매칭 신뢰도 (0.0~1.0) |
| created_at | TIMESTAMP | DEFAULT NOW() | 추출일 |

### 얼굴 인식 파이프라인 (Bull Queue)

기존 사진 업로드 파이프라인에 `face-detection` 큐 추가:

```
사진 업로드 (Multer)
  ↓
photo-processing 큐
  ├─ Sharp 리사이징 (원본/large/medium/thumbnail)
  ├─ 블러 감지 (Laplacian)
  ├─ pHash 중복 감지
  └─ (끝)
  ↓
face-detection 큐 (신규)
  ├─ face-api.js SSD Mobilenet v1 → 얼굴 검출
  ├─ FaceNet → 128차원 embedding 추출
  ├─ photo_faces 테이블 insert (얼굴마다 1 row)
  └─ user_face_anchor와 코사인 유사도 계산 → matched_user_id 자동 매칭 (threshold ≥ 0.6)
  ↓
ai-quality 큐 (기존)
  └─ OpenAI GPT-4o-mini Vision → ai_score
```

### face-api.js 사용 규칙
- 라이브러리: `@vladmandic/face-api` (face-api.js의 Node.js 유지 보수 fork, MIT)
- 의존성: `@tensorflow/tfjs-node` + `canvas` (native binding)
- 모델: SSD Mobilenet v1 (얼굴 검출) + FaceNet (embedding)
- 실행 위치: BE에서만 (FE 전송 금지, 임베딩 노출 방지)
- 모델 파일 경로: `src/external/face-api/models/` (git lfs 또는 초기 배포 시 다운로드)
- 실행 비용: 로컬, API 호출 0원
- 처리 속도: 1장당 평균 200ms (M1 기준), 큐 동시성 4로 제한

### 코사인 유사도 계산 (본인 매칭)
```typescript
function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}
```
- MVP: 애플리케이션 레벨 계산 (1000장 × 30명 = 30k 연산, 1초 이내)
- 규모 확장 시: `pgvector` 확장 도입, `embedding vector(128)` 타입으로 마이그레이션
- threshold: 0.6 (고정). 0.6 미만 = 다른 사람, 0.6~0.75 = 유사, 0.75+ = 확실

### API 엔드포인트
```
POST /photos/:photoId/faces/redetect   방장 전용. 얼굴 재검출 트리거 (특정 사진 1장)
GET  /groups/:groupId/photos/by-face?userId=xxx   특정 사용자 얼굴이 포함된 사진만 조회
```

### 개인정보 및 안전장치
- 얼굴 embedding은 **개인정보** 취급 → 로그 출력 금지, 응답에 포함 금지
- BE 내부에서만 비교 연산, 외부 API 전송 금지
- 탈퇴 시 user_face_anchor 삭제 + 해당 유저의 photo_faces.matched_user_id = NULL 업데이트
- EXIF GPS 제거와 병행 처리 (프라이버시)

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
- `idx_photo_faces_photo_id` — photo_id
- `idx_photo_faces_matched_user` — matched_user_id (특정 사용자 얼굴 조회용)

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

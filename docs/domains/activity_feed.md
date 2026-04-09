# Activity Feed 도메인 ERD

## notifications과의 차이

| 구분 | Notifications | Activity Feed |
|------|--------------|---------------|
| 대상 | 특정 사용자 1명 | 모임 전체 멤버 |
| 성격 | 개인 알림 ("나에게 온 것") | 모임 활동 로그 ("우리 모임에서 일어난 일") |
| 읽음 처리 | 개인별 is_read | 없음 (타임라인 스크롤) |
| 발송 트리거 | 스케줄/이벤트 기반 | 모든 주요 액션 발생 시 자동 기록 |
| 보존 기간 | 읽은 후 30일 | 모임 존속 동안 영구 보존 |

## activities 테이블

| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|----------|------|
| id | UUID | PK, auto-generated | 활동 고유 ID |
| group_id | UUID | FK → groups.id, NOT NULL | 소속 모임 ID |
| actor_id | UUID | FK → users.id, NOT NULL | 행위자 (활동을 한 사용자) |
| type | ENUM | NOT NULL | 활동 유형 |
| target_type | VARCHAR(50) | NULLABLE | 대상 엔티티 종류 (photo, book, order 등) |
| target_id | UUID | NULLABLE | 대상 엔티티 ID |
| metadata | JSONB | NULLABLE | 활동 부가 정보 |
| created_at | TIMESTAMP | DEFAULT NOW() | 활동 발생 시각 |

### type ENUM 값

| 타입 | 설명 | metadata 예시 |
|------|------|--------------|
| `MEMBER_JOINED` | 새 멤버 참여 | `{}` |
| `MEMBER_LEFT` | 멤버 탈퇴 | `{}` |
| `PHOTO_UPLOADED` | 사진 업로드 | `{ "count": 5 }` |
| `PHOTO_DELETED` | 사진 삭제 | `{ "count": 1 }` |
| `CHAPTER_CREATED` | AI 챕터 자동 생성 | `{ "chapterTitle": "오후 산책" }` |
| `BOOK_CREATED` | 포토북 생성 시작 | `{ "bookTitle": "2025 동창회" }` |
| `BOOK_FINALIZED` | 포토북 제작 완료 | `{ "bookTitle": "2025 동창회" }` |
| `VOTE_STARTED` | 표지 투표 시작 | `{}` |
| `VOTE_CAST` | 표지 투표 참여 | `{ "photoId": "..." }` |
| `VOTE_COMPLETED` | 표지 투표 종료 | `{ "winnerPhotoId": "..." }` |
| `ORDER_STARTED` | 주문 수집 시작 | `{ "estimatedPrice": 25000 }` |
| `ORDER_PLACED` | 개별 주문 완료 | `{ "quantity": 1 }` |
| `ORDER_DELIVERED` | 배송 완료 | `{}` |
| `GROUP_UPDATED` | 모임 정보 수정 | `{ "field": "uploadDeadline" }` |
| `DEADLINE_SET` | 업로드 마감일 설정 | `{ "deadline": "2025-05-01" }` |

## 관계
- `Activity` N:1 `Group` — 활동이 속한 모임
- `Activity` N:1 `User` (actor) — 활동을 수행한 사용자

## 인덱스
- `idx_activities_group_id` — group_id
- `idx_activities_group_created` — (group_id, created_at DESC) — 모임별 최신순 피드 조회용
- `idx_activities_actor_id` — actor_id
- `idx_activities_type` — type

## API 엔드포인트

### 피드 조회
```
GET /groups/:groupId/activities?page=1&limit=20&type=PHOTO_UPLOADED
```
- 모임 멤버만 조회 가능 (JwtAuthGuard + 멤버십 확인)
- 기본 정렬: created_at DESC (최신순)
- type 필터 선택 가능 (쿼리 파라미터)
- 페이지네이션 필수

### 응답 형식
```json
{
  "success": true,
  "data": [
    {
      "id": "...",
      "type": "PHOTO_UPLOADED",
      "actor": { "id": "...", "name": "김철수", "profileImage": "..." },
      "targetType": "photo",
      "targetId": "...",
      "metadata": { "count": 5 },
      "createdAt": "2025-04-09T14:30:00Z"
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 142, "totalPages": 8 }
}
```

## 활동 기록 규칙

### 자동 기록 (Service 레이어에서 트리거)
- 사진 업로드 시 → `PHOTO_UPLOADED` (동일 사용자가 연속 업로드 시 5분 이내는 count 합산)
- 멤버 참여/탈퇴 시 → `MEMBER_JOINED` / `MEMBER_LEFT`
- 포토북 상태 변경 시 → `BOOK_CREATED` / `BOOK_FINALIZED`
- 투표 시작/종료 시 → `VOTE_STARTED` / `VOTE_COMPLETED`
- 주문 시작/완료 시 → `ORDER_STARTED` / `ORDER_PLACED` / `ORDER_DELIVERED`

### 배치 합산 (노이즈 방지)
- 같은 사용자가 5분 이내 같은 type 활동 반복 시 → 기존 레코드의 metadata.count 업데이트
- 예: 사진 10장 연속 업로드 → "김철수님이 사진 10장을 업로드했습니다" (레코드 1개)

### 기록하지 않는 것
- 사진 조회, 피드 조회 등 읽기 전용 행위
- 개인 프로필 수정
- 알림 읽음 처리

## BE 모듈 구조
```
src/domains/activity-feed/
├── activity-feed.module.ts
├── activity-feed.service.ts       # 활동 기록 + 조회 로직
├── activity-feed.controller.ts    # GET /groups/:groupId/activities
├── activity-feed.repository.ts    # 커스텀 쿼리 (배치 합산 등)
├── dto/
│   ├── activity-response.dto.ts   # 피드 응답 DTO
│   └── activity-query.dto.ts      # 필터/페이지네이션 쿼리 DTO
└── entities/
    └── activity.entity.ts         # TypeORM 엔티티
```

### 활동 기록 호출 방식
- 각 도메인 Service에서 ActivityFeedService를 DI로 주입
- CUD 작업 완료 후 `activityFeedService.record()` 호출
- 활동 기록 실패 시 원래 작업에 영향 없도록 try-catch 처리 (graceful degradation)

```typescript
// 예시: PhotoService에서 업로드 후 활동 기록
async uploadPhotos(groupId: string, userId: string, files: Express.Multer.File[]) {
  const photos = await this.savePhotos(groupId, userId, files);

  // 활동 기록 (실패해도 업로드 성공에 영향 없음)
  try {
    await this.activityFeedService.record({
      groupId,
      actorId: userId,
      type: ActivityType.PHOTO_UPLOADED,
      targetType: 'photo',
      targetId: photos[0].id,
      metadata: { count: photos.length },
    });
  } catch (error) {
    this.logger.warn('Activity feed record failed', error);
  }

  return photos;
}
```

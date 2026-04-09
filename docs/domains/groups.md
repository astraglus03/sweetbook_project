# Groups 도메인 ERD

## groups 테이블

| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|----------|------|
| id | UUID | PK, auto-generated | 모임 고유 ID |
| name | VARCHAR(100) | NOT NULL | 모임 이름 |
| description | TEXT | NULLABLE | 모임 설명 |
| cover_image | VARCHAR(500) | NULLABLE | 모임 커버 이미지 URL |
| invite_code | VARCHAR(20) | UNIQUE, NOT NULL | 초대 링크용 코드 |
| status | ENUM | NOT NULL, DEFAULT 'COLLECTING' | 모임 상태 |
| owner_id | UUID | FK → users.id, NOT NULL | 방장 ID |
| event_date | DATE | NULLABLE | 모임 날짜 |
| upload_deadline | TIMESTAMP | NULLABLE | 사진 업로드 마감일 |
| year | INTEGER | NULLABLE | 모임 연도 (히스토리 아카이브용) |
| parent_group_id | UUID | FK → groups.id, NULLABLE | 반복 모임의 원본 그룹 ID |
| created_at | TIMESTAMP | DEFAULT NOW() | 생성일 |
| updated_at | TIMESTAMP | DEFAULT NOW() | 수정일 |

### status ENUM 값
- `COLLECTING` — 사진 수집중
- `EDITING` — 포토북 편집중
- `VOTING` — 표지 투표중
- `ORDERED` — 주문 완료
- `COMPLETED` — 배송 완료

## group_members 테이블

| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|----------|------|
| id | UUID | PK, auto-generated | 멤버십 고유 ID |
| group_id | UUID | FK → groups.id, NOT NULL | 모임 ID |
| user_id | UUID | FK → users.id, NOT NULL | 사용자 ID |
| role | ENUM | NOT NULL, DEFAULT 'MEMBER' | 역할 |
| upload_count | INTEGER | DEFAULT 0 | 업로드한 사진 수 (대시보드용) |
| last_notified_at | TIMESTAMP | NULLABLE | 마지막 독려 알림 발송 시각 |
| joined_at | TIMESTAMP | DEFAULT NOW() | 참여일 |

### role ENUM 값
- `OWNER` — 방장 (모임 생성자)
- `MEMBER` — 일반 멤버

## 관계
- `Group` N:1 `User` (owner) — 모임의 방장
- `Group` 1:N `GroupMember` — 모임의 멤버들
- `GroupMember` N:1 `User` — 멤버인 사용자
- `Group` 1:N `Photo` — 모임에 올린 사진들
- `Group` 1:N `PhotoChapter` — AI 생성 챕터들
- `Group` 1:N `Book` — 모임의 포토북들
- `Group` 1:N `CoverVote` — 표지 투표들
- `Group` 1:N `Notification` — 독려 알림들
- `Group` N:1 `Group` (parent) — 반복 모임 연결 (히스토리 아카이브)

## 인덱스
- `idx_groups_invite_code` — invite_code (UNIQUE)
- `idx_groups_owner_id` — owner_id
- `idx_groups_parent_group_id` — parent_group_id
- `idx_group_members_group_user` — (group_id, user_id) UNIQUE

## 업로드 독려 시스템
- `upload_deadline` 설정 시 D-3, D-1에 자동 알림 발송 (Bull Queue 스케줄)
- `group_members.upload_count`로 멤버별 업로드 현황 대시보드 표시
- "사진 아직 안 올리신 분" 일괄 알림: upload_count = 0인 멤버 필터링
- 중복 발송 방지: `last_notified_at` 기준 24시간 이내 재발송 차단

## 멤버 탈퇴 / 모임 해산

### 멤버 자발적 탈퇴
```
1. POST /groups/:groupId/leave
2. 진행 중 주문 확인 (PENDING/PAID/PDF_READY 상태 주문 존재 시)
   - 주문 있음 → ForbiddenException "진행 중인 주문이 있어 탈퇴할 수 없습니다"
   - 주문 없음 → 탈퇴 진행
3. group_members에서 해당 레코드 hard delete
4. 사진 처리: 업로드한 사진은 모임에 유지 (uploader_id 보존)
5. Activity Feed에 MEMBER_LEFT 기록
6. upload_count 등 통계는 자연스럽게 반영 (멤버 목록에서 제외)
```

### 방장(OWNER) 탈퇴 시 위임
- 방장은 바로 탈퇴 불가 → 먼저 방장 위임 필수
- `PATCH /groups/:groupId/transfer-owner` → 다른 멤버에게 OWNER 역할 이전
- 위임 후에야 일반 탈퇴 가능
- 멤버가 방장 1명뿐인 경우 → 모임 해산만 가능

### 멤버 강퇴 (방장 전용)
```
DELETE /groups/:groupId/members/:userId
```
- 방장만 실행 가능 (OWNER role 확인)
- 강퇴 대상에게 알림 발송 (type: 별도 추가 불필요, 단순 안내)
- 진행 중 주문 확인 → 주문 있으면 강퇴 불가
- Activity Feed에 MEMBER_LEFT 기록

### 모임 해산 (방장 전용)
```
DELETE /groups/:groupId
```
- 방장만 실행 가능
- 해산 조건 검증:
  - 진행 중 주문(OrderGroup status: COLLECTING/CONFIRMED/ORDERED)이 없어야 함
  - 조건 미충족 시 → ForbiddenException "진행 중인 주문이 있어 해산할 수 없습니다"
- Soft delete: `groups.status` → `DELETED` (ENUM 값 추가)
- 해산 후:
  - 모임 목록에서 비노출
  - 기존 사진/포토북 데이터는 DB에 보존 (향후 복구 가능)
  - 공유 링크(shared viewer)는 비활성화 (is_shared = false)
  - 모든 멤버에게 해산 알림 발송

### groups.status ENUM 추가
- 기존: `COLLECTING`, `EDITING`, `VOTING`, `ORDERED`, `COMPLETED`
- 추가: `DELETED`

## 히스토리 아카이브
- `parent_group_id`로 반복 모임 연결 ("2024 동창회" → "2025 동창회")
- `year` 필드로 연도별 타임라인 뷰 구성
- 같은 parent_group_id를 가진 모임들을 시간순 나열

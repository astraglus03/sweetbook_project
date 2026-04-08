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

## 히스토리 아카이브
- `parent_group_id`로 반복 모임 연결 ("2024 동창회" → "2025 동창회")
- `year` 필드로 연도별 타임라인 뷰 구성
- 같은 parent_group_id를 가진 모임들을 시간순 나열

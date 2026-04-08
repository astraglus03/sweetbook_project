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
| created_at | TIMESTAMP | DEFAULT NOW() | 생성일 |
| updated_at | TIMESTAMP | DEFAULT NOW() | 수정일 |

### status ENUM 값
- `COLLECTING` — 사진 수집중
- `EDITING` — 포토북 편집중
- `ORDERED` — 주문 완료
- `COMPLETED` — 배송 완료

## group_members 테이블

| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|----------|------|
| id | UUID | PK, auto-generated | 멤버십 고유 ID |
| group_id | UUID | FK → groups.id, NOT NULL | 모임 ID |
| user_id | UUID | FK → users.id, NOT NULL | 사용자 ID |
| role | ENUM | NOT NULL, DEFAULT 'MEMBER' | 역할 |
| joined_at | TIMESTAMP | DEFAULT NOW() | 참여일 |

### role ENUM 값
- `OWNER` — 방장 (모임 생성자)
- `MEMBER` — 일반 멤버

## 관계
- `Group` N:1 `User` (owner) — 모임의 방장
- `Group` 1:N `GroupMember` — 모임의 멤버들
- `GroupMember` N:1 `User` — 멤버인 사용자
- `Group` 1:N `Photo` — 모임에 올린 사진들
- `Group` 1:N `Book` — 모임의 포토북들

## 인덱스
- `idx_groups_invite_code` — invite_code (UNIQUE)
- `idx_groups_owner_id` — owner_id
- `idx_group_members_group_user` — (group_id, user_id) UNIQUE

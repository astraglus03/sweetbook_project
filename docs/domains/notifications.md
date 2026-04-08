# Notifications 도메인 ERD

## notifications 테이블

| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|----------|------|
| id | UUID | PK, auto-generated | 알림 고유 ID |
| group_id | UUID | FK → groups.id, NOT NULL | 관련 모임 ID |
| user_id | UUID | FK → users.id, NOT NULL | 수신 대상 사용자 ID |
| type | ENUM | NOT NULL | 알림 유형 |
| title | VARCHAR(200) | NOT NULL | 알림 제목 |
| message | TEXT | NOT NULL | 알림 내용 |
| is_read | BOOLEAN | DEFAULT false | 읽음 여부 |
| sent_at | TIMESTAMP | DEFAULT NOW() | 발송 시각 |

### type ENUM 값
- `UPLOAD_REMINDER` — 사진 업로드 독려
- `DEADLINE_D3` — 마감 3일 전 알림
- `DEADLINE_D1` — 마감 1일 전 알림
- `DEADLINE_EXPIRED` — 마감일 경과 알림
- `VOTE_STARTED` — 표지 투표 시작
- `VOTE_COMPLETED` — 표지 투표 완료
- `BOOK_READY` — 포토북 제작 완료
- `ORDER_STATUS` — 주문 상태 변경
- `GROUP_INVITE` — 모임 초대

## 관계
- `Notification` N:1 `Group` — 알림이 속한 모임
- `Notification` N:1 `User` — 알림 수신자

## 인덱스
- `idx_notifications_user_id` — user_id
- `idx_notifications_user_read` — (user_id, is_read) — 안 읽은 알림 조회용
- `idx_notifications_group_id` — group_id
- `idx_notifications_type` — type

## 알림 발송 규칙

### 자동 알림 (Bull Queue 스케줄)
- 마감일 D-3: `upload_deadline - 3일` 시점에 upload_count = 0인 멤버에게 발송
- 마감일 D-1: `upload_deadline - 1일` 시점에 upload_count = 0인 멤버에게 발송
- 마감일 경과: `upload_deadline` 지난 후 방장에게 미업로드 멤버 수 알림

### 수동 알림 (방장 트리거)
- "사진 아직 안 올리신 분" 일괄 알림 버튼
- upload_count = 0인 멤버 필터링 후 한번에 발송
- 중복 발송 방지: `group_members.last_notified_at` 기준 24시간 이내 재발송 차단

### 이벤트 기반 알림
- 표지 투표 시작/완료: 전체 멤버에게 발송
- 포토북 제작 완료: 전체 멤버에게 발송
- 주문 상태 변경: 주문자에게 발송

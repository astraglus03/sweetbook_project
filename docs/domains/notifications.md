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

## 알림 채널

### 채널 종류
| 채널 | 설명 | 기본값 |
|------|------|--------|
| `IN_APP` | 앱 내 알림 (notifications 테이블) | ON |
| `EMAIL` | 이메일 알림 | ON (중요 알림만) |

### 채널별 발송 대상
| 알림 type | IN_APP | EMAIL |
|-----------|--------|-------|
| `UPLOAD_REMINDER` | O | O |
| `DEADLINE_D3` | O | O |
| `DEADLINE_D1` | O | O |
| `DEADLINE_EXPIRED` | O | X |
| `VOTE_STARTED` | O | O |
| `VOTE_COMPLETED` | O | X |
| `BOOK_READY` | O | O |
| `ORDER_STATUS` | O | O (배송 시작/완료만) |
| `GROUP_INVITE` | O | O |

### 이메일 발송 인프라
- **이메일 서비스**: Nodemailer + Gmail SMTP (무료, 일 500통 제한)
- **패키지**: `nodemailer` (MIT 라이선스, 무료)
- **발송 방식**: Bull Queue 비동기 처리 (기존 큐 인프라 활용)
- **발신자**: Gmail 계정 (App Password 사용)
- **템플릿**: Handlebars 기반 HTML 이메일 템플릿 (알림 type별 1개씩)
- **개발환경**: Ethereal (가짜 SMTP, 실제 발송 없이 테스트)

### 이메일 환경변수
```
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=groupbook.noreply@gmail.com
MAIL_PASSWORD=xxxx-xxxx-xxxx-xxxx  # Gmail App Password
MAIL_FROM="GroupBook <groupbook.noreply@gmail.com>"
```

### NestJS 이메일 모듈 구조
```
src/common/mail/
├── mail.module.ts        # Nodemailer 설정
├── mail.service.ts       # 발송 로직 (Bull Queue producer)
├── mail.processor.ts     # Bull Queue consumer (비동기 발송)
└── templates/
    ├── upload-reminder.hbs
    ├── deadline-warning.hbs
    ├── vote-started.hbs
    ├── book-ready.hbs
    ├── order-status.hbs
    └── group-invite.hbs
```

### 발송 제한 및 안전장치
- Gmail SMTP: 일 500통, 초당 10통 제한
- Bull Queue `limiter`: `{ max: 10, duration: 1000 }` (초당 10건)
- 실패 시 재시도 3회 (exponential backoff)
- 프로덕션 스케일 시 SendGrid/AWS SES로 교체 (MailService 인터페이스 동일)

## notification_preferences 테이블

| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|----------|------|
| id | UUID | PK, auto-generated | 설정 고유 ID |
| user_id | UUID | FK → users.id, NOT NULL, UNIQUE | 사용자 ID |
| email_enabled | BOOLEAN | DEFAULT true | 이메일 알림 전체 on/off |
| email_upload_reminder | BOOLEAN | DEFAULT true | 업로드 독려 이메일 |
| email_deadline | BOOLEAN | DEFAULT true | 마감일 알림 이메일 |
| email_vote | BOOLEAN | DEFAULT true | 투표 알림 이메일 |
| email_book_ready | BOOLEAN | DEFAULT true | 포토북 완성 이메일 |
| email_order_status | BOOLEAN | DEFAULT true | 주문 상태 이메일 |
| email_group_invite | BOOLEAN | DEFAULT true | 모임 초대 이메일 |
| updated_at | TIMESTAMP | DEFAULT NOW() | 수정일 |

### 인덱스
- `idx_notification_preferences_user_id` — user_id (UNIQUE)

### 이메일 수신 거부 규칙
- 이메일 하단에 "수신 거부" 링크 필수 (정보통신망법)
- 수신 거부 클릭 → `email_enabled = false` 즉시 반영
- 수신 거부 전용 API: `POST /notifications/preferences/unsubscribe?token={jwt}`
  - JWT에 userId 포함, 로그인 없이 처리 가능
  - 토큰 만료: 없음 (영구 유효)

### FE 알림 설정 UI
- Profile Settings(15) 화면에 "알림 설정" 섹션 추가
- 이메일 알림 전체 토글 + 유형별 개별 토글
- 전체 토글 OFF 시 하위 토글 모두 비활성화(disabled) 처리
- 변경 즉시 저장 (debounce 500ms)

### API
```
GET  /notifications/preferences        → 현재 설정 조회
PATCH /notifications/preferences       → 설정 변경
POST /notifications/preferences/unsubscribe?token={jwt}  → 수신 거부 (비로그인)
```

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

# Users 도메인 ERD

## users 테이블

| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|----------|------|
| id | UUID | PK, auto-generated | 사용자 고유 ID |
| email | VARCHAR(255) | UNIQUE, NOT NULL | 이메일 (로그인 ID) |
| password | VARCHAR(255) | NULLABLE | bcrypt 해시 (소셜 로그인 시 null) |
| name | VARCHAR(50) | NOT NULL | 사용자 이름 |
| profile_image | VARCHAR(500) | NULLABLE | 프로필 이미지 URL |
| provider | ENUM('EMAIL','GOOGLE','KAKAO') | NOT NULL, DEFAULT 'EMAIL' | 인증 프로바이더 |
| provider_user_id | VARCHAR(255) | NULLABLE | 소셜 프로바이더 고유 ID |
| created_at | TIMESTAMP | DEFAULT NOW() | 가입일 |
| updated_at | TIMESTAMP | DEFAULT NOW() | 수정일 |

## 관계
- `User` 1:N `GroupMember` — 사용자는 여러 모임에 참여 가능
- `User` 1:N `Photo` — 사용자는 여러 사진 업로드 가능
- `User` 1:N `CoverVote` — 사용자는 표지 투표 가능
- `User` 1:N `Notification` — 사용자는 여러 알림 수신

## 인덱스
- `idx_users_email` — email (UNIQUE)
- `idx_users_provider_id` — (provider, provider_user_id) UNIQUE

## 소셜 로그인 규칙
- 동일 이메일 가입자가 소셜 로그인 시 → 기존 계정에 provider 연동
- 소셜 로그인 사용자: password NULL 허용
- 소셜 연동 해제 시 비밀번호 설정 필수 (로그인 수단 0개 방지)

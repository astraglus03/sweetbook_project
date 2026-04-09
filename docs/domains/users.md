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

## 회원 탈퇴

### 탈퇴 조건 검증
```
1. POST /users/me/withdraw
2. 검증:
   - 진행 중인 주문 확인 (PENDING~SHIPPING 상태)
     → 있으면 ForbiddenException "진행 중인 주문이 있어 탈퇴할 수 없습니다"
   - 방장인 모임 확인
     → 있으면 ForbiddenException "방장인 모임이 있습니다. 방장 위임 후 탈퇴해주세요"
3. 검증 통과 시 탈퇴 진행
```

### 탈퇴 처리 (Soft Delete)
- `users` 테이블에 컬럼 추가:
  - `deleted_at` TIMESTAMP NULLABLE — null이면 활성 계정
  - `is_deleted` BOOLEAN DEFAULT false — 소프트 삭제 플래그
- 탈퇴 시 처리:
  1. `is_deleted = true`, `deleted_at = NOW()`
  2. `email` → `deleted_{uuid}@withdrawn.local` (UNIQUE 제약 해제용)
  3. `name` → `탈퇴한 사용자`
  4. `profile_image` → NULL
  5. `password` → NULL
  6. `provider_user_id` → NULL
  7. Redis refresh token 삭제 + 쿠키 clear (즉시 로그아웃)

### 탈퇴 후 데이터 처리
| 데이터 | 처리 방식 | 이유 |
|--------|----------|------|
| 업로드한 사진 | 모임에 유지, uploader 표시는 "탈퇴한 사용자" | 공동 포토북 무결성 |
| 표지 투표 | 유지 (투표 결과에 영향 없도록) | 투표 집계 무결성 |
| 주문 내역 | 유지 (배송 완료된 건) | 주문/배송 추적 |
| 멤버십 | 모든 group_members hard delete | 모임 목록에서 제거 |
| 알림 | hard delete | 개인 데이터 |
| 알림 설정 | hard delete | 개인 데이터 |

### FE 탈퇴 UI
- Profile Settings(15) 하단에 "회원 탈퇴" 링크 (빨간색 텍스트)
- 탈퇴 클릭 → 확인 모달:
  - "정말 탈퇴하시겠습니까?"
  - 탈퇴 시 처리 내용 안내 (사진 유지, 개인정보 삭제 등)
  - 비밀번호/소셜 재인증 필수
  - "탈퇴합니다" 입력 확인 (오타 방지)

### users 테이블 컬럼 추가

| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|----------|------|
| is_deleted | BOOLEAN | DEFAULT false | 소프트 삭제 플래그 |
| deleted_at | TIMESTAMP | NULLABLE | 탈퇴 처리 시각 |

### 인덱스 추가
- `idx_users_is_deleted` — is_deleted (활성 사용자 필터링용)

### 탈퇴 계정 재가입
- 동일 이메일로 재가입 가능 (기존 email이 변경되므로 UNIQUE 충돌 없음)
- 기존 데이터와 연결 불가 (완전 새 계정)

## 소셜 로그인 규칙
- 동일 이메일 가입자가 소셜 로그인 시 → 기존 계정에 provider 연동
- 소셜 로그인 사용자: password NULL 허용
- 소셜 연동 해제 시 비밀번호 설정 필수 (로그인 수단 0개 방지)

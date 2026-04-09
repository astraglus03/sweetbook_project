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

## user_face_anchors 테이블 (얼굴 앵커)

> 본인의 얼굴 embedding을 저장해두는 테이블. 개인 포토북 자동 생성 시 이 앵커와 사진 속 얼굴들을 유사도 비교하여 "내가 찍힌 사진"을 필터링한다.

| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|----------|------|
| user_id | UUID | PK, FK → users.id | 사용자 ID (1인 1앵커) |
| embedding | FLOAT[] | NOT NULL | 128차원 face embedding |
| source_photo_id | UUID | FK → photos.id, NULLABLE | 앵커 추출 출처 사진 ID |
| source_type | ENUM | NOT NULL | `PROFILE`, `GROUP_PHOTO`, `UPLOAD` |
| updated_at | TIMESTAMP | DEFAULT NOW() | 최종 업데이트 시각 |

### source_type ENUM
- `PROFILE` — 프로필 사진에서 추출 (가입/설정 화면)
- `GROUP_PHOTO` — 모임에 업로드된 사진 중 본인이 "이거 나야" 선택한 사진
- `UPLOAD` — 앵커 등록 전용으로 별도 셀카 업로드

## 관계
- `User` 1:N `GroupMember` — 사용자는 여러 모임에 참여 가능
- `User` 1:N `Photo` — 사용자는 여러 사진 업로드 가능
- `User` 1:N `CoverVote` — 사용자는 표지 투표 가능
- `User` 1:N `Notification` — 사용자는 여러 알림 수신
- `User` 1:1 `UserFaceAnchor` — 본인 얼굴 앵커 (nullable, 등록 전까지 없음)
- `User` 1:N `Book` (owner) — 본인이 소유한 개인 포토북들 (PERSONAL type)

## 인덱스
- `idx_users_email` — email (UNIQUE)
- `idx_users_provider_id` — (provider, provider_user_id) UNIQUE
- `idx_user_face_anchors_user_id` — user_id (PK, 자동)

## 얼굴 앵커 등록 플로우

개인 포토북 기능을 사용하려면 본인의 얼굴 앵커(embedding)가 등록되어 있어야 한다. 3가지 진입점:

### 1) 가입 직후 (UPLOAD)
- 가입 완료 후 "본인 인증 셀카 한 장" 화면으로 유도 (선택 스킵 가능)
- 업로드된 사진에서 face-api.js로 embedding 추출
- 얼굴이 정확히 1개인 경우만 인정, 0개/2개 이상 → 재시도 안내
- `user_face_anchors` insert: `source_type = UPLOAD`

### 2) 모임 참여 후 (GROUP_PHOTO)
- 모임에 사진이 어느정도 올라온 후 "본인 찾기" 배너 노출
- 시스템이 해당 group의 photo_faces 중 matched_user_id=NULL인 얼굴 후보 최대 10개 제시
- 사용자가 "이게 나야" 선택 → 그 얼굴 embedding이 앵커로 저장 (`source_type = GROUP_PHOTO`)
- 동시에 해당 photo_face.matched_user_id = 본인으로 업데이트

### 3) 프로필 사진 교체 시 (PROFILE)
- 프로필 이미지 업로드 시 face-api.js 자동 실행
- 얼굴 1개 감지 → 자동으로 앵커 갱신 (`source_type = PROFILE`)
- 얼굴 0개/2개 이상 → 프로필 이미지만 저장, 앵커는 업데이트 안 함

### 앵커 재등록/삭제
```
PUT    /users/me/face-anchor          새 앵커 등록 or 교체
DELETE /users/me/face-anchor          앵커 삭제 (개인 포토북 기능 off)
POST   /users/me/face-anchor/from-photo   기존 photo_face ID로 앵커 설정 (source_type=GROUP_PHOTO)
```

### 앵커 미등록 시 동작
- 개인 포토북 자동 생성 대상에서 **제외**
- "본인 포토북" 탭에서 "얼굴 앵커를 등록하면 개인 포토북이 자동 생성됩니다" 안내 + 등록 버튼
- 공동 포토북(SHARED)은 정상 이용 가능

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
| 얼굴 앵커 | **user_face_anchors hard delete** | 생체정보, 즉시 파기 |
| photo_faces 매칭 | matched_user_id = NULL로 업데이트 | 개인식별 해제, 얼굴 데이터는 사진 귀속 |
| 개인 포토북 (PERSONAL) | 미주문분 hard delete, 주문 완료분은 owner "탈퇴한 사용자" 표시 후 유지 | 주문 추적 vs 개인정보 |

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

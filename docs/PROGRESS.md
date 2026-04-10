# GroupBook 구현 진행 현황

> 마지막 업데이트: 2026-04-10

## Pen 스토리보드 화면별 구현 상태

### Desktop (1280px)

| # | 화면 | 구현 | FE 파일 | 비고 |
|---|------|:----:|---------|------|
| - | Landing Page | O | `LandingPage.jsx` | |
| - | Login Page | O | `LoginPage.jsx` | 소셜 로그인 가이드, 비밀번호 찾기 링크 |
| 01 | Sign Up | O | `SignupPage.jsx` | |
| 02 | Groups Dashboard | O | `GroupsPage.jsx` | 페이지네이션 |
| 03 | Create Group | O | `CreateGroupPage.jsx` | 풀 페이지, 커버 업로드, 판형 선택 UI |
| 04 | Invite Join | O | `JoinPage.jsx` | 비로그인 → 로그인 → 자동 복귀 |
| 05 | Group Detail | O | `GroupDetailPage.jsx` | 탭(사진/멤버/포토북/주문), 초대링크 복사 |
| 06 | Photo Gallery | O | `PhotoGallery.jsx` | 사이드바 필터, 챕터/업로더 필터, 반응형 그리드 |
| 07 | Photo Upload | O | `PhotoUploadModal.jsx` | 드래그앤드롭, 진행률, 다중 업로드 |
| 08 | Book Templates | - | | |
| 09 | Book Editor | - | `BookEditorPage.jsx` (stub) | |
| 10 | Book Preview | - | | |
| 11 | Cover Voting | - | | |
| 12 | Order Collection | - | | |
| 13 | Order Status | - | `OrdersPage.jsx` (stub) | |
| 14 | Notifications | - | | |
| 15 | Profile & Settings | - | | |
| 16 | Password Reset | O | `ForgotPasswordPage.jsx`, `ResetPasswordPage.jsx` | Redis 토큰, 강도 표시기 |
| 17 | Group Edit / Members | O | `MemberList.jsx`, `GroupSettings.jsx` | 테이블 형식, 초대/강퇴/위임 |
| 18 | Photo Detail Modal | - | | |
| 19 | Book List | - | | |
| 20 | Shared Viewer | - | `SharedViewerPage.jsx` (stub) | |
| 21 | Order History | - | | |
| 22 | Activity Feed | - | | |
| 23 | Book Error | - | | |
| 24 | Order Error | - | | |
| 25 | Book Spec Showcase | - | | |
| 26 | Personal Books | - | | |
| 27 | Face Anchor Setup | - | | |
| 28 | Kakao Import Upload | - | | |
| 29 | Kakao Name Mapping | - | | |

### Mobile (375px)

| # | 화면 | 구현 | 비고 |
|---|------|:----:|------|
| M01 | 로그인 | O | 반응형 (모바일 퍼스트) |
| M02 | 대시보드 | O | BottomTab + 모바일 카드 리스트 |
| M03 | 모임 상세 | O | 탭 UI |
| M04 | 초대 참여 (QR) | O | 기본 참여 UI (QR 미구현) |
| M05 | 사진 업로드 | O | 모달 |
| M06 | 사진 갤러리 | O | 모바일 칩 필터 + 2열 그리드 |
| M07~M10 | 나머지 | - | |
| M11~M19 | 추가 모바일 | - | |

## BE 도메인별 구현 상태

| 도메인 | Entity | Controller | Service | 비고 |
|--------|:------:|:----------:|:-------:|------|
| auth | O | O (8 endpoints) | O | JWT + OAuth + 비밀번호 재설정 + 소셜 분기 |
| users | O | O | O | 프로필, 얼굴 앵커는 미구현 |
| groups | O | O (9 endpoints) | O | CRUD + 초대/참여/탈퇴/위임 |
| photos | O | O (6 endpoints) | O | 업로드(Sharp 리사이징), 갤러리, 챕터 필터 |
| books | △ | stub | stub | |
| orders | △ | stub | stub | |
| notifications | △ | stub | stub | |

## 인프라

| 항목 | 상태 | 비고 |
|------|:----:|------|
| PostgreSQL + TypeORM | O | |
| Redis (refresh token, 세션) | O | 비밀번호 재설정 토큰도 Redis |
| Multer (파일 업로드) | O | memoryStorage + Sharp |
| 정적 파일 서빙 | O | `/uploads/` prefix |
| Nodemailer (이메일) | O | SMTP 미설정 시 콘솔 로그 대체 |
| Swagger | O | `/api/docs` |
| Bull Queue | - | 비동기 처리 미연동 |
| Docker Compose | O | PostgreSQL + Redis |

## 다음 우선순위 (추천)

1. **15 Profile & Settings** — 프로필 수정, 비밀번호 변경, 알림 설정
2. **14 Notifications** — 업로드 독려, 이벤트 알림
3. **08 Book Templates + 09 Book Editor** — Sweetbook Books API 연동
4. **10 Book Preview** — 포토북 미리보기
5. **12-13 Order Collection/Status** — Sweetbook Orders API 연동
6. **11 Cover Voting** — 표지 투표

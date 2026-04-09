# GroupBook 도메인 ERD 참조

이 디렉토리에는 각 도메인의 ERD 설계 문서가 위치합니다.
새로운 도메인 추가 시 반드시 ERD 문서를 함께 생성하세요.

## 🎯 플래그십 차별화 기능

1. **개인 포토북 자동 분배 (Personal Book)** — 얼굴 인식으로 1개 모임에서 멤버 수만큼 서로 다른 포토북 자동 생성. 각자가 주인공인 포토북을 받을 수 있다.
2. **카카오톡 zip 일괄 업로드 (Kakao Import)** — Android 카톡 "대화 내보내기"를 드래그앤드롭 하면 사진 전체를 원본 화질로 한번에 업로드 + 업로더 자동 매칭. 진입 장벽 제로화.

## 도메인 목록

| 도메인 | 파일 | 설명 |
|--------|------|------|
| users | [users.md](./users.md) | 사용자 계정 + 얼굴 앵커 등록 |
| groups | [groups.md](./groups.md) | 모임, 멤버 관리, 업로드 독려, 히스토리 |
| photos | [photos.md](./photos.md) | 사진 업로드/관리, AI 큐레이션, 챕터, **얼굴 인식 (photo_faces)** |
| books | [books.md](./books.md) | 포토북 제작, 표지 투표, 디지털 공유 |
| └ personal-book | [books/personal-book.md](./books/personal-book.md) | **개인 포토북 (얼굴 인식 기반 자동 생성)** |
| └ book-specs | [books/book-specs.md](./books/book-specs.md) | 판형 3종 상세 스펙 + 가격 공식 + 판형 변경 규칙 |
| orders | [orders.md](./orders.md) | 주문 (Sweetbook Orders API), PERSONAL Book 단순 주문 |
| notifications | [notifications.md](./notifications.md) | 업로드 독려 알림, 이벤트 알림 |
| activity_feed | [activity_feed.md](./activity_feed.md) | 모임 활동 타임라인 (개인 알림과 분리) |
| **kakao_import** | [kakao_import.md](./kakao_import.md) | **카카오톡 zip 일괄 업로드 + 이름 매칭** |

## ERD 전체 관계도 (요약)

```
User ──1:N──> GroupMember ──N:1──> Group
User ──1:1──> UserFaceAnchor                    [NEW: 본인 얼굴 embedding]
User ──1:N──> Photo ──N:1──> Group
Photo ──1:N──> PhotoFace ──N:1──> User (matched) [NEW: 사진 속 얼굴들]
Group ──1:N──> PhotoChapter ──1:N──> Photo
Group ──1:N──> Book ──1:N──> BookPage ──N:1──> Photo
Book ──N:1──> User (owner, PERSONAL만)          [NEW: 개인 포토북 소유자]
Book ──N:1──> Photo (cover)
Book ──1:1──> OrderGroup ──1:N──> Order
Group ──1:N──> CoverVote ──N:1──> Photo         (SHARED Book 전용)
CoverVote ──N:1──> User
Group ──1:N──> Notification ──N:1──> User
Group ──1:N──> Activity ──N:1──> User (actor)
Group ──1:N──> KakaoNameMapping                 [NEW: 카톡 이름 ↔ 멤버]
Group ──N:1──> Group (parent, 히스토리 아카이브)
```

## 핵심 기능 → 도메인 매핑

| 기능 | 관련 도메인 |
|------|-------------|
| 모임 생성/초대/멤버 관리 | groups |
| 사진 업로드/갤러리 | photos |
| **카톡 zip 일괄 업로드** | kakao_import, photos |
| **얼굴 인식 + 본인 앵커** | photos (photo_faces), users (user_face_anchor) |
| AI 블러 감지/중복 감지 | photos (Sharp, pHash) |
| AI 베스트 사진 추천 | photos (OpenAI Vision) |
| AI 챕터 자동 분류 | photos (PhotoChapter) |
| 업로드 독려/마감일/알림 | groups, notifications |
| **개인 포토북 자동 생성** | books/personal-book, photos (얼굴 매칭) |
| 표지 투표 (공동 포토북) | books (CoverVote) |
| 공동 포토북 제작 (Books API) | books |
| 디지털 포토북 공유 | books (share_code) |
| 주문 (Orders API) | orders |
| 모임 히스토리 아카이브 | groups (parent_group_id, 타임라인) |

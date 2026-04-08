# GroupBook 도메인 ERD 참조

이 디렉토리에는 각 도메인의 ERD 설계 문서가 위치합니다.
새로운 도메인 추가 시 반드시 ERD 문서를 함께 생성하세요.

## 도메인 목록

| 도메인 | 파일 | 설명 |
|--------|------|------|
| users | [users.md](./users.md) | 사용자 계정 |
| groups | [groups.md](./groups.md) | 모임, 멤버 관리, 업로드 독려, 히스토리 |
| photos | [photos.md](./photos.md) | 사진 업로드/관리, AI 큐레이션, 챕터 |
| books | [books.md](./books.md) | 포토북 제작, 표지 투표, 디지털 공유 |
| orders | [orders.md](./orders.md) | 주문 (Sweetbook Orders API) |
| notifications | [notifications.md](./notifications.md) | 업로드 독려 알림, 이벤트 알림 |

## ERD 전체 관계도 (요약)

```
User ──1:N──> GroupMember ──N:1──> Group
User ──1:N──> Photo ──N:1──> Group
Group ──1:N──> PhotoChapter ──1:N──> Photo
Group ──1:N──> Book ──1:N──> BookPage ──N:1──> Photo
Book ──N:1──> Photo (cover)
Book ──1:1──> Order
Group ──1:N──> CoverVote ──N:1──> Photo
CoverVote ──N:1──> User
Group ──1:N──> Notification ──N:1──> User
Group ──N:1──> Group (parent, 히스토리 아카이브)
```

## 핵심 기능 → 도메인 매핑

| 기능 | 관련 도메인 |
|------|-------------|
| 모임 생성/초대/멤버 관리 | groups |
| 사진 업로드/갤러리 | photos |
| AI 블러 감지/중복 감지 | photos (Sharp, pHash) |
| AI 베스트 사진 추천 | photos (OpenAI Vision) |
| AI 챕터 자동 분류 | photos (PhotoChapter) |
| 업로드 독려/마감일/알림 | groups, notifications |
| 표지 투표 | books (CoverVote) |
| 포토북 제작 (Books API) | books |
| 디지털 포토북 공유 | books (share_code) |
| 주문 (Orders API) | orders |
| 모임 히스토리 아카이브 | groups (parent_group_id, 타임라인) |

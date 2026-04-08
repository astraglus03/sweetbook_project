# GroupBook 도메인 ERD 참조

이 디렉토리에는 각 도메인의 ERD 설계 문서가 위치합니다.
새로운 도메인 추가 시 반드시 ERD 문서를 함께 생성하세요.

## 도메인 목록

| 도메인 | 파일 | 설명 |
|--------|------|------|
| users | [users.md](./users.md) | 사용자 계정 |
| groups | [groups.md](./groups.md) | 모임 및 멤버 관리 |
| photos | [photos.md](./photos.md) | 사진 업로드/관리 |
| books | [books.md](./books.md) | 포토북 (Sweetbook Books API) |
| orders | [orders.md](./orders.md) | 주문 (Sweetbook Orders API) |

## ERD 전체 관계도 (요약)

```
User ──1:N──> GroupMember ──N:1──> Group
User ──1:N──> Photo
Group ──1:N──> Photo
Group ──1:N──> Book
Book ──1:N──> BookPage
BookPage ──N:1──> Photo
Book ──1:1──> Order
```

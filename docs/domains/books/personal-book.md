# 개인 포토북 (Personal Book)

> GroupBook의 **플래그십 차별화 기능**. 한 번의 모임에서 멤버 수만큼의 서로 다른 포토북이 자동으로 생성된다. 각자의 얼굴이 중심이 되는 포토북을 받아볼 수 있다.

## 핵심 개념

- **공동 포토북(SHARED)**: 모임 전원이 동일한 한 권을 받음 (N부 인쇄 = 같은 내용)
- **개인 포토북(PERSONAL)**: 각 멤버가 **서로 다른 내용**의 포토북을 받음 (N권 = N개의 다른 책)

`books.book_type` ENUM으로 구분하며, 한 모임에 SHARED 1개 + PERSONAL N개가 공존 가능하다.

## 자동 생성 파이프라인

방장이 "개인 포토북 자동 생성" 버튼을 누르면 실행되는 배치 로직:

```
INPUT: groupId
  ↓
FOR 각 멤버 m in group.members WHERE m.has_face_anchor = true:
  1. m.face_anchor.embedding 조회
  2. group의 모든 photo_faces JOIN photos
  3. 각 photo_face.embedding과 코사인 유사도 계산
  4. similarity ≥ 0.6 인 photo_id 수집 (set 중복 제거)
  5. IF count(matchedPhotos) < 12 (최소 페이지 충족 불가):
       → skip + 멤버에게 알림 "당신이 찍힌 사진이 부족해 개인 포토북을 만들 수 없었어요"
       → continue
  6. 매칭된 사진들을 AI 큐레이션 파이프라인에 투입:
       - 시간순 정렬 (taken_at)
       - 블러/중복 사진 자동 제외
       - ai_score 기준 상위 N장 (최대 50장 또는 판형 max)
       - AI 챕터 자동 분류 (photo_chapters 재사용)
  7. Book insert:
       - book_type = 'PERSONAL'
       - owner_user_id = m.id
       - status = 'AUTO_GENERATING'
       - book_spec_uid = 'SQUAREBOOK_HC' (기본)
       - template_id = 기본 템플릿 1개 (group 공동과 동일)
  8. BookPage insert × N (시간순 배치)
  9. status = 'READY_TO_REVIEW'
  10. 멤버에게 푸시 알림 "당신의 개인 포토북이 준비됐어요"
```

### 성능
- 1장당 유사도 계산: O(128) = 상수
- 30멤버 × 1000장 = 30,000회 연산 → 1초 이내 (MVP 애플리케이션 레벨)
- 규모 확장 시 pgvector 도입 권장

### 비동기 실행
Bull Queue `personal-book-generation`에 group 단위로 job enqueue:
```
POST /groups/:groupId/books/personal/generate
→ { jobId, expectedBookCount, estimatedSeconds }
```

WebSocket `/ws/groups/:groupId/personal-book-progress`로 진행률 푸시.

## 상태 흐름 (PERSONAL 전용)

공동 포토북(SHARED)의 `DRAFT → UPLOADING → PROCESSING → READY → ORDERED`와 달리 PERSONAL은 표지 투표가 없고 소유자 직접 확정 흐름:

```
AUTO_GENERATING   (얼굴 필터링 + 자동 배치 중, Bull Queue)
  ↓
READY_TO_REVIEW   (owner가 미리보기, 수정 가능)
  ↓
EDITING           (owner가 사진 추가/삭제/순서 변경 중)
  ↓
UPLOADING         (Sweetbook에 사진 업로드 중)
  ↓
PROCESSING        (Sweetbook finalization 중)
  ↓
FINALIZED         (주문 가능, 수정 불가)
  ↓
ORDERED / COMPLETED
```

> `books.status` ENUM에 `AUTO_GENERATING`, `READY_TO_REVIEW`, `FINALIZED` 추가. 기존 SHARED Book은 `DRAFT → EDITING → VOTING → UPLOADING → PROCESSING → READY → ORDERED` 유지.

## 권한 규칙

| 작업 | SHARED Book | PERSONAL Book |
|------|-------------|---------------|
| 편집 (페이지 순서, 사진 추가/삭제) | 방장 + 공동 편집자 | **owner_user_id 본인만** |
| 앱 내 미리보기 | 모임 전원 | **owner 본인만** |
| 공유 링크 `share_code` 발급 | 방장 토글 | owner 토글 |
| 비로그인 `/shared/:code` 뷰어 | 모임 공개 (방장 허용 시) | 기본 비공개, owner 명시적 허용 시 공개 |
| PDF 다운로드 | 주문자 전원 (orderer) | **owner 본인만** (주문 완료 후) |
| 주문 | OrderGroup → 멤버별 배송지 | **owner 1부**만 단일 주문 |
| 삭제 | 방장 | owner 본인 (주문 전까지) |

### 권한 검증 구현
- NestJS Guard로 분리: `@PersonalBookOwnerGuard`
- Guard 내부:
  ```typescript
  if (book.book_type === 'PERSONAL' && book.owner_user_id !== currentUser.id) {
    throw new ForbiddenException('BOOK_PERSONAL_NOT_OWNER', '본인의 개인 포토북만 접근할 수 있습니다');
  }
  ```
- BookService.findOne()에서는 권한 체크 후 반환

## 주문 흐름 (PERSONAL 단순화)

공동 포토북이 OrderGroup(1) → Order(N) 구조라면 개인은:

```
PERSONAL Book
  ↓
OrderGroup 1개 (initiated_by = owner_user_id, 1 Book → 1 Order)
  ↓
Order 1개 (orderer_id = owner_user_id, quantity ≥ 1)
```

- 구조적으로 OrderGroup을 생략해도 되지만 **코드 통일성을 위해 유지**
- owner가 "친구에게도 선물하고 싶어요" 경우 quantity를 높여서 1회 주문 (1~100 제한, Sweetbook 준수)
- 배송지는 owner 본인이 직접 입력, 다른 멤버의 배송지를 받지 않음
- 주문 상태 추적/취소/배송지 수정은 기존 SHARED Book과 동일한 Sweetbook 연동 로직 재사용

## 엣지 케이스

| 케이스 | 처리 |
|--------|------|
| owner가 face anchor 미등록 | 자동 생성 대상에서 제외, "얼굴 앵커 등록 필요" 알림 |
| 매칭된 사진 < 12장 | PERSONAL Book 생성 skip, 멤버에게 알림 |
| 매칭된 사진 > 200장 (A5 max) | ai_score DESC 상위 200장만 선택, "일부 사진은 포함되지 않았습니다" 안내 |
| 동일 모임에서 재생성 | 기존 AUTO_GENERATING/READY_TO_REVIEW 상태 Book이 있으면 덮어쓰기, 그 외 상태(EDITING 이후)는 새 Book으로 생성 |
| owner 탈퇴 | 미주문분 hard delete, 주문 완료분은 "탈퇴한 사용자" 표시 후 유지 |
| 사진이 나중에 추가되어 재매칭 필요 | Book status가 READY_TO_REVIEW일 때만 "사진 새로고침" 버튼 제공 |

## API 엔드포인트

```
POST   /groups/:groupId/books/personal/generate         전체 멤버 대상 일괄 생성 (방장 전용)
POST   /groups/:groupId/books/personal/generate/me      본인 1명 대상 생성 (멤버 본인)
GET    /groups/:groupId/books/personal                  내가 소유한 PERSONAL Book 조회
PATCH  /books/:bookId                                    편집 (owner 전용, @PersonalBookOwnerGuard)
POST   /books/:bookId/refresh-photos                    사진 새로고침 (얼굴 매칭 재실행)
DELETE /books/:bookId                                   삭제 (owner 전용, 주문 전만)
```

## AI 큐레이션 판형 기본값
- 개인 포토북 기본 판형: `SQUAREBOOK_HC` (243×248, 24~130p, 정사각)
- 사진 수가 130장을 초과하면 FE 안내: "사진이 많아요. A5 소프트커버(최대 200p)로 바꿔보시겠어요?"
- 판형 변경은 owner가 EDITING 단계에서 수동으로 수행

## FE 화면 (Pen 참조)
- 데스크탑: `25 Personal Books` (개인 포토북 목록 탭) + `26 Personal Book Preview`
- 모바일: `M18 Personal Books` + `M19 Personal Book Preview`

> 자세한 디자인은 `docs/designs/roupbook-storyboard.pen` 참조.

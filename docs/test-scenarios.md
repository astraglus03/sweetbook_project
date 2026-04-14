# GroupBook 테스트 시나리오 (수동 입력용)

이 문서대로 회원가입 → 모임 생성 → 사진 업로드 → 포토북 편집 → 주문 → 표지 투표 등을 직접 진행하면 모든 핵심 기능을 한 번씩 검증할 수 있습니다.

전부 진행하면 다음 시나리오가 동시에 살아있게 됩니다:
- COLLECTING (사진 모으는 중) + 표지 투표 진행 중
- EDITING (포토북 편집 중)
- ORDERED (주문 완료, 일부 SHIPPED)
- 빈 모임 (방금 생성)
- 카카오 import 1건
- 얼굴 anchor 등록 + 개인 포토북 자동 생성

---

## 0. 사전 준비

| 항목 | 값 |
|------|---|
| BE 배포 URL | `https://sweetbookproject-production.up.railway.app` |
| FE 배포 URL | `https://sweetbook-project.vercel.app` |
| 사진 디렉토리 | `/Users/astraglus/Downloads/test_data` (kakaotalk 사진 9장 + 기타) |
| 카톡 zip 샘플 | (보유한 Android 카톡 대화 zip 1개) |
| 본인 셀카 | 얼굴 anchor 등록용 — 정면 사진 3장 |

이미 등록된 데이터가 있으면 먼저 비우세요 (Railway DB Tables 탭에서 직접 삭제해도 OK):

```sql
TRUNCATE TABLE
  cover_votes, cover_candidates, personal_book_matches, book_pages,
  orders, order_groups, books, photo_faces, user_face_anchor_samples,
  user_face_anchors, photos, group_activities, notifications,
  group_members, groups, users
RESTART IDENTITY CASCADE;
```

Supabase Storage `sweetbook_bucket` 의 `photos/`, `covers/`, `profiles/` 폴더도 비우세요.

Redis도 함께 비웁니다 (refresh token / OAuth state / 캐시 / 웹훅 dedup 전부 초기화):

```bash
# Railway CLI
railway connect Redis
# 프롬프트에서
FLUSHALL
exit

# 또는 redis-cli 한 줄
redis-cli -u redis://default:<비번>@mainline.proxy.rlwy.net:39565 FLUSHALL
```

> Redis를 비우면 기존 로그인 세션이 전부 풀려서 모든 사용자가 다시 로그인해야 합니다 (의도된 동작).

---

## 1. 계정 (8명, 전부 local 회원가입)

OAuth 검증은 별도 1회로 분리 (8.OAuth 검증 섹션). 시나리오 테스트는 전부 local 계정으로 단순화 — `/signup` 페이지에서 차례대로 가입하세요. 비밀번호는 모두 `demo1234`.

| # | 표시 이름 | 이메일 | 비밀번호 | 역할 |
|---|----------|--------|---------|------|
| 1 | 김지현 | `demo01@groupbook.test` | `demo1234` | 봄 동창회 owner |
| 2 | 박서준 | `demo02@groupbook.test` | `demo1234` | 등산 동호회 owner |
| 3 | 이수민 | `demo03@groupbook.test` | `demo1234` | 동창회/등산 양쪽 멤버 |
| 4 | 최도윤 | `demo04@groupbook.test` | `demo1234` | 동창회/등산 멤버 |
| 5 | 정유나 | `demo05@groupbook.test` | `demo1234` | **가족 제주 여행 owner** + 동창회 |
| 6 | 한재민 | `demo06@groupbook.test` | `demo1234` | 동창회/제주 |
| 7 | 윤서연 | `demo07@groupbook.test` | `demo1234` | 등산/사진 동호회 owner |
| 8 | 오준호 | `demo08@groupbook.test` | `demo1234` | 제주 멤버 (얼굴 anchor 후보) |

> 가입 시간 단축 팁: 각 계정마다 새 시크릿 창을 열거나, 같은 창에서 가입 → 로그아웃 → 다음 계정 반복.

---

## 2. 모임 4개 (시나리오)

각 모임은 **다른 상태**로 마감되도록 진행합니다. 시나리오 검증 포인트별로 분리.

### 모임 ① — "2026 봄 동창회" 🟢 COLLECTING + 표지 투표

| 항목 | 값 |
|------|----|
| owner | 김지현(1) |
| 멤버 | 김지현, 박서준, 이수민, 최도윤, 정유나, 한재민 (6명) |
| description | 졸업 10주년 기념 동창회. 사진 모아서 포토북 만들어요! |
| eventDate | 일주일 전 (자유) |
| 업로드 마감 | 7일 후 |
| 사진 | 12장 |
| chapter | "오프닝" 4장 / "단체사진" 4장 / 미분류 4장 |
| 업로더 분포 | 멤버 6명에게 골고루 (각 2장씩) |
| 표지 후보 | 3개 (각각 다른 멤버가 등록) |
| 투표 | 6명이 후보에 분산 투표 (1·2·3·1·2·3 순으로) |

**검증 포인트**:
- 초대코드로 멤버 가입
- chapter 분류 UI
- 업로더 랭킹 (한 사람이 많이 업로드한 경우 vs 골고루)
- 사진 미분류 → "미분류" 챕터 자동 표시
- 표지 후보 등록 + 투표 + 1인 1표 제약
- COLLECTING 상태 모임 카드 UI

### 모임 ② — "주말 등산 동호회" 🟡 EDITING

| 항목 | 값 |
|------|----|
| owner | 박서준(2) |
| 멤버 | 박서준, 이수민, 최도윤, 윤서연 (4명) |
| description | 북한산/도봉산 매주 등반. 분기별 포토북 제작. |
| eventDate | 2주 전 |
| 사진 | 8장 |
| chapter | "정상에서" 4장 / "하산길" 4장 |
| 업로더 분포 | 박서준 3장, 이수민 2장, 최도윤 2장, 윤서연 1장 |
| 포토북 | 1권 생성 (status=DRAFT) |
| 책 제목 | "주말 등산 — 봄" / 부제 "북한산 백운대 정복기" |
| 책 페이지 | 8장 (사진 그대로 1장씩) — 1쪽에 "정상에서" chapter title + caption "백운대 정상에서" |

**검증 포인트**:
- 사진 → 자동 페이지 채우기
- 포토북 에디터에서 페이지 순서 바꾸기 / chapter title 편집
- 업로드 독려 알림 (멤버 중 업로드 0인 사람이 있을 경우)
- EDITING 상태 모임 카드 UI

### 모임 ③ — "가족 제주 여행" 🔴 ORDERED + 일부 SHIPPED

| 항목 | 값 |
|------|----|
| owner | 정유나(5) |
| 멤버 | 정유나, 한재민, 오준호 (3명) |
| description | 4박 5일 제주 여행 추억 |
| eventDate | 한 달 전 |
| 사진 | 10장 |
| chapter | "1일차 - 도착" 5장 / "2일차 - 한라산" 5장 |
| 업로더 분포 | 정유나 4장, 한재민 3장, 오준호 3장 |
| 포토북 | 1권 (status=ORDERED, sweetbookBookUid=mock) |
| 주문 | 3건 (정유나=SHIPPED+운송장 / 한재민=CONFIRMED / 오준호=PAID) |
| 운송장 | `1234567890` / 택배사 CJ |

**검증 포인트**:
- 주문 페이지: 동일 모임 내 멤버별 주문 상태 다양성
- SHIPPED 주문에 운송장 표시 + 추적 링크
- 주문 후 모임 상태 변경 (ORDERED)
- 웹훅 수신 검증 (실제 sandbox 호출 안 했으므로 → "테스트" 섹션 참조)

### 모임 ④ — "사진 동호회 1기" ⚪ 빈 모임

| 항목 | 값 |
|------|----|
| owner | 윤서연(7) |
| 멤버 | 윤서연 1명만 |
| description | 이제 막 시작된 모임 — 사진 0장 |
| eventDate | 일주일 후 (예정) |
| 사진 | **0장** |
| 포토북 | 없음 |

**검증 포인트**:
- 빈 상태 UI (사진 0장 / "사진을 업로드하세요" CTA)
- 멤버 1명일 때 초대 링크 노출
- 빈 모임 카드 UI

---

## 3. 카카오톡 zip Import (모임 ① 에 추가)

별도 모임 만들지 않고 **모임 ①에 카톡 import**로 추가 사진 업로드.

1. 모임 ① 진입 → "카카오톡 사진 가져오기" 버튼
2. Android 카톡 "대화 내보내기" zip 선택 → 드래그앤드롭
3. 진행률 바 → 완료 알림
4. 업로드된 사진들이 모임 갤러리에 표시되는지 확인
5. 업로더 자동 매칭 (zip의 보낸 사람 닉네임 ↔ 멤버 이름 매칭)

**검증 포인트**:
- iOS zip 업로드 시도 → 안내 메시지 ("Android 전용")
- 매칭 안 된 사진은 "알 수 없음" 업로더로 표시
- 큰 zip (50장 이상) 업로드 시 백그라운드 처리 + 진행률 표시

---

## 4. 얼굴 anchor + 개인 포토북 (모임 ③ 에 적용)

플래그십 차별화 기능 검증.

1. 정유나(5) 로그인 → 모임 ③ 진입 → "내 얼굴 등록" 메뉴
2. 본인 정면 셀카 3장 업로드 → anchor 생성 확인
3. 한재민(6) 로그인 → 동일하게 셀카 3장 등록
4. 오준호(8) 로그인 → 셀카 등록 **하지 않음** (검증용)
5. 모임 ③ "개인 포토북 만들기" 실행 → 멤버별 개인 포토북 자동 생성
6. 결과:
   - 정유나 개인 포토북: 정유나가 찍힌 사진만 모임
   - 한재민 개인 포토북: 한재민이 찍힌 사진만
   - 오준호: anchor 미등록이라 생성 안 됨 → 안내 메시지

**검증 포인트**:
- 얼굴 인식 큐 처리 (Bull) — 사진 업로드 직후 photo_faces 테이블 채워지는지
- anchor 임계값(threshold=0.6) 기준 매칭
- excludedByUser 토글 (개인 포토북에서 사진 제외)
- 매칭 점수가 낮은 사진은 자동 제외

---

## 5. 알림 시나리오

각 액션마다 적절한 알림이 발생하는지 확인.

| 트리거 | 알림 받는 대상 | 알림 종류 |
|--------|--------------|----------|
| 멤버 가입 | owner | "박서준님이 모임에 참여했어요" |
| 사진 업로드 5장 이상 | 다른 멤버 전원 | "새 사진 N장이 추가되었어요" |
| 표지 투표 시작 | 모임 멤버 전원 | "표지 투표가 시작되었어요" |
| 업로드 마감 24h 전 | 미업로드 멤버 | "업로드 마감이 임박했어요" |
| 포토북 편집 완료 | 모임 멤버 전원 | "포토북이 완성되었어요" |
| 주문 결제 완료 | orderer | "주문이 완료되었어요" |
| `production.confirmed` 웹훅 | orderer | "제작 예정일 04-17" |
| `shipping.departed` 웹훅 | orderer | "포토북이 발송되었어요 (운송장: 1234567890)" |
| `shipping.delivered` 웹훅 | orderer | "포토북이 도착했어요" |

**검증 포인트**:
- 알림 페이지 unread/all 토글
- 클릭 시 해당 모임/주문으로 이동
- 읽음 처리 후 unread count 감소

---

## 6. Sweetbook 웹훅 테스트

실제 주문 안 했어도 sandbox 웹훅 endpoint 호출로 시뮬레이션 가능.

```bash
# 모임 ③의 첫 번째 주문(정유나) sweetbookOrderUid 를 DB에서 조회 후 사용
ORDER_UID="<DB의 sweetbookOrderUid 값>"

# production.confirmed
curl -X POST https://api-sandbox.sweetbook.com/v1/webhooks/test \
  -H "Authorization: Bearer SBBU8H0YCW5N.<secret>" \
  -H "Content-Type: application/json" \
  -d "{\"eventType\":\"production.confirmed\",\"orderUid\":\"$ORDER_UID\"}"

# shipping.departed
curl -X POST https://api-sandbox.sweetbook.com/v1/webhooks/test \
  -H "Authorization: Bearer SBBU8H0YCW5N.<secret>" \
  -H "Content-Type: application/json" \
  -d "{\"eventType\":\"shipping.departed\",\"orderUid\":\"$ORDER_UID\"}"
```

각 호출 후 **알림 수신 + 주문 상태 변경 + 운송장 표시** 확인.

---

## 7-1. OAuth 검증 (별도 1회, 본인 계정으로)

위 시나리오는 모두 local 계정이라 OAuth 흐름이 빠집니다. **본인 Google / Kakao 계정으로 별도 1번씩**만 검증하면 충분합니다.

1. 시크릿 창 열기 → `/login`
2. "Google로 로그인" 클릭 → 본인 Google 계정 선택 → 동의 → 자동 로그인 + `/groups` 이동 확인
3. 로그아웃 → 다시 로그인하면 새 가입이 아니라 기존 계정으로 들어가는지 확인 (provider+providerUserId upsert)
4. 같은 흐름을 Kakao 로도 1회

**검증 포인트**:
- 콜백 후 httpOnly Cookie 정상 발급
- 동일 이메일 기존 가입자(local) → 자동 연동되는 경우 처리
- 에러 시 `?error=oauth_failed` 쿼리로 로그인 페이지 복귀

---

## 7. 에러/경계 케이스

| 케이스 | 어떻게 트리거 | 기대 결과 |
|--------|--------------|---------|
| 잘못된 초대코드 | `/join/INVALID` 진입 | "초대코드를 찾을 수 없어요" |
| 만료된 초대링크 | uploadDeadline 지난 모임의 초대코드 | "마감된 모임이에요" |
| 10MB 초과 사진 | 큰 파일 업로드 시도 | "파일 크기가 10MB를 초과합니다" |
| HEIC 업로드 | iPhone HEIC 파일 | "지원하지 않는 파일 형식입니다" |
| 본인 사진이 아닌 것 삭제 | 다른 멤버 사진 삭제 시도 | 403 "본인이 업로드한 사진만 삭제할 수 있습니다" |
| 빈 모임 포토북 생성 | 모임 ④에서 포토북 만들기 | "사진을 먼저 업로드해주세요" |
| 표지 투표 1인 2표 | 같은 모임 다른 후보에 또 투표 | UI에서 막힘 또는 409 |
| 주문 취소 (PAID 상태) | 모임 ③ 한재민 주문 취소 | "취소되었습니다" + 환불 알림 |
| 주문 취소 (SHIPPED 상태) | 모임 ③ 정유나 주문 취소 시도 | "이미 발송된 주문은 취소할 수 없습니다" |
| Access Token 만료 | 16분 대기 후 API 호출 | 자동 refresh → 정상 응답 |
| 동시 사진 업로드 (병렬) | 한 번에 10장 업로드 | 모두 성공 + 큐 처리 |

---

## 8. 반응형 UI 검증

각 페이지를 모바일(375px) + 태블릿(768px) + 데스크톱(1280px)에서 확인.

| 페이지 | 모바일 | 데스크톱 |
|--------|-------|---------|
| 모임 목록 | 1열 카드 | 3열 카드 |
| 사진 갤러리 | 2열 | 4~5열 |
| 포토북 에디터 | 캔버스 + 하단 시트 | 3패널 |
| 하단 탭 (모바일) | 보임 | `lg:hidden` |
| 상단 네비 (데스크톱) | `hidden lg:block` | 보임 |
| 로그인 | 풀너비 | 좌우 분할 (브랜딩 + 폼) |
| 주문 페이지 | 카드형 리스트 | 테이블 |

---

## 9. 검증 체크리스트 (최종)

스크린샷이나 짧은 메모로 다음 항목 OK 표시:

- [ ] OAuth 로그인 (Google + Kakao) 양쪽 다 됨
- [ ] local 회원가입 + 로그인
- [ ] 4개 모임 모두 다른 상태 살아있음
- [ ] 카톡 zip import 1건 성공
- [ ] 얼굴 anchor 등록 + 개인 포토북 자동 생성
- [ ] 표지 투표 결과 집계
- [ ] 포토북 편집 → 주문 → 웹훅 수신 → 알림 도착 풀 플로우
- [ ] 빈 모임 / 빈 갤러리 / 빈 알림 UI
- [ ] 모바일 + 데스크톱 반응형 양쪽 OK
- [ ] 에러 케이스 (10MB 초과, HEIC, 403, 409 등) 핸들링
- [ ] 알림 unread → 클릭 → read 흐름
- [ ] 주문 취소 (PAID 상태만 가능)

---

## 부록 — 데이터 직접 입력 시 SQL 템플릿

UI 통해 입력하기 귀찮은 항목 (활동 로그, 알림 등)은 SQL로 직접 넣어도 됨.

```sql
-- 알림 직접 추가
INSERT INTO notifications ("userId", "groupId", type, title, message, "isRead")
VALUES (1, 1, 'COVER_VOTE', '표지 투표가 시작되었어요', '내가 좋아하는 표지에 투표하세요', false);

-- 모임 활동 로그
INSERT INTO group_activities ("groupId", "actorUserId", type, payload)
VALUES (1, 1, 'PHOTO_UPLOADED', '{"count": 12}'::jsonb);

-- 주문 상태 강제 변경 (웹훅 안 호출하고 SHIPPED 만들기)
UPDATE orders
SET status = 'SHIPPED',
    "trackingNumber" = '1234567890',
    "carrierCode" = 'CJ',
    "shippedAt" = NOW()
WHERE id = <order_id>;
```

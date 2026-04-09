# Orders 도메인 ERD

## order_groups 테이블

| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|----------|------|
| id | UUID | PK, auto-generated | 주문 그룹 고유 ID |
| book_id | UUID | FK → books.id, NOT NULL, UNIQUE | 포토북 ID |
| group_id | UUID | FK → groups.id, NOT NULL | 모임 ID |
| initiated_by | UUID | FK → users.id, NOT NULL | 주문 시작한 사용자 (방장) |
| estimated_price | DECIMAL(10,2) | NULLABLE | 1권당 예상 금액 (견적) |
| status | ENUM | NOT NULL, DEFAULT 'COLLECTING' | 주문 그룹 상태 |
| created_at | TIMESTAMP | DEFAULT NOW() | 생성일 |
| updated_at | TIMESTAMP | DEFAULT NOW() | 수정일 |

### status ENUM 값 (OrderGroup)
- `COLLECTING` — 멤버별 배송 정보 수집중
- `CONFIRMED` — 전원 입력 완료, 주문 진행 가능
- `ORDERED` — Sweetbook 주문 완료
- `CANCELLED` — 취소됨

## orders 테이블

| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|----------|------|
| id | UUID | PK, auto-generated | 주문 고유 ID |
| order_group_id | UUID | FK → order_groups.id, NOT NULL | 소속 주문 그룹 |
| orderer_id | UUID | FK → users.id, NOT NULL | 주문자 (멤버 각자) |
| status | ENUM | NOT NULL, DEFAULT 'PENDING' | 개별 주문 상태 |
| sweetbook_order_id | VARCHAR(100) | NULLABLE, UNIQUE | Sweetbook API 응답 order ID |
| idempotency_key | VARCHAR(100) | UNIQUE, NOT NULL | 멱등성 키 (이중 차감 방지) |
| quantity | INTEGER | NOT NULL, DEFAULT 1 | 주문 수량 |
| recipient_name | VARCHAR(50) | NOT NULL | 수령인 이름 |
| recipient_phone | VARCHAR(20) | NOT NULL | 수령인 연락처 |
| recipient_address | VARCHAR(500) | NOT NULL | 배송 주소 |
| recipient_zip_code | VARCHAR(10) | NOT NULL | 우편번호 |
| total_price | DECIMAL(10,2) | NULLABLE | 총 금액 |
| ordered_at | TIMESTAMP | NULLABLE | 주문 확정 시각 |
| created_at | TIMESTAMP | DEFAULT NOW() | 생성일 |
| updated_at | TIMESTAMP | DEFAULT NOW() | 수정일 |

### status ENUM 값 (Order) — Sweetbook 상태 코드 매핑
| 내부 상태 | Sweetbook 코드 | 설명 |
|-----------|---------------|------|
| `PENDING` | - (내부 전용) | 배송 정보 입력 대기 (Sweetbook 주문 전) |
| `SUBMITTING` | - (내부 전용) | Sweetbook POST /orders 호출 중 (멱등성 보호 윈도우) |
| `PAID` | 20 | 결제 완료 (충전금 차감) |
| `PDF_READY` | 25 | PDF 생성 완료 |
| `CONFIRMED` | 30 | 제작 확정 (인쇄일 배정) |
| `IN_PRODUCTION` | 40 | 제작 진행중 |
| `ITEM_COMPLETED` | 45 | 개별 아이템 제작 완료 (다중 item 주문 시) |
| `PRODUCTION_COMPLETE` | 50 | 전체 제작 완료 |
| `SHIPPED` | 60 | 발송 완료 |
| `DELIVERED` | 70 | 배송 완료 |
| `CANCELLED` | 80 | 취소됨 |
| `CANCELLED_REFUND` | 81 | 환불 완료 |
| `ERROR` | 90 | 오류 발생 |

> **주의**: Sweetbook API는 주문 생성 즉시 `PAID(20)` 상태. `PENDING`/`SUBMITTING`은 우리 서비스 내부에서만 사용.
> - `PENDING`: 배송정보 수집 중 (Sweetbook 호출 전)
> - `SUBMITTING`: Sweetbook API 호출 진행 중. 멱등성 키 보호 구간. 동일 요청 재진입 시 상태 확인만 하고 return.

## 관계
- `OrderGroup` 1:1 `Book` — 주문 그룹이 연결된 포토북
- `OrderGroup` N:1 `Group` — 주문 그룹이 속한 모임
- `OrderGroup` N:1 `User` (initiated_by) — 주문 시작한 방장
- `OrderGroup` 1:N `Order` — 멤버별 개별 주문들
- `Order` N:1 `User` (orderer) — 주문한 멤버

## 인덱스
- `idx_order_groups_book_id` — book_id (UNIQUE)
- `idx_order_groups_group_id` — group_id
- `idx_orders_order_group_id` — order_group_id
- `idx_orders_orderer_id` — orderer_id
- `idx_orders_sweetbook_order_id` — sweetbook_order_id (UNIQUE)
- `idx_orders_idempotency_key` — idempotency_key (UNIQUE)
- `idx_orders_status` — status

## 주문 플로우
```
1. 방장이 포토북 finalization 완료 (Book status: READY)
2. GET /credits → 충전금 잔액 확인
3. POST /orders/estimate → 1권당 가격 견적 조회
4. OrderGroup 생성 (status: COLLECTING)
5. 멤버 각자 배송 정보 입력 → 개별 Order 생성 (status: PENDING)
6. 방장이 최종 확인 → OrderGroup status: CONFIRMED
7. 멤버별로 Sweetbook POST /orders 호출 (Idempotency-Key 필수!)
   → 성공: Order status: PAID + sweetbook_order_id 저장
   → 실패(402): 충전금 부족 에러 → balance 정보 파싱 후 사용자 안내
8. Webhook으로 상태 변경 수신 (또는 GET /orders/{orderUid} 폴링)
   PAID(20) → PDF_READY(25) → CONFIRMED(30) → IN_PRODUCTION(40)
   → PRODUCTION_COMPLETE(50) → SHIPPED(60) → DELIVERED(70)
```

## 402 Payment Required — 충전금 부족 응답

Sweetbook은 잔액 부족 시 에러 본문에 상세 정보를 포함한다. 우리는 이걸 파싱해서 사용자에게 **정확한 부족 금액**을 안내해야 한다.

```json
// POST /orders 실패 응답 예시 (HTTP 402)
{
  "success": false,
  "errors": [{
    "code": "INSUFFICIENT_CREDITS",
    "message": "Insufficient credit balance",
    "required": 28500,
    "current": 15000,
    "currency": "KRW"
  }]
}
```

**서비스 처리**:
- `ExternalApiException`으로 래핑하되 `balance` 필드 보존
- FE에 `ORDER_INSUFFICIENT_CREDITS` 에러코드 + `{ required, current, shortfall }` 데이터 전달
- 사용자 화면: "충전금이 **13,500원** 부족해요" (shortfall = required - current)
- 주문 생성 전 `GET /credits`로 **사전 차단**하는 게 1차 방어선, 402는 2차 fallback

## Sweetbook Orders API 상세

### POST /orders — 주문 생성
```json
// Headers
{ "Authorization": "Bearer API_KEY", "Idempotency-Key": "order-{bookId}-{userId}-{timestamp}" }

// Request Body
{
  "items": [{ "bookUid": "bk_xxx", "quantity": 1 }],
  "shipping": {
    "recipientName": "홍길동",
    "recipientPhone": "010-1234-5678",
    "postalCode": "06101",
    "address1": "서울시 강남구 테헤란로 123",
    "address2": "4층 401호",
    "memo": "부재시 경비실"
  },
  "externalRef": "groupbook-order-{orderId}"
}
```

**필드 제약 (공식 문서 기준):**
- `items[].quantity`: **1~100** (범위 초과 시 400)
- `items[].bookUid`: FINALIZED 상태의 책만 허용 (DRAFT 상태는 400)
- `externalRef`: 최대 100자, 우리 서비스의 `orders.id` UUID 전달 (웹훅 매칭용)
- `shipping`: 모든 필드 필수 (`memo`, `address2` 제외)

### POST /orders/estimate — 가격 견적
- items[].bookUid + items[].quantity로 견적 조회
- FINALIZED 상태 책만 허용

### GET /orders — 주문 목록 조회
**필터 파라미터**:
- `status` — 주문 상태 코드 (20, 25, 30, ...)
- `from` / `to` — 생성일 기준 날짜 범위 (ISO 8601)
- `limit` / `offset` — 페이지네이션 (최대 100)

**용도**: 관리자 대시보드, 우리 DB와 Sweetbook 서버 동기화 cron

### GET /orders/{orderUid} — 주문 상태 조회
- 폴링 방식 상태 추적 (웹훅 fallback)
- 응답: `orderStatus`, `items[].itemStatus`, `tracking` 정보 포함

### POST /orders/{orderUid}/cancel — 주문 취소
- **PAID(20) 또는 PDF_READY(25) 상태에서만 가능**
- CONFIRMED(30) 이후 취소 불가 → ForbiddenException
- Request: `{ "cancelReason": "고객 요청에 의한 취소" }`
- 취소 시 충전금 즉시 환불

### PATCH /orders/{orderUid}/shipping — 배송지 수정
- **PAID(20) ~ CONFIRMED(30) 상태에서만 가능** (발송 전)
- 부분 수정 지원 (변경 필드만 전송)
- Request: `{ "recipientName": "김영희", "address1": "서울시 서초구..." }`

## 멤버별 개별 배송
- Sweetbook API는 주문 1개 = 배송지 1개
- 멤버마다 다른 주소로 받으려면 멤버 수만큼 Sweetbook 주문 각각 생성
- OrderGroup이 이들을 묶는 상위 엔티티

## PERSONAL Book 주문 흐름 (단순화)

공동 포토북(SHARED)의 `OrderGroup 1 → Order N` 구조와 달리, 개인 포토북은 owner 본인 1명만 주문하므로 구조가 단순화된다. 단, 코드 통일성을 위해 OrderGroup 엔티티는 유지한다.

```
PERSONAL Book (book_type='PERSONAL', owner_user_id=m)
  ↓
OrderGroup (initiated_by=m, book 1:1)
  ↓
Order 1개
  - orderer_id = m (owner와 동일)
  - quantity ≥ 1 (owner가 친구 선물용으로 quantity 증가 가능, 1~100 제한)
  - recipient_*는 owner가 직접 입력
```

### 권한 규칙
- PERSONAL Book의 OrderGroup 생성/조회/결제는 **owner_user_id 본인만** 가능
- Guard: `@PersonalBookOwnerGuard` 적용 (상위 Book 소유권 검증)
- 다른 멤버가 이 OrderGroup에 배송지 입력하려 시도 시 `ForbiddenException`

### 단순화된 API
```
POST /books/:bookId/orders    PERSONAL Book 주문 (quantity + shipping)
GET  /books/:bookId/orders    본인 주문 내역 조회 (PERSONAL인 경우 1개만 반환)
```

### quantity 활용
- Sweetbook `items[].quantity`: 1~100 제한 (공식 문서 기준)
- 단일 배송지로 여러 권 인쇄 가능 ("친구 3명에게 선물" → quantity=3)
- 여러 배송지로 나눠 보내려면 별도 OrderGroup 생성 (각각 1권씩)

## 취소 규칙
- `PAID(20)`, `PDF_READY(25)` 상태에서만 취소 가능 (Sweetbook API 기준)
- `CONFIRMED(30)` 이후 취소 불가 → ForbiddenException
- 개별 Order만 취소 가능 (다른 멤버 주문에 영향 없음)
- 취소 시 cancelReason 필수 (최대 500자)
- 취소 → 충전금 즉시 환불 → status: `CANCELLED_REFUND(81)`

## 배송지 수정 규칙
- `PAID(20)` ~ `CONFIRMED(30)` 상태에서만 수정 가능
- `IN_PRODUCTION(40)` 이후 수정 불가
- 부분 수정 지원: 변경할 필드만 전송
- 수정 가능 필드: recipientName, recipientPhone, postalCode, address1, address2, memo

## 가격 구조
- **상품금액**: `priceBase + ((pageCount - pageMin) / pageIncrement) * pricePerIncrement`
- **배송비**: 3,000원/건
- **포장비**: 별도 (해당 시)
- **VAT**: 10% 포함
- **총액**: `totalProductAmount + totalShippingFee + totalPackagingFee` (VAT 포함)
- Sweetbook 충전금(크레딧)에서 차감

## 멱등성 키
- 주문 생성 시 반드시 고유한 `idempotency_key` 생성
- 형식: `order-{bookId}-{userId}-{timestamp}`
- Sweetbook API 헤더에 `Idempotency-Key`로 전달
- 이중 요청 시 같은 결과 반환 (충전금 이중 차감 방지)

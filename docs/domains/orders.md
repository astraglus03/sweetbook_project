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
| `PAID` | 20 | 결제 완료 (충전금 차감) |
| `PDF_READY` | 25 | PDF 생성 완료 |
| `CONFIRMED` | 30 | 제작 확정 (인쇄일 배정) |
| `IN_PRODUCTION` | 40 | 제작 진행중 |
| `PRODUCTION_COMPLETE` | 50 | 제작 완료 |
| `SHIPPED` | 60 | 발송 완료 |
| `DELIVERED` | 70 | 배송 완료 |
| `CANCELLED` | 80 | 취소됨 |
| `CANCELLED_REFUND` | 81 | 환불 완료 |
| `ERROR` | 90 | 오류 발생 |

> **주의**: Sweetbook API는 주문 생성 즉시 `PAID(20)` 상태. `PENDING`은 우리 서비스 내부에서 배송정보 수집 중인 상태로만 사용.

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
   → 실패(402): 충전금 부족 에러 → 사용자에게 안내
8. Webhook으로 상태 변경 수신 (또는 GET /orders/{orderUid} 폴링)
   PAID(20) → PDF_READY(25) → CONFIRMED(30) → IN_PRODUCTION(40)
   → PRODUCTION_COMPLETE(50) → SHIPPED(60) → DELIVERED(70)
```

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

### POST /orders/estimate — 가격 견적
- items[].bookUid + items[].quantity로 견적 조회

### GET /orders/{orderUid} — 주문 상태 조회
- 폴링 방식 상태 추적 (웹훅 fallback)
- 응답: orderStatus, items[].itemStatus, tracking 정보

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

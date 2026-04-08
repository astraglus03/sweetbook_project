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

### status ENUM 값 (Order)
- `PENDING` — 배송 정보 입력 대기
- `PAID` — 결제 완료 (Sweetbook 충전금 차감)
- `PDF_READY` — PDF 생성 완료
- `PRODUCING` — 제작중
- `SHIPPING` — 배송중
- `DELIVERED` — 배송 완료
- `CANCELLED` — 취소됨

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
2. POST /orders/estimate로 1권당 가격 견적 조회
3. OrderGroup 생성 (status: COLLECTING)
4. 멤버 각자 배송 정보 입력 → 개별 Order 생성 (status: PENDING)
5. 방장이 최종 확인 → OrderGroup status: CONFIRMED
6. 멤버별로 Sweetbook POST /orders 호출 (Idempotency-Key 필수!)
7. 성공 → Order status: PAID + sweetbook_order_id 저장
8. Webhook 또는 폴링으로 PRODUCING → SHIPPING → DELIVERED 추적
```

## 멤버별 개별 배송
- Sweetbook API는 주문 1개 = 배송지 1개
- 멤버마다 다른 주소로 받으려면 멤버 수만큼 Sweetbook 주문 각각 생성
- OrderGroup이 이들을 묶는 상위 엔티티

## 취소 규칙
- `PAID`, `PDF_READY` 상태에서만 취소 가능 (Sweetbook API 기준)
- `PRODUCING` 이후 취소 불가 → ForbiddenException
- 개별 Order만 취소 가능 (다른 멤버 주문에 영향 없음)

## 멱등성 키
- 주문 생성 시 반드시 고유한 `idempotency_key` 생성
- 형식: `order-{bookId}-{userId}-{timestamp}`
- Sweetbook API 헤더에 `Idempotency-Key`로 전달
- 이중 요청 시 같은 결과 반환 (충전금 이중 차감 방지)

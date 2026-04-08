# Orders 도메인 ERD

## orders 테이블

| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|----------|------|
| id | UUID | PK, auto-generated | 주문 고유 ID |
| book_id | UUID | FK → books.id, NOT NULL, UNIQUE | 포토북 ID |
| orderer_id | UUID | FK → users.id, NOT NULL | 주문자 ID |
| status | ENUM | NOT NULL, DEFAULT 'PENDING' | 주문 상태 |
| sweetbook_order_id | VARCHAR(100) | NULLABLE, UNIQUE | Sweetbook API 응답 order ID |
| quantity | INTEGER | NOT NULL, DEFAULT 1 | 주문 수량 |
| recipient_name | VARCHAR(50) | NOT NULL | 수령인 이름 |
| recipient_phone | VARCHAR(20) | NOT NULL | 수령인 연락처 |
| recipient_address | VARCHAR(500) | NOT NULL | 배송 주소 |
| recipient_zip_code | VARCHAR(10) | NOT NULL | 우편번호 |
| total_price | DECIMAL(10,2) | NULLABLE | 총 금액 |
| ordered_at | TIMESTAMP | NULLABLE | 주문 확정 시각 |
| created_at | TIMESTAMP | DEFAULT NOW() | 생성일 |
| updated_at | TIMESTAMP | DEFAULT NOW() | 수정일 |

### status ENUM 값
- `PENDING` — 주문 대기 (배송 정보 입력 중)
- `CONFIRMED` — 주문 확정 (Sweetbook API 전송 완료)
- `PRODUCING` — 제작중
- `SHIPPING` — 배송중
- `DELIVERED` — 배송 완료
- `CANCELLED` — 취소됨

## 관계
- `Order` 1:1 `Book` — 주문된 포토북
- `Order` N:1 `User` (orderer) — 주문한 사용자

## 인덱스
- `idx_orders_book_id` — book_id (UNIQUE)
- `idx_orders_orderer_id` — orderer_id
- `idx_orders_sweetbook_order_id` — sweetbook_order_id (UNIQUE)
- `idx_orders_status` — status

## Sweetbook Orders API 연동
- 주문 생성 시 `SweetbookApiService.createOrder()` 호출
- 응답의 `order_id`를 `sweetbook_order_id`에 저장
- 주문 상태 조회: `SweetbookApiService.getOrderStatus()` (폴링)

## 주문 플로우
```
1. 방장이 포토북 완성 (Book status: READY)
2. 주문 정보 입력 (수량, 배송지)
3. Order 생성 (status: PENDING)
4. Sweetbook Orders API 호출
5. 성공 → status: CONFIRMED + sweetbook_order_id 저장
6. 상태 폴링으로 PRODUCING → SHIPPING → DELIVERED 추적
```

## 취소 규칙
- `PENDING`, `CONFIRMED` 상태에서만 취소 가능
- `PRODUCING` 이후 취소 불가 → ForbiddenException

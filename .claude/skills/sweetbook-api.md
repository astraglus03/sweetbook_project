# Sweetbook API 연동 스킬

## 개요
Sweetbook Book Print API를 통해 포토북 생성 및 주문을 처리한다.
반드시 `SweetbookApiService`를 통해서만 외부 API를 호출한다.

## 사용 가능한 상품 (BookSpecs)
| bookSpecUid | 상품명 | 페이지 범위 | 시작가 |
|-------------|--------|-------------|--------|
| SQUAREBOOK_HC | 고화질 스퀘어북 | 24~130p | 19,800원 |
| LAYFLAT_HC | 레이플랫북 | 16~46p | 미공개 |
| SLIMALBUM_HC | 슬림앨범 | 20~30p | 미공개 |

달력, 퍼즐, 액자 등은 파트너 API에 없음. **포토북만 가능.**

## 포토북 생성 전체 플로우 (필수 순서)
```
1. GET /book-specs          → 판형 선택 (SQUAREBOOK_HC 등)
2. GET /templates           → 표지/내지 템플릿 선택
3. POST /books              → 빈 책 생성 (draft)
4. POST /books/{uid}/photos → 사진 업로드 (Sweetbook 서버로)
5. POST /books/{uid}/cover  → 표지 추가 (투표 결과 사진)
6. POST /books/{uid}/contents (반복) → 내지 페이지 추가
7. POST /books/{uid}/finalization    → 최종화 (이후 수정 불가!)
8. POST /orders/estimate    → 가격 견적 조회
9. POST /orders             → 주문 생성 (충전금 즉시 차감)
```

**이 순서를 반드시 지켜야 함:**
- finalize 전에는 주문 불가
- finalize 후에는 내용 수정 불가

## 사용할 API 전체 목록
| API | 엔드포인트 | 언제 사용 |
|-----|-----------|-----------|
| BookSpecs 조회 | GET /book-specs | 포토북 생성 전 판형 선택 |
| Templates 조회 | GET /templates | 표지/내지 디자인 선택 |
| 책 생성 | POST /books | 방장이 포토북 제작 시작 |
| 사진 업로드 | POST /books/{uid}/photos | 사진을 Sweetbook 서버에 업로드 |
| 표지 추가 | POST /books/{uid}/cover | 표지 투표 확정 후 |
| 내지 추가 | POST /books/{uid}/contents | 챕터별 사진 페이지 생성 |
| 최종화 | POST /books/{uid}/finalization | 편집 완료, 주문 직전 |
| 가격 견적 | POST /orders/estimate | 주문 전 멤버에게 금액 고지 |
| 주문 생성 | POST /orders | 충전금 차감 + 인쇄 시작 |
| 주문 조회 | GET /orders/{uid} | 주문 상태 추적 |
| 주문 취소 | POST /orders/{uid}/cancel | PAID/PDF_READY 상태에서만 |
| Webhook 수신 | (수신 서버 구현) | 주문 상태 변경 → 멤버 알림 |

## 핵심 규칙

### 멱등성 키 (Idempotency-Key) — 필수!
주문 생성 시 반드시 `Idempotency-Key` 헤더 포함. 없으면 충전금 이중 차감 위험.
```typescript
headers: {
  'Idempotency-Key': `order-${bookId}-${Date.now()}`
}
```

### 사진 업로드 2단계
```
1. 멤버가 우리 서버에 업로드 → 로컬 저장 + DB 기록
2. 포토북 제작 시 우리 서버 → Sweetbook /books/{uid}/photos로 재업로드
3. Sweetbook이 반환하는 fileName을 contents API에서 사용
```

### 판형별 페이지 규칙
- SQUAREBOOK_HC: 최소 24페이지 → 사진 부족 시 finalization 에러
- AI 큐레이션 시 페이지 수 계산에 최소 페이지 규칙 반영 필수

### 주문 1개 = 배송지 1개
멤버마다 다른 배송지로 받으려면 멤버 수만큼 주문을 각각 생성해야 함.
```
OrderGroup (우리 DB)
├── Order_김민석 → Sweetbook Order (배송지: 김민석 집)
├── Order_이지수 → Sweetbook Order (배송지: 이지수 집)
└── Order_박준호 → Sweetbook Order (배송지: 박준호 집)
```

### 기타
- 모든 요청/응답 로깅 필수
- timeout 설정 필수 (기본 10초)
- 실패 시 `ExternalApiException`으로 래핑 (raw error throw 금지)
- 응답 데이터 타입 검증 후 사용
- API Key는 BE 환경변수에서만 관리 (FE 노출 절대 금지)
- Sandbox 환경 사용 (실제 인쇄/배송 없음)

## 환경변수
```env
SWEETBOOK_API_URL=https://api.sweetbook.com
SWEETBOOK_API_KEY=your_api_key_here
```

## 비동기 처리 (Bull Queue)
포토북 생성은 사진 업로드 + finalization 포함 시간이 걸림.
1. Controller → Service에서 Job 생성
2. Processor에서 사진 업로드 → 표지/내지 추가 → finalization 순서대로 처리
3. 완료 시 DB 상태 업데이트 (PROCESSING → READY/FAILED)
4. 클라이언트는 폴링 or Notification으로 상태 확인

## Webhook 수신
주문 상태 변경 시 Sweetbook이 Webhook으로 알려줌.
- BE에 Webhook 수신 엔드포인트 구현 필요
- 수신 시 Order 상태 업데이트 + Notification 발송

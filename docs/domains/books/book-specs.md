# 판형 스펙 (Book Specs)

> Sweetbook `GET /book-specs` 엔드포인트 응답을 기반으로 한다. 공식 지원 판형은 3종(MVP 전부 커버)이며, 모두 2페이지 증분(`pageIncrement=2`)이다. Finalization 시 `pageMin`/`pageMax`/`pageIncrement` 규칙을 위반하면 에러가 발생한다.

## 지원 판형 3종 (공식 전부)

| bookSpecUid | 이름 | 크기 (mm) | 커버 | 페이지 범위 | 증분 | 추천 용도 |
|-------------|------|-----------|------|-------------|------|-----------|
| `SQUAREBOOK_HC` | 정사각 하드커버 | 243 × 248 | 하드커버 | 24~130 | 2p | 🎯 **기본 추천** — 모임 기념, 선물용 |
| `PHOTOBOOK_A4_SC` | A4 소프트커버 | 210 × 297 | 소프트커버 | 24~130 | 2p | 여행 일기, 사진 저널 |
| `PHOTOBOOK_A5_SC` | A5 소프트커버 | 148 × 210 | 소프트커버 | 50~200 | 2p | 사진 다량 (휴대용) |

## `GET /book-specs` 응답 필드 (공식)

| 필드 | 타입 | 설명 |
|------|------|------|
| `bookSpecUid` | string | 판형 UID (ex. `SQUAREBOOK_HC`) |
| `name` | string | 판형 이름 |
| **`innerTrimWidthMm`** | number | 내지 재단 폭 (mm) — **width가 아니라 이 필드명** |
| **`innerTrimHeightMm`** | number | 내지 재단 높이 (mm) |
| `coverType` | enum | `Hardcover` / `Softcover` |
| `pageMin` | number | 최소 페이지 수 |
| `pageMax` | number | 최대 페이지 수 |
| `pageIncrement` | number | 증분 단위 (= 2) |
| `priceBase` | number | **Live 환경 상품 기본가** (원) |
| `pricePerIncrement` | number | **Live 환경 증분당 가격** (원) |
| `sandboxPriceBase` | number | **Sandbox 환경 기본가** (테스트용, 실제와 다름) |
| `sandboxPricePerIncrement` | number | **Sandbox 환경 증분당 가격** |

> **`specProfileUid`는 `POST /books` 요청의 선택 필드**로만 존재 (검증용). `GET /book-specs` 응답 스키마에는 없으므로 우리 DB에 저장할 필요 없음. 기본값으로 생략해도 동작한다.

## 물리적 비율 비교 (같은 축척)

```
SQUAREBOOK_HC        PHOTOBOOK_A4_SC      PHOTOBOOK_A5_SC
┌─────────┐          ┌─────────┐          ┌───────┐
│         │          │         │          │       │
│  243mm  │          │         │          │ 148mm │
│   ×     │          │  210mm  │          │   ×   │
│  248mm  │          │    ×    │          │ 210mm │
│         │          │  297mm  │          │       │
└─────────┘          │         │          └───────┘
 ≈ 정사각            │         │           ≈ 손바닥
                     │         │
                     └─────────┘
                      ≈ A4 세로
```

**실측 비교:**
- `SQUAREBOOK_HC` 243×248 → **거의 정사각**, 표지가 평평하게 놓임, 가장 "앨범다운" 비주얼
- `PHOTOBOOK_A4_SC` 210×297 → 세로로 긴 A4. 풍경 사진보다 **세로 인물/일기 스타일**에 적합
- `PHOTOBOOK_A5_SC` 148×210 → A4의 절반. 가볍고 휴대성 좋음, **페이지 많이 쓸 때** (50p~200p)

## Pen 디자인 참조

판형별 실측 예시 목업은 `docs/designs/roupbook-storyboard.pen` 파일의 **"Book Spec Showcase"** 프레임 참조. Pencil 에디터로 열어서 3가지 판형의 비율과 내지 샘플 레이아웃을 확인할 수 있다.

- 데스크탑 화면: `08 Book Templates`에 판형 선택 카드로 포함
- 모바일 화면: `M08 Book Templates`에 세로 스크롤 카드
- 판형별 상세 스펙 프레임: `Book Spec / Square`, `Book Spec / A4`, `Book Spec / A5`

## 가격 공식

```
상품금액 = basePrice + ((pageCount - pageMin) / pageIncrement) × pricePerIncrement
총액    = 상품금액 + 배송비(3,000원) + 포장비 (VAT 10% 포함)
```

각 판형의 가격 값은 런타임에 `GET /book-specs/{bookSpecUid}`로 조회한다. **하드코딩 금지.**

### ⚠️ Sandbox vs Live 가격 필드 분리 (중요)

Sweetbook은 Sandbox와 Live 환경의 가격 필드 이름이 **다르다**. 코드에서 환경변수(`SWEETBOOK_ENV`)로 어느 필드를 읽을지 분기해야 한다.

| 환경 | basePrice 필드 | pricePerIncrement 필드 |
|------|----------------|----------------------|
| Sandbox | `sandboxPriceBase` | `sandboxPricePerIncrement` |
| Live | `priceBase` | `pricePerIncrement` |

```typescript
// SweetbookApiService 예시
const env = this.configService.get('SWEETBOOK_ENV'); // 'sandbox' | 'live'
const basePrice = env === 'sandbox' ? spec.sandboxPriceBase : spec.priceBase;
const increment = env === 'sandbox' ? spec.sandboxPricePerIncrement : spec.pricePerIncrement;
```

> Sandbox 가격(≤100원 수준)은 테스트용이며 **실제 Live 가격과 완전히 다르다**. 견적 표시 시 현재 환경을 사용자에게 명시하자.

## 판형 변경 규칙

### 변경 가능 시점
- `DRAFT` 상태에서만 판형 변경 가능
- `UPLOADING` 이후 변경 불가 (Sweetbook API에 이미 책이 생성된 상태)
- PERSONAL Book은 `AUTO_GENERATING` 이후 변경 불가
- 변경 시도 시 status 검증 필수 → DRAFT 아니면 `ForbiddenException`

### 판형 변경 시 페이지 재구성 로직
```
1. 새 판형의 최소 페이지 수 확인
2. 현재 book_pages 수와 비교
   - 현재 페이지 ≥ 새 최소 → 기존 페이지 유지, 경고 없음
   - 현재 페이지 < 새 최소 → FE에서 경고 배너
     "현재 {N}페이지입니다. {판형}은 최소 {M}페이지가 필요합니다."
     (빈 페이지 자동 추가 X, 사용자가 직접 사진 추가)
3. book_pages의 photo 배치는 그대로 유지 (사진 자체는 판형과 무관)
4. books.template_id + books.book_spec_uid 업데이트
5. Sweetbook API에는 아직 전송하지 않으므로 재업로드 불필요
```

### 판형 변경 API
```
PATCH /books/:id/spec
Body:     { "bookSpecUid": "PHOTOBOOK_A5_SC", "templateId": "tmpl_xxx" }
Response: {
  "success": true,
  "data": {
    "bookSpecUid": "PHOTOBOOK_A5_SC",
    "templateId": "tmpl_xxx",
    "minPages": 50,
    "currentPages": 24,
    "isPagesSufficient": false,
    "shortfall": 26
  }
}
```

### FE 판형 변경 UI
- Book Editor(09) 상단 툴바에 현재 판형 표시 + 변경 버튼
- 변경 클릭 → Book Templates(08) 화면 또는 모달로 판형 재선택
- 최소 페이지 부족 시 경고 배너 표시 (빨간색, 해제 불가)
- finalize 버튼은 최소 페이지 충족 시에만 활성화

## 템플릿 시스템 (판형 종속)

- 템플릿 종류: `cover`(표지), `content`(내지), `divider`(구분), `publish`(발행)
- 파라미터: `$$variableName$$` 플레이스홀더로 텍스트/이미지 바인딩
- 파라미터 타입: `text`(문자열), `file`(이미지), `rowGallery`(사진 배열)
- 판형별 호환 템플릿만 사용 가능 (`bookSpecUid` 매칭)
- 카테고리: `diary`, `album`, `yearbook`, `wedding`, `baby`, `travel`, `notice`, `etc`
- 템플릿 목록 조회: `GET /templates?bookSpecUid={uid}`

## AI 큐레이션 시 판형 제약 반영
- 개인 포토북 자동 생성(AUTO 모드) 시 기본 판형은 `SQUAREBOOK_HC`
- 선별된 사진 수 < 12장이면 A5로 자동 스왑 금지 (오히려 사진 부족 경고 표시)
- 사진 수 > 130장이면 A5(최대 200p)로 자동 제안
- 판형 규칙과 사진 수가 충돌할 경우 FE에서 경고 + 사용자 결정

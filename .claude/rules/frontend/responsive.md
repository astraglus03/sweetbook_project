# FE 반응형 디자인 규칙

## 브레이크포인트 (Tailwind)
- `sm` (640px~): 소형 태블릿
- `md` (768px~): 태블릿
- `lg` (1024px~): 데스크톱
- `xl` (1280px~): 대형 데스크톱

## 모바일 퍼스트
- 모든 스타일은 모바일(375px)부터 → `sm:`, `md:`, `lg:`로 확장
- 기본: 1열 세로 스택 → `md:` 2열 → `lg:` 3열

## 네비게이션
- 모바일: 하단 탭 바 (내 모임/둘러보기/알림/프로필) — `fixed bottom-0`
- `lg:` 이상: 상단 네비게이션 바
- 햄버거 메뉴 금지 → 하단 탭으로 항상 노출

## 레이아웃 전환
| 요소 | 모바일 | 데스크톱 |
|------|--------|----------|
| 사이드바 | 바텀 시트/필터 바 | 좌측 사이드바 |
| 카드 그리드 | 1열 | 3열 |
| 사진 갤러리 | 2열 | 4~5열 |
| 로그인 폼 | 풀너비 (브랜딩 숨김) | 좌우 분할 |
| 포토북 에디터 | 캔버스 + 하단 시트 | 3패널 |
| 테이블 | 카드형 리스트 | 테이블 유지 |

## 터치 최적화
- 터치 타겟: 44x44px (모바일), 36px (태블릿)
- 버튼: 48px (모바일), 40px (데스크톱)
- 입력 필드: 48px (모바일), 42px (데스크톱)

## 타이포그래피 스케일
| 요소 | 모바일 | 데스크톱 |
|------|--------|----------|
| 페이지 제목 | 20px | 24px |
| 섹션 제목 | 17px | 18px |
| 본문 | 14px | 14px |
| 캡션 | 12px | 13px |

## 모바일 전용 UX
- 사진 업로드: 카메라 촬영 옵션 (`capture="environment"`)
- 초대: QR 코드 스캔
- 포토북: 스와이프 페이지 넘기기
- Pull-to-refresh: 갤러리, 알림

## Tailwind 패턴
```jsx
// 카드 그리드
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-5">

// 사이드바
<aside className="hidden lg:block lg:w-60">

// 폼 분할
<div className="flex flex-col lg:flex-row">
  <div className="hidden lg:flex lg:w-1/2">  {/* 브랜딩 */}
  <div className="w-full lg:w-1/2">          {/* 폼 */}

// 하단 탭 (모바일)
<nav className="fixed bottom-0 inset-x-0 bg-white border-t lg:hidden">
```

## 이미지 최적화
- `loading="lazy"` 필수
- 썸네일: 모바일 200px, 데스크톱 300px
- WebP 우선, fallback JPEG

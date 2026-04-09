# FE 컴포넌트 규칙

## 기본 원칙
- 함수형 컴포넌트만 사용 (class component 금지)
- 컴포넌트 파일 하나에 컴포넌트 하나만
- 컴포넌트 export는 named export (default export는 페이지만)
- props는 구조분해 할당으로 받기
- 인라인 스타일 금지 → Tailwind CSS 클래스 사용

## 네이밍
| 대상 | 규칙 | 예시 |
|------|------|------|
| 이벤트 핸들러 | `handle` 접두사 | `handleSubmit`, `handleClick` |
| 커스텀 훅 | `use` 접두사 | `useAuth`, `useGroups` |
| 상태 boolean | `is/has/should` 접두사 | `isLoading`, `hasError` |
| API 함수 | 도메인별 분리 | `features/{domain}/api/` |

## 파일 배치
```
features/{domain}/
├── components/    # 도메인 전용 컴포넌트
├── hooks/         # 커스텀 훅 (useAuth, useGroups)
└── api/           # API 호출 함수

components/
├── ui/            # Button, Input, Modal (공통 UI)
└── layout/        # Header, Footer, Sidebar

pages/             # 라우트별 페이지 컴포넌트만
```

## 에러/로딩/빈 상태 처리 필수
```jsx
function PhotoGallery({ groupId }) {
  const { data, isLoading, isError } = usePhotos(groupId);

  if (isLoading) return <Skeleton />;
  if (isError) return <ErrorMessage />;
  if (data.length === 0) return <EmptyState />;

  return <PhotoGrid photos={data} />;
}
```

## OAuth 버튼
- 소셜 로그인 버튼은 `window.location.href`로 BE OAuth URL 이동 (SPA 라우팅 X)
- 콜백 후 리다이렉트: BE에서 쿠키 설정 + FE로 302
- 에러: 쿼리 파라미터 `?error=oauth_failed`

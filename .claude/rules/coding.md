# 코딩 규칙

## 공통
- 들여쓰기: 2 spaces (탭 금지)
- 따옴표: single quote
- 세미콜론: 항상 사용
- 파일명: kebab-case (`auth.service.ts`, `use-auth.js`)
- 클래스명: PascalCase
- 변수/함수명: camelCase
- 상수: UPPER_SNAKE_CASE
- 줄 끝 공백 금지
- 파일 끝 빈 줄 1개

## Backend (TypeScript)
- `any` 타입 사용 절대 금지 → `unknown` 사용 후 타입 가드
- `console.log` / `console.error` 금지 → NestJS `Logger` 사용
- 모든 클래스는 생성자 주입(DI) 사용, `new` 키워드로 서비스 인스턴스 생성 금지
- Entity에 비즈니스 로직 넣지 않음 (빈혈 도메인 모델)
- Service에서만 비즈니스 로직 처리
- Controller는 요청 파싱 + 응답 변환만 담당
- DTO는 요청/응답 각각 분리 (`CreateGroupDto`, `GroupResponseDto`)
- 환경변수는 `ConfigService`로만 접근 (하드코딩 절대 금지)
- `async/await` 사용, `.then()` 체인 금지
- 불필요한 `else` 금지 → early return 패턴 사용
- magic number 금지 → 상수로 추출

## Frontend (JSX)
- 함수형 컴포넌트만 사용 (class component 금지)
- 컴포넌트 export는 named export (default export는 페이지만)
- props는 구조분해 할당으로 받기
- 인라인 스타일 금지 → Tailwind CSS 클래스 사용
- 이벤트 핸들러명: `handle` 접두사 (`handleSubmit`, `handleClick`)
- 커스텀 훅: `use` 접두사 필수 (`useAuth`, `useGroups`)
- 상태 관련 네이밍: `is/has/should` 접두사 (`isLoading`, `hasError`)
- API 호출 함수는 `features/{domain}/api/`에 분리
- 컴포넌트 파일 하나에 컴포넌트 하나만

## 금지 패턴
- `// TODO` 주석 남기기 금지 → 즉시 구현하거나 이슈 생성
- 주석으로 코드 비활성화 금지 → 삭제할 것
- 빈 catch 블록 금지 → 최소한 로그라도 남길 것
- `setTimeout`으로 비동기 문제 해결 시도 금지
- 중첩 삼항연산자 금지

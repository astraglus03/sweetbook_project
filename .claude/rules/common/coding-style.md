# 공통 코딩 스타일

## 포맷팅
- 들여쓰기: 2 spaces (탭 금지)
- 따옴표: single quote
- 세미콜론: 항상 사용
- 줄 끝 공백 금지
- 파일 끝 빈 줄 1개

## 네이밍 컨벤션
| 대상 | 규칙 | 예시 |
|------|------|------|
| 파일명 | kebab-case | `auth.service.ts`, `use-auth.js` |
| 클래스명 | PascalCase | `BookService`, `PhotoCard` |
| 변수/함수 | camelCase | `groupId`, `handleSubmit` |
| 상수 | UPPER_SNAKE_CASE | `MAX_FILE_SIZE`, `API_BASE_URL` |
| 에러 코드 | UPPER_SNAKE_CASE | `GROUP_NOT_FOUND` |

## 금지 패턴
- `// TODO` 주석 남기기 금지 → 즉시 구현하거나 이슈 생성
- 주석으로 코드 비활성화 금지 → 삭제할 것
- 빈 catch 블록 금지 → 최소한 로그라도 남길 것
- `setTimeout`으로 비동기 문제 해결 시도 금지
- 중첩 삼항연산자 금지
- magic number 금지 → 상수로 추출

## 환경변수 관리
- `sweet_book_project_be/.env`, `sweet_book_project_fe/.env` 분리
- `.env.example` 항상 최신화
- Sweetbook/OAuth API Key는 BE 서버에서만 관리
- FE에서 API Key 직접 호출 절대 금지
- 환경변수 접근: BE는 `ConfigService`, FE는 `import.meta.env`

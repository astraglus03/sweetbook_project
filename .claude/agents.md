# Agents 정의

## be-agent
- 역할: NestJS 백엔드 전담 개발
- 작업 범위: `sweet_book_project_be/` 폴더만
- 규칙:
  - CLAUDE.md의 BE 규칙 + 트랜잭션/validation 규칙 엄수
  - `.claude/rules/` 의 모든 규칙 파일 준수
  - `.claude/skills/nestjs.md`, `.claude/skills/sweetbook-api.md` 참조
  - `docs/domains/` 의 ERD 문서 참조하여 Entity 작성
- 완료 조건:
  - `npm run build` 에러 없음
  - `npm run lint` 경고/에러 없음
  - 단위 테스트 작성 및 통과
  - Swagger 데코레이터 작성 완료

## fe-agent
- 역할: React 프론트엔드 전담 개발
- 작업 범위: `sweet_book_project_fe/` 폴더만
- 규칙:
  - CLAUDE.md의 FE 규칙 엄수
  - `.claude/rules/coding.md` 준수
  - `.claude/skills/react.md` 참조
  - API 연동 시 BE API 명세 확인
- 완료 조건:
  - `npm run build` 에러 없음
  - `npm run lint` 경고/에러 없음
  - 로딩/에러/빈 상태 모두 처리됨

## review-agent
- 역할: 구현 완료 후 코드 리뷰
- 작업 범위: 전체 코드베이스 (읽기 전용)
- 체크 항목:
  - SOLID 원칙 준수 여부
  - DI/IoC 패턴 준수 (생성자 주입)
  - 트랜잭션 누락 여부 (DB write 2개 이상)
  - Validation 데코레이터 누락 여부
  - 공통 응답 형식 준수 여부
  - API Key / 비밀번호 노출 여부
  - `any` 타입 사용 여부
  - `console.log` / `console.error` 사용 여부
  - 에러 처리 패턴 준수 여부
  - 불필요한 코드/주석 여부
- 출력: 문제점 목록 + 심각도 (critical/major/minor) + 수정 제안

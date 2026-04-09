# Git 규칙

## 커밋 메시지
- 형식: `type(scope): 설명`
- type: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `style`
- scope (선택): 도메인명 (`auth`, `groups`, `books`, `orders`, `photos`)
- 예시:
  - `feat(auth): JWT refresh token 구현`
  - `fix(orders): 주문 취소 시 상태 검증 누락 수정`
  - `chore: Docker Compose 설정 추가`

## 브랜치 전략
- `main`: 프로덕션 배포 브랜치
- `develop`: 개발 통합 브랜치
- `feature/{domain}-{기능}`: 기능 개발 (`feature/auth-jwt`, `feature/groups-crud`)
- `fix/{설명}`: 버그 수정
- main 브랜치 직접 커밋 금지

## 커밋 금지 항목
- `.env` 파일 (API Key, 비밀번호 포함)
- `node_modules/`, `dist/`, `build/`
- IDE 설정 파일 (`.idea/`, `.vscode/`)
- 로그 파일

## 반드시 커밋할 항목
- `.env.example` (값 없이 키만)
- `docker-compose.yml`
- 마이그레이션 파일
- Swagger 설정

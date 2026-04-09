# 카카오톡 zip 일괄 업로드 (Kakao Import)

> GroupBook의 진입 장벽 제거 기능. 모임 사진의 95%는 이미 카톡 단톡방에 있다. 이 기능 없이 "웹에 다시 업로드하세요"를 요구하면 사용자는 이탈한다. 카카오톡 "대화 내보내기" zip을 그대로 드래그앤드롭 받아서 일괄 처리한다.

## 지원 플랫폼

| 플랫폼 | 형태 | 사진 포함 | 지원 |
|--------|------|----------|------|
| **Android 카톡** | `.zip` (대화.txt + 미디어) | ✅ 원본 | ✅ **지원** |
| iOS 카톡 | `.txt` 단독 (사진 미포함) | ❌ | ❌ 차단, 안내 표시 |
| PC 카톡 | `.txt` 단독 | ❌ | ❌ 차단 |

### iOS 사용자 안내
- 업로드 화면에서 zip 파일이 아닌 `.txt` 파일 감지 → 업로드 즉시 차단
- 안내 메시지:
  > "iOS 카카오톡은 사진이 포함된 파일 내보내기를 지원하지 않습니다. 아이폰 카톡에서 사진을 꾹 누른 뒤 '모두 저장'으로 갤러리에 저장하신 후, 직접 사진 업로드를 이용해주세요."
- FE에서 "사진 직접 업로드" 버튼으로 유도 (기존 `07 Photo Upload` 화면)
- 이 분기는 파일 확장자 + MIME 타입으로 1차 검증, zip 내부 구조로 2차 검증

## zip 내부 구조 (Android 카톡 기준)

```
KakaoTalkChats.zip
├── KakaoTalk_2025-04-09-14-30-22.txt    ← 대화 로그
├── 1712635822000.jpg                     ← timestamp-based filename
├── 1712635872000.jpg
├── 1712635891000.jpg
├── Screenshot_2025-04-07-14-30-25.png
└── ...
```

### 대화 txt 샘플 (파싱 대상)
```
2025년 4월 7일 토요일
-------------- 2025년 4월 7일 토요일 --------------
오후 2:30, 김철수 : 사진
오후 2:31, 김철수 : 사진
오후 2:31, 김철수 : 사진
오후 2:55, 이영희 : 사진
오후 3:02, 박민수 : 동창회 너무 재밌었다 ㅋㅋ
오후 3:05, 이영희 : 동영상
```

- "사진" 라인 → 파싱 대상 (업로더 + 타임스탬프)
- "동영상" 라인 → 건너뛰기 (동영상 미지원)
- 일반 텍스트 라인 → 무시 (채팅 로그는 저장하지 않음)

## 파싱 파이프라인

```
1. 사용자: POST /groups/:id/kakao-import (multipart zip)
   Content-Type: multipart/form-data
   - file: KakaoTalkChats.zip (최대 500MB)

2. BE:
   a. Multer로 수신 (임시 경로)
   b. MIME 타입 검증 (application/zip)
   c. 파일 확장자 검증 (.zip)
   d. adm-zip으로 해제 → 임시 디렉토리 (/tmp/kakao-import/{jobId}/)
   e. 내부 구조 검증:
      - .txt 파일 1개 이상 존재 → 계속
      - 이미지 파일 0개 → 에러 "사진이 포함되지 않은 파일입니다"
   f. .txt 파일 파싱 (아래 "txt 파서" 섹션)
   g. 이미지 파일 리스트 추출 (확장자 .jpg/.jpeg/.png/.webp만, 동영상 제외)
   h. 이미지-메시지 순서 매칭 (아래 "매칭 전략" 섹션)
   i. 카톡 이름 ↔ group.members 매칭 (kakao_name_mapping 테이블 활용)
   j. 매칭 결과를 Bull Queue `kakao-import-processing`에 enqueue
      (photo 단위로 job 1개씩, 기존 사진 업로드 파이프라인과 동일하게 처리)
   k. 즉시 응답: { jobId, totalPhotos, unmatchedNames[] }

3. 워커:
   - Sharp 리사이징
   - 블러/pHash/얼굴 인식 (기존 큐와 동일)
   - WebSocket으로 진행률 푸시 (/ws/groups/:id/import)

4. 완료 후:
   - 매칭 안 된 이름이 있으면 FE에 매칭 UI 표시 (선택)
   - 개인 포토북 자동 생성 버튼 활성화
```

## txt 파서 (정규식)

```typescript
// 카톡 Android 내보내기 포맷 (2023년 이후)
const messageRegex = /^(오전|오후)\s(\d+):(\d+),\s([^:]+)\s:\s(사진|동영상|.+)$/;

// 날짜 구분 라인
const dateHeaderRegex = /^-+\s(\d{4})년\s(\d+)월\s(\d+)일\s.+?\s-+$/;

interface ParsedMessage {
  timestamp: Date;
  uploaderName: string;
  type: 'photo' | 'video' | 'text';
}

function parseKakaoTxt(content: string): ParsedMessage[] {
  const lines = content.split('\n');
  let currentDate: Date | null = null;
  const messages: ParsedMessage[] = [];

  for (const line of lines) {
    // 날짜 헤더 감지
    const dateMatch = line.match(dateHeaderRegex);
    if (dateMatch) {
      currentDate = new Date(+dateMatch[1], +dateMatch[2] - 1, +dateMatch[3]);
      continue;
    }

    // 메시지 라인 감지
    const msgMatch = line.match(messageRegex);
    if (msgMatch && currentDate) {
      const [, ampm, hh, mm, name, content] = msgMatch;
      const hour = ampm === '오후' && +hh !== 12 ? +hh + 12 : +hh;
      const timestamp = new Date(currentDate);
      timestamp.setHours(hour, +mm, 0, 0);

      messages.push({
        timestamp,
        uploaderName: name.trim(),
        type: content === '사진' ? 'photo'
            : content === '동영상' ? 'video'
            : 'text',
      });
    }
  }

  return messages;
}
```

### 파싱 실패 대응 (graceful degradation)
- 정규식 매칭 0건 → 카톡 포맷 변경 가능성. 파싱 없이 이미지만 업로드, uploader = NULL로 저장
- 일부 라인만 매칭 실패 → 해당 라인만 스킵, 나머지는 정상 처리
- 치명적 에러(예: zip 손상) → 전체 import 실패 + 사용자에게 에러 코드 반환

## 이미지 - 메시지 매칭 전략

카톡 zip의 이미지 파일은 타임스탬프 기반 이름(`1712635822000.jpg`)이라 .txt의 메시지 순서와 맞춰야 한다.

### 전략 A: 파일명 타임스탬프 정렬 (권장)
1. 이미지 파일명에서 unix timestamp 추출 (`1712635822000` → Date)
2. 추출 실패(Screenshot 등) → 파일 mtime 사용
3. 이미지들을 timestamp 오름차순 정렬
4. .txt 파서 결과에서 `type='photo'`인 메시지도 timestamp 오름차순 정렬
5. 순서대로 1:1 매칭 → 각 이미지에 uploaderName 부여

### 전략 B: 타임스탬프 근접 매칭 (폴백)
전략 A의 매칭 쌍에서 시각 차이가 ±10초 초과 시 "순서 불일치" 경고 → 관리자 확인 후 진행

### 매칭 실패 처리
- 이미지 개수 > 메시지 사진 개수: 나머지 이미지는 uploader = NULL
- 이미지 개수 < 메시지 사진 개수: 일부 사진이 손실된 zip일 가능성, 그대로 진행

## 카톡 이름 매칭 UI

카톡 표시명과 GroupBook 가입 이름이 다를 수 있음 (예: 카톡=`철수🔥`, GroupBook=`김철수`). 업로드 완료 후 매칭 화면 표시.

```
┌────────────────────────────────────────┐
│ 카톡 대화에서 발견된 사용자 매칭       │
│ ────────────────────────────────────── │
│ "철수🔥"    → [김철수     ▼]  47장    │
│ "영희맘"    → [이영희     ▼]  32장    │
│ "개발자A"   → [매칭 안함  ▼]  12장    │
│ "까꿍"      → [매칭 안함  ▼]   5장    │
│                                        │
│            [ 다음에 하기 ]  [ 저장 ]   │
└────────────────────────────────────────┘
```

- 드롭다운: 현재 group.members 리스트
- "매칭 안함" 선택 시 → uploader_id = NULL 유지
- "저장" 시 `kakao_name_mapping` 테이블에 기록 → 이후 같은 group에서 동일 이름 재업로드 시 자동 매칭
- "다음에 하기" → 매칭 skip, 나중에 설정 화면에서 재조정 가능

### 자동 매칭 알고리즘 (매칭 UI 진입 전)
1. 완전 일치 (공백/이모지 제거 후) → 자동 매칭
2. 부분 문자열 (예: 카톡 `김철수✨` → GroupBook `김철수`) → 자동 매칭
3. 두 단계 모두 실패 → 사용자 수동 선택

## 스키마 추가

### kakao_name_mappings 테이블
```
| 컬럼        | 타입        | 제약조건                        | 설명                     |
|-------------|-------------|--------------------------------|--------------------------|
| id          | UUID        | PK                             |                          |
| group_id    | UUID        | FK → groups.id, NOT NULL       | 소속 모임                |
| kakao_name  | VARCHAR(100)| NOT NULL                       | 카톡 표시명              |
| user_id     | UUID        | FK → users.id, NULLABLE        | 매칭된 사용자 (null = 매칭 안함) |
| created_at  | TIMESTAMP   | DEFAULT NOW()                  |                          |
| updated_at  | TIMESTAMP   | DEFAULT NOW()                  |                          |
```

**인덱스:**
- `idx_kakao_mapping_group_name` — (group_id, kakao_name) UNIQUE

## API 엔드포인트

```
POST   /groups/:groupId/kakao-import                zip 업로드 + 비동기 처리 시작
GET    /groups/:groupId/kakao-import/status         진행률 조회 (폴링 fallback)
WS     /ws/groups/:groupId/import                   진행률 실시간 푸시
GET    /groups/:groupId/kakao-import/unmatched      매칭 안 된 카톡 이름 목록
POST   /groups/:groupId/kakao-import/mapping        카톡 이름 ↔ member 매칭 저장
```

### POST /groups/:groupId/kakao-import 응답
```json
{
  "success": true,
  "data": {
    "jobId": "import-a1b2c3",
    "totalPhotos": 247,
    "parsedMessages": 240,
    "unmatchedNames": [
      { "kakaoName": "개발자A", "photoCount": 12 },
      { "kakaoName": "까꿍", "photoCount": 5 }
    ],
    "estimatedSeconds": 180
  }
}
```

## 실패 케이스 정리

| 상황 | 처리 |
|------|------|
| iOS txt 단독 업로드 | 400 + 안내 메시지 "Android 카톡 zip만 지원" |
| 500MB 초과 zip | 413 Payload Too Large |
| zip 내 이미지 0개 | 400 "사진이 포함되지 않은 파일" |
| zip 손상/해제 실패 | 500 + 관리자 로그 |
| 50MB 초과 단일 사진 | Sharp로 리사이즈 후 Sweetbook 업로드 (기존 파이프라인 활용) |
| 동영상 파일 포함 | 무시 (이미지만 추출) |
| 중복 사진 (다른 멤버가 재업로드한 경우) | pHash 중복 감지로 자동 dedup, 경고 표시 |
| 동일 zip 재업로드 | job 단위 dedup 없음 (사용자 책임), pHash로 사진 레벨 dedup만 적용 |
| 카톡 이름 = 탈퇴 사용자 | uploader = NULL (탈퇴 사용자는 매칭 드롭다운에 미표시) |

## 기술 스택

- **`adm-zip`** (MIT) — zip 파일 해제. `@types/adm-zip` 포함
- **Multer** — 기존 파일 업로드 인프라 재사용
- **Bull Queue** — 기존 사진 처리 큐 재사용
- **Socket.io** — 기존 WebSocket 인프라 재사용 (실시간 포토월에도 사용됨)
- 별도 Python 마이크로서비스 불필요, 전부 Node.js로 처리

## 보안 고려사항

- zip 파일을 임시 경로에 해제하되 **path traversal 방지**: adm-zip의 `overwrite=true` 옵션 금지, 경로 검증 필수
- 파일명에 `../`, 절대경로 포함 시 해제 거부 + 알림
- 해제 후 임시 파일은 처리 완료 시 즉시 삭제 (cron으로 1시간마다 잔존 파일 청소)
- 사용자당 동시 import job 1개로 제한 (DoS 방지, Redis 분산 락)

## FE 화면 (Pen 참조)
- 데스크탑: `25 Kakao Import Upload` (드래그앤드롭) + `26 Kakao Name Mapping`
- 모바일: `M18 Kakao Import` + `M19 Kakao Name Mapping`
- iOS 차단 모달: `Modal / iOS Blocked`

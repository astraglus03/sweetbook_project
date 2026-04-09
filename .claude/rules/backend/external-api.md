# BE 외부 API 연동 규칙

## Sweetbook API
- `SweetbookApiService`로 모든 외부 API 호출 캡슐화
- 실패 시 `ExternalApiException`으로 래핑 (raw throw 금지)
- 응답은 타입가드로 검증 후 사용
- 요청/응답 로깅 필수
- Sandbox 환경 사용 (실제 인쇄/배송 없음)
- timeout 설정 필수 (기본 10초)

### Sweetbook 연동 순서 (엄수)
```
1. 책 생성 (POST /books)
2. 사진 업로드 (POST /books/:id/photos)
3. 표지/내지 설정
4. Finalization (POST /books/:id/finalize)
5. 주문 생성 (POST /orders)
```

### 주문 안전성
- `Idempotency-Key` 헤더 필수 (충전금 이중 차감 방지)
- 판형별 최소 페이지 규칙 준수 (SQUAREBOOK_HC: 24p 이상)

### 사진 업로드 2단계
```
사용자 → 우리 서버 (Multer) → Sharp 처리 → 로컬 저장
                                            ↓ (Bull Queue 비동기)
                                    Sweetbook API 업로드 (재시도 3회)
```

## OpenAI API
- GPT-4o-mini Vision: 사진 품질 분석 (구도/조명/감정 점수)
- GPT-4o-mini: 챕터 자동 네이밍
- 응답 JSON 파싱 실패 시 기본값 반환 (서비스 중단 방지)
- AI 분석 실패해도 핵심 기능(업로드, 포토북 제작)은 정상 동작 (graceful degradation)
- 재시도: 멱등성 있는 GET 요청에만 적용

## 공통 규칙
- 외부 API 호출은 트랜잭션 밖에서 먼저 처리
- 트랜잭션 안에서 외부 API 호출 금지 (롤백 불가능)

## Bull Queue 비동기 처리
### 큐로 처리할 작업 (응답 시간에 영향주면 안 되는 것)
- 사진 리사이징/최적화 (Sharp)
- AI 품질 분석 (OpenAI Vision API)
- 포토북 PDF 생성
- Sweetbook API 사진 업로드
- 알림 발송 (대량)

```typescript
// Controller → 즉시 응답
@Post('photos/upload')
async upload(@UploadedFile() file) {
  const photo = await this.photoService.saveToLocal(file);
  await this.photoQueue.add('process', { photoId: photo.id });
  return photo; // 즉시 응답
}

// Processor → 백그라운드
@Processor('photo')
export class PhotoProcessor {
  @Process('process')
  async handle(job: Job<{ photoId: number }>) {
    await this.resizeImage(job.data.photoId);
    await this.analyzeQuality(job.data.photoId);
    await this.uploadToSweetbook(job.data.photoId);
  }
}
```

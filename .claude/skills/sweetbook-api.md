# Sweetbook API 연동 스킬

## 개요
Sweetbook Book Print API를 통해 포토북 생성 및 주문을 처리한다.
반드시 `SweetbookApiService`를 통해서만 외부 API를 호출한다.

## 필수 사용 API
1. **Books API** — 포토북 생성/조회/수정
2. **Orders API** — 주문 생성/조회/취소

## SweetbookApiService 구현 패턴
```typescript
@Injectable()
export class SweetbookApiService {
  private readonly logger = new Logger(SweetbookApiService.name);
  private readonly httpService: HttpService;

  constructor(
    private readonly configService: ConfigService,
    httpService: HttpService,
  ) {
    this.httpService = httpService;
  }

  private get baseUrl(): string {
    return this.configService.get<string>('SWEETBOOK_API_URL');
  }

  private get apiKey(): string {
    return this.configService.get<string>('SWEETBOOK_API_KEY');
  }

  async createBook(data: CreateBookRequest): Promise<SweetbookBook> {
    try {
      this.logger.log(`[Sweetbook] POST /books 요청: ${JSON.stringify(data)}`);
      const response = await firstValueFrom(
        this.httpService.post(`${this.baseUrl}/books`, data, {
          headers: { Authorization: `Bearer ${this.apiKey}` },
          timeout: 10000,
        }),
      );
      this.logger.log(`[Sweetbook] POST /books 응답: ${response.status}`);
      return this.validateResponse<SweetbookBook>(response.data);
    } catch (error) {
      this.logger.error(`[Sweetbook] POST /books 실패: ${error.message}`);
      throw new ExternalApiException('포토북 생성에 실패했습니다', error);
    }
  }
}
```

## 핵심 규칙
- 모든 요청/응답 로깅 필수
- timeout 설정 필수 (기본 10초)
- 실패 시 `ExternalApiException`으로 래핑 (raw error throw 금지)
- 응답 데이터 타입 검증 후 사용
- API Key는 BE 환경변수에서만 관리 (FE 노출 절대 금지)
- Sandbox 환경 사용 (실제 인쇄/배송 없음)

## 환경변수
```env
SWEETBOOK_API_URL=https://api.sweetbook.co.kr  # or sandbox URL
SWEETBOOK_API_KEY=your_api_key_here
```

## 에러 처리 흐름
```
Sweetbook API 실패
  → SweetbookApiService에서 catch
  → ExternalApiException throw (원본 에러 포함)
  → GlobalExceptionFilter에서 처리
  → 클라이언트에 { success: false, error: { code: "EXTERNAL_API_FAILED", ... } }
```

## 비동기 처리 (Bull Queue)
포토북 생성은 시간이 걸릴 수 있으므로 Bull Queue로 비동기 처리:
1. Controller → Service에서 Job 생성
2. Processor에서 Sweetbook API 호출
3. 완료 시 DB 상태 업데이트
4. 클라이언트는 폴링 or WebSocket으로 상태 확인

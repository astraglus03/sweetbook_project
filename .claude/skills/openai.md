# OpenAI 연동 스킬

## 개요
사진 품질 분석(Vision)과 챕터 이름 생성(Text)에 OpenAI API를 사용한다.
반드시 `OpenaiService`를 통해서만 외부 API를 호출한다.

## 사용 모델
- **GPT-4o-mini Vision**: 사진 품질 점수화 (composition, lighting, subject, emotion)
- **GPT-4o-mini Text**: 챕터 이름 생성 (이미지 미전송, 메타데이터만)

## OpenaiService 구현 패턴
```typescript
@Injectable()
export class OpenaiService {
  private readonly logger = new Logger(OpenaiService.name);
  private readonly openai: OpenAI;

  constructor(private readonly configService: ConfigService) {
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });
  }

  async analyzePhotoQuality(imageUrl: string): Promise<PhotoScore> {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `포토북 편집 전문가로서 사진을 평가하세요. JSON으로만 응답:
{
  "composition": 0-10,
  "lighting": 0-10,
  "subject": 0-10,
  "emotion": 0-10,
  "total": 0-10,
  "reason": "한줄 평가"
}`,
              },
              { type: 'image_url', image_url: { url: imageUrl } },
            ],
          },
        ],
        max_tokens: 200,
      });

      return this.parseScoreResponse(response);
    } catch (error) {
      this.logger.error(`[OpenAI] 사진 분석 실패: ${error.message}`);
      throw new ExternalApiException('AI 사진 분석에 실패했습니다', error);
    }
  }

  async generateChapterNames(
    groupName: string,
    eventDate: string,
    chapters: { index: number; startTime: string; endTime: string; count: number }[],
  ): Promise<ChapterName[]> {
    try {
      const prompt = `모임 포토북의 챕터 이름을 지어주세요.
모임명: ${groupName}
모임 날짜: ${eventDate}
사진 그룹: ${JSON.stringify(chapters)}

JSON 배열로만 응답: [{ "index": 0, "title": "...", "subtitle": "..." }]`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 300,
      });

      return this.parseChapterResponse(response);
    } catch (error) {
      this.logger.error(`[OpenAI] 챕터 생성 실패: ${error.message}`);
      throw new ExternalApiException('AI 챕터 생성에 실패했습니다', error);
    }
  }
}
```

## 핵심 규칙
- 모든 요청/응답 로깅 필수
- 실패 시 `ExternalApiException`으로 래핑
- API Key는 BE 환경변수에서만 관리 (`OPENAI_API_KEY`)
- 응답 JSON 파싱 실패 시 기본값 반환 (서비스 중단 방지)
- Bull Queue로 비동기 처리 (업로드 즉시 반환, 백그라운드 분석)

## 비용 관리
- Vision: 사진 1장 ≈ $0.001~0.003 (GPT-4o-mini)
- Text: 챕터 생성 ≈ 거의 무료
- 이미 분석된 사진 재분석 방지: `ai_analyzed_at` 체크

## 환경변수
```env
OPENAI_API_KEY=your_openai_api_key_here
```

## 에러 처리
```
OpenAI API 실패
  → OpenaiService에서 catch
  → ExternalApiException throw
  → GlobalExceptionFilter에서 처리
  → AI 분석 실패해도 사진 업로드/포토북 제작은 정상 진행 (graceful degradation)
```

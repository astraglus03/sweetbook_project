import {
  BadRequestException,
  Controller,
  Headers,
  HttpCode,
  Logger,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { WebhookVerifierService } from './webhook-verifier.service';
import { WebhookDedupService } from './webhook-dedup.service';
import {
  WebhookRouterService,
  SweetbookEventPayload,
} from './webhook-router.service';

@ApiTags('webhooks')
@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(
    private readonly verifier: WebhookVerifierService,
    private readonly dedup: WebhookDedupService,
    private readonly router: WebhookRouterService,
  ) {}

  @Public()
  @Post('sweetbook')
  @HttpCode(200)
  @ApiOperation({ summary: 'Sweetbook 웹훅 수신 (HMAC 서명 검증)' })
  async handleSweetbook(
    @Headers('x-webhook-signature') signature: string,
    @Headers('x-webhook-event') eventType: string,
    @Headers('x-webhook-delivery') deliveryId: string,
    @Headers('x-webhook-timestamp') timestamp: string,
    @Req() req: RawBodyRequest<Request>,
  ): Promise<{ received: boolean; duplicate?: boolean }> {
    const rawBody = req.rawBody?.toString('utf-8');
    if (!rawBody) {
      throw new BadRequestException('EMPTY_BODY');
    }

    // 1. 타임스탬프 신선도
    if (!this.verifier.isTimestampFresh(timestamp)) {
      throw new UnauthorizedException('STALE_TIMESTAMP');
    }

    // 2. HMAC 서명 검증
    if (!this.verifier.verify(signature, timestamp, rawBody)) {
      this.logger.warn(
        `Invalid signature: event=${eventType} delivery=${deliveryId}`,
      );
      throw new UnauthorizedException('INVALID_WEBHOOK_SIGNATURE');
    }

    // 3. dedup
    if (deliveryId && (await this.dedup.isAlreadyProcessed(deliveryId))) {
      this.logger.log(`Duplicate delivery: ${deliveryId}`);
      return { received: true, duplicate: true };
    }

    // 4. 파싱 + 라우팅
    let payload: SweetbookEventPayload;
    try {
      payload = JSON.parse(rawBody) as SweetbookEventPayload;
    } catch {
      throw new BadRequestException('INVALID_JSON');
    }

    this.logger.log(
      `Received ${eventType} delivery=${deliveryId} event_uid=${payload.event_uid} test=${!!payload.isTest}`,
    );

    try {
      await this.router.handle(payload);
    } catch (err) {
      this.logger.error(
        `Handler failed for ${eventType} delivery=${deliveryId}: ${String(err)}`,
      );
      // Sweetbook 재시도 유도: 500 던지기 (3xx/4xx/5xx 모두 재시도 대상)
      throw err;
    }

    if (deliveryId) await this.dedup.markProcessed(deliveryId);
    return { received: true };
  }
}

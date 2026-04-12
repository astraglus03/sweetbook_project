import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class WebhookVerifierService {
  private readonly logger = new Logger(WebhookVerifierService.name);
  private readonly secret: string | undefined;

  constructor(private readonly configService: ConfigService) {
    this.secret = this.configService.get<string>('SWEETBOOK_WEBHOOK_SECRET');
    if (!this.secret) {
      this.logger.warn(
        'SWEETBOOK_WEBHOOK_SECRET not configured — webhooks will be rejected',
      );
    }
  }

  /**
   * HMAC-SHA256 서명 검증
   * 서명 대상: `{timestamp}.{rawBody}`
   * 헤더 형식: `sha256=<hex>`
   */
  verify(signatureHeader: string, timestamp: string, rawBody: string): boolean {
    if (!this.secret) return false;
    if (!signatureHeader || !timestamp || !rawBody) return false;

    const expected = crypto
      .createHmac('sha256', this.secret)
      .update(`${timestamp}.${rawBody}`)
      .digest('hex');
    const expectedHeader = `sha256=${expected}`;

    // timing-safe compare
    const a = Buffer.from(signatureHeader);
    const b = Buffer.from(expectedHeader);
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  }

  /** 타임스탬프 rogue replay 방지 (±5분) */
  isTimestampFresh(timestamp: string, toleranceSeconds = 300): boolean {
    const sec = Number(timestamp);
    if (Number.isNaN(sec)) return false;
    const now = Math.floor(Date.now() / 1000);
    return Math.abs(now - sec) <= toleranceSeconds;
  }
}

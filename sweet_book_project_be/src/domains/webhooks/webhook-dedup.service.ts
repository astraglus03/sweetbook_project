import { Inject, Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../../config/redis.provider';

const DEDUP_TTL_SEC = 24 * 60 * 60; // 24h

@Injectable()
export class WebhookDedupService {
  private readonly logger = new Logger(WebhookDedupService.name);

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  /** deliveryId가 이미 처리됐으면 true */
  async isAlreadyProcessed(deliveryId: string): Promise<boolean> {
    const key = this.key(deliveryId);
    const exists = await this.redis.exists(key);
    return exists === 1;
  }

  /** 처리 완료 마킹 (24h TTL) */
  async markProcessed(deliveryId: string): Promise<void> {
    const key = this.key(deliveryId);
    await this.redis.set(key, '1', 'EX', DEDUP_TTL_SEC);
  }

  private key(deliveryId: string): string {
    return `webhook-dedup:sweetbook:${deliveryId}`;
  }
}

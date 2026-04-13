import { BullModuleOptions } from '@nestjs/bull';
import { ConfigService } from '@nestjs/config';

export const bullConfig = (
  configService: ConfigService,
): BullModuleOptions => ({
  redis: {
    host: configService.getOrThrow<string>('REDIS_HOST'),
    port: Number(configService.getOrThrow<string>('REDIS_PORT')),
    password: configService.get<string>('REDIS_PASSWORD') || undefined,
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: { age: 3600, count: 100 },
    removeOnFail: { age: 86400 },
  },
});

export const QUEUE_NAMES = {
  PERSONAL_BOOK: 'personal-book-generation',
  PHOTO_FACE: 'photo-face-detection',
} as const;

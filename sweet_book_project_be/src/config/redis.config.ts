import { ConfigService } from '@nestjs/config';

export interface RedisOptions {
  host: string;
  port: number;
  password?: string;
}

export const redisConfig = (configService: ConfigService): RedisOptions => ({
  host: configService.get<string>('REDIS_HOST', '127.0.0.1'),
  port: configService.get<number>('REDIS_PORT', 6379),
  password: configService.get<string>('REDIS_PASSWORD') || undefined,
});

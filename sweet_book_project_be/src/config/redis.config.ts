import { ConfigService } from '@nestjs/config';

export interface RedisOptions {
  host: string;
  port: number;
  password?: string;
}

export const redisConfig = (configService: ConfigService): RedisOptions => ({
  host: configService.getOrThrow<string>('REDIS_HOST'),
  port: Number(configService.getOrThrow<string>('REDIS_PORT')),
  password: configService.get<string>('REDIS_PASSWORD') || undefined,
});

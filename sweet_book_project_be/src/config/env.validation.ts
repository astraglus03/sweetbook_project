import { plainToInstance } from 'class-transformer';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  validateSync,
} from 'class-validator';

class EnvVariables {
  @IsOptional()
  @IsString()
  NODE_ENV?: string;

  @IsNotEmpty()
  @IsString()
  PORT: string;

  @IsNotEmpty()
  @IsString()
  CORS_ORIGIN: string;

  // PostgreSQL
  @IsNotEmpty()
  @IsString()
  DB_HOST: string;

  @IsNotEmpty()
  @IsString()
  DB_PORT: string;

  @IsNotEmpty()
  @IsString()
  DB_USER: string;

  @IsNotEmpty()
  @IsString()
  DB_PASSWORD: string;

  @IsNotEmpty()
  @IsString()
  DB_NAME: string;

  // Redis
  @IsNotEmpty()
  @IsString()
  REDIS_HOST: string;

  @IsNotEmpty()
  @IsString()
  REDIS_PORT: string;

  @IsOptional()
  @IsString()
  REDIS_PASSWORD?: string;

  // JWT
  @IsNotEmpty()
  @IsString()
  JWT_SECRET: string;

  @IsNotEmpty()
  @IsString()
  JWT_ACCESS_EXPIRES: string;

  @IsNotEmpty()
  @IsString()
  JWT_REFRESH_EXPIRES: string;

  // OAuth - Google
  @IsNotEmpty()
  @IsString()
  GOOGLE_CLIENT_ID: string;

  @IsNotEmpty()
  @IsString()
  GOOGLE_CLIENT_SECRET: string;

  @IsNotEmpty()
  @IsString()
  GOOGLE_CALLBACK_URL: string;

  // OAuth - Kakao
  @IsNotEmpty()
  @IsString()
  KAKAO_CLIENT_ID: string;

  @IsNotEmpty()
  @IsString()
  KAKAO_CLIENT_SECRET: string;

  @IsNotEmpty()
  @IsString()
  KAKAO_CALLBACK_URL: string;

  @IsNotEmpty()
  @IsString()
  OAUTH_SUCCESS_REDIRECT: string;

  @IsNotEmpty()
  @IsString()
  OAUTH_FAILURE_REDIRECT: string;

  // Sweetbook
  @IsOptional()
  @IsString()
  SWEETBOOK_API_KEY?: string;

  @IsOptional()
  @IsString()
  SWEETBOOK_BASE_URL?: string;

  @IsOptional()
  @IsString()
  SWEETBOOK_WEBHOOK_SECRET?: string;

  // OpenAI
  @IsOptional()
  @IsString()
  OPENAI_API_KEY?: string;
}

export const validateEnv = (config: Record<string, unknown>): EnvVariables => {
  const validated = plainToInstance(EnvVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validated, { skipMissingProperties: false });
  if (errors.length > 0) {
    throw new Error(errors.toString());
  }
  if (validated.NODE_ENV === 'production') {
    const required: Array<keyof EnvVariables> = [
      'SWEETBOOK_API_KEY',
      'SWEETBOOK_BASE_URL',
      'SWEETBOOK_WEBHOOK_SECRET',
    ];
    const missing = required.filter((k) => !validated[k]);
    if (missing.length > 0) {
      throw new Error(
        `Production environment missing required env: ${missing.join(', ')}`,
      );
    }
  }
  return validated;
};

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { typeOrmConfig } from './config/typeorm.config';
import { validateEnv } from './config/env.validation';
import { RedisModule } from './config/redis.provider';
import { EmailModule } from './common/email/email.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { AuthModule } from './domains/auth/auth.module';
import { UsersModule } from './domains/users/users.module';
import { GroupsModule } from './domains/groups/groups.module';
import { PhotosModule } from './domains/photos/photos.module';
import { BooksModule } from './domains/books/books.module';
import { OrdersModule } from './domains/orders/orders.module';
import { NotificationsModule } from './domains/notifications/notifications.module';
import { KakaoImportModule } from './domains/kakao-import/kakao-import.module';
import { WebhooksModule } from './domains/webhooks/webhooks.module';
import { SweetbookModule } from './external/sweetbook/sweetbook.module';
import { OpenAiModule } from './external/openai/openai.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: typeOrmConfig,
    }),
    ScheduleModule.forRoot(),
    RedisModule,
    EmailModule,
    AuthModule,
    UsersModule,
    GroupsModule,
    PhotosModule,
    BooksModule,
    OrdersModule,
    NotificationsModule,
    KakaoImportModule,
    WebhooksModule,
    SweetbookModule,
    OpenAiModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule {}

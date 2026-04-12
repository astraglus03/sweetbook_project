import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from '../orders/entities/order.entity';
import { OrderGroup } from '../orders/entities/order-group.entity';
import { Book } from '../books/entities/book.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { WebhooksController } from './webhooks.controller';
import { WebhookVerifierService } from './webhook-verifier.service';
import { WebhookDedupService } from './webhook-dedup.service';
import { WebhookRouterService } from './webhook-router.service';
import { OrderSyncCron } from './order-sync.cron';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderGroup, Book]),
    NotificationsModule,
  ],
  controllers: [WebhooksController],
  providers: [
    WebhookVerifierService,
    WebhookDedupService,
    WebhookRouterService,
    OrderSyncCron,
  ],
})
export class WebhooksModule {}

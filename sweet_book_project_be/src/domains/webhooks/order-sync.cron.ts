import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { In, Not, Repository } from 'typeorm';
import { Order } from '../orders/entities/order.entity';
import { SweetbookApiService } from '../../external/sweetbook/sweetbook.service';
import { WebhookRouterService } from './webhook-router.service';

const TERMINAL_STATUSES = [
  'DELIVERED',
  'CANCELLED',
  'CANCELLED_REFUND',
  'ERROR',
  'PENDING',
  'REJECTED',
];

@Injectable()
export class OrderSyncCron {
  private readonly logger = new Logger(OrderSyncCron.name);

  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    private readonly sweetbookApiService: SweetbookApiService,
    private readonly router: WebhookRouterService,
  ) {}

  /** 웹훅 누락 대비: 30분마다 non-terminal 주문 상태 Sweetbook과 동기화 */
  @Cron(CronExpression.EVERY_30_MINUTES)
  async syncNonTerminalOrders(): Promise<void> {
    const orders = await this.orderRepository.find({
      where: {
        status: Not(In(TERMINAL_STATUSES)),
      },
      relations: ['orderGroup', 'orderGroup.book'],
    });

    const active = orders.filter((o) => !!o.sweetbookOrderUid);
    if (active.length === 0) {
      this.logger.debug('No non-terminal orders to sync');
      return;
    }

    this.logger.log(`Polling ${active.length} non-terminal orders`);
    let updated = 0;

    for (const order of active) {
      try {
        const remote = (await this.sweetbookApiService.getOrder(
          order.sweetbookOrderUid!,
        )) as {
          orderStatus?: number;
          trackingNumber?: string;
          carrierCode?: string;
        };
        const before = order.status;
        await this.router.syncOrderStatus(order, remote.orderStatus, remote);
        if (order.status !== before) updated++;
      } catch (err) {
        this.logger.warn(
          `Poll failed for order ${order.id} (${order.sweetbookOrderUid}): ${String(err)}`,
        );
      }
    }

    this.logger.log(`Sync complete: ${updated}/${active.length} orders updated`);
  }
}

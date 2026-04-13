import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order, OrderStatus } from '../orders/entities/order.entity';
import { OrderGroup } from '../orders/entities/order-group.entity';
import { Book } from '../books/entities/book.entity';
import { NotificationsService } from '../notifications/notifications.service';

export interface SweetbookEventPayload {
  event_uid: string;
  event_type: string;
  created_at: string;
  isTest?: boolean;
  data: Record<string, unknown>;
}

@Injectable()
export class WebhookRouterService {
  private readonly logger = new Logger(WebhookRouterService.name);

  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(OrderGroup)
    private readonly orderGroupRepository: Repository<OrderGroup>,
    @InjectRepository(Book)
    private readonly bookRepository: Repository<Book>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async handle(payload: SweetbookEventPayload): Promise<void> {
    const { event_type: eventType, data, isTest } = payload;
    // Sweetbook은 snake_case로 보냄. 혹시 camelCase가 와도 fallback 유지.
    const orderUid =
      typeof data?.order_uid === 'string'
        ? data.order_uid
        : typeof data?.orderUid === 'string'
          ? data.orderUid
          : null;

    if (!orderUid) {
      this.logger.warn(`Event ${eventType} missing order_uid, skipping`);
      return;
    }

    const order = await this.orderRepository.findOne({
      where: { sweetbookOrderUid: orderUid },
      relations: ['orderGroup', 'orderGroup.book'],
    });
    if (!order) {
      this.logger.warn(`Order not found for sweetbookOrderUid=${orderUid}`);
      return;
    }

    switch (eventType) {
      case 'order.created':
        await this.onOrderCreated(order, data, !!isTest);
        break;
      case 'order.cancelled':
        await this.onOrderCancelled(order, data, !!isTest);
        break;
      case 'order.restored':
        await this.onOrderRestored(order, !!isTest);
        break;
      case 'production.confirmed':
        await this.onProductionConfirmed(order, data, !!isTest);
        break;
      case 'production.started':
        await this.onProductionStarted(order, !!isTest);
        break;
      case 'production.completed':
        await this.onProductionCompleted(order, !!isTest);
        break;
      case 'shipping.departed':
        await this.onShippingDeparted(order, data, !!isTest);
        break;
      case 'shipping.delivered':
        await this.onShippingDelivered(order, data, !!isTest);
        break;
      default:
        this.logger.warn(`Unknown event type: ${eventType}`);
    }
  }

  /** 폴링 fallback에서 호출 — Sweetbook status code 기반 동기화 */
  async syncOrderStatus(
    order: Order,
    statusCode: number | undefined,
    detail?: Record<string, unknown>,
  ): Promise<void> {
    const mapped = this.mapStatusCode(statusCode);
    if (!mapped || mapped === order.status) return;

    const prev = order.status;
    order.status = mapped;

    if (mapped === 'SHIPPED') {
      const tn =
        typeof detail?.tracking_number === 'string'
          ? detail.tracking_number
          : typeof detail?.trackingNumber === 'string'
            ? detail.trackingNumber
            : null;
      if (tn) order.trackingNumber = tn;
      const tc =
        typeof detail?.tracking_carrier === 'string'
          ? detail.tracking_carrier
          : typeof detail?.carrierCode === 'string'
            ? detail.carrierCode
            : null;
      if (tc) order.carrierCode = tc;
      if (!order.shippedAt) order.shippedAt = new Date();
    }
    if (mapped === 'DELIVERED' && !order.deliveredAt) {
      order.deliveredAt = new Date();
    }

    await this.orderRepository.save(order);
    this.logger.log(
      `Polled sync: order ${order.id} ${prev} → ${mapped} (code=${statusCode})`,
    );
  }

  // ────── Event handlers ──────

  private async onOrderCreated(
    order: Order,
    _data: Record<string, unknown>,
    isTest: boolean,
  ): Promise<void> {
    // 이미 confirmAndPlace에서 PAID로 설정 + 알림 생성됨.
    // 웹훅이 소스 오브 트루스면 여기서 상태 확정.
    if (order.status === 'SUBMITTING') {
      order.status = 'PAID';
      order.orderedAt = order.orderedAt ?? new Date();
      await this.orderRepository.save(order);
    }
    this.logger.log(
      `order.created handled for order ${order.id} (test=${isTest})`,
    );
  }

  private async onOrderCancelled(
    order: Order,
    data: Record<string, unknown>,
    isTest: boolean,
  ): Promise<void> {
    const cancelReason =
      typeof data?.cancel_reason === 'string'
        ? data.cancel_reason
        : typeof data?.cancelReason === 'string'
          ? data.cancelReason
          : null;
    order.status = 'CANCELLED_REFUND';
    if (cancelReason) order.memo = `[취소] ${cancelReason}`;
    await this.orderRepository.save(order);

    if (!isTest) {
      await this.notifyOrderer(
        order,
        'ORDER_STATUS',
        '주문이 취소되었습니다',
        cancelReason
          ? `"${this.bookTitle(order)}" 주문이 취소되어 환불 처리됐어요. 사유: ${cancelReason}`
          : `"${this.bookTitle(order)}" 주문이 취소되어 환불 처리됐어요.`,
      );
    }
    this.logger.log(`order.cancelled handled for order ${order.id}`);
  }

  private async onOrderRestored(order: Order, isTest: boolean): Promise<void> {
    order.status = 'PAID';
    await this.orderRepository.save(order);
    if (!isTest) {
      await this.notifyOrderer(
        order,
        'ORDER_STATUS',
        '주문이 복구되었습니다',
        `"${this.bookTitle(order)}" 주문 취소가 철회되어 다시 진행됩니다.`,
      );
    }
  }

  private async onProductionConfirmed(
    order: Order,
    data: Record<string, unknown>,
    isTest: boolean,
  ): Promise<void> {
    order.status = 'CONFIRMED';
    // Sweetbook은 print_day, 과거 필드명 expectedPrintDate 도 fallback
    const printDay =
      typeof data?.print_day === 'string'
        ? data.print_day
        : typeof data?.expectedPrintDate === 'string'
          ? data.expectedPrintDate
          : null;
    if (printDay) {
      order.expectedPrintDate = new Date(printDay);
    }
    await this.orderRepository.save(order);
    if (!isTest) {
      const dateStr = order.expectedPrintDate
        ? order.expectedPrintDate.toLocaleDateString('ko-KR')
        : null;
      await this.notifyOrderer(
        order,
        'ORDER_STATUS',
        '제작이 확정되었어요',
        dateStr
          ? `"${this.bookTitle(order)}" 제작 예정일: ${dateStr}`
          : `"${this.bookTitle(order)}" 제작이 곧 시작됩니다.`,
      );
    }
  }

  private async onProductionStarted(
    order: Order,
    _isTest: boolean,
  ): Promise<void> {
    order.status = 'IN_PRODUCTION';
    await this.orderRepository.save(order);
    // 중간 단계 알림은 노이즈, 생략
  }

  private async onProductionCompleted(
    order: Order,
    isTest: boolean,
  ): Promise<void> {
    order.status = 'PRODUCTION_COMPLETE';
    await this.orderRepository.save(order);
    if (!isTest) {
      await this.notifyOrderer(
        order,
        'ORDER_STATUS',
        '제작이 완료됐어요',
        `"${this.bookTitle(order)}" 포토북 제작이 끝났어요. 곧 발송됩니다.`,
      );
    }
  }

  private async onShippingDeparted(
    order: Order,
    data: Record<string, unknown>,
    isTest: boolean,
  ): Promise<void> {
    order.status = 'SHIPPED';
    // shipped_at (snake) → shippedAt (camel) fallback
    const shippedAt =
      typeof data?.shipped_at === 'string'
        ? data.shipped_at
        : typeof data?.shippedAt === 'string'
          ? data.shippedAt
          : null;
    order.shippedAt = shippedAt ? new Date(shippedAt) : new Date();

    const trackingNumber =
      typeof data?.tracking_number === 'string'
        ? data.tracking_number
        : typeof data?.trackingNumber === 'string'
          ? data.trackingNumber
          : null;
    if (trackingNumber) order.trackingNumber = trackingNumber;

    const carrier =
      typeof data?.tracking_carrier === 'string'
        ? data.tracking_carrier
        : typeof data?.carrierCode === 'string'
          ? data.carrierCode
          : null;
    if (carrier) order.carrierCode = carrier;

    await this.orderRepository.save(order);

    if (!isTest) {
      const tracking = order.trackingNumber
        ? ` (${order.carrierCode ?? ''} ${order.trackingNumber})`
        : '';
      await this.notifyOrderer(
        order,
        'ORDER_STATUS',
        '배송이 시작되었어요',
        `"${this.bookTitle(order)}" 발송 완료${tracking}`,
      );
    }
  }

  private async onShippingDelivered(
    order: Order,
    data: Record<string, unknown>,
    isTest: boolean,
  ): Promise<void> {
    order.status = 'DELIVERED';
    // Sweetbook이 changed_at 으로 보냄, 과거 deliveredAt 도 fallback
    const deliveredAt =
      typeof data?.changed_at === 'string'
        ? data.changed_at
        : typeof data?.deliveredAt === 'string'
          ? data.deliveredAt
          : null;
    order.deliveredAt = deliveredAt ? new Date(deliveredAt) : new Date();
    await this.orderRepository.save(order);

    if (!isTest) {
      await this.notifyOrderer(
        order,
        'ORDER_STATUS',
        '배송 완료',
        `"${this.bookTitle(order)}" 포토북이 도착했어요!`,
      );
    }
  }

  // ────── helpers ──────

  private bookTitle(order: Order): string {
    return order.orderGroup?.book?.title ?? '포토북';
  }

  private async notifyOrderer(
    order: Order,
    type: string,
    title: string,
    message: string,
  ): Promise<void> {
    try {
      await this.notificationsService.createNotification({
        userId: order.ordererId,
        groupId: order.orderGroup?.groupId,
        type,
        title,
        message,
      });
    } catch (err) {
      this.logger.warn(`Notification failed: ${String(err)}`);
    }
  }

  /** Sweetbook 상태 코드 → 내부 OrderStatus 매핑 (docs/domains/orders.md 기준) */
  private mapStatusCode(code: number | undefined): OrderStatus | null {
    if (code === undefined) return null;
    const map: Record<number, OrderStatus> = {
      20: 'PAID',
      25: 'PDF_READY',
      30: 'CONFIRMED',
      40: 'IN_PRODUCTION',
      45: 'ITEM_COMPLETED',
      50: 'PRODUCTION_COMPLETE',
      60: 'SHIPPED',
      70: 'DELIVERED',
      90: 'CANCELLED',
      95: 'CANCELLED_REFUND',
    };
    return map[code] ?? null;
  }
}

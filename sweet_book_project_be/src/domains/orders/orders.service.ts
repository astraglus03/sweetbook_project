import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { SweetbookApiService } from '../../external/sweetbook/sweetbook.service';
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '../../common/exceptions';
import { Order } from './entities/order.entity';
import { OrderGroup } from './entities/order-group.entity';
import { Book } from '../books/entities/book.entity';
import { SubmitShippingDto } from './dto/submit-shipping.dto';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(OrderGroup)
    private readonly orderGroupRepository: Repository<OrderGroup>,
    @InjectRepository(Book)
    private readonly bookRepository: Repository<Book>,
    private readonly sweetbookApiService: SweetbookApiService,
    private readonly dataSource: DataSource,
  ) {}

  async getCredits(): Promise<{ balance: number; currency: string }> {
    return this.sweetbookApiService.getCredits();
  }

  async estimate(bookId: number) {
    const book = await this.findBookOrFail(bookId);
    if (!book.sweetbookBookUid) {
      throw new ForbiddenException(
        'BOOK_NOT_SYNCED',
        '포토북이 아직 Sweetbook에 등록되지 않았습니다',
      );
    }
    if (book.status !== 'READY' && book.status !== 'ORDERED') {
      throw new ForbiddenException(
        'BOOK_NOT_READY',
        '포토북이 아직 준비되지 않았습니다 (finalization 필요)',
      );
    }

    const estimateData = await this.sweetbookApiService.estimateOrder([
      { bookUid: book.sweetbookBookUid, quantity: 1 },
    ]);
    return estimateData;
  }

  async createOrderGroup(
    bookId: number,
    groupId: number,
    userId: number,
  ) {
    const book = await this.findBookOrFail(bookId);

    if (book.status !== 'READY') {
      throw new ForbiddenException(
        'BOOK_NOT_READY',
        '포토북 최종화 후에만 주문할 수 있습니다',
      );
    }
    if (book.groupId !== groupId) {
      throw new ForbiddenException(
        'BOOK_GROUP_MISMATCH',
        '포토북이 해당 모임에 속하지 않습니다',
      );
    }

    const existing = await this.orderGroupRepository.findOne({
      where: { bookId },
    });
    if (existing && existing.status !== 'CANCELLED') {
      throw new ConflictException(
        'ORDER_GROUP_EXISTS',
        '이미 주문 그룹이 존재합니다',
      );
    }

    const orderGroup = this.orderGroupRepository.create({
      bookId,
      groupId,
      initiatedBy: userId,
      status: 'COLLECTING',
    });

    // 견적 조회해서 저장
    if (book.sweetbookBookUid) {
      try {
        const est = (await this.sweetbookApiService.estimateOrder([
          { bookUid: book.sweetbookBookUid, quantity: 1 },
        ])) as { totalAmount?: number };
        orderGroup.estimatedPrice = est.totalAmount ?? null;
      } catch {
        this.logger.warn('Failed to fetch estimate, proceeding without price');
      }
    }

    const saved = await this.orderGroupRepository.save(orderGroup);
    return this.getOrderGroupDetail(saved.id);
  }

  async getOrderGroup(orderGroupId: number) {
    return this.getOrderGroupDetail(orderGroupId);
  }

  async getOrderGroupByBook(bookId: number) {
    const og = await this.orderGroupRepository.findOne({
      where: { bookId },
      relations: ['orders', 'orders.orderer', 'book'],
    });
    if (!og) {
      throw new NotFoundException(
        'ORDER_GROUP_NOT_FOUND',
        '주문 그룹을 찾을 수 없습니다',
      );
    }
    return og;
  }

  async submitShipping(
    orderGroupId: number,
    userId: number,
    dto: SubmitShippingDto,
  ) {
    const orderGroup = await this.findOrderGroupOrFail(orderGroupId);

    if (orderGroup.status !== 'COLLECTING') {
      throw new ForbiddenException(
        'ORDER_GROUP_NOT_COLLECTING',
        '배송 정보 수집 중이 아닙니다',
      );
    }

    // 이미 배송 정보를 입력한 경우 업데이트
    let order = await this.orderRepository.findOne({
      where: { orderGroupId, ordererId: userId },
    });

    const timestamp = Date.now();
    if (order) {
      order.recipientName = dto.recipientName;
      order.recipientPhone = dto.recipientPhone;
      order.recipientAddress = dto.recipientAddress;
      order.recipientZipCode = dto.recipientZipCode;
      order.recipientAddressDetail = dto.recipientAddressDetail ?? null;
      order.memo = dto.memo ?? null;
      order.quantity = dto.quantity;
    } else {
      order = this.orderRepository.create({
        orderGroupId,
        ordererId: userId,
        recipientName: dto.recipientName,
        recipientPhone: dto.recipientPhone,
        recipientAddress: dto.recipientAddress,
        recipientZipCode: dto.recipientZipCode,
        recipientAddressDetail: dto.recipientAddressDetail ?? null,
        memo: dto.memo ?? null,
        quantity: dto.quantity,
        idempotencyKey: `order-${orderGroup.bookId}-${userId}-${timestamp}`,
        status: 'PENDING',
      });
    }

    const saved = await this.orderRepository.save(order);
    return saved;
  }

  async confirmAndPlaceOrders(orderGroupId: number, userId: number) {
    const orderGroup = await this.findOrderGroupOrFail(orderGroupId);

    if (orderGroup.initiatedBy !== userId) {
      throw new ForbiddenException(
        'ORDER_NOT_INITIATOR',
        '주문 확정은 주문을 시작한 사용자만 가능합니다',
      );
    }
    if (
      orderGroup.status !== 'COLLECTING' &&
      orderGroup.status !== 'CONFIRMED'
    ) {
      throw new ForbiddenException(
        'ORDER_GROUP_INVALID_STATUS',
        '주문 확정할 수 없는 상태입니다',
      );
    }

    const orders = await this.orderRepository.find({
      where: { orderGroupId },
    });
    if (orders.length === 0) {
      throw new ForbiddenException(
        'ORDER_NO_MEMBERS',
        '배송 정보를 입력한 멤버가 없습니다',
      );
    }

    const book = await this.findBookOrFail(orderGroup.bookId);
    if (!book.sweetbookBookUid) {
      throw new ForbiddenException(
        'BOOK_NOT_SYNCED',
        '포토북이 Sweetbook에 등록되지 않았습니다',
      );
    }

    // OrderGroup 상태를 CONFIRMED로
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      orderGroup.status = 'CONFIRMED';
      await queryRunner.manager.save(orderGroup);
      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }

    // 각 주문을 Sweetbook에 생성
    const results: Array<{ orderId: number; success: boolean; error?: string }> =
      [];

    for (const order of orders) {
      if (order.status !== 'PENDING') {
        results.push({ orderId: order.id, success: true });
        continue;
      }

      try {
        order.status = 'SUBMITTING';
        await this.orderRepository.save(order);

        const result = await this.sweetbookApiService.createOrder({
          items: [
            { bookUid: book.sweetbookBookUid!, quantity: order.quantity },
          ],
          shipping: {
            recipientName: order.recipientName,
            recipientPhone: order.recipientPhone,
            postalCode: order.recipientZipCode,
            address1: order.recipientAddress,
            address2: order.recipientAddressDetail ?? undefined,
            memo: order.memo ?? undefined,
          },
          externalRef: `groupbook-order-${order.id}`,
          idempotencyKey: order.idempotencyKey,
        });

        order.sweetbookOrderUid = result.orderUid;
        order.status = 'PAID';
        order.orderedAt = new Date();
        await this.orderRepository.save(order);

        results.push({ orderId: order.id, success: true });
        this.logger.log(
          `Order ${order.id} placed → ${result.orderUid}`,
        );
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : String(err);
        order.status = 'ERROR';
        await this.orderRepository.save(order);
        results.push({
          orderId: order.id,
          success: false,
          error: errorMessage,
        });
        this.logger.error(`Order ${order.id} failed: ${errorMessage}`);
      }
    }

    // 모든 주문 성공 시 OrderGroup과 Book 상태 업데이트
    const allSuccess = results.every((r) => r.success);
    if (allSuccess) {
      orderGroup.status = 'ORDERED';
      await this.orderGroupRepository.save(orderGroup);

      book.status = 'ORDERED';
      await this.bookRepository.save(book);
    }

    return { orderGroupId, results };
  }

  async cancelOrder(orderId: number, userId: number, cancelReason: string) {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: ['orderGroup'],
    });
    if (!order) {
      throw new NotFoundException(
        'ORDER_NOT_FOUND',
        '주문을 찾을 수 없습니다',
      );
    }
    if (order.ordererId !== userId) {
      throw new ForbiddenException(
        'ORDER_NOT_OWNER',
        '본인의 주문만 취소할 수 있습니다',
      );
    }
    if (order.status !== 'PAID' && order.status !== 'PDF_READY') {
      throw new ForbiddenException(
        'ORDER_CANCEL_NOT_ALLOWED',
        'PAID 또는 PDF_READY 상태에서만 취소 가능합니다',
      );
    }

    if (order.sweetbookOrderUid) {
      await this.sweetbookApiService.cancelOrder(
        order.sweetbookOrderUid,
        cancelReason,
      );
    }

    order.status = 'CANCELLED_REFUND';
    await this.orderRepository.save(order);

    this.logger.log(`Order ${orderId} cancelled by user ${userId}`);
    return order;
  }

  async getOrderStatus(orderId: number) {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
    });
    if (!order) {
      throw new NotFoundException(
        'ORDER_NOT_FOUND',
        '주문을 찾을 수 없습니다',
      );
    }

    // Sweetbook에서 최신 상태 동기화
    if (order.sweetbookOrderUid && !this.isTerminalStatus(order.status)) {
      try {
        const sbOrder = (await this.sweetbookApiService.getOrder(
          order.sweetbookOrderUid,
        )) as { orderStatus?: number };

        const mapped = this.mapSweetbookStatus(sbOrder.orderStatus);
        if (mapped && mapped !== order.status) {
          order.status = mapped;
          await this.orderRepository.save(order);
        }
      } catch {
        this.logger.warn(
          `Failed to sync order ${orderId} status from Sweetbook`,
        );
      }
    }

    return order;
  }

  async getUserOrders(userId: number) {
    return this.orderRepository.find({
      where: { ordererId: userId },
      relations: ['orderGroup', 'orderGroup.book'],
      order: { createdAt: 'DESC' },
    });
  }

  // ─── Private Helpers ───────────────────────────────────────

  private async findBookOrFail(bookId: number): Promise<Book> {
    const book = await this.bookRepository.findOne({ where: { id: bookId } });
    if (!book) {
      throw new NotFoundException('BOOK_NOT_FOUND', '포토북을 찾을 수 없습니다');
    }
    return book;
  }

  private async findOrderGroupOrFail(id: number): Promise<OrderGroup> {
    const og = await this.orderGroupRepository.findOne({ where: { id } });
    if (!og) {
      throw new NotFoundException(
        'ORDER_GROUP_NOT_FOUND',
        '주문 그룹을 찾을 수 없습니다',
      );
    }
    return og;
  }

  private async getOrderGroupDetail(id: number) {
    const og = await this.orderGroupRepository.findOne({
      where: { id },
      relations: ['orders', 'book'],
    });
    if (!og) {
      throw new NotFoundException(
        'ORDER_GROUP_NOT_FOUND',
        '주문 그룹을 찾을 수 없습니다',
      );
    }
    return {
      id: og.id,
      bookId: og.bookId,
      groupId: og.groupId,
      initiatedBy: og.initiatedBy,
      estimatedPrice: og.estimatedPrice,
      status: og.status,
      bookTitle: og.book?.title ?? null,
      orders: og.orders.map((o) => ({
        id: o.id,
        ordererId: o.ordererId,
        status: o.status,
        quantity: o.quantity,
        recipientName: o.recipientName,
        totalPrice: o.totalPrice,
        orderedAt: o.orderedAt,
      })),
      createdAt: og.createdAt,
    };
  }

  private isTerminalStatus(status: string): boolean {
    return ['DELIVERED', 'CANCELLED', 'CANCELLED_REFUND', 'ERROR'].includes(
      status,
    );
  }

  private mapSweetbookStatus(
    code: number | undefined,
  ): Order['status'] | null {
    const map: Record<number, Order['status']> = {
      20: 'PAID',
      25: 'PDF_READY',
      30: 'CONFIRMED',
      40: 'IN_PRODUCTION',
      45: 'ITEM_COMPLETED',
      50: 'PRODUCTION_COMPLETE',
      60: 'SHIPPED',
      70: 'DELIVERED',
      80: 'CANCELLED',
      81: 'CANCELLED_REFUND',
      90: 'ERROR',
    };
    return code !== undefined ? (map[code] ?? null) : null;
  }
}

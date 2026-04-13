import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { NotificationListQueryDto } from './dto/notification-list-query.dto';
import { NotificationResponseDto } from './dto/notification-response.dto';
import { ForbiddenException, NotFoundException } from '../../common/exceptions';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
  ) {}

  async getNotifications(
    userId: number,
    query: NotificationListQueryDto,
  ): Promise<{
    notifications: NotificationResponseDto[];
    meta: Record<string, number>;
  }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const qb = this.notificationRepository
      .createQueryBuilder('notification')
      .leftJoinAndSelect('notification.group', 'group')
      .where('notification.userId = :userId', { userId })
      .orderBy('notification.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    if (query.unreadOnly === true) {
      qb.andWhere('notification.isRead = false');
    }

    const [notifications, total] = await qb.getManyAndCount();

    return {
      notifications: notifications.map((n) => NotificationResponseDto.from(n)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getUnreadCount(userId: number): Promise<{ count: number }> {
    const count = await this.notificationRepository.count({
      where: { userId, isRead: false },
    });
    return { count };
  }

  async markAsRead(
    notificationId: number,
    userId: number,
  ): Promise<NotificationResponseDto> {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId },
      relations: ['group'],
    });

    if (!notification) {
      throw new NotFoundException(
        'NOTIFICATION_NOT_FOUND',
        '알림을 찾을 수 없습니다',
      );
    }

    if (notification.userId !== userId) {
      throw new ForbiddenException(
        'NOTIFICATION_FORBIDDEN',
        '본인의 알림만 읽음 처리할 수 있습니다',
      );
    }

    notification.isRead = true;
    const saved = await this.notificationRepository.save(notification);
    return NotificationResponseDto.from(saved);
  }

  async markAllAsRead(userId: number): Promise<void> {
    await this.notificationRepository.update(
      { userId, isRead: false },
      { isRead: true },
    );
  }

  async createNotification(params: {
    userId: number;
    groupId?: number;
    type: string;
    title: string;
    message?: string;
  }): Promise<Notification> {
    const notification = this.notificationRepository.create({
      userId: params.userId,
      groupId: params.groupId ?? null,
      type: params.type,
      title: params.title,
      message: params.message ?? null,
      isRead: false,
    });
    return this.notificationRepository.save(notification);
  }
}

import { ApiProperty } from '@nestjs/swagger';
import { Notification } from '../entities/notification.entity';

export class NotificationResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  userId: number;

  @ApiProperty({ nullable: true })
  groupId: number | null;

  @ApiProperty()
  type: string;

  @ApiProperty()
  title: string;

  @ApiProperty({ nullable: true })
  message: string | null;

  @ApiProperty()
  isRead: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty({ nullable: true })
  groupName: string | null;

  static from(notification: Notification): NotificationResponseDto {
    const dto = new NotificationResponseDto();
    dto.id = notification.id;
    dto.userId = notification.userId;
    dto.groupId = notification.groupId;
    dto.type = notification.type;
    dto.title = notification.title;
    dto.message = notification.message;
    dto.isRead = notification.isRead;
    dto.createdAt = notification.createdAt;
    dto.groupName = notification.group?.name ?? null;
    return dto;
  }
}

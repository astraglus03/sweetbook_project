import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { NotificationsService } from './notifications.service';
import { NotificationListQueryDto } from './dto/notification-list-query.dto';
import { NotificationResponseDto } from './dto/notification-response.dto';

@ApiTags('notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: '알림 목록 조회 (페이지네이션)' })
  getNotifications(
    @CurrentUser() user: User,
    @Query() query: NotificationListQueryDto,
  ) {
    return this.notificationsService.getNotifications(user.id, query);
  }

  @Get('unread-count')
  @ApiBearerAuth()
  @ApiOperation({ summary: '읽지 않은 알림 수 조회' })
  @ApiOkResponse({ schema: { properties: { count: { type: 'number' } } } })
  getUnreadCount(@CurrentUser() user: User): Promise<{ count: number }> {
    return this.notificationsService.getUnreadCount(user.id);
  }

  @Patch('read-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: '모든 알림 읽음 처리' })
  async markAllAsRead(@CurrentUser() user: User): Promise<void> {
    await this.notificationsService.markAllAsRead(user.id);
  }

  @Patch(':id/read')
  @ApiBearerAuth()
  @ApiOperation({ summary: '알림 읽음 처리' })
  @ApiOkResponse({ type: NotificationResponseDto })
  markAsRead(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<NotificationResponseDto> {
    return this.notificationsService.markAsRead(id, user.id);
  }
}

import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { SubmitShippingDto } from './dto/submit-shipping.dto';
import { CancelOrderDto } from './dto/cancel-order.dto';

@ApiTags('orders')
@ApiBearerAuth()
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get('credits')
  @ApiOperation({ summary: '충전금 잔액 조회' })
  getCredits(@CurrentUser() _user: User) {
    return this.ordersService.getCredits();
  }

  @Get('my')
  @ApiOperation({ summary: '내 주문 목록 조회' })
  getMyOrders(@CurrentUser() user: User) {
    return this.ordersService.getUserOrders(user.id);
  }

  @Post('books/:bookId/estimate')
  @ApiOperation({ summary: '포토북 주문 견적 조회' })
  estimate(
    @CurrentUser() _user: User,
    @Param('bookId', ParseIntPipe) bookId: number,
  ) {
    return this.ordersService.estimate(bookId);
  }

  @Post('books/:bookId/groups/:groupId')
  @ApiOperation({ summary: '주문 그룹 생성 (배송 정보 수집 시작)' })
  createOrderGroup(
    @CurrentUser() user: User,
    @Param('bookId', ParseIntPipe) bookId: number,
    @Param('groupId', ParseIntPipe) groupId: number,
  ) {
    return this.ordersService.createOrderGroup(bookId, groupId, user.id);
  }

  @Get('groups/:orderGroupId')
  @ApiOperation({ summary: '주문 그룹 상세 조회' })
  getOrderGroup(
    @CurrentUser() _user: User,
    @Param('orderGroupId', ParseIntPipe) orderGroupId: number,
  ) {
    return this.ordersService.getOrderGroup(orderGroupId);
  }

  @Get('books/:bookId/group')
  @ApiOperation({ summary: '포토북의 주문 그룹 조회' })
  getOrderGroupByBook(
    @CurrentUser() _user: User,
    @Param('bookId', ParseIntPipe) bookId: number,
  ) {
    return this.ordersService.getOrderGroupByBook(bookId);
  }

  @Post('groups/:orderGroupId/shipping')
  @ApiOperation({ summary: '배송 정보 입력 (멤버별)' })
  submitShipping(
    @CurrentUser() user: User,
    @Param('orderGroupId', ParseIntPipe) orderGroupId: number,
    @Body() dto: SubmitShippingDto,
  ) {
    return this.ordersService.submitShipping(orderGroupId, user.id, dto);
  }

  @Post('groups/:orderGroupId/confirm')
  @ApiOperation({ summary: '주문 확정 및 Sweetbook 주문 생성' })
  confirmAndPlaceOrders(
    @CurrentUser() user: User,
    @Param('orderGroupId', ParseIntPipe) orderGroupId: number,
  ) {
    return this.ordersService.confirmAndPlaceOrders(orderGroupId, user.id);
  }

  @Get(':orderId')
  @ApiOperation({ summary: '개별 주문 상태 조회 (Sweetbook 동기화)' })
  getOrderStatus(
    @CurrentUser() _user: User,
    @Param('orderId', ParseIntPipe) orderId: number,
  ) {
    return this.ordersService.getOrderStatus(orderId);
  }

  @Post(':orderId/cancel')
  @ApiOperation({ summary: '개별 주문 취소' })
  cancelOrder(
    @CurrentUser() user: User,
    @Param('orderId', ParseIntPipe) orderId: number,
    @Body() dto: CancelOrderDto,
  ) {
    return this.ordersService.cancelOrder(orderId, user.id, dto.cancelReason);
  }
}

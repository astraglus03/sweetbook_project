import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from './entities/order.entity';
import { OrderGroup } from './entities/order-group.entity';
import { Book } from '../books/entities/book.entity';
import { GroupMember } from '../groups/entities/group-member.entity';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { SweetbookModule } from '../../external/sweetbook/sweetbook.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ActivitiesModule } from '../activities/activities.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderGroup, Book, GroupMember]),
    SweetbookModule,
    NotificationsModule,
    ActivitiesModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}

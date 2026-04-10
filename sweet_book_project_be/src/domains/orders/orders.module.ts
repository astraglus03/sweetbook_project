import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from './entities/order.entity';
import { OrderGroup } from './entities/order-group.entity';
import { Book } from '../books/entities/book.entity';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { SweetbookModule } from '../../external/sweetbook/sweetbook.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderGroup, Book]),
    SweetbookModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}

import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { OrderGroup } from './order-group.entity';

export type OrderStatus =
  | 'PENDING'
  | 'SUBMITTING'
  | 'PAID'
  | 'PDF_READY'
  | 'CONFIRMED'
  | 'IN_PRODUCTION'
  | 'ITEM_COMPLETED'
  | 'PRODUCTION_COMPLETE'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'CANCELLED_REFUND'
  | 'ERROR';

@Entity('orders')
@Index('idx_orders_order_group_id', ['orderGroupId'])
@Index('idx_orders_orderer_id', ['ordererId'])
@Index('idx_orders_status', ['status'])
@Index('idx_orders_sweetbook_order_uid', ['sweetbookOrderUid'], {
  unique: true,
  where: '"sweetbookOrderUid" IS NOT NULL',
})
@Index('idx_orders_idempotency_key', ['idempotencyKey'], { unique: true })
export class Order {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  orderGroupId: number;

  @Column()
  ordererId: number;

  @Column({
    type: 'enum',
    enum: [
      'PENDING',
      'SUBMITTING',
      'PAID',
      'PDF_READY',
      'CONFIRMED',
      'IN_PRODUCTION',
      'ITEM_COMPLETED',
      'PRODUCTION_COMPLETE',
      'SHIPPED',
      'DELIVERED',
      'CANCELLED',
      'CANCELLED_REFUND',
      'ERROR',
    ],
    default: 'PENDING',
  })
  status: OrderStatus;

  @Column({ type: 'varchar', nullable: true })
  sweetbookOrderUid: string | null;

  @Column({ type: 'varchar', unique: true })
  idempotencyKey: string;

  @Column({ type: 'int', default: 1 })
  quantity: number;

  @Column({ type: 'varchar', length: 50 })
  recipientName: string;

  @Column({ type: 'varchar', length: 20 })
  recipientPhone: string;

  @Column({ type: 'varchar', length: 500 })
  recipientAddress: string;

  @Column({ type: 'varchar', length: 10 })
  recipientZipCode: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  recipientAddressDetail: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  memo: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  totalPrice: number | null;

  @Column({ type: 'timestamp', nullable: true })
  orderedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => OrderGroup, (og) => og.orders, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orderGroupId' })
  orderGroup: OrderGroup;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ordererId' })
  orderer: User;
}

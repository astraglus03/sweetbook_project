import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Book } from '../../books/entities/book.entity';
import { Group } from '../../groups/entities/group.entity';
import { User } from '../../users/entities/user.entity';
import { Order } from './order.entity';

export type OrderGroupStatus =
  | 'COLLECTING'
  | 'CONFIRMED'
  | 'ORDERED'
  | 'CANCELLED';

@Entity('order_groups')
@Index('idx_order_groups_group_id', ['groupId'])
export class OrderGroup {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  bookId: number;

  @Column()
  groupId: number;

  @Column()
  initiatedBy: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  estimatedPrice: number | null;

  @Column({
    type: 'enum',
    enum: ['COLLECTING', 'CONFIRMED', 'ORDERED', 'CANCELLED'],
    default: 'COLLECTING',
  })
  status: OrderGroupStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToOne(() => Book, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'bookId' })
  book: Book;

  @ManyToOne(() => Group, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'groupId' })
  group: Group;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'initiatedBy' })
  initiator: User;

  @OneToMany(() => Order, (order) => order.orderGroup)
  orders: Order[];
}

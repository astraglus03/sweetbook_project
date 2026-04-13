import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Group } from '../../groups/entities/group.entity';
import { User } from '../../users/entities/user.entity';

export type GroupActivityType =
  | 'PHOTO_UPLOADED'
  | 'BOOK_CREATED'
  | 'ORDER_PLACED'
  | 'MEMBER_JOINED'
  | 'KAKAO_IMPORTED'
  | 'PERSONAL_BOOK_READY'
  | 'COVER_VOTED'
  | 'BOOK_FINALIZED';

@Entity('group_activities')
@Index('idx_gact_group_created', ['groupId', 'createdAt'])
export class GroupActivity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  groupId: number;

  @Column({ type: 'int', nullable: true })
  actorUserId: number | null;

  @Column({ type: 'varchar', length: 40 })
  type: GroupActivityType;

  @Column({ type: 'jsonb', default: {} })
  payload: Record<string, unknown>;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => Group, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'groupId' })
  group: Group;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'actorUserId' })
  actor: User | null;
}

import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Group } from './group.entity';

export type GroupRole = 'OWNER' | 'MEMBER';

@Entity('group_members')
@Index('idx_group_members_group_user', ['groupId', 'userId'], { unique: true })
export class GroupMember {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  groupId: number;

  @Column()
  userId: number;

  @Column({
    type: 'enum',
    enum: ['OWNER', 'MEMBER'],
    default: 'MEMBER',
  })
  role: GroupRole;

  @Column({ type: 'int', default: 0 })
  uploadCount: number;

  @Column({ type: 'timestamp', nullable: true })
  lastNotifiedAt: Date | null;

  @CreateDateColumn()
  joinedAt: Date;

  @ManyToOne(() => Group, (group) => group.members, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'groupId' })
  group: Group;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;
}

import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { GroupMember } from './group-member.entity';

export type GroupStatus =
  | 'COLLECTING'
  | 'EDITING'
  | 'VOTING'
  | 'ORDERED'
  | 'COMPLETED'
  | 'DELETED';

@Entity('groups')
@Index('idx_groups_invite_code', ['inviteCode'], { unique: true })
@Index('idx_groups_owner_id', ['ownerId'])
@Index('idx_groups_parent_group_id', ['parentGroupId'])
export class Group {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  coverImage: string | null;

  @Column({ type: 'varchar', length: 20, unique: true })
  inviteCode: string;

  @Column({
    type: 'enum',
    enum: ['COLLECTING', 'EDITING', 'VOTING', 'ORDERED', 'COMPLETED', 'DELETED'],
    default: 'COLLECTING',
  })
  status: GroupStatus;

  @Column()
  ownerId: number;

  @Column({ type: 'date', nullable: true })
  eventDate: string | null;

  @Column({ type: 'timestamp', nullable: true })
  uploadDeadline: Date | null;

  @Column({ type: 'int', nullable: true })
  year: number | null;

  @Column({ type: 'int', nullable: true })
  parentGroupId: number | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ownerId' })
  owner: User;

  @OneToMany(() => GroupMember, (member) => member.group)
  members: GroupMember[];

  @ManyToOne(() => Group, { nullable: true })
  @JoinColumn({ name: 'parentGroupId' })
  parentGroup: Group | null;
}

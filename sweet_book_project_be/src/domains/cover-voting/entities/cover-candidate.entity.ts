import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Group } from '../../groups/entities/group.entity';
import { User } from '../../users/entities/user.entity';
import { Photo } from '../../photos/entities/photo.entity';
import { CoverVote } from './cover-vote.entity';

@Entity('cover_candidates')
@Index('idx_ccand_group', ['groupId'])
export class CoverCandidate {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  groupId: number;

  @Column()
  creatorUserId: number;

  @Column()
  photoId: number;

  @Column({ type: 'varchar', length: 60 })
  title: string;

  @Column({ type: 'varchar', length: 60, nullable: true })
  subtitle: string | null;

  @Column({ type: 'varchar', length: 50 })
  templateUid: string;

  @Column({ type: 'varchar', length: 50 })
  bookSpecUid: string;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => Group, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'groupId' })
  group: Group;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'creatorUserId' })
  creator: User;

  @ManyToOne(() => Photo, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'photoId' })
  photo: Photo;

  @OneToMany(() => CoverVote, (v) => v.candidate, { cascade: ['remove'] })
  votes: CoverVote[];
}

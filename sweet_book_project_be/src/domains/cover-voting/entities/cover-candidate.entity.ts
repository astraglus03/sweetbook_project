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

  /** @deprecated 레거시 컬럼 — params.slot_0 으로 대체. nullable 유지 */
  @Column({ nullable: true })
  photoId: number | null;

  /** @deprecated 레거시 컬럼 — params 텍스트 슬롯으로 대체. nullable 유지 */
  @Column({ type: 'varchar', length: 60, nullable: true })
  title: string | null;

  /** @deprecated 레거시 컬럼 — params 텍스트 슬롯으로 대체. nullable 유지 */
  @Column({ type: 'varchar', length: 60, nullable: true })
  subtitle: string | null;

  @Column({ type: 'varchar', length: 50 })
  templateUid: string;

  @Column({ type: 'varchar', length: 50 })
  bookSpecUid: string;

  /**
   * 슬롯별 파라미터: { [slotId: string]: photoId(number) | text(string) }
   * 사진 슬롯은 photoId(number), 텍스트 슬롯은 문자열 값으로 저장.
   */
  @Column({ type: 'jsonb', default: '{}' })
  params: Record<string, string | number>;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => Group, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'groupId' })
  group: Group;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'creatorUserId' })
  creator: User;

  @ManyToOne(() => Photo, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'photoId' })
  photo: Photo | null;

  @OneToMany(() => CoverVote, (v) => v.candidate, { cascade: ['remove'] })
  votes: CoverVote[];
}

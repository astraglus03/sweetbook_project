import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { CoverCandidate } from './cover-candidate.entity';
import { User } from '../../users/entities/user.entity';

@Entity('cover_votes')
@Index('uniq_cvote', ['candidateId', 'userId'], { unique: true })
export class CoverVote {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  candidateId: number;

  @Column()
  userId: number;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => CoverCandidate, (c) => c.votes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'candidateId' })
  candidate: CoverCandidate;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;
}

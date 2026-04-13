import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { UserFaceAnchor } from './user-face-anchor.entity';

@Entity('user_face_anchor_samples')
@Index('idx_user_face_anchor_samples_anchor', ['anchorId'])
export class UserFaceAnchorSample {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  anchorId: number;

  @Column({ type: 'double precision', array: true })
  embedding: number[];

  @Column({ type: 'varchar', length: 500, nullable: true })
  sourcePath: string | null;

  @Column({ type: 'double precision', nullable: true })
  confidence: number | null;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => UserFaceAnchor, (anchor) => anchor.samples, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'anchorId' })
  anchor: UserFaceAnchor;
}

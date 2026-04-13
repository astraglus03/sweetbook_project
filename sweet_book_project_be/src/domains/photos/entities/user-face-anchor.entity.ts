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
import { Group } from '../../groups/entities/group.entity';
import { UserFaceAnchorSample } from './user-face-anchor-sample.entity';

@Entity('user_face_anchors')
@Index('idx_user_face_anchors_user_group', ['userId', 'groupId'], {
  unique: true,
})
@Index('idx_user_face_anchors_group', ['groupId'])
export class UserFaceAnchor {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column()
  groupId: number;

  @Column({ type: 'double precision', array: true })
  embedding: number[];

  @Column({ type: 'int', default: 1 })
  sampleCount: number;

  @Column({ type: 'double precision', default: 0.6 })
  threshold: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Group, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'groupId' })
  group: Group;

  @OneToMany(() => UserFaceAnchorSample, (sample) => sample.anchor)
  samples: UserFaceAnchorSample[];
}

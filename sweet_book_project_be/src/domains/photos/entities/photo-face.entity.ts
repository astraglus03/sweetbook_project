import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Photo } from './photo.entity';
import { Group } from '../../groups/entities/group.entity';

@Entity('photo_faces')
@Index('idx_photo_faces_photo', ['photoId'])
@Index('idx_photo_faces_group', ['groupId'])
export class PhotoFace {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  photoId: number;

  @Column()
  groupId: number;

  @Column({ type: 'double precision', array: true })
  embedding: number[];

  @Column({ type: 'int' })
  bboxX: number;

  @Column({ type: 'int' })
  bboxY: number;

  @Column({ type: 'int' })
  bboxWidth: number;

  @Column({ type: 'int' })
  bboxHeight: number;

  @Column({ type: 'double precision' })
  confidence: number;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => Photo, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'photoId' })
  photo: Photo;

  @ManyToOne(() => Group, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'groupId' })
  group: Group;
}

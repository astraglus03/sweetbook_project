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
import { Photo } from '../../photos/entities/photo.entity';
import { BookPage } from './book-page.entity';

export type BookType = 'SHARED' | 'PERSONAL';
export type BookStatus =
  | 'DRAFT'
  | 'UPLOADING'
  | 'PROCESSING'
  | 'READY'
  | 'ORDERED'
  | 'FAILED';

@Entity('books')
@Index('idx_books_group_id', ['groupId'])
@Index('idx_books_sweetbook_uid', ['sweetbookBookUid'], { unique: true, where: '"sweetbookBookUid" IS NOT NULL' })
@Index('idx_books_share_code', ['shareCode'], { unique: true, where: '"shareCode" IS NOT NULL' })
export class Book {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  groupId: number;

  @Column({ type: 'varchar', length: 100 })
  title: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  subtitle: string | null;

  @Column({
    type: 'enum',
    enum: ['SHARED', 'PERSONAL'],
    default: 'SHARED',
  })
  bookType: BookType;

  @Column({ type: 'int', nullable: true })
  ownerUserId: number | null;

  @Column({ type: 'varchar', nullable: true })
  templateUid: string | null;

  @Column({ type: 'varchar' })
  bookSpecUid: string;

  @Column({ type: 'varchar', nullable: true })
  theme: string | null;

  @Column({
    type: 'enum',
    enum: ['DRAFT', 'UPLOADING', 'PROCESSING', 'READY', 'ORDERED', 'FAILED'],
    default: 'DRAFT',
  })
  status: BookStatus;

  @Column({ type: 'varchar', nullable: true })
  sweetbookBookUid: string | null;

  @Column({ type: 'varchar', nullable: true })
  externalRef: string | null;

  @Column({ type: 'int', nullable: true })
  coverPhotoId: number | null;

  @Column({ type: 'int', default: 0 })
  pageCount: number;

  @Column({ type: 'varchar', length: 8, nullable: true })
  shareCode: string | null;

  @Column({ type: 'boolean', default: false })
  isShared: boolean;

  @Column()
  createdById: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Group, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'groupId' })
  group: Group;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'createdById' })
  createdBy: User;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'ownerUserId' })
  owner: User | null;

  @ManyToOne(() => Photo, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'coverPhotoId' })
  coverPhoto: Photo | null;

  @OneToMany(() => BookPage, (page) => page.book)
  pages: BookPage[];
}

import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Book } from './book.entity';
import { Photo } from '../../photos/entities/photo.entity';
import { PhotoFace } from '../../photos/entities/photo-face.entity';

@Entity('personal_book_matches')
@Index('idx_personal_book_matches_book_photo', ['bookId', 'photoId'], {
  unique: true,
})
@Index('idx_personal_book_matches_book', ['bookId'])
export class PersonalBookMatch {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  bookId: number;

  @Column()
  photoId: number;

  @Column({ type: 'int', nullable: true })
  photoFaceId: number | null;

  @Column({ type: 'double precision' })
  similarity: number;

  @Column({ type: 'boolean', default: false })
  excludedByUser: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => Book, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'bookId' })
  book: Book;

  @ManyToOne(() => Photo, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'photoId' })
  photo: Photo;

  @ManyToOne(() => PhotoFace, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'photoFaceId' })
  photoFace: PhotoFace | null;
}

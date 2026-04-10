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

@Entity('book_pages')
@Index('idx_book_pages_book_id', ['bookId'])
export class BookPage {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  bookId: number;

  @Column({ type: 'int' })
  pageNumber: number;

  @Column({ type: 'int', nullable: true })
  photoId: number | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  chapterTitle: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  caption: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => Book, (book) => book.pages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'bookId' })
  book: Book;

  @ManyToOne(() => Photo, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'photoId' })
  photo: Photo | null;
}

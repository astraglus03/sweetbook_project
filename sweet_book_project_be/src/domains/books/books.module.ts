import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Book } from './entities/book.entity';
import { BookPage } from './entities/book-page.entity';
import { Photo } from '../photos/entities/photo.entity';
import { GroupMember } from '../groups/entities/group-member.entity';
import { BooksController } from './books.controller';
import { BooksService } from './books.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Book, BookPage, Photo, GroupMember]),
    NotificationsModule,
  ],
  controllers: [BooksController],
  providers: [BooksService],
  exports: [BooksService],
})
export class BooksModule {}

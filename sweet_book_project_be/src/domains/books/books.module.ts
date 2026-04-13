import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Book } from './entities/book.entity';
import { BookPage } from './entities/book-page.entity';
import { PersonalBookMatch } from './entities/personal-book-match.entity';
import { Photo } from '../photos/entities/photo.entity';
import { PhotoFace } from '../photos/entities/photo-face.entity';
import { UserFaceAnchor } from '../photos/entities/user-face-anchor.entity';
import { GroupMember } from '../groups/entities/group-member.entity';
import { BooksController } from './books.controller';
import { BooksService } from './books.service';
import { PersonalBookController } from './personal-book.controller';
import { PersonalBookService } from './personal-book.service';
import { PersonalBookProcessor } from './personal-book.processor';
import { NotificationsModule } from '../notifications/notifications.module';
import { ActivitiesModule } from '../activities/activities.module';
import { bullConfig, QUEUE_NAMES } from '../../config/bull.config';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Book,
      BookPage,
      PersonalBookMatch,
      Photo,
      PhotoFace,
      UserFaceAnchor,
      GroupMember,
    ]),
    BullModule.registerQueueAsync({
      name: QUEUE_NAMES.PERSONAL_BOOK,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: bullConfig,
    }),
    NotificationsModule,
    ActivitiesModule,
  ],
  controllers: [BooksController, PersonalBookController],
  providers: [BooksService, PersonalBookService, PersonalBookProcessor],
  exports: [BooksService],
})
export class BooksModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Photo } from '../photos/entities/photo.entity';
import { GroupMember } from '../groups/entities/group-member.entity';
import { User } from '../users/entities/user.entity';
import { KakaoImportController } from './kakao-import.controller';
import { KakaoImportService } from './kakao-import.service';
import { ActivitiesModule } from '../activities/activities.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Photo, GroupMember, User]),
    ActivitiesModule,
  ],
  controllers: [KakaoImportController],
  providers: [KakaoImportService],
})
export class KakaoImportModule {}

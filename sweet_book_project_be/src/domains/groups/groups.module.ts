import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Group } from './entities/group.entity';
import { GroupMember } from './entities/group-member.entity';
import { Photo } from '../photos/entities/photo.entity';
import { UserFaceAnchor } from '../photos/entities/user-face-anchor.entity';
import { GroupsController } from './groups.controller';
import { GroupsService } from './groups.service';
import { GroupsRepository } from './groups.repository';
import { GroupMembersRepository } from './group-members.repository';
import { NotificationsModule } from '../notifications/notifications.module';
import { ActivitiesModule } from '../activities/activities.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Group, GroupMember, Photo, UserFaceAnchor]),
    NotificationsModule,
    ActivitiesModule,
  ],
  controllers: [GroupsController],
  providers: [GroupsService, GroupsRepository, GroupMembersRepository],
  exports: [GroupsService],
})
export class GroupsModule {}

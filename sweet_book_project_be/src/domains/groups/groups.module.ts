import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Group } from './entities/group.entity';
import { GroupMember } from './entities/group-member.entity';
import { GroupsController } from './groups.controller';
import { GroupsService } from './groups.service';
import { GroupsRepository } from './groups.repository';
import { GroupMembersRepository } from './group-members.repository';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [TypeOrmModule.forFeature([Group, GroupMember]), NotificationsModule],
  controllers: [GroupsController],
  providers: [GroupsService, GroupsRepository, GroupMembersRepository],
  exports: [GroupsService],
})
export class GroupsModule {}

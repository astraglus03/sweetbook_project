import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CoverCandidate } from './entities/cover-candidate.entity';
import { CoverVote } from './entities/cover-vote.entity';
import { GroupMember } from '../groups/entities/group-member.entity';
import { CoverVotingController } from './cover-voting.controller';
import { CoverVotingService } from './cover-voting.service';
import { ActivitiesModule } from '../activities/activities.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([CoverCandidate, CoverVote, GroupMember]),
    ActivitiesModule,
  ],
  controllers: [CoverVotingController],
  providers: [CoverVotingService],
  exports: [CoverVotingService],
})
export class CoverVotingModule {}

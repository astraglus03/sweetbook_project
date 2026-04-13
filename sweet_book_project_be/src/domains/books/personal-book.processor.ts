import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import type { Job } from 'bull';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QUEUE_NAMES } from '../../config/bull.config';
import {
  PersonalBookService,
  PersonalBookGenResult,
} from './personal-book.service';
import { GroupMember } from '../groups/entities/group-member.entity';

export interface PersonalBookGroupJob {
  groupId: number;
  requesterUserId: number;
}

export interface PersonalBookMemberJob {
  groupId: number;
  userId: number;
}

@Processor(QUEUE_NAMES.PERSONAL_BOOK)
export class PersonalBookProcessor {
  private readonly logger = new Logger(PersonalBookProcessor.name);

  constructor(
    private readonly personalBookService: PersonalBookService,
    @InjectRepository(GroupMember)
    private readonly memberRepo: Repository<GroupMember>,
  ) {}

  @Process('generate-for-group')
  async handleGroupGeneration(job: Job<PersonalBookGroupJob>) {
    const { groupId } = job.data;
    this.logger.log(`[job ${job.id}] group=${groupId} 생성 시작`);

    const members = await this.memberRepo.find({
      where: { groupId },
      relations: ['user'],
    });

    const total = members.length;
    const results: PersonalBookGenResult[] = [];

    for (let i = 0; i < members.length; i++) {
      const m = members[i];
      try {
        const r = await this.personalBookService.generateForMember(
          groupId,
          m.userId,
        );
        results.push({ ...r, userName: m.user?.name ?? 'unknown' });
      } catch (err) {
        this.logger.error(`user=${m.userId} 실패: ${(err as Error).message}`);
        results.push({
          userId: m.userId,
          userName: m.user?.name ?? 'unknown',
          status: 'SKIPPED_NO_ANCHOR' as const,
        });
      }
      await job.progress(Math.round(((i + 1) / total) * 100));
    }

    this.logger.log(`[job ${job.id}] 완료 (${results.length}/${total})`);
    return results;
  }

  @Process('generate-for-member')
  async handleMemberGeneration(job: Job<PersonalBookMemberJob>) {
    const { groupId, userId } = job.data;
    this.logger.log(`[job ${job.id}] user=${userId} 생성 시작`);
    const result = await this.personalBookService.generateForMember(
      groupId,
      userId,
    );
    await job.progress(100);
    return result;
  }
}

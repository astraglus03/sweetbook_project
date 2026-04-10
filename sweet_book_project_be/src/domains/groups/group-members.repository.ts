import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GroupMember } from './entities/group-member.entity';

@Injectable()
export class GroupMembersRepository {
  constructor(
    @InjectRepository(GroupMember)
    private readonly repo: Repository<GroupMember>,
  ) {}

  findByGroupAndUser(
    groupId: number,
    userId: number,
  ): Promise<GroupMember | null> {
    return this.repo.findOne({ where: { groupId, userId } });
  }

  findByGroup(groupId: number): Promise<GroupMember[]> {
    return this.repo.find({
      where: { groupId },
      relations: ['user'],
      order: { joinedAt: 'ASC' },
    });
  }

  countByGroup(groupId: number): Promise<number> {
    return this.repo.count({ where: { groupId } });
  }

  create(partial: Partial<GroupMember>): GroupMember {
    return this.repo.create(partial);
  }

  save(member: GroupMember): Promise<GroupMember> {
    return this.repo.save(member);
  }

  remove(member: GroupMember): Promise<GroupMember> {
    return this.repo.remove(member);
  }
}

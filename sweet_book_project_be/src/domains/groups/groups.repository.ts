import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Group } from './entities/group.entity';

@Injectable()
export class GroupsRepository {
  constructor(
    @InjectRepository(Group)
    private readonly repo: Repository<Group>,
  ) {}

  findById(id: number): Promise<Group | null> {
    return this.repo.findOne({ where: { id } });
  }

  findByIdWithMembers(id: number): Promise<Group | null> {
    return this.repo
      .createQueryBuilder('group')
      .leftJoinAndSelect('group.members', 'member')
      .leftJoinAndSelect('member.user', 'user')
      .where('group.id = :id', { id })
      .andWhere('group.status != :deleted', { deleted: 'DELETED' })
      .getOne();
  }

  findByInviteCode(code: string): Promise<Group | null> {
    return this.repo.findOne({
      where: { inviteCode: code },
    });
  }

  async findUserGroups(
    userId: number,
    page: number,
    limit: number,
    search?: string,
  ): Promise<[Group[], number]> {
    const qb = this.repo
      .createQueryBuilder('group')
      .innerJoin('group.members', 'member', 'member.userId = :userId', {
        userId,
      })
      .loadRelationCountAndMap('group.memberCount', 'group.members')
      .where('group.status != :deleted', { deleted: 'DELETED' });

    if (search) {
      qb.andWhere('group.name ILIKE :search', { search: `%${search}%` });
    }

    qb.orderBy('group.updatedAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    return qb.getManyAndCount();
  }

  create(partial: Partial<Group>): Group {
    return this.repo.create(partial);
  }

  save(group: Group): Promise<Group> {
    return this.repo.save(group);
  }
}

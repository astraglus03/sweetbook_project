import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { CoverCandidate } from './entities/cover-candidate.entity';
import { CoverVote } from './entities/cover-vote.entity';
import { GroupMember } from '../groups/entities/group-member.entity';
import { Photo } from '../photos/entities/photo.entity';
import { CreateCoverCandidateDto } from './dto/create-cover-candidate.dto';
import { CoverCandidateResponseDto } from './dto/cover-candidate-response.dto';
import { ForbiddenException, NotFoundException, ValidationException } from '../../common/exceptions';
import { ActivitiesService } from '../activities/activities.service';
import { GroupActivityType } from '../activities/entities/group-activity.entity';

@Injectable()
export class CoverVotingService {
  private readonly logger = new Logger(CoverVotingService.name);
  private readonly baseUrl: string;

  constructor(
    @InjectRepository(CoverCandidate)
    private readonly candidateRepository: Repository<CoverCandidate>,
    @InjectRepository(CoverVote)
    private readonly voteRepository: Repository<CoverVote>,
    @InjectRepository(GroupMember)
    private readonly groupMemberRepository: Repository<GroupMember>,
    @InjectRepository(Photo)
    private readonly photoRepository: Repository<Photo>,
    private readonly configService: ConfigService,
    private readonly activitiesService: ActivitiesService,
  ) {
    this.baseUrl = this.configService.get<string>('BASE_URL', 'http://localhost:3000');
  }

  private async verifyMember(groupId: number, userId: number): Promise<GroupMember> {
    const member = await this.groupMemberRepository.findOne({ where: { groupId, userId } });
    if (!member) {
      throw new ForbiddenException('GROUP_NOT_MEMBER', '모임 멤버만 접근할 수 있습니다');
    }
    return member;
  }

  private async verifyOwner(groupId: number, userId: number): Promise<void> {
    const member = await this.groupMemberRepository.findOne({ where: { groupId, userId } });
    if (!member || member.role !== 'OWNER') {
      throw new ForbiddenException('GROUP_NOT_OWNER', '방장만 접근할 수 있습니다');
    }
  }

  private buildPhotoUrl(photo: Photo): string {
    return `${this.baseUrl}/uploads/photos/${photo.groupId}/medium/${photo.filename}`;
  }

  async create(
    groupId: number,
    userId: number,
    dto: CreateCoverCandidateDto,
  ): Promise<CoverCandidateResponseDto> {
    await this.verifyMember(groupId, userId);

    const photo = await this.photoRepository.findOne({
      where: { id: dto.photoId, groupId },
      relations: ['uploader'],
    });
    if (!photo) {
      throw new NotFoundException('PHOTO_NOT_FOUND', '해당 그룹의 사진을 찾을 수 없습니다');
    }

    const candidate = this.candidateRepository.create({
      groupId,
      creatorUserId: userId,
      photoId: dto.photoId,
      title: dto.title,
      subtitle: dto.subtitle ?? null,
      templateKind: dto.templateKind,
    });
    const saved = await this.candidateRepository.save(candidate);

    return this.toDto(saved, photo, userId, 0, false);
  }

  async list(groupId: number, userId: number): Promise<CoverCandidateResponseDto[]> {
    await this.verifyMember(groupId, userId);

    const candidates = await this.candidateRepository
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.creator', 'creator')
      .leftJoinAndSelect('c.photo', 'photo')
      .leftJoin('c.votes', 'vote')
      .addSelect('COUNT(vote.id)', 'voteCount')
      .where('c.groupId = :groupId', { groupId })
      .groupBy('c.id')
      .addGroupBy('creator.id')
      .addGroupBy('photo.id')
      .orderBy('"voteCount"', 'DESC')
      .addOrderBy('c.createdAt', 'ASC')
      .getRawAndEntities();

    const rawMap = new Map<number, number>();
    for (const raw of candidates.raw) {
      rawMap.set(Number(raw.c_id), Number(raw.voteCount));
    }

    const myVotes = await this.voteRepository.find({
      where: { userId },
      select: ['candidateId'],
    });
    const myVotedIds = new Set(myVotes.map((v) => v.candidateId));

    return candidates.entities.map((c) => {
      const voteCount = rawMap.get(c.id) ?? 0;
      const votedByMe = myVotedIds.has(c.id);
      return this.toDto(c, c.photo, userId, voteCount, votedByMe);
    });
  }

  async delete(groupId: number, candidateId: number, userId: number): Promise<void> {
    const member = await this.verifyMember(groupId, userId);

    const candidate = await this.candidateRepository.findOne({
      where: { id: candidateId, groupId },
    });
    if (!candidate) {
      throw new NotFoundException('COVER_CANDIDATE_NOT_FOUND', '표지 후보를 찾을 수 없습니다');
    }

    const isOwner = member.role === 'OWNER';
    const isCreator = candidate.creatorUserId === userId;
    if (!isOwner && !isCreator) {
      throw new ForbiddenException('COVER_CANDIDATE_DELETE_FORBIDDEN', '본인 후보 또는 방장만 삭제할 수 있습니다');
    }

    await this.candidateRepository.remove(candidate);
  }

  async toggleVote(
    groupId: number,
    candidateId: number,
    userId: number,
  ): Promise<{ voted: boolean; voteCount: number }> {
    await this.verifyMember(groupId, userId);

    const candidate = await this.candidateRepository.findOne({
      where: { id: candidateId, groupId },
    });
    if (!candidate) {
      throw new NotFoundException('COVER_CANDIDATE_NOT_FOUND', '표지 후보를 찾을 수 없습니다');
    }

    const existing = await this.voteRepository.findOne({
      where: { candidateId, userId },
    });

    let voted: boolean;
    if (existing) {
      await this.voteRepository.remove(existing);
      voted = false;
    } else {
      const vote = this.voteRepository.create({ candidateId, userId });
      await this.voteRepository.save(vote);
      voted = true;

      await this.activitiesService.record({
        groupId,
        actorUserId: userId,
        type: 'COVER_VOTED' as GroupActivityType,
        payload: { candidateId, title: candidate.title },
      });
    }

    const voteCount = await this.voteRepository.count({ where: { candidateId } });
    return { voted, voteCount };
  }

  async confirm(
    groupId: number,
    candidateId: number,
    userId: number,
  ): Promise<{ photoId: number; title: string; subtitle: string | null; templateKind: string }> {
    await this.verifyOwner(groupId, userId);

    const candidate = await this.candidateRepository.findOne({
      where: { id: candidateId, groupId },
    });
    if (!candidate) {
      throw new NotFoundException('COVER_CANDIDATE_NOT_FOUND', '표지 후보를 찾을 수 없습니다');
    }

    await this.activitiesService.record({
      groupId,
      actorUserId: userId,
      type: 'COVER_CONFIRMED' as GroupActivityType,
      payload: { candidateId, title: candidate.title },
    });

    return {
      photoId: candidate.photoId,
      title: candidate.title,
      subtitle: candidate.subtitle,
      templateKind: candidate.templateKind,
    };
  }

  private toDto(
    candidate: CoverCandidate,
    photo: Photo,
    _userId: number,
    voteCount: number,
    votedByMe: boolean,
  ): CoverCandidateResponseDto {
    const dto = new CoverCandidateResponseDto();
    dto.id = candidate.id;
    dto.groupId = candidate.groupId;
    dto.creatorUserId = candidate.creatorUserId;
    dto.creatorName = candidate.creator?.name ?? '알 수 없음';
    dto.photoId = candidate.photoId;
    dto.photoUrl = this.buildPhotoUrl(photo);
    dto.title = candidate.title;
    dto.subtitle = candidate.subtitle;
    dto.templateKind = candidate.templateKind;
    dto.voteCount = voteCount;
    dto.votedByMe = votedByMe;
    dto.createdAt = candidate.createdAt;
    return dto;
  }
}

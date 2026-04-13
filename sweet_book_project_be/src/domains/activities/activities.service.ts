import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GroupActivity, GroupActivityType } from './entities/group-activity.entity';
import { GroupMember } from '../groups/entities/group-member.entity';
import { ForbiddenException } from '../../common/exceptions';

export interface ActivityItemDto {
  id: number;
  type: GroupActivityType;
  createdAt: Date;
  actor: { userId: number; userName: string; avatarUrl: string | null } | null;
  message: string;
  payload: Record<string, unknown>;
}

@Injectable()
export class ActivitiesService {
  private readonly logger = new Logger(ActivitiesService.name);

  constructor(
    @InjectRepository(GroupActivity)
    private readonly activityRepository: Repository<GroupActivity>,
    @InjectRepository(GroupMember)
    private readonly groupMemberRepository: Repository<GroupMember>,
  ) {}

  async record(params: {
    groupId: number;
    actorUserId?: number;
    type: GroupActivityType;
    payload?: Record<string, unknown>;
  }): Promise<void> {
    try {
      const activity = this.activityRepository.create({
        groupId: params.groupId,
        actorUserId: params.actorUserId ?? null,
        type: params.type,
        payload: params.payload ?? {},
      });
      await this.activityRepository.save(activity);
    } catch (err) {
      this.logger.warn(
        `Failed to record activity [${params.type}] for group ${params.groupId}: ${String(err)}`,
      );
    }
  }

  async list(
    groupId: number,
    userId: number,
    { page = 1, limit = 20 }: { page?: number; limit?: number },
  ): Promise<{ items: ActivityItemDto[]; meta: Record<string, number> }> {
    const membership = await this.groupMemberRepository.findOne({
      where: { groupId, userId },
    });
    if (!membership) {
      throw new ForbiddenException(
        'GROUP_NOT_MEMBER',
        '모임 멤버만 활동 피드를 볼 수 있습니다',
      );
    }

    const clampedLimit = Math.max(1, Math.min(50, limit));
    const clampedPage = Math.max(1, page);

    const [activities, total] = await this.activityRepository.findAndCount({
      where: { groupId },
      relations: ['actor'],
      order: { createdAt: 'DESC' },
      skip: (clampedPage - 1) * clampedLimit,
      take: clampedLimit,
    });

    const items: ActivityItemDto[] = activities.map((a) => ({
      id: a.id,
      type: a.type,
      createdAt: a.createdAt,
      actor: a.actor
        ? {
            userId: a.actor.id,
            userName: a.actor.name,
            avatarUrl: a.actor.avatarUrl,
          }
        : null,
      message: this.buildMessage(a.type, a.actor?.name ?? null, a.payload),
      payload: a.payload,
    }));

    return {
      items,
      meta: {
        page: clampedPage,
        limit: clampedLimit,
        total,
        totalPages: Math.ceil(total / clampedLimit),
      },
    };
  }

  private buildMessage(
    type: GroupActivityType,
    actorName: string | null,
    payload: Record<string, unknown>,
  ): string {
    const actor = actorName ?? '시스템';
    switch (type) {
      case 'PHOTO_UPLOADED':
        return `${actor}님이 사진 ${payload.count ?? 1}장을 올렸어요`;
      case 'BOOK_CREATED':
        return `${actor}님이 "${payload.title ?? '포토북'}" 포토북을 만들었어요`;
      case 'ORDER_PLACED':
        return `${actor}님이 ${payload.bookTitle ?? '포토북'} 주문을 완료했어요`;
      case 'MEMBER_JOINED':
        return `${actor}님이 모임에 참여했어요`;
      case 'KAKAO_IMPORTED':
        return `${actor}님이 카톡에서 ${payload.count ?? 0}장을 가져왔어요`;
      case 'PERSONAL_BOOK_READY':
        return `${actor}님의 개인 포토북이 준비됐어요`;
      case 'COVER_VOTED':
        return `${actor}님이 표지에 투표했어요`;
      case 'COVER_CONFIRMED':
        return `방장이 "${payload.title ?? '표지'}" 표지를 확정했어요`;
      case 'BOOK_FINALIZED':
        return `"${payload.title ?? '포토북'}" 포토북이 완성됐어요`;
      default:
        return `${actor}님이 활동했어요`;
    }
  }
}

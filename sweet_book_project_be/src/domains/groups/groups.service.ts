import { Injectable, Logger } from '@nestjs/common';
import { DataSource, In, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import * as crypto from 'crypto';
import sharp from 'sharp';
import { StorageService } from '../../common/storage/storage.service';
import { Photo } from '../photos/entities/photo.entity';
import { UserFaceAnchor } from '../photos/entities/user-face-anchor.entity';
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
  ValidationException,
} from '../../common/exceptions';
import { GroupsRepository } from './groups.repository';
import { GroupMembersRepository } from './group-members.repository';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { TransferOwnerDto } from './dto/transfer-owner.dto';
import { GroupListQueryDto } from './dto/group-list-query.dto';
import {
  GroupResponseDto,
  GroupDetailResponseDto,
} from './dto/group-response.dto';
import { Group } from './entities/group.entity';
import { GroupMember } from './entities/group-member.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { ActivitiesService } from '../activities/activities.service';

const MAX_INVITE_CODE_RETRIES = 3;

@Injectable()
export class GroupsService {
  private readonly logger = new Logger(GroupsService.name);

  constructor(
    private readonly groupsRepository: GroupsRepository,
    private readonly groupMembersRepository: GroupMembersRepository,
    private readonly dataSource: DataSource,
    private readonly notificationsService: NotificationsService,
    @InjectRepository(Photo)
    private readonly photoRepository: Repository<Photo>,
    @InjectRepository(UserFaceAnchor)
    private readonly faceAnchorRepository: Repository<UserFaceAnchor>,
    private readonly activitiesService: ActivitiesService,
    private readonly storageService: StorageService,
  ) {}

  async uploadCover(
    groupId: number,
    userId: number,
    file: Express.Multer.File,
  ): Promise<GroupResponseDto> {
    if (!file) {
      throw new ValidationException('GROUP_COVER_REQUIRED', '이미지가 필요합니다');
    }
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.mimetype)) {
      throw new ValidationException(
        'GROUP_COVER_INVALID_MIMETYPE',
        '지원하지 않는 이미지 형식입니다',
      );
    }

    const group = await this.findGroupOrFail(groupId);
    this.verifyOwner(group, userId);

    const filename = `cover-${Date.now()}.webp`;
    const buffer = await sharp(file.buffer)
      .rotate()
      .resize(1600, 900, { fit: 'cover', position: 'attention' })
      .webp({ quality: 85 })
      .toBuffer();

    const coverUrl = await this.storageService.upload(
      `groups/${groupId}/${filename}`,
      buffer,
      'image/webp',
    );

    group.coverImage = coverUrl;
    await this.groupsRepository.save(group);

    return GroupResponseDto.from(group);
  }

  private async countPhotosByGroupIds(
    groupIds: number[],
  ): Promise<Map<number, number>> {
    const map = new Map<number, number>();
    if (groupIds.length === 0) return map;
    const rows = await this.photoRepository
      .createQueryBuilder('p')
      .select('p.groupId', 'groupId')
      .addSelect('COUNT(p.id)', 'count')
      .where({ groupId: In(groupIds) })
      .groupBy('p.groupId')
      .getRawMany<{ groupId: number; count: string }>();
    for (const r of rows) map.set(Number(r.groupId), Number(r.count));
    for (const id of groupIds) if (!map.has(id)) map.set(id, 0);
    return map;
  }

  async createGroup(
    userId: number,
    dto: CreateGroupDto,
  ): Promise<GroupResponseDto> {
    const inviteCode = await this.generateInviteCode();

    const group = this.groupsRepository.create({
      name: dto.name,
      description: dto.description ?? null,
      inviteCode,
      ownerId: userId,
      eventDate: dto.eventDate ?? null,
      uploadDeadline: dto.uploadDeadline ? new Date(dto.uploadDeadline) : null,
      year: dto.year ?? null,
      parentGroupId: dto.parentGroupId ?? null,
    });
    const savedGroup = await this.groupsRepository.save(group);

    const member = this.groupMembersRepository.create({
      groupId: savedGroup.id,
      userId,
      role: 'OWNER',
    });
    await this.groupMembersRepository.save(member);

    return GroupResponseDto.from(savedGroup, 1);
  }

  async getMyGroups(
    userId: number,
    query: GroupListQueryDto,
  ): Promise<{ groups: GroupResponseDto[]; meta: Record<string, number> }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const [groups, total] = await this.groupsRepository.findUserGroups(
      userId,
      page,
      limit,
      query.search,
    );

    const photoCounts = await this.countPhotosByGroupIds(
      groups.map((g) => g.id),
    );

    return {
      groups: groups.map((g) =>
        GroupResponseDto.from(
          g,
          (g as Group & { memberCount: number }).memberCount,
          photoCounts.get(g.id) ?? 0,
        ),
      ),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getGroupDetail(
    groupId: number,
    userId: number,
  ): Promise<GroupDetailResponseDto> {
    const group = await this.groupsRepository.findByIdWithMembers(groupId);
    if (!group) {
      throw new NotFoundException('GROUP_NOT_FOUND', '모임을 찾을 수 없습니다');
    }

    const isMember = group.members.some((m) => m.userId === userId);
    if (!isMember) {
      throw new ForbiddenException(
        'GROUP_NOT_MEMBER',
        '모임 멤버만 접근할 수 있습니다',
      );
    }

    const memberIds = group.members.map((m) => m.userId);
    const [photoCounts, anchorCount, uploadCountByUserId] = await Promise.all([
      this.countPhotosByGroupIds([group.id]),
      memberIds.length > 0
        ? this.faceAnchorRepository.count({
            where: { groupId, userId: In(memberIds) },
          })
        : Promise.resolve(0),
      this.countPhotosByUploader(group.id),
    ]);
    const unregisteredFaceCount = group.members.length - anchorCount;

    return GroupDetailResponseDto.fromDetail(
      group,
      photoCounts.get(group.id) ?? 0,
      unregisteredFaceCount,
      uploadCountByUserId,
    );
  }

  private async countPhotosByUploader(
    groupId: number,
  ): Promise<Map<number, number>> {
    const rows = await this.photoRepository
      .createQueryBuilder('p')
      .select('p.uploaderId', 'uploaderId')
      .addSelect('COUNT(p.id)', 'count')
      .where('p.groupId = :groupId AND p.uploaderId IS NOT NULL', { groupId })
      .groupBy('p.uploaderId')
      .getRawMany<{ uploaderId: number; count: string }>();
    const map = new Map<number, number>();
    for (const r of rows) map.set(Number(r.uploaderId), Number(r.count));
    return map;
  }

  async updateGroup(
    groupId: number,
    userId: number,
    dto: UpdateGroupDto,
  ): Promise<GroupResponseDto> {
    const group = await this.findGroupOrFail(groupId);
    this.verifyOwner(group, userId);

    if (dto.name !== undefined) group.name = dto.name;
    if (dto.description !== undefined) group.description = dto.description;
    if (dto.coverImage !== undefined) group.coverImage = dto.coverImage;
    if (dto.eventDate !== undefined) group.eventDate = dto.eventDate;
    if (dto.uploadDeadline !== undefined) {
      group.uploadDeadline = dto.uploadDeadline
        ? new Date(dto.uploadDeadline)
        : null;
    }
    if (dto.year !== undefined) group.year = dto.year;

    const saved = await this.groupsRepository.save(group);
    const memberCount = await this.groupMembersRepository.countByGroup(groupId);
    return GroupResponseDto.from(saved, memberCount);
  }

  async deleteGroup(groupId: number, userId: number): Promise<void> {
    const group = await this.findGroupOrFail(groupId);
    this.verifyOwner(group, userId);

    group.status = 'DELETED';
    await this.groupsRepository.save(group);
  }

  async getGroupByInviteCode(code: string): Promise<GroupResponseDto> {
    const group = await this.groupsRepository.findByInviteCode(code);
    if (!group || group.status === 'DELETED') {
      throw new NotFoundException(
        'GROUP_INVITE_NOT_FOUND',
        '유효하지 않은 초대 코드입니다',
      );
    }

    const memberCount = await this.groupMembersRepository.countByGroup(
      group.id,
    );
    return GroupResponseDto.from(group, memberCount);
  }

  async joinGroup(
    groupId: number,
    userId: number,
    inviteCode: string,
  ): Promise<GroupResponseDto> {
    const group = await this.findGroupOrFail(groupId);

    if (group.inviteCode !== inviteCode) {
      throw new NotFoundException(
        'GROUP_INVITE_NOT_FOUND',
        '유효하지 않은 초대 코드입니다',
      );
    }

    const existing = await this.groupMembersRepository.findByGroupAndUser(
      groupId,
      userId,
    );
    if (existing) {
      throw new ConflictException(
        'GROUP_ALREADY_MEMBER',
        '이미 참여한 모임입니다',
      );
    }

    const member = this.groupMembersRepository.create({
      groupId,
      userId,
      role: 'MEMBER',
    });
    await this.groupMembersRepository.save(member);

    await this.activitiesService.record({
      groupId,
      actorUserId: userId,
      type: 'MEMBER_JOINED',
    });

    // 방장에게 새 멤버 참여 알림
    try {
      const owner = await this.groupMembersRepository.findByGroupAndUser(
        groupId,
        group.ownerId,
      );
      if (owner && owner.userId !== userId) {
        await this.notificationsService.createNotification({
          userId: owner.userId,
          groupId,
          type: 'GROUP_INVITE',
          title: '새 멤버가 참여했어요',
          message: `"${group.name}"에 새 멤버가 합류했습니다.`,
        });
      }
    } catch (notifyErr) {
      this.logger.warn(
        `GROUP_INVITE notification failed: ${String(notifyErr)}`,
      );
    }

    const memberCount = await this.groupMembersRepository.countByGroup(groupId);
    return GroupResponseDto.from(group, memberCount);
  }

  async leaveGroup(groupId: number, userId: number): Promise<void> {
    const membership = await this.findMembershipOrFail(groupId, userId);

    if (membership.role === 'OWNER') {
      throw new ForbiddenException(
        'GROUP_OWNER_CANNOT_LEAVE',
        '방장은 위임 후 탈퇴할 수 있습니다',
      );
    }

    await this.groupMembersRepository.remove(membership);
  }

  async removeMember(
    groupId: number,
    targetUserId: number,
    currentUserId: number,
  ): Promise<void> {
    const group = await this.findGroupOrFail(groupId);
    this.verifyOwner(group, currentUserId);

    if (targetUserId === currentUserId) {
      throw new ValidationException(
        'GROUP_CANNOT_KICK_SELF',
        '자기 자신을 강퇴할 수 없습니다',
      );
    }

    const targetMembership = await this.findMembershipOrFail(
      groupId,
      targetUserId,
    );
    await this.groupMembersRepository.remove(targetMembership);
  }

  async transferOwner(
    groupId: number,
    currentUserId: number,
    dto: TransferOwnerDto,
  ): Promise<void> {
    const group = await this.findGroupOrFail(groupId);
    this.verifyOwner(group, currentUserId);

    if (dto.newOwnerId === currentUserId) {
      throw new ValidationException(
        'GROUP_TRANSFER_SELF',
        '자기 자신에게 위임할 수 없습니다',
      );
    }

    const newOwnerMembership =
      await this.groupMembersRepository.findByGroupAndUser(
        groupId,
        dto.newOwnerId,
      );
    if (!newOwnerMembership) {
      throw new NotFoundException(
        'GROUP_MEMBER_NOT_FOUND',
        '해당 멤버를 찾을 수 없습니다',
      );
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const currentOwnerMembership = await this.findMembershipOrFail(
        groupId,
        currentUserId,
      );
      currentOwnerMembership.role = 'MEMBER';
      newOwnerMembership.role = 'OWNER';
      group.ownerId = dto.newOwnerId;

      await queryRunner.manager.save(currentOwnerMembership);
      await queryRunner.manager.save(newOwnerMembership);
      await queryRunner.manager.save(group);

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private async findGroupOrFail(groupId: number): Promise<Group> {
    const group = await this.groupsRepository.findById(groupId);
    if (!group || group.status === 'DELETED') {
      throw new NotFoundException('GROUP_NOT_FOUND', '모임을 찾을 수 없습니다');
    }
    return group;
  }

  private async findMembershipOrFail(
    groupId: number,
    userId: number,
  ): Promise<GroupMember> {
    const membership = await this.groupMembersRepository.findByGroupAndUser(
      groupId,
      userId,
    );
    if (!membership) {
      throw new NotFoundException(
        'GROUP_MEMBER_NOT_FOUND',
        '모임 멤버가 아닙니다',
      );
    }
    return membership;
  }

  private verifyOwner(group: Group, userId: number): void {
    if (group.ownerId !== userId) {
      throw new ForbiddenException(
        'GROUP_NOT_OWNER',
        '방장만 수행할 수 있습니다',
      );
    }
  }

  private async generateInviteCode(): Promise<string> {
    for (let i = 0; i < MAX_INVITE_CODE_RETRIES; i++) {
      const code = crypto.randomBytes(4).toString('hex');
      const existing = await this.groupsRepository.findByInviteCode(code);
      if (!existing) return code;
    }
    throw new Error('초대 코드 생성에 실패했습니다');
  }
}

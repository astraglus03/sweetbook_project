import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { GroupStatus } from '../entities/group.entity';
import { Group } from '../entities/group.entity';
import type { GroupRole } from '../entities/group-member.entity';
import { GroupMember } from '../entities/group-member.entity';

export class GroupMemberResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  userId: number;

  @ApiProperty()
  userName: string;

  @ApiPropertyOptional()
  userAvatarUrl: string | null;

  @ApiProperty()
  role: GroupRole;

  @ApiProperty()
  uploadCount: number;

  @ApiProperty()
  joinedAt: Date;

  static from(
    member: GroupMember,
    uploadCountOverride?: number,
  ): GroupMemberResponseDto {
    const dto = new GroupMemberResponseDto();
    dto.id = member.id;
    dto.userId = member.userId;
    dto.userName = member.user?.name ?? '';
    dto.userAvatarUrl = member.user?.avatarUrl ?? null;
    dto.role = member.role;
    dto.uploadCount = uploadCountOverride ?? member.uploadCount ?? 0;
    dto.joinedAt = member.joinedAt;
    return dto;
  }
}

export class GroupResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  description: string | null;

  @ApiPropertyOptional()
  coverImage: string | null;

  @ApiProperty()
  inviteCode: string;

  @ApiProperty()
  status: GroupStatus;

  @ApiProperty()
  ownerId: number;

  @ApiPropertyOptional()
  eventDate: string | null;

  @ApiPropertyOptional()
  uploadDeadline: Date | null;

  @ApiPropertyOptional()
  year: number | null;

  @ApiProperty()
  memberCount: number;

  @ApiProperty()
  photoCount: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  static from(
    group: Group,
    memberCount?: number,
    photoCount?: number,
  ): GroupResponseDto {
    const dto = new GroupResponseDto();
    dto.id = group.id;
    dto.name = group.name;
    dto.description = group.description;
    dto.coverImage = group.coverImage;
    dto.inviteCode = group.inviteCode;
    dto.status = group.status;
    dto.ownerId = group.ownerId;
    dto.eventDate = group.eventDate;
    dto.uploadDeadline = group.uploadDeadline;
    dto.year = group.year;
    dto.memberCount = memberCount ?? group.members?.length ?? 0;
    dto.photoCount = photoCount ?? 0;
    dto.createdAt = group.createdAt;
    dto.updatedAt = group.updatedAt;
    return dto;
  }
}

export class GroupDetailResponseDto extends GroupResponseDto {
  @ApiProperty({ type: [GroupMemberResponseDto] })
  members: GroupMemberResponseDto[];

  @ApiProperty({ description: '얼굴 앵커 미등록 멤버 수' })
  unregisteredFaceCount: number;

  static fromDetail(
    group: Group,
    photoCount?: number,
    unregisteredFaceCount?: number,
    uploadCountByUserId?: Map<number, number>,
  ): GroupDetailResponseDto {
    const dto = new GroupDetailResponseDto();
    Object.assign(dto, GroupResponseDto.from(group, undefined, photoCount));
    dto.members = (group.members ?? []).map((m) =>
      GroupMemberResponseDto.from(m, uploadCountByUserId?.get(m.userId)),
    );
    dto.unregisteredFaceCount = unregisteredFaceCount ?? 0;
    return dto;
  }
}

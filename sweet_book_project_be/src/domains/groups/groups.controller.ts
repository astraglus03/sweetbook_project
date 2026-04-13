import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { GroupsService } from './groups.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { JoinGroupDto } from './dto/join-group.dto';
import { TransferOwnerDto } from './dto/transfer-owner.dto';
import { GroupListQueryDto } from './dto/group-list-query.dto';
import {
  GroupResponseDto,
  GroupDetailResponseDto,
} from './dto/group-response.dto';

@ApiTags('groups')
@Controller('groups')
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: '모임 생성' })
  @ApiOkResponse({ type: GroupResponseDto })
  create(
    @CurrentUser() user: User,
    @Body() dto: CreateGroupDto,
  ): Promise<GroupResponseDto> {
    return this.groupsService.createGroup(user.id, dto);
  }

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: '내 모임 목록' })
  getMyGroups(@CurrentUser() user: User, @Query() query: GroupListQueryDto) {
    return this.groupsService.getMyGroups(user.id, query);
  }

  // join/:code는 :groupId보다 먼저 선언해야 라우트 충돌 방지
  @Public()
  @Get('join/:code')
  @ApiOperation({ summary: '초대 코드로 모임 정보 조회' })
  @ApiOkResponse({ type: GroupResponseDto })
  getByInviteCode(@Param('code') code: string): Promise<GroupResponseDto> {
    return this.groupsService.getGroupByInviteCode(code);
  }

  @Get(':groupId')
  @ApiBearerAuth()
  @ApiOperation({ summary: '모임 상세' })
  @ApiOkResponse({ type: GroupDetailResponseDto })
  getDetail(
    @CurrentUser() user: User,
    @Param('groupId', ParseIntPipe) groupId: number,
  ): Promise<GroupDetailResponseDto> {
    return this.groupsService.getGroupDetail(groupId, user.id);
  }

  @Patch(':groupId')
  @ApiBearerAuth()
  @ApiOperation({ summary: '모임 정보 수정 (방장만)' })
  @ApiOkResponse({ type: GroupResponseDto })
  update(
    @CurrentUser() user: User,
    @Param('groupId', ParseIntPipe) groupId: number,
    @Body() dto: UpdateGroupDto,
  ): Promise<GroupResponseDto> {
    return this.groupsService.updateGroup(groupId, user.id, dto);
  }

  @Delete(':groupId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: '모임 해산 (방장만, soft delete)' })
  async delete(
    @CurrentUser() user: User,
    @Param('groupId', ParseIntPipe) groupId: number,
  ): Promise<void> {
    await this.groupsService.deleteGroup(groupId, user.id);
  }

  @Post(':groupId/join')
  @ApiBearerAuth()
  @ApiOperation({ summary: '초대 코드로 모임 참여' })
  @ApiOkResponse({ type: GroupResponseDto })
  join(
    @CurrentUser() user: User,
    @Param('groupId', ParseIntPipe) groupId: number,
    @Body() dto: JoinGroupDto,
  ): Promise<GroupResponseDto> {
    return this.groupsService.joinGroup(groupId, user.id, dto.inviteCode);
  }

  @Post(':groupId/leave')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: '모임 탈퇴' })
  async leave(
    @CurrentUser() user: User,
    @Param('groupId', ParseIntPipe) groupId: number,
  ): Promise<void> {
    await this.groupsService.leaveGroup(groupId, user.id);
  }

  @Delete(':groupId/members/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: '멤버 강퇴 (방장만)' })
  async removeMember(
    @CurrentUser() user: User,
    @Param('groupId', ParseIntPipe) groupId: number,
    @Param('userId', ParseIntPipe) userId: number,
  ): Promise<void> {
    await this.groupsService.removeMember(groupId, userId, user.id);
  }

  @Patch(':groupId/transfer-owner')
  @ApiBearerAuth()
  @ApiOperation({ summary: '방장 위임' })
  async transferOwner(
    @CurrentUser() user: User,
    @Param('groupId', ParseIntPipe) groupId: number,
    @Body() dto: TransferOwnerDto,
  ): Promise<void> {
    await this.groupsService.transferOwner(groupId, user.id, dto);
  }
}
